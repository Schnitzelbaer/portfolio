import type { APIRoute } from "astro";
import { markdownResponse } from "../lib/agent/markdown";
import { workDocument } from "../lib/agent/pages";
import { pageContext, workFor } from "../lib/page";

export const GET: APIRoute = async () =>
  markdownResponse(workDocument(await workFor(undefined), pageContext()));
