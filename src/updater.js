import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "templates");

function copyTemplate(src, dest) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  copyFileSync(src, dest);
}

export function update(flags = []) {
  const projectRoot = process.cwd();

  console.log("\n  knowledge-system update\n");

  if (!existsSync(join(projectRoot, ".knowledge"))) {
    console.error("  Error: .knowledge/ not found. Run 'knowledge-system init' first.");
    process.exit(1);
  }

  // Update guide template
  console.log("  Updating templates...");
  copyTemplate(
    join(TEMPLATES, "core", "guide.tpl.md"),
    join(projectRoot, ".knowledge", "_templates", "guide.tpl.md")
  );
  console.log("    update .knowledge/_templates/guide.tpl.md");

  // Update Claude Code commands
  console.log("  Updating Claude Code commands...");

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
      console.log(`    update ${dest}`);
    }
  }

  console.log();
  console.log("  Done! Commands and templates updated.");
  console.log("  Your existing guides, architecture.md, config, and index are untouched.\n");
}
