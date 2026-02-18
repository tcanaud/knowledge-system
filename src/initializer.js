import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { detect } from "./detect.js";
import { generateConfig } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "templates");

function copyTemplate(src, dest) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  copyFileSync(src, dest);
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

export async function install(flags = []) {
  const projectRoot = process.cwd();
  const skipBmad = flags.includes("--skip-bmad");
  const autoYes = flags.includes("--yes");

  console.log("\n  knowledge-system v1.0.0\n");

  // ── Detect environment ──────────────────────────────
  const env = detect(projectRoot);

  console.log("  Environment detected:");
  console.log(`    BMAD:           ${env.hasBmad ? `yes (${env.bmadDir}/)` : "no"}`);
  console.log(`    Spec Kit:       ${env.hasSpeckit ? "yes" : "no"}`);
  console.log(`    Agreements:     ${env.hasAgreements ? "yes" : "no"}`);
  console.log(`    ADR:            ${env.hasAdr ? "yes" : "no"}`);
  console.log(`    Features:       ${env.hasFeatures ? "yes" : "no"}`);
  console.log(`    Claude commands: ${env.hasClaudeCommands ? "yes" : "no"}`);
  console.log();

  const knowledgeDir = join(projectRoot, ".knowledge");

  if (existsSync(knowledgeDir) && !autoYes) {
    const answer = await ask("  .knowledge/ already exists. Overwrite templates? (y/N) ");
    if (answer !== "y" && answer !== "yes") {
      console.log("  Skipping. Use 'knowledge-system update' to update commands only.\n");
      return;
    }
  }

  // ── Phase 1/3: Core ──────────────────────────────────
  console.log("  [1/3] Installing core...");

  // Create .knowledge/ directory
  if (!existsSync(knowledgeDir)) {
    mkdirSync(knowledgeDir, { recursive: true });
  }

  // Create guides/ subdirectory
  const guidesDir = join(knowledgeDir, "guides");
  if (!existsSync(guidesDir)) {
    mkdirSync(guidesDir, { recursive: true });
    console.log("    create .knowledge/guides/");
  }

  // Config
  const configPath = join(knowledgeDir, "config.yaml");
  if (existsSync(configPath)) {
    console.log("    skip .knowledge/config.yaml (already configured)");
  } else {
    generateConfig(projectRoot, env);
    console.log("    write .knowledge/config.yaml (paths auto-detected)");
  }

  // Index
  const indexPath = join(knowledgeDir, "index.yaml");
  if (existsSync(indexPath)) {
    console.log("    skip .knowledge/index.yaml (already exists)");
  } else {
    const template = readFileSync(join(TEMPLATES, "core", "index.yaml"), "utf-8");
    const content = template.replace("{{generated}}", new Date().toISOString());
    writeFileSync(indexPath, content);
    console.log("    write .knowledge/index.yaml");
  }

  // Architecture
  const archPath = join(knowledgeDir, "architecture.md");
  if (existsSync(archPath)) {
    console.log("    skip .knowledge/architecture.md (already exists)");
  } else {
    copyTemplate(join(TEMPLATES, "core", "architecture.md"), archPath);
    console.log("    write .knowledge/architecture.md (scaffold)");
  }

  // Guide template
  const guideTplDir = join(knowledgeDir, "_templates");
  if (!existsSync(guideTplDir)) {
    mkdirSync(guideTplDir, { recursive: true });
  }
  copyTemplate(
    join(TEMPLATES, "core", "guide.tpl.md"),
    join(guideTplDir, "guide.tpl.md")
  );
  console.log("    write .knowledge/_templates/guide.tpl.md");

  // Snapshot (empty initial)
  const snapshotPath = join(knowledgeDir, "snapshot.md");
  if (!existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, "# Project Snapshot\n\n> Run `/knowledge.refresh` to populate.\n");
    console.log("    write .knowledge/snapshot.md (empty)");
  }

  // ── Phase 2/3: Claude Code commands ──────────────────
  console.log("  [2/3] Installing Claude Code commands...");

  if (!env.hasClaudeCommands) {
    mkdirSync(join(projectRoot, ".claude", "commands"), { recursive: true });
    console.log("    create .claude/commands/");
  }

  const commandMappings = [
    ["commands/k.md", ".claude/commands/k.md"],
    ["commands/knowledge.refresh.md", ".claude/commands/knowledge.refresh.md"],
    ["commands/knowledge.check.md", ".claude/commands/knowledge.check.md"],
    ["commands/knowledge.create.md", ".claude/commands/knowledge.create.md"],
  ];

  for (const [src, dest] of commandMappings) {
    const srcPath = join(TEMPLATES, src);
    if (existsSync(srcPath)) {
      copyTemplate(srcPath, join(projectRoot, dest));
      console.log(`    write ${dest}`);
    }
  }

  // ── Phase 3/3: BMAD Integration ─────────────────────
  if (!skipBmad && env.hasBmad) {
    console.log(`  [3/3] BMAD detected (${env.bmadDir}/), no integration needed.`);
  } else if (env.hasBmad && skipBmad) {
    console.log("  [3/3] BMAD integration skipped (--skip-bmad).");
  } else {
    console.log("  [3/3] No BMAD detected, skipping integration.");
  }

  // ── Done ────────────────────────────────────────────
  console.log();
  console.log("  Done! Knowledge System installed.");
  console.log("  Config: .knowledge/config.yaml (edit to customize paths)");
  console.log();
  console.log("  Next steps:");
  console.log("    1. Edit .knowledge/architecture.md with your project overview");
  console.log("    2. Run /knowledge.refresh to populate snapshot and index");
  console.log("    3. Use /k <question> to query the knowledge base");
  console.log();
}
