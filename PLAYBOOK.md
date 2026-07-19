# SuperX Growth Playbook

Strategy reference for agents creating Twitter/X content with the `superx` CLI. Read this before drafting or scheduling anything. Each section notes which commands supply the data.

## 1. The mental model: discovery beats followers

Most growth on X now comes from the For You feed showing posts to people who do not follow the account. The feed is ML-ranked: each post is scored independently on the actions it is predicted to trigger (reply, repost, profile visit, dwell) minus predicted negatives (mute, block, "not interested"). Consequences:

- Every post is judged on its own; follower count matters less than the actions a post triggers.
- Niche consistency matters: the system needs to learn who a post is for. Keep the account inside 1 or 2 clear topic clusters.
- Posting many times in a short window quietly reduces reach (the ranker attenuates repeated authors). Prefer one strong post per day at a peak time over volume.

Data: `superx posts:analytics` shows whether reach is trending; `superx posts:list --sort impressions` shows which topics escape the follower base.

## 2. The action hierarchy: what to optimize for

Not all engagement is equal. Rough value order, highest first:

1. **Replies and reply chains**: the strongest signal by far. A post that starts conversations beats a post that collects likes.
2. **Reposts and quotes**: distribution signals that push a post outside the follower graph.
3. **Profile visits and follows**: posts that make a stranger curious about the author.
4. **Likes**: baseline. A like-only strategy underperforms.
5. **Negatives** (mute, block, "not interested"): actively suppress reach. Avoid bait, rage, and off-topic posts.

Before scheduling, self-check every draft: would a stranger reply, share, or click the profile after reading? If the honest answer is "they would like it and move on", rework it. Invite replies with a question or a bold, specific claim. Explicit "repost if you agree" phrasing reads as spam now; earn the share with usefulness instead.

Data: `superx posts:list --sort likes` plus reading `metrics.replies` vs `metrics.likes` per post shows which of the account's posts trigger the valuable actions.

## 3. Out-of-network discovery

A good post can go from a handful of follower likes to thousands of stranger views, but only if it is built for it:

- Write for the share: useful, funny, or insightful enough that a follower sends it onward.
- Reply early under larger accounts in the niche with something additive (a fact, a sharp take, a smart follow-up). Never "great post" filler.
- Time the first window: schedule the best post of the day for when the audience is active, then protect the first 30 to 60 minutes by replying to every response fast. Early engagement compounds.

Actions: `superx scheduled:create --at` for peak-time scheduling; `superx replies:list` to confirm the account is actually participating in conversations, not just broadcasting.

## 4. The engagement loop (3-3-3)

Consistent, targeted interaction grows accounts faster than posting alone:

- Maintain a small circle of roughly 3 accounts at ~1k followers (peers), 3 at ~10k (communities), and 3 at ~100k+ (top of funnel). Reply early and add value.
- Reply back to everyone who replies to you. Reply chains are among the strongest ranking signals, and people who feel seen come back.
- After a genuine back-and-forth, a soft pointer to related content on the profile is fine. Self-promo inside someone else's thread is not.
- Budget: about 20 minutes outbound and 20 minutes inbound daily.

Data: `superx contacts:list --sort engagement` identifies who already engages most (reply to them first); `superx contacts:replies <id>` shows the history with one person so replies can be specific. For the inbound block, `superx replies:received --sort recent` lists every reply the audience has sent across all posts, so nothing goes unanswered. Keep the 3-3-3 circle in a contact list (`superx lists:list`, `lists:add-member`) so the daily targets survive between sessions. If the account runs signal agents, `superx signals:leads` surfaces fresh people matching the ideal customer profile, with the post that revealed them; engage while the discovery is recent. No agent yet? `superx signals:create-agent --name ... --icp ...` sets one up from a plain-language customer description (keywords auto-suggested when omitted); leads accumulate over the following days, so create it early in the week and harvest with `signals:leads` later.

## 5. The research system

Reverse-engineer what wins instead of guessing:

- Judge accounts by engagement-to-follower ratio, not size.
- For the account itself: pull the top posts of the last 30 to 60 days and write down the pattern behind each winner (topic, hook type, format, what action it triggered).
- Extract structures, hooks, and angles. Never copy content.

Data: `superx posts:list --sort likes --since <60d ago>` and `--sort impressions` are the core research queries. Compare winners against `superx posts:analytics` for the follower effect. For patterns beyond the account's own history, `superx inspiration:search "<topic>" --sort outlier` pulls proven high-performers on the topic from a 50M+ post library; study their structures and hooks before drafting.

## 6. Weekly operating system

A sustainable weekly loop an agent can run:

1. Confirm the 1-2 topic clusters for the week; every post should fit one.
2. Pull last week's winners (`posts:list --sort likes --since ...`) and note why each worked.
3. Plan roughly 7 posts for the week; draft them (`scheduled:create` without `--at`, with a `--title` naming the angle and a `--tag` for the week's cluster so the human can scan the batch), review, then promote the best 3 to peak times (`scheduled:update <id> --at ... --status scheduled`).
4. Include one format experiment per week (a thread via `--part`, a longer post, or a long-form X Article via `articles:create` when a topic deserves depth: draft it, add a cover with `articles:cover`, and let the human review before `articles:publish`) so format reach is never left untested.
5. Refresh the 3-3-3 circle (`contacts:list`) and do the daily reply blocks.
6. End of week: `posts:analytics` for the trend, top 3 posts by meaningful actions, one failure mode to fix with a rule (for example "no link-drop posts", "never ghost early replies").
7. Repurpose one winner into two new assets for next week (tighter version, thread expansion, follow-up take).

Verify state with `superx scheduled:list --status draft,scheduled` after every planning pass.

## 7. Failure modes that kill reach

- **Inconsistency**: long gaps make the system re-learn the account. Sustainable cadence beats bursts.
- **Engagement bait**: obvious bait, bought engagement, and spam replies backfire.
- **Broadcast-only behavior**: never replying caps growth. The ranker rewards participants.
- **Link-heavy posting and constant self-promo**: keep roughly 80% pure value, 20% gentle promotion. Make the link an optional next step, not the point.
- **Rage and pile-ons**: strong positions that invite discussion are good; content that harvests blocks and mutes is throttled.
- **Off-cluster posting**: random topics confuse the system about who to show the account to.
- **Quitting early**: growth tends to be slow and then compounding. Hold the routine.

## 8. Hard boundaries for agents

- Drafts first when confidence is low; a human (or a later `scheduled:update --status scheduled`) can promote a draft after review. Use `--scratchpad` to leave the reasoning behind a draft where the human will see it.
- Never fabricate metrics, quotes, or claims in content. Use real data from the CLI or say nothing.
- Respect the write constraints: main account only, images only via `media:upload` (no video), UTC timestamps with explicit offset (see SKILL.md Rule 3).
- Quality over volume, always. One post a stranger would reply to beats five posts nobody finishes reading.
