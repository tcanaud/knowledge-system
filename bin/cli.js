#!/usr/bin/env node

import { argv, exit } from "node:process";

const command = argv[2];
const flags = argv.slice(3);

const HELP = `
@tcanaud/knowledge-system — Verified Knowledge System for AI agent onboarding.

Usage:
  npx @tcanaud/knowledge-system init      Scaffold .knowledge/ directory in the current project
  npx @tcanaud/knowledge-system update    Update commands and templates without touching user content
  npx @tcanaud/knowledge-system refresh   Regenerate snapshot.md and rebuild index.yaml
  npx @tcanaud/knowledge-system check     Verify freshness of all knowledge guides
  npx @tcanaud/knowledge-system help      Show this help message

Options (init):
  --skip-bmad       Skip BMAD integration even if detected
  --yes             Skip confirmation prompts

Claude Code commands (after init):
  /k <question>              Query knowledge base with verified answers
  /knowledge.refresh         Refresh snapshot and index
  /knowledge.check           Check all guides for freshness
  /knowledge.create <topic>  Create a new knowledge guide
`;

switch (command) {
  case "init": {
    const { install } = await import("../src/initializer.js");
    install(flags);
    break;
  }
  case "update": {
    const { update } = await import("../src/updater.js");
    update(flags);
    break;
  }
  case "refresh": {
    const { refresh } = await import("../src/refresher.js");
    refresh();
    break;
  }
  case "check": {
    const { check } = await import("../src/checker.js");
    check();
    break;
  }
  case "help":
  case "--help":
  case "-h":
  case undefined:
    console.log(HELP);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.log(HELP);
    exit(1);
}
