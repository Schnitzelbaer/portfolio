import type { APIRoute } from "astro";
import { llmsTxt } from "../lib/agent/pages";
import { pageContext, workFor } from "../lib/page";

export const GET: APIRoute = async () =>
  new Response(llmsTxt(await workFor(undefined), pageContext()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
