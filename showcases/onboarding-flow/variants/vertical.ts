import { defineVariant } from "../../../src/lib/tour/types";
import { createDiagram, tour } from "../diagram";

export default defineVariant({ mount: (root) => createDiagram(root, "vertical"), tour });
