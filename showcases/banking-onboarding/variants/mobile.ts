import { defineVariant } from "../../../src/lib/tour/types";
import { createApp } from "../app";
import { tour } from "../tour";

export default defineVariant({ mount: (root) => createApp(root, "mobile"), tour });
