import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

export async function workersList(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listWorkers({ account_id: argv.account }));
}

export async function workersSuggestions(argv: {
  account?: string;
  status?: string;
  worker?: number;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listWorkerSuggestions({
      account_id: argv.account,
      status: argv.status,
      worker_id: argv.worker,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function workersDraft(argv: { id: number; account?: string }): Promise<void> {
  const body: Record<string, unknown> = {};
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.draftWorkerSuggestion(argv.id, body));
}

export async function workersSchedule(argv: {
  id: number;
  at?: string;
  account?: string;
}): Promise<void> {
  if (typeof argv.at !== "string" || argv.at.length === 0) {
    note("--at is required: the UTC ISO-8601 time to post, for example 2026-09-15T14:00:00Z.");
    process.exit(1);
    return;
  }
  const body: Record<string, unknown> = { scheduled_for: argv.at };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.scheduleWorkerSuggestion(argv.id, body));
}

export async function workersDismiss(argv: { id: number; account?: string }): Promise<void> {
  const body: Record<string, unknown> = {};
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.dismissWorkerSuggestion(argv.id, body));
}
