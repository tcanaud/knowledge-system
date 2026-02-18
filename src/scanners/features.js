import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Scan .features/ for feature manifest YAML files.
 * Returns array of { id, title, path, summary, topics, status }.
 */
export function scanFeatures(projectRoot, config) {
  const featuresDir = config.features_dir || ".features";
  const basePath = join(projectRoot, featuresDir);

  if (!existsSync(basePath)) return [];

  const results = [];
  const entries = readdirSync(basePath);

  for (const entry of entries) {
    // Skip non-feature files
    if (!entry.endsWith(".yaml")) continue;
    if (["config.yaml", "index.yaml"].includes(entry)) continue;

    const filePath = join(basePath, entry);
    const content = readFileSync(filePath, "utf-8");

    // Extract fields via regex
    const idMatch = content.match(/^feature_id:\s*["']?(.+?)["']?\s*$/m);
    const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    const stageMatch = content.match(/^\s*stage:\s*["']?(.+?)["']?\s*$/m);
    const tagsMatch = content.match(/^tags:\s*\[([^\]]*)\]/m);

    if (!idMatch) continue;

    const id = idMatch[1];
    const title = titleMatch ? titleMatch[1] : id;
    const stage = stageMatch ? stageMatch[1] : "unknown";
    const tags = tagsMatch
      ? tagsMatch[1].split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
      : [];

    const summary = `Feature ${id}: ${title} (${stage})`;
    const topics = tags.length > 0
      ? tags
      : title.toLowerCase().split(/[\s,\-_/]+/).filter((w) => w.length > 2);

    results.push({
      id,
      title,
      path: join(featuresDir, entry),
      summary,
      topics,
      status: stage,
    });
  }

  return results;
}
