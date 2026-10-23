import type { APIRoute } from "astro";
import { markdownResponse } from "../lib/agent/markdown";
import { aboutDocument } from "../lib/agent/pages";
import { pageContext } from "../lib/page";

export const GET: APIRoute = async () => markdownResponse(await aboutDocument(pageContext()));
