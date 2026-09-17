import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { note, printJson } from "../api";

/**
 * `superx skills:list` and `superx skills:install`.
 *
 * These two are the only commands that never touch the API: they work on the
 * skill files shipped inside the npm package (`skills/superx`, listed in
 * package.json `files`). tsup builds a CJS bundle at dist/index.js, so
 * `__dirname` is the package's dist/ and the skill sits one level up.
 *
 * Installing is always an explicit command, never a postinstall hook: nothing
 * is written to a user's home directory because they ran `npm install`.
 */

const SKILL_NAME = "superx";

/** <package>/skills/superx, resolved from the built bundle. */
export function packageSkillDir(): string {
  return path.join(__dirname, "..", "skills", SKILL_NAME);
}

function skillsRefDir(): string {
  return path.join(packageSkillDir(), "references", "skills");
}

function readJson(file: string): any {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export async function skillsList(): Promise<void> {
  const dir = skillsRefDir();
  const meta = readJson(path.join(dir, "categories.json"));
  const categoryOrder: string[] = meta.categories.map((c: any) => c.id);

  const rows = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const card = readJson(path.join(dir, e.name, "card.json"));
      return {
        id: e.name,
        name: card.name as string,
        category: card.category as string,
        order: card.order as number,
      };
    })
    .sort((a, b) => {
      const ca = categoryOrder.indexOf(a.category);
      const cb = categoryOrder.indexOf(b.category);
      if (ca !== cb) return ca - cb;
      return a.order - b.order;
    })
    .map(({ id, name, category }) => ({ id, name, category }));

  printJson({
    data: rows,
    meta: { count: rows.length, skills_dir: dir, categories: meta.categories },
  });
}

/* ── Install ──────────────────────────────────────────────────────────────── */

type Target = { label: string; dest: string };

function homeTargets(target: string | undefined): Target[] {
  const home = os.homedir();
  const claude: Target = {
    label: "claude",
    dest: path.join(home, ".claude", "skills", SKILL_NAME),
  };
  const agents: Target = {
    label: "agents",
    dest: path.join(home, ".agents", "skills", SKILL_NAME),
  };
  const openclaw: Target = {
    label: "openclaw",
    dest: path.join(home, ".openclaw", "skills", SKILL_NAME),
  };

  if (target === "claude") return [claude];
  if (target === "agents") return [agents];
  if (target === "openclaw") return [openclaw];
  if (target === "all") return [claude, agents, openclaw];

  // Default: Claude Code plus the directory Cursor, Codex, Gemini CLI and
  // Copilot share, and OpenClaw only when it is already set up on this machine.
  const targets = [claude, agents];
  if (fs.existsSync(path.join(home, ".openclaw"))) targets.push(openclaw);
  return targets;
}

function projectTargets(target: string | undefined): Target[] {
  const cwd = process.cwd();
  const claude: Target = {
    label: "claude",
    dest: path.join(cwd, ".claude", "skills", SKILL_NAME),
  };
  const agents: Target = {
    label: "agents",
    dest: path.join(cwd, ".agents", "skills", SKILL_NAME),
  };
  // OpenClaw reads <workspace>/skills; `npx skills add` walks it too.
  const workspace: Target = {
    label: "workspace",
    dest: path.join(cwd, "skills", SKILL_NAME),
  };

  if (target === "claude") return [claude];
  if (target === "agents") return [agents];
  if (target === "openclaw") return [workspace];
  return [claude, agents, workspace];
}

function copyTree(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

/**
 * Copy a skill ROOT. The SKILL.md check is here and not inside copyTree (which
 * recurses into subdirectories that rightly have none): by the time this runs
 * the caller has already removed `dest`, so a source that is empty or lost its
 * files mid-run must fail loudly instead of writing an empty install. A copy
 * that fails part way takes its own partial directory with it, so a retry is
 * not blocked by half a skill.
 */
function copySkillTree(src: string, dest: string): void {
  if (!fs.existsSync(path.join(src, "SKILL.md"))) {
    throw new Error(`refusing to copy: ${src} has no SKILL.md`);
  }
  try {
    copyTree(src, dest);
  } catch (err) {
    fs.rmSync(dest, { recursive: true, force: true });
    throw err;
  }
}

/**
 * Is `dest` literally the same directory as `source`?
 *
 * This is the destructive case: removing `dest` to reinstall would remove the
 * very files being installed. A SYMLINK at `dest` is deliberately NOT "the
 * same directory" even when it resolves to `source`, because removing a link
 * unlinks the link and never touches its target (verified: fs.rmSync uses
 * lstat and does not follow). That keeps `--copy` able to turn an existing
 * link into a real copy, which is the whole point of asking for `--copy`.
 */
function isSameDirectory(dest: string, source: string): boolean {
  try {
    if (fs.lstatSync(dest).isSymbolicLink()) return false;
  } catch {
    return false; // dest missing
  }
  if (path.resolve(dest) === path.resolve(source)) return true;
  try {
    // Hard links, bind mounts, a case-insensitive filesystem, `/private` vs
    // `/tmp`: different spellings of one directory.
    return fs.realpathSync(dest) === fs.realpathSync(source);
  } catch {
    return false;
  }
}

/**
 * Is `dest` an install THIS command owns, and may therefore replace?
 *
 * A symlink is ours to repoint whatever it points at: an install dir holding a
 * link is a managed slot, and replacing a link destroys nothing. A real
 * directory has to prove it is a copy of THIS skill: `name: superx` in its
 * SKILL.md frontmatter AND the skills folder only this package ships. A
 * hand-written skill that merely happens to sit at `skills/superx` fails both
 * and is never touched.
 */
function isManagedInstall(dest: string): boolean {
  let stat;
  try {
    stat = fs.lstatSync(dest);
  } catch {
    return false;
  }
  if (stat.isSymbolicLink()) return true;
  if (!stat.isDirectory()) return false;

  if (!fs.existsSync(path.join(dest, "references", "skills", "categories.json"))) {
    return false;
  }
  let head: string;
  try {
    head = fs.readFileSync(path.join(dest, "SKILL.md"), "utf8").slice(0, 4096);
  } catch {
    return false;
  }
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(head);
  if (!frontmatter) return false;
  return new RegExp(`^name:\\s*${SKILL_NAME}\\s*$`, "m").test(frontmatter[1]);
}

function install(source: string, t: Target, copy: boolean): { action: string; error?: string } {
  let exists = true;
  try {
    fs.lstatSync(t.dest);
  } catch {
    exists = false;
  }

  // FIRST, before any check that could lead to a delete: installing a skill
  // over itself is a no-op, not a reinstall. `--project` run inside the
  // package's own checkout aims the workspace target straight at the source,
  // and a delete-then-copy there wipes the skill it was asked to install.
  if (exists && isSameDirectory(t.dest, source)) return { action: "unchanged" };

  if (exists) {
    if (!isManagedInstall(t.dest)) {
      return {
        action: "skipped",
        error: `${t.dest} already exists and is not a copy of this skill; move or remove it first, then run skills:install again`,
      };
    }
    if (!copy) {
      try {
        // Already linked at this package: leave it alone.
        if (fs.realpathSync(t.dest) === fs.realpathSync(source)) return { action: "unchanged" };
      } catch {
        // a broken link: fall through and replace it
      }
    }
    // Safe: dest is either a symlink (unlinked, target untouched) or a
    // directory proven to be a copy of this skill and not the source itself.
    fs.rmSync(t.dest, { recursive: true, force: true });
  }

  fs.mkdirSync(path.dirname(t.dest), { recursive: true });

  if (!copy) {
    try {
      fs.symlinkSync(source, t.dest, "dir");
      return { action: exists ? "relinked" : "linked" };
    } catch (err: any) {
      // Windows without developer mode, and some network filesystems, refuse
      // symlinks: copying is the documented fallback, not an error.
      note(`Symlink failed for ${t.dest} (${err?.code || err?.message}); copying instead.`);
    }
  }

  copySkillTree(source, t.dest);
  return { action: "copied" };
}

export async function skillsInstall(argv: {
  target?: string;
  project?: boolean;
  copy?: boolean;
}): Promise<void> {
  const source = packageSkillDir();
  if (!fs.existsSync(path.join(source, "SKILL.md"))) {
    note(`Error: no skill found at ${source}. Reinstall superx-cli.`);
    process.exit(1);
  }

  const targets = argv.project ? projectTargets(argv.target) : homeTargets(argv.target);
  const results = targets.map((t) => {
    let outcome: { action: string; error?: string };
    try {
      outcome = install(source, t, Boolean(argv.copy));
    } catch (err: any) {
      // One target failing must not hide the others' results, and must never
      // be reported as a success.
      outcome = { action: "failed", error: err?.message || String(err) };
    }
    if (outcome.error) note(`${t.label}: ${outcome.error}`);
    else note(`${t.label}: ${outcome.action} ${t.dest}`);
    return { target: t.label, path: t.dest, ...outcome };
  });

  const failed = results.filter((r) => r.error).length;
  printJson({
    data: {
      skill: SKILL_NAME,
      source,
      mode: argv.copy ? "copy" : "symlink",
      scope: argv.project ? "project" : "home",
      targets: results,
    },
    meta: { installed: results.length - failed, failed },
  });

  if (failed) process.exit(1);
}
