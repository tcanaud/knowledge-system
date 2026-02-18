import { scanConventions } from "./conventions.js";
import { scanAdrs } from "./adrs.js";
import { scanFeatures } from "./features.js";
import { scanGuides } from "./guides.js";

export { scanConventions, scanAdrs, scanFeatures, scanGuides };

export function scanAll(projectRoot, config) {
  return {
    guides: scanGuides(projectRoot, config),
    conventions: scanConventions(projectRoot, config),
    adrs: scanAdrs(projectRoot, config),
    features: scanFeatures(projectRoot, config),
  };
}
