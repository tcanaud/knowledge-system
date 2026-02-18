import { existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { readConfig } from "./config.js";
import { scanGuides } from "./scanners/guides.js";

/**
 * Check freshness of a single guide by comparing watched_paths against git log.
 * Returns { status: "verified"|"stale"|"unknown", details: [] }
 */
export function checkGuideFreshness(guide, projectRoot) {
  if (!guide.watched_paths || guide.watched_paths.length === 0) {
    return { status: "unknown", details: [] };
  }

  if (!guide.last_verified) {
    return { status: "unknown", details: [] };
  }

  const lastVerified = new Date(guide.last_verified);
  const staleDetails = [];

  for (const watchedPath of guide.watched_paths) {
    const fullPath = join(projectRoot, watchedPath);

    if (!existsSync(fullPath)) {
      staleDetails.push({ path: watchedPath, reason: "deleted" });
      continue;
    }

    try {
      const lastModified = execSync(
        `git log -1 --format=%aI -- "${watchedPath}"`,
        { encoding: "utf-8", cwd: projectRoot }
      ).trim();

      if (lastModified && new Date(lastModified) > lastVerified) {
        staleDetails.push({
          path: watchedPath,
          reason: "modified",
          date: lastModified.split("T")[0],
        });
      }
    } catch {
      // Git not available or path not tracked — skip
    }
  }

  // Check references
  if (guide.references) {
    for (const convId of guide.references.conventions || []) {
      // Check convention still exists and isn't superseded
      const convPath = join(projectRoot, ".agreements", convId, "agreement.yaml");
      if (!existsSync(convPath)) {
        staleDetails.push({ path: convId, reason: "orphaned reference" });
      }
    }

    for (const adrId of guide.references.adrs || []) {
      // We can't easily check ADR status without scanning — just check existence
      // This is a lightweight check; full ADR status scanning happens in refresh
    }
  }

  if (staleDetails.length > 0) {
    return { status: "stale", details: staleDetails };
  }

  return { status: "verified", details: [] };
}

/**
 * Check freshness of all guides and output report.
 */
export function check() {
  const projectRoot = process.cwd();

  console.log("\n  Knowledge Freshness Report");
  console.log("  ==========================\n");

  if (!existsSync(join(projectRoot, ".knowledge"))) {
    console.error("  Error: .knowledge/ not found. Run 'knowledge-system init' first.");
    process.exit(1);
  }

  const config = readConfig(projectRoot);
  if (!config) {
    console.error("  Error: .knowledge/config.yaml not found.");
    process.exit(1);
  }

  const guides = scanGuides(projectRoot, config);

  if (guides.length === 0) {
    console.log("  No guides found in .knowledge/guides/");
    console.log("  Use /knowledge.create to add guides.\n");
    return;
  }

  let verifiedCount = 0;
  let staleCount = 0;
  let unknownCount = 0;
  let hasStale = false;

  for (const guide of guides) {
    const result = checkGuideFreshness(guide, projectRoot);

    const idPadded = guide.id.padEnd(24);

    switch (result.status) {
      case "verified":
        console.log(`  VERIFIED  ${idPadded} (last verified: ${guide.last_verified})`);
        verifiedCount++;
        break;
      case "stale":
        console.log(`  STALE     ${idPadded} watched_paths changed:`);
        for (const detail of result.details) {
          if (detail.reason === "deleted") {
            console.log(`                                 - ${detail.path} (deleted)`);
          } else if (detail.reason === "orphaned reference") {
            console.log(`                                 - ${detail.path} (orphaned reference)`);
          } else {
            console.log(`                                 - ${detail.path} (${detail.date})`);
          }
        }
        staleCount++;
        hasStale = true;
        break;
      case "unknown":
        console.log(`  UNKNOWN   ${idPadded} (no watched_paths defined)`);
        unknownCount++;
        break;
    }
  }

  console.log();
  console.log(`  Summary: ${verifiedCount} verified, ${staleCount} stale, ${unknownCount} unknown`);
  console.log();

  if (hasStale) {
    process.exit(1);
  }
}
