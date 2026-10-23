import { SITE_DOMAIN } from "astro:env/server";
import { defineMiddleware } from "astro:middleware";
import siteYaml from "../content/site.yaml?raw";
import { isUnlocked } from "./lib/auth/runtime";
import { variantFromHost } from "./lib/routing/host";
import { routingInput } from "./lib/routing/input";
import { interpret } from "./lib/routing/interpret";
import { buildRules, VARIANT_PREFIX } from "./lib/routing/rules";
import { getVariants } from "./lib/variants";

/**
 * - Dev server: applies the routing table (subdomains, Markdown negotiation, headers), which
 *   Vercel applies in production before any code runs.
 * - On-demand routes: resolves the variant from the Host header. Serverless functions see the
 *   original URL, so the host is the reliable signal.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered && !import.meta.env.DEV) return next();

  const variants = await getVariants();
  // context.url carries the Host header; reading request headers on prerendered routes would
  // only produce dev warnings.
  const host = context.url.host;
  context.locals.variant = variantFromHost(
    host,
    SITE_DOMAIN,
    variants.map((v) => v.id),
  );
  context.locals.unlocked = context.isPrerendered ? false : await isUnlocked(context.cookies);

  if (!import.meta.env.DEV) return next();

  const path = context.url.pathname;
  if (path.startsWith(`${VARIANT_PREFIX}/`) || path.endsWith(".md")) return next();
  const rules = buildRules(
    routingInput({
      domain: SITE_DOMAIN,
      production: false,
      variants: variants.map((v) => ({ id: v.id, indexable: v.indexable })),
      siteYaml,
    }),
  );
  const { action, headers } = interpret(rules, {
    host,
    path,
    headers: context.isPrerendered ? {} : Object.fromEntries(context.request.headers),
  });
  const withHeaders = (response: Response) => {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  };
  switch (action.type) {
    case "rewrite":
      return withHeaders(await context.rewrite(action.path));
    case "redirect": {
      // Keep the dev server's protocol and port instead of the production https URL.
      const location = action.location.replace(
        /^https:\/\/([^/]+)/,
        (_, h) => `${context.url.protocol}//${h}${context.url.port ? `:${context.url.port}` : ""}`,
      );
      return new Response(null, { status: action.status, headers: { Location: location } });
    }
    case "status":
      return new Response("Not found", { status: action.status });
    default:
      return withHeaders(await next());
  }
});
