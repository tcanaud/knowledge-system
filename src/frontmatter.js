import { readFileSync } from "node:fs";

/**
 * Parse YAML frontmatter from markdown content.
 * Returns an object with extracted fields, or null if no frontmatter found.
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const raw = match[1];
  const result = {};

  // Extract simple string fields
  const matchField = (key) => {
    const re = new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m");
    const m = raw.match(re);
    return m ? m[1].trim() : null;
  };

  result.id = matchField("id");
  result.title = matchField("title");
  result.created = matchField("created");
  result.last_verified = matchField("last_verified");
  result.status = matchField("status");

  // Extract inline arrays: field: [val1, val2, val3]
  const matchInlineArray = (key) => {
    const re = new RegExp(`^${key}:\\s*\\[([^\\]]*)]`, "m");
    const m = raw.match(re);
    if (!m) return [];
    return m[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  };

  // Extract block arrays: field:\n  - val1\n  - val2
  const matchBlockArray = (key) => {
    const re = new RegExp(`^${key}:\\s*\\n((?:[ \\t]+-[^\\n]*\\n?)*)`, "m");
    const m = raw.match(re);
    if (!m) return [];
    return m[1]
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  };

  // Extract arrays (try inline first, then block)
  const matchArray = (key) => {
    const inline = matchInlineArray(key);
    if (inline.length > 0) return inline;
    return matchBlockArray(key);
  };

  result.topics = matchArray("topics");
  result.watched_paths = matchArray("watched_paths");

  // Extract nested references
  result.references = {
    conventions: matchArray("conventions"),
    adrs: matchArray("adrs"),
    features: matchArray("features"),
  };

  // Extract tags (used by ADRs)
  const tagsRaw = matchField("tags");
  result.tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
    : [];

  return result;
}

/**
 * Read a file and parse its frontmatter.
 */
export function readFrontmatter(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return parseFrontmatter(content);
}

/**
 * Extract the body (content after frontmatter) from markdown.
 */
export function extractBody(content) {
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

/**
 * Extract first non-empty paragraph after frontmatter as summary.
 */
export function extractSummary(content) {
  const body = extractBody(content);
  const lines = body.split("\n");
  const summaryLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headings and empty lines at start
    if (summaryLines.length === 0 && (trimmed === "" || trimmed.startsWith("#"))) continue;
    // Stop at empty line after collecting some content
    if (summaryLines.length > 0 && trimmed === "") break;
    summaryLines.push(trimmed);
  }

  const summary = summaryLines.join(" ");
  return summary.length > 120 ? summary.substring(0, 117) + "..." : summary;
}
