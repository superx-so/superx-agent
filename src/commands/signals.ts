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
