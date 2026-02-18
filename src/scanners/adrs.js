import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, relative } from "node:path";
import { parseFrontmatter, extractSummary } from "../frontmatter.js";

/**
 * Recursively scan an ADR directory for .md files.
 */
function scanAdrDirectory(dirPath, projectRoot, results) {
  if (!existsSync(dirPath)) return;

  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanAdrDirectory(fullPath, projectRoot, results);
      continue;
    }

    if (!entry.endsWith(".md")) continue;
    if (["template.md", "index.md", "README.md"].includes(entry)) continue;

    const content = readFileSync(fullPath, "utf-8");
    const fm = parseFrontmatter(content);
    if (!fm) continue;

    const id = fm.id || basename(entry, ".md");
    const title = fm.title || extractTitle(content) || id;
    const status = fm.status || "unknown";
    const summary = extractSummary(content);
    const topics = fm.tags.length > 0
      ? fm.tags
      : title.toLowerCase().split(/[\s,\-_/]+/).filter((w) => w.length > 2);

    results.push({
      id,
      title,
      path: relative(projectRoot, fullPath),
      summary,
      topics,
      status,
    });
  }
}

/**
 * Extract H1 title from markdown content.
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Scan .adr/ for ADR summaries across all scopes.
 * Returns array of { id, title, path, summary, topics, status }.
 */
export function scanAdrs(projectRoot, config) {
  const adrDir = config.adr_dir || ".adr";
  const adrPath = join(projectRoot, adrDir);

  if (!existsSync(adrPath)) return [];

  const results = [];

  scanAdrDirectory(join(adrPath, "global"), projectRoot, results);
  scanAdrDirectory(join(adrPath, "domain"), projectRoot, results);
  scanAdrDirectory(join(adrPath, "local"), projectRoot, results);

  // Deduplicate by id
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
