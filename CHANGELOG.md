# Changelog

## Unreleased

- Inspiration search relevance: `inspiration:search` results are now relevance-ranked, strongest matches first and more loosely related posts after. BEHAVIOR CHANGE: results are no longer a fresh varied mix on every run, and weak and promotional matches are filtered out, so a page can return fewer posts than `--limit`; `has_more` no longer requires a full page, so keep paging with `--page` while it is true (pages run 1 to 7). `--sort relevant` is still the default and is the relevance-ranked order

## 0.2.0 (2026-08-01)

- Advanced post settings: `scheduled:create`/`scheduled:update` gain `--auto-retweet <h>` / `--auto-retweet-remove <h>` (1-12), `--auto-delete <h>` / `--auto-delete-threshold <views>`, `--auto-plug <templateId>` / `--auto-plug-threshold <likes>`, `--super-followers`, plus `--no-*` disable forms; new `plug-templates:list` command. BEHAVIOR CHANGE: posts created via the API now inherit the account's Default Post Settings (auto retweet, auto delete, auto plug, auto DM, Super Followers only) when the matching flags are omitted, exactly like posts composed in the app; previously API posts got no advanced settings at all. Auto DM stays inherit-only (no flag) and surfaces `auto_dm_skipped: true` when a plan limit strips it
- Media: `media:upload <file>` uploads a local image (JPG/PNG/WEBP 5MB, GIF 15MB) and prints its `object_key`; `scheduled:create`/`scheduled:update` gain `--media` (comma list of keys), `--alt-text` (single key), and `--parts-json` for threads with per-part media. Text replacement on update is a full replace, media included
- Signal agent writes: `signals:create-agent` (--name, --icp, repeatable --keyword, --precision, --list-id, --idempotency-key with replay detection), `signals:pause-agent <id>`, `signals:resume-agent <id>`, `signals:delete-agent <id>`
- Context settings: `context:get` (the account's AI writing background: profile description, interests, SuperX rules, reply settings, favorite creators, style guide, products), `context:set` (present flags only change; `""` clears a string; `--interests`/`--favorite-creators` comma lists fully replace; boolean flags support `--no-*`), `context:products`, `context:products:set` (upsert by `--url` or edit by `--id`), `context:products:delete <id>`
- Queue settings: `queue:get` (the account's posting schedule: predefined time slots and their timezone) and `queue:set` (`--slots-json` full replace, max 50, 0 = Sunday, `'[]'` clears; `--timezone` IANA name). Changing the slots also re-flows queued posts onto them the way the app does, reported as `reflow: { moved, skipped, bailed }`; a timezone-only change never moves posts
- Shared accounts: `accounts` now lists accounts shared with you (manual and team shares) alongside your own, each with `shared` and `permission`. `--account` accepts them everywhere, and `context:*` / `queue:set` can write to them. A share with Editor permission can change queue settings but gets 403 `editor_restricted` on context writes

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
