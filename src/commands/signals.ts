import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

export async function signalsAgents(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listSignalAgents({ account_id: argv.account }));
}

export async function signalsLeads(argv: {
  account?: string;
  agent?: number;
  deposited?: boolean;
  since?: string;
  until?: string;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listSignalLeads({
      account_id: argv.account,
      agent_id: argv.agent,
      // yargs boolean: pass through only when the flag was given.
      deposited: argv.deposited === undefined ? undefined : String(argv.deposited),
      since: argv.since,
      until: argv.until,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function signalsCreateAgent(argv: {
  name: string;
  icp: string;
  precision?: string;
  "list-id"?: string;
  keyword?: string[];
  signal?: string[];
  "idempotency-key"?: string;
}): Promise<void> {
  const body: Record<string, unknown> = {
    name: argv.name,
    icp_description: argv.icp,
  };
  if (argv.precision) body.precision_mode = argv.precision;
  if (argv["list-id"]) body.destination_list_id = argv["list-id"];
  const keywords = (argv.keyword || []).filter((k) => typeof k === "string" && k.length > 0);
  if (keywords.length > 0) body.keywords = keywords;
  const specs = (argv.signal || []).filter((s) => typeof s === "string" && s.length > 0);
  if (specs.length > 0) body.signals = specs.map(parseSignalSpec);

  const api = new SuperXAPI(getConfig());
  const { json, replayed } = await api.createSignalAgent(body, argv["idempotency-key"]);

  if (replayed) {
    note("Idempotency replay: this Idempotency-Key was already processed; returning the original response.");
    printJson({ ...json, replayed: true });
    return;
  }
  printJson(json);
}

export async function signalsPauseAgent(argv: { id: number }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.setSignalAgentStatus(argv.id, "paused"));
}

export async function signalsResumeAgent(argv: { id: number }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.setSignalAgentStatus(argv.id, "active"));
}

export async function signalsDeleteAgent(argv: { id: number }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.deleteSignalAgent(argv.id));
}

/**
 * Parse a --signal value: "type:target", where type is one of the four
 * signal types (or a short alias) and target is the query, handle or list.
 * The target may itself contain colons (an x.com list URL does), so only the
 * FIRST colon splits.
 */
const SIGNAL_TYPE_ALIASES: Record<string, string> = {
  keyword: "keyword_watch",
  keyword_watch: "keyword_watch",
  profile: "profile_watch",
  profile_watch: "profile_watch",
  follower: "follower_watch",
  follower_watch: "follower_watch",
  list: "list_watch",
  list_watch: "list_watch",
};

function parseSignalSpec(spec: string): Record<string, unknown> {
  const at = spec.indexOf(":");
  const rawType = at === -1 ? "" : spec.slice(0, at).trim().toLowerCase();
  const target = at === -1 ? "" : spec.slice(at + 1).trim();
  const type = SIGNAL_TYPE_ALIASES[rawType];
  if (!type || !target) {
    note(
      `Could not read --signal "${spec}". Use type:target, for example keyword:"just shipped my MVP", profile:@naval, follower:@naval or list:https://x.com/i/lists/123.`
    );
    process.exit(1);
  }
  if (type === "keyword_watch") return { type, query: target };
  if (type === "list_watch") return { type, list: target };
  return { type, handle: target };
}

export async function signalsUpdateAgent(argv: {
  id: number;
  name?: string;
  icp?: string;
  precision?: string;
  "list-id"?: string;
  status?: string;
}): Promise<void> {
  const body: Record<string, unknown> = {};
  if (argv.name !== undefined) body.name = argv.name;
  if (argv.icp !== undefined) body.icp_description = argv.icp;
  if (argv.precision !== undefined) body.precision_mode = argv.precision;
  if (argv["list-id"] !== undefined) body.destination_list_id = argv["list-id"];
  if (argv.status !== undefined) body.status = argv.status;

  if (Object.keys(body).length === 0) {
    note("Provide at least one of: --name, --icp, --precision, --list-id, --status.");
    process.exit(1);
  }

  const api = new SuperXAPI(getConfig());
  printJson(await api.updateSignalAgent(argv.id, body));
}

export async function signalsAddSignal(argv: {
  id: number;
  type?: string;
  query?: string;
  handle?: string;
  list?: string;
  account?: string;
}): Promise<void> {
  const type = SIGNAL_TYPE_ALIASES[String(argv.type || "").toLowerCase()];
  if (!type) {
    note("--type must be one of: keyword_watch, profile_watch, follower_watch, list_watch.");
    process.exit(1);
  }
  const body: Record<string, unknown> = { type };
  if (argv.query !== undefined) body.query = argv.query;
  if (argv.handle !== undefined) body.handle = argv.handle;
  if (argv.list !== undefined) body.list = argv.list;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.addSignalAgentSignal(argv.id, body));
}

export async function signalsRemoveSignal(argv: {
  id: number;
  signalId: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  await api.removeSignalAgentSignal(argv.id, argv.signalId);
  printJson({ agent_id: argv.id, signal_id: argv.signalId, deleted: true });
}

export async function signalsFeedback(argv: {
  leadId: number;
  fit?: boolean;
  "not-fit"?: boolean;
  clear?: boolean;
  account?: string;
}): Promise<void> {
  const chosen = [argv.fit, argv["not-fit"], argv.clear].filter(Boolean);
  if (chosen.length !== 1) {
    note("Pass exactly one of --fit, --not-fit or --clear.");
    process.exit(1);
  }
  const feedback = argv.fit ? "fit" : argv["not-fit"] ? "not_fit" : null;
  const body: Record<string, unknown> = { feedback };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.setLeadFeedback(argv.leadId, body));
}
