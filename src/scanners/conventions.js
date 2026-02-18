import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Scan .agreements/conv-* directories for active conventions.
 * Returns array of { id, title, path, summary, topics }.
 */
export function scanConventions(projectRoot, config) {
  const agreementsDir = config.agreements_dir || ".agreements";
  const basePath = join(projectRoot, agreementsDir);

  if (!existsSync(basePath)) return [];

  const results = [];
  const entries = readdirSync(basePath);

  for (const entry of entries) {
    // Only convention directories (conv-*)
    if (!entry.startsWith("conv-")) continue;

    const dirPath = join(basePath, entry);
    if (!statSync(dirPath).isDirectory()) continue;

    const yamlPath = join(dirPath, "agreement.yaml");
    if (!existsSync(yamlPath)) continue;

    const content = readFileSync(yamlPath, "utf-8");

    // Extract fields
    const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    const statusMatch = content.match(/^status:\s*["']?(.+?)["']?\s*$/m);
    const intentMatch = content.match(/^intent:\s*\|\s*\n([\s\S]*?)(?=\n\w|\n#)/m);

    const status = statusMatch ? statusMatch[1] : "unknown";
    if (status === "deprecated" || status === "superseded") continue;

    const title = titleMatch ? titleMatch[1] : entry;
    const intent = intentMatch ? intentMatch[1].trim().split("\n")[0].trim() : "";
    const summary = intent.length > 120 ? intent.substring(0, 117) + "..." : intent;

    // Derive topics from title keywords
    const topics = title
      .toLowerCase()
      .replace(/convention:\s*/i, "")
      .split(/[\s,\-_/]+/)
      .filter((w) => w.length > 2)
      .filter((w) => !["with", "the", "and", "for"].includes(w));

    results.push({
      id: entry,
      title,
      path: join(agreementsDir, entry, "agreement.yaml"),
      summary,
      topics,
    });
  }

  return results;
}
