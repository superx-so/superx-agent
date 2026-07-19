# Changelog

## Unreleased (joins 0.1.0)

- Media: `media:upload <file>` uploads a local image (JPG/PNG/WEBP 5MB, GIF 15MB) and prints its `object_key`; `scheduled:create`/`scheduled:update` gain `--media` (comma list of keys), `--alt-text` (single key), and `--parts-json` for threads with per-part media. Text replacement on update is a full replace, media included
- Signal agent writes: `signals:create-agent` (--name, --icp, repeatable --keyword, --precision, --list-id, --idempotency-key with replay detection), `signals:pause-agent <id>`, `signals:resume-agent <id>`, `signals:delete-agent <id>`

## 0.1.0 (2026-07-06)

Initial release.

- `superx login` / `logout` / `status` with guided API key setup and credentials stored in `~/.superx/credentials.json`
- Read commands: `me`, `accounts`, `posts:list`, `posts:analytics`, `replies:list`, `contacts:list`, `contacts:replies`
- Scheduling: `scheduled:list`, `scheduled:create` (drafts, scheduled posts, and threads with `--part`), `scheduled:delete`
- `docs` prints the API quickstart as markdown
- Clean JSON on stdout for every data command; human messages go to stderr
- Idempotency-Key support on `scheduled:create` with replay detection
- Agent skill (`SKILL.md`) and growth strategy guide (`PLAYBOOK.md`)

Maintainer note: `SKILL.md` and `skills/superx/SKILL.md` must stay byte-identical. Edit the root file, then copy it over the nested one.
