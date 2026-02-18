import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, extractSummary } from "../frontmatter.js";

/**
 * Scan .knowledge/guides/ for knowledge guide markdown files.
 * Returns array of guide entries with frontmatter data.
 */
export function scanGuides(projectRoot, config) {
  const guidesDir = join(projectRoot, ".knowledge", "guides");

  if (!existsSync(guidesDir)) return [];

  const results = [];
  const entries = readdirSync(guidesDir);

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;

    const filePath = join(guidesDir, entry);
    const content = readFileSync(filePath, "utf-8");
    const fm = parseFrontmatter(content);

    if (!fm) continue;

    const id = fm.id || entry.replace(/\.md$/, "");
    const title = fm.title || id;
    const summary = extractSummary(content);

    results.push({
      id,
      title,
      path: join(".knowledge", "guides", entry),
      summary,
      topics: fm.topics || [],
      status: "unknown", // Will be updated by checker
      last_verified: fm.last_verified || null,
      watched_paths: fm.watched_paths || [],
      references: fm.references || { conventions: [], adrs: [], features: [] },
    });
  }

  return results;
}
