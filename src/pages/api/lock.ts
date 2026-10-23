import type { APIRoute } from "astro";
import { clearUnlockCookie, safeNext } from "../../lib/auth/runtime";

export const prerender = false;

/** Forgets the unlock cookie (e.g. on a shared device). */
export const POST: APIRoute = async ({ request, cookies }) => {
  const form = await request.formData().catch(() => undefined);
  clearUnlockCookie(cookies);
  return new Response(null, {
    status: 303,
    headers: { Location: safeNext(form?.get("next")), "Cache-Control": "no-store" },
  });
};
