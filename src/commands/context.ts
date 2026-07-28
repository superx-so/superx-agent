import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

/**
 * Context settings commands — the SuperX Context page over the API: profile
 * description, interests, SuperX rules, reply settings, favorite creators,
 * style-guide overrides and products.
 *
 * Flag conventions (context:set):
 *  - string flags: pass "" (empty string) to clear the value; style-guide
 *    overrides then revert to the generated guide.
 *  - boolean flags support --no-* negation.
 *  - comma-list flags (--interests, --favorite-creators) fully REPLACE the
 *    stored list; pass "" to clear it.
 */

export async function contextGet(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.getContext({ account_id: argv.account }));
}

/** Split a comma-list flag; "" (explicit clear) becomes []. */
function commaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Map a string flag to the API value: "" clears (null), else the string. */
function stringOrClear(value: string): string | null {
  return value === "" ? null : value;
}

export async function contextSet(argv: {
  account?: string;
  "profile-description"?: string;
  "profile-description-enabled"?: boolean;
  interests?: string;
  rules?: string;
  "reply-rules"?: string;
  "reply-author-name"?: boolean;
  "favorite-creators"?: string;
  "own-posts-as-examples"?: boolean;
  "style-audience"?: string;
  "style-vocabulary"?: string;
}): Promise<void> {
  const body: Record<string, any> = {};

  const profileDescription: Record<string, any> = {};
  if (argv["profile-description"] !== undefined) {
    profileDescription.text = stringOrClear(argv["profile-description"]);
  }
  if (typeof argv["profile-description-enabled"] === "boolean") {
    profileDescription.enabled = argv["profile-description-enabled"];
  }
  if (Object.keys(profileDescription).length > 0) {
    body.profile_description = profileDescription;
  }

  if (argv.interests !== undefined) {
    body.interests = commaList(argv.interests);
  }
  if (argv.rules !== undefined) {
    body.rules = stringOrClear(argv.rules);
  }

  const reply: Record<string, any> = {};
  if (argv["reply-rules"] !== undefined) {
    reply.custom_instructions = stringOrClear(argv["reply-rules"]);
  }
  if (typeof argv["reply-author-name"] === "boolean") {
    reply.include_author_name = argv["reply-author-name"];
  }
  if (Object.keys(reply).length > 0) {
    body.reply = reply;
  }

  const voice: Record<string, any> = {};
  if (argv["favorite-creators"] !== undefined) {
    voice.favorite_creators = commaList(argv["favorite-creators"]);
  }
  if (typeof argv["own-posts-as-examples"] === "boolean") {
    voice.use_own_posts_as_examples = argv["own-posts-as-examples"];
  }
  if (Object.keys(voice).length > 0) {
    body.voice = voice;
  }

  const styleGuide: Record<string, any> = {};
  if (argv["style-audience"] !== undefined) {
    styleGuide.audience_override = stringOrClear(argv["style-audience"]);
  }
  if (argv["style-vocabulary"] !== undefined) {
    styleGuide.vocabulary_override = stringOrClear(argv["style-vocabulary"]);
  }
  if (Object.keys(styleGuide).length > 0) {
    body.style_guide = styleGuide;
  }

  if (Object.keys(body).length === 0) {
    note("Provide at least one setting flag. Run: superx context:set --help");
    process.exit(1);
  }

  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.updateContext(body));
}

export async function contextProducts(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  const json = await api.getContext({ account_id: argv.account });
  printJson({ data: json?.data?.products ?? [] });
}

export async function contextProductsSet(argv: {
  account?: string;
  id?: string;
  url?: string;
  name?: string;
  description?: string;
  positioning?: string;
  features?: string;
  updates?: string;
}): Promise<void> {
  if (!argv.id && !argv.url) {
    note("Provide --id (from context:products) to edit, or --url to add or edit by url.");
    process.exit(1);
  }
  if (argv.id && argv.url) {
    note("Use either --id or --url, not both.");
    process.exit(1);
  }

  const body: Record<string, any> = {};
  if (argv.name !== undefined) body.name = stringOrClear(argv.name);
  if (argv.description !== undefined) body.description = stringOrClear(argv.description);
  if (argv.positioning !== undefined) body.positioning = stringOrClear(argv.positioning);
  if (argv.features !== undefined) body.features = stringOrClear(argv.features);
  if (argv.updates !== undefined) body.updates = stringOrClear(argv.updates);
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.updateContextProduct(argv.id || (argv.url as string), body));
}

export async function contextProductsDelete(argv: {
  id?: string;
  account?: string;
}): Promise<void> {
  const id = String(argv.id || "").trim();
  if (!id) {
    note("Provide the product id. Run: superx context:products:delete --help");
    process.exit(1);
  }
  const api = new SuperXAPI(getConfig());
  printJson(await api.deleteContextProduct(id, { account_id: argv.account }));
}
