#!/usr/bin/env node
/**
 * SuperX skills generator.
 *
 * The skill folders under skills/superx/references/skills/ are the ONLY
 * source of truth. Everything else is generated from them:
 *
 *   1. the Skills index block in skills/superx/SKILL.md (between the
 *      <!-- skills:index:start/end --> markers)
 *   2. superx-server/src/data/skills-catalog.json (served to the webapp and
 *      the extension by GET /ask/skills)
 *   3. superx-docs/skills.mdx (the public Agent skills page)
 *
 * Usage:
 *   node scripts/skills.mjs build [--server <dir>] [--docs <dir>] [--stdout]
 *   node scripts/skills.mjs check [--server <dir>] [--docs <dir>]
 *
 * `build` writes the outputs it has a path for; `--stdout` prints the catalog
 * JSON only and writes nothing. `check` regenerates everything in memory and
 * exits 1 listing whatever is stale on disk.
 *
 * Node built-ins only: this runs from prepublishOnly and must never need an
 * install.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SKILL_MD = path.join(REPO, "skills/superx/SKILL.md");
const SKILLS_DIR = path.join(REPO, "skills/superx/references/skills");

const INDEX_START = "<!-- skills:index:start -->";
const INDEX_END = "<!-- skills:index:end -->";

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED = [
  "name",
  "category",
  "order",
  "subtitle",
  "summary",
  "howToAsk",
  "provide",
  "get",
  "chips",
  "launchPrompt",
  "sampleKind",
];
/** Catalog key order, exactly as the served JSON has always had it. */
const CARD_KEYS = [
  "id",
  "name",
  "category",
  "subtitle",
  "summary",
  "howToAsk",
  "provide",
  "get",
  "chips",
  "launchPrompt",
  "sampleKind",
  "starter",
  "starterGroup",
];

/* ── Failure ──────────────────────────────────────────────────────────────── */

const problems = [];
function fail(where, message) {
  problems.push(`${where}: ${message}`);
}
function bail() {
  if (!problems.length) return;
  process.stderr.write("Skills validation failed:\n");
  for (const p of problems) process.stderr.write(`  ${p}\n`);
  process.exit(1);
}

/* ── Read the source of truth ─────────────────────────────────────────────── */

function readSources() {
  if (fs.existsSync(path.join(REPO, "SKILL.md"))) {
    fail("SKILL.md", "a root SKILL.md exists; the skill lives in skills/superx/");
  }

  const metaPath = path.join(SKILLS_DIR, "categories.json");
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (err) {
    fail(metaPath, `unreadable (${err.message})`);
    bail();
  }
  if (!Array.isArray(meta.categories) || !meta.categories.length) {
    fail(metaPath, "categories must be a non-empty array");
  }
  if (!meta.meta || typeof meta.meta !== "object") {
    fail(metaPath, "meta must be an object");
  }

  const allowed = new Set(["README.md", "categories.json"]);
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const ids = [];
  for (const e of entries) {
    if (e.name === ".DS_Store") continue;
    if (e.isDirectory()) {
      ids.push(e.name);
      continue;
    }
    if (!allowed.has(e.name)) {
      fail(path.join(SKILLS_DIR, e.name), "stray file in the skills directory");
    }
  }
  ids.sort();

  const categoryIds = new Set(meta.categories.map((c) => c.id));
  const seenOrder = new Map();
  const skills = [];

  for (const id of ids) {
    const dir = path.join(SKILLS_DIR, id);
    const cardPath = path.join(dir, "card.json");
    const recipePath = path.join(dir, "recipe.md");

    if (!ID_RE.test(id)) {
      fail(dir, "folder name must match ^[a-z0-9]+(-[a-z0-9]+)*$");
    }
    if (id.length > 64) {
      fail(dir, `folder name is ${id.length} characters, the limit is 64`);
    }

    let card;
    try {
      card = JSON.parse(fs.readFileSync(cardPath, "utf8"));
    } catch (err) {
      fail(cardPath, `unreadable (${err.message})`);
      continue;
    }

    for (const key of REQUIRED) {
      if (card[key] === undefined || card[key] === null || card[key] === "") {
        fail(cardPath, `missing required key "${key}"`);
      }
    }
    if (!Array.isArray(card.howToAsk) || !card.howToAsk.length) {
      fail(cardPath, "howToAsk must be a non-empty array");
    }
    if (!Array.isArray(card.chips) || !card.chips.length) {
      fail(cardPath, "chips must be a non-empty array");
    }
    if (card.category && !categoryIds.has(card.category)) {
      fail(cardPath, `unknown category "${card.category}"`);
    }
    if (typeof card.order !== "number" || !Number.isInteger(card.order)) {
      fail(cardPath, "order must be an integer");
    } else {
      const key = `${card.category}/${card.order}`;
      if (seenOrder.has(key)) {
        fail(cardPath, `order ${card.order} in "${card.category}" is already used by ${seenOrder.get(key)}`);
      } else {
        seenOrder.set(key, id);
      }
    }

    let recipe;
    try {
      recipe = fs.readFileSync(recipePath, "utf8");
    } catch (err) {
      fail(recipePath, `unreadable (${err.message})`);
      continue;
    }
    const firstLine = recipe.split("\n")[0];
    if (firstLine !== `# ${card.name}`) {
      fail(recipePath, `first line must be "# ${card.name}", found "${firstLine}"`);
    }

    skills.push({ id, card, recipe: recipe.replace(/\s+$/, "") });
  }

  bail();

  skills.sort((a, b) => {
    const ca = meta.categories.findIndex((c) => c.id === a.card.category);
    const cb = meta.categories.findIndex((c) => c.id === b.card.category);
    if (ca !== cb) return ca - cb;
    return a.card.order - b.card.order;
  });

  return { meta, skills };
}

/* ── Catalog JSON, formatted the way the committed file is ────────────────── */

const WIDTH = 80;
const j = (v) => JSON.stringify(v);

/** An array on one line when it fits the print width, one item per line if not. */
function arrayValue(items, indent, prefixLen, suffix) {
  const inline = `[${items.map(j).join(", ")}]`;
  if (prefixLen + inline.length + suffix.length <= WIDTH) return inline;
  const pad = " ".repeat(indent + 2);
  return `[\n${items.map((i) => pad + j(i)).join(",\n")}\n${" ".repeat(indent)}]`;
}

function skillBlock(card, indent) {
  const pad = " ".repeat(indent);
  const rows = [];
  for (const key of CARD_KEYS) {
    if (card[key] === undefined) continue;
    const prefix = `${pad}${j(key)}: `;
    const value = Array.isArray(card[key])
      ? arrayValue(card[key], indent, prefix.length, ",")
      : j(card[key]);
    rows.push(prefix + value);
  }
  return rows.join(",\n");
}

function renderCatalog({ meta, skills }) {
  const out = [];
  out.push("{");
  out.push(`  "version": ${j(meta.version)},`);
  out.push('  "meta": {');
  const metaKeys = Object.keys(meta.meta);
  metaKeys.forEach((k, i) => {
    out.push(`    ${j(k)}: ${j(meta.meta[k])}${i === metaKeys.length - 1 ? "" : ","}`);
  });
  out.push("  },");
  out.push('  "categories": [');
  meta.categories.forEach((c, i) => {
    out.push(`    { "id": ${j(c.id)}, "name": ${j(c.name)} }${i === meta.categories.length - 1 ? "" : ","}`);
  });
  out.push("  ],");
  out.push('  "skills": [');
  skills.forEach((s, i) => {
    // `order` is folder-local and never served: CARD_KEYS leaves it out.
    out.push("    {");
    out.push(skillBlock({ id: s.id, ...s.card }, 6));
    out.push(`    }${i === skills.length - 1 ? "" : ","}`);
  });
  out.push("  ]");
  out.push("}");
  return out.join("\n") + "\n";
}

/* ── SKILL.md index block ─────────────────────────────────────────────────── */

function renderIndex({ meta, skills }) {
  const lines = [INDEX_START];
  meta.categories.forEach((cat) => {
    const group = skills.filter((s) => s.card.category === cat.id);
    if (!group.length) return;
    if (lines.length > 1) lines.push("");
    lines.push(`### ${cat.name}`);
    for (const s of group) {
      lines.push(`- **${s.card.name}**: ${s.card.subtitle} -> references/skills/${s.id}/recipe.md`);
    }
  });
  lines.push(INDEX_END);
  return lines.join("\n");
}

function renderSkillMd(sources) {
  const current = fs.readFileSync(SKILL_MD, "utf8");
  const start = current.indexOf(INDEX_START);
  const end = current.indexOf(INDEX_END);
  if (start === -1 || end === -1) {
    fail(SKILL_MD, `missing the ${INDEX_START} / ${INDEX_END} markers`);
    bail();
  }
  return current.slice(0, start) + renderIndex(sources) + current.slice(end + INDEX_END.length);
}

/* ── Docs page ────────────────────────────────────────────────────────────── */

function renderDocs({ meta, skills }) {
  const readme = fs.readFileSync(path.join(SKILLS_DIR, "README.md"), "utf8");
  // Drop the README's own H1: the frontmatter title is the page title.
  const intro = readme.replace(/^#[^\n]*\n+/, "").trim();

  const parts = [];
  parts.push("---");
  parts.push('title: "Agent skills"');
  parts.push(
    `description: "${skills.length} goal-shaped recipes, one per SuperX skill, each with its CLI chain, its MCP tool chain, and the point where it hands back to a person."`
  );
  parts.push("---");
  parts.push("");
  parts.push(
    "This page is generated from the skill folders in the [superx-agent](https://github.com/superx-so/superx-agent) repo, the same files the installed skill reads. Run a chain with the [CLI](/cli) or the [MCP server](/mcp-server)."
  );
  parts.push("");
  parts.push(intro);

  meta.categories.forEach((cat) => {
    const group = skills.filter((s) => s.card.category === cat.id);
    if (!group.length) return;
    parts.push("");
    parts.push(`## ${cat.name}`);
    for (const s of group) {
      const body = s.recipe.replace(/^# /, "### ");
      parts.push("");
      parts.push(body);
    }
  });

  return parts.join("\n") + "\n";
}

/* ── Outputs ──────────────────────────────────────────────────────────────── */

/**
 * Resolve a sibling repo argument.
 *
 * `build` REFUSES a path that is not there: silently mkdir-ing a typo would
 * write a catalog nobody reads and leave the real one stale. `check` skips it
 * with a warning instead, so `prepublishOnly` still works in a standalone
 * clone of superx-agent; inside the monorepo both siblings exist, so the check
 * stays strict where it matters.
 */
function resolveSibling(dir, flag, mode) {
  const abs = path.resolve(dir);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return abs;
  if (mode === "check") {
    process.stderr.write(`skipping ${dir} (not present)\n`);
    return null;
  }
  process.stderr.write(`${flag} ${dir} does not exist (resolved to ${abs}).\n`);
  process.exit(1);
}

function plan(args, mode) {
  const sources = readSources();
  const outputs = [
    { label: "skills/superx/SKILL.md", file: SKILL_MD, content: renderSkillMd(sources) },
  ];

  const server = args.server ? resolveSibling(args.server, "--server", mode) : null;
  if (server) {
    outputs.push({
      label: path.join(args.server, "src/data/skills-catalog.json"),
      file: path.join(server, "src/data/skills-catalog.json"),
      content: renderCatalog(sources),
    });
  }

  const docs = args.docs ? resolveSibling(args.docs, "--docs", mode) : null;
  if (docs) {
    outputs.push({
      label: path.join(args.docs, "skills.mdx"),
      file: path.join(docs, "skills.mdx"),
      content: renderDocs(sources),
    });
  }

  return { sources, outputs };
}

function parseArgs(argv) {
  const args = { cmd: argv[0], server: null, docs: null, stdout: false };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--stdout") args.stdout = true;
    else if (a === "--server") args.server = argv[(i += 1)];
    else if (a === "--docs") args.docs = argv[(i += 1)];
    else if (a.startsWith("--server=")) args.server = a.slice("--server=".length);
    else if (a.startsWith("--docs=")) args.docs = a.slice("--docs=".length);
    else {
      process.stderr.write(`Unknown argument: ${a}\n`);
      process.exit(1);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.cmd === "build" && args.stdout) {
    process.stdout.write(renderCatalog(readSources()));
    return;
  }

  if (args.cmd === "build") {
    const { sources, outputs } = plan(args, "build");
    for (const o of outputs) {
      const before = fs.existsSync(o.file) ? fs.readFileSync(o.file, "utf8") : null;
      if (before === o.content) {
        process.stderr.write(`unchanged  ${o.label}\n`);
        continue;
      }
      fs.writeFileSync(o.file, o.content);
      process.stderr.write(`wrote      ${o.label}\n`);
    }
    process.stderr.write(`${sources.skills.length} skills in ${sources.meta.categories.length} categories\n`);
    return;
  }

  if (args.cmd === "check") {
    const { sources, outputs } = plan(args, "check");
    const stale = [];
    for (const o of outputs) {
      const before = fs.existsSync(o.file) ? fs.readFileSync(o.file, "utf8") : null;
      if (before !== o.content) stale.push(o.label);
    }
    if (stale.length) {
      process.stderr.write("Generated outputs are stale. Run: npm run skills:build\n");
      for (const s of stale) process.stderr.write(`  ${s}\n`);
      process.exit(1);
    }
    process.stderr.write(
      `skills:check OK (${sources.skills.length} skills, ${outputs.length} outputs up to date)\n`
    );
    return;
  }

  process.stderr.write("Usage: node scripts/skills.mjs build|check [--server <dir>] [--docs <dir>] [--stdout]\n");
  process.exit(1);
}

main();
