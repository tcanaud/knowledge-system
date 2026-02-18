import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "templates");

export function generateConfig(projectRoot, detected) {
  const agreementsDir = detected.hasAgreements ? ".agreements" : "null";
  const adrDir = detected.hasAdr ? ".adr" : "null";
  const featuresDir = detected.hasFeatures ? ".features" : "null";
  const specsDir = detected.hasSpeckit ? "specs" : "null";

  const templatePath = join(TEMPLATES, "core", "config.yaml");
  let content = readFileSync(templatePath, "utf-8");

  content = content.replace("{{agreements_dir}}", agreementsDir);
  content = content.replace("{{adr_dir}}", adrDir);
  content = content.replace("{{features_dir}}", featuresDir);
  content = content.replace("{{specs_dir}}", specsDir);

  const configPath = join(projectRoot, ".knowledge", "config.yaml");
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, content);

  return configPath;
}

export function readConfig(projectRoot) {
  const configPath = join(projectRoot, ".knowledge", "config.yaml");
  if (!existsSync(configPath)) return null;

  const content = readFileSync(configPath, "utf-8");
  const config = {};

  const matchSimple = (key) => {
    const re = new RegExp(`^  ${key}:\\s*["']?(.+?)["']?\\s*$`, "m");
    const m = content.match(re);
    if (!m) return null;
    const val = m[1].trim();
    return val === "null" ? null : val;
  };

  const matchRoot = (key) => {
    const re = new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m");
    const m = content.match(re);
    if (!m) return null;
    const val = m[1].trim();
    return val === "null" ? null : val;
  };

  config.version = matchRoot("version");
  config.freshness_threshold_days = parseInt(matchRoot("freshness_threshold_days") || "30", 10);

  // Sources (nested under sources:)
  config.agreements_dir = matchSimple("agreements_dir") || ".agreements";
  config.adr_dir = matchSimple("adr_dir") || ".adr";
  config.features_dir = matchSimple("features_dir") || ".features";
  config.specs_dir = matchSimple("specs_dir") || "specs";

  // Snapshot options (nested under snapshot:)
  config.include_conventions = matchSimple("include_conventions") !== "false";
  config.include_adrs = matchSimple("include_adrs") !== "false";
  config.include_features = matchSimple("include_features") !== "false";
  config.include_tech_stack = matchSimple("include_tech_stack") !== "false";

  return config;
}
