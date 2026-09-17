# SuperX Skills

A goal-shaped recipe for every SuperX skill. Each is the same job the
in-app skill of that name does, run from the CLI or from the hosted MCP server.
Pick by goal, run the chain in order, hand the result to the person.

Three rules hold in every skill, no exceptions:

1. **Drafts unless the person says otherwise.** `scheduled:create` without `--at` is a draft and nothing publishes.
2. **Nothing here sends a reply or a DM.** Reply drafts are text a person posts. `dm:campaign` enqueues; the SuperX app sends.
3. **`posts:publish` and `articles:publish` are immediate and irreversible.** Confirm the exact text with the person first, and note that `posts:publish` REQUIRES `--idempotency-key` so a retry cannot post twice.

`--account <account-id>` acts on a linked account (`superx accounts` lists the
ids). It is shown once, in Weekly Growth Recap, and applies the same way to the
**account-scoped** commands: the posts, scheduled, replies, contacts, lists,
engage, signals, dm, context, queue and articles families, plus the dataset
commands that WRITE for an account (`datasets:collect`, `datasets:refine`,
`datasets:research`, `datasets:outreach-drafts`, `datasets:add-to-list`).

Some commands are **owner-scoped** and the CLI is strict, so passing `--account`
to one is an error, not a no-op. Nothing about them is per-X-account: the live
lookups `x:post`, `x:replies`, `x:user` and `x:user-posts`, the inspiration
searches `inspiration:search` and `inspiration:media`, and the dataset reads
`datasets:list`, `datasets:get`, `datasets:rows` and `datasets:export`. A few
id-addressed subcommands inside the account families are owner-scoped for the
same reason (the id already names the account), among them `articles:publish`,
`scheduled:delete` and `lists:remove-member`. When a chain here does not show
`--account`, that is deliberate; `superx <command> --help` is the check.

Accounts other people shared with you are read-only. Ids in angle brackets are
placeholders you fill from the previous step's JSON.
