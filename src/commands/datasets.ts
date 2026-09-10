import fs from "fs";
import path from "path";
import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

/**
 * Datasets: the audience collections Ask SuperX builds in the app. Read-only
 * here (plus the one write that copies people into a contact list) — new
 * datasets are created in the app for now.
 */

export async function datasetsList(argv: {
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listDatasets({ limit: argv.limit, page: argv.page }));
}

export async function datasetsGet(argv: { id: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.getDataset(argv.id));
}

export async function datasetsRows(argv: {
  id: string;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.getDatasetRows(argv.id, { limit: argv.limit, page: argv.page })
  );
}

export async function datasetsExport(argv: {
  id: string;
  out?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  const { filename, text } = await api.exportDatasetCsv(argv.id);

  // `--out -` streams the CSV to stdout instead of writing a file, so it can
  // be piped. Everything else writes a file and prints the JSON receipt.
  if (argv.out === "-") {
    process.stdout.write(text);
    return;
  }

  // The default name comes from the server's Content-Disposition, so it is
  // reduced to a bare basename before it is joined to the cwd: a header can
  // never steer the write out of the current directory. `--out` is the user's
  // own path and is used as given.
  const target = argv.out
    ? argv.out
    : path.join(process.cwd(), path.basename(filename));
  fs.writeFileSync(target, text, "utf8");
  note(`Wrote ${target}`);
  printJson({ file: target, bytes: Buffer.byteLength(text, "utf8") });
}

export async function datasetsAddToList(argv: {
  id: string;
  listId: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { list_id: argv.listId };
  if (argv.account) body.account_id = argv.account;
  const api = new SuperXAPI(getConfig());
  printJson(await api.addDatasetToList(argv.id, body));
}

/**
 * Start a collection. A small one finishes inside the request; a big one
 * answers with a `collecting` dataset, which `--wait` then polls until it is
 * ready (or failed). Costs one of 10 collections a day, shared with the
 * collections Ask SuperX runs in the app.
 */
const WAIT_POLL_MS = 5000;
const WAIT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Poll one dataset until it stops collecting, printing the final read. Shared
 * by collect, research and refine, which all answer 202 for big jobs.
 * Returns true when it printed, false when the caller should print `started`.
 */
async function waitForDataset(api: SuperXAPI, started: any): Promise<boolean> {
  const datasetId = started?.data?.id;
  if (!datasetId || started?.data?.status !== "collecting") return false;

  note(`Running ${datasetId}; polling every ${WAIT_POLL_MS / 1000}s until it is ready.`);
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  let latest = started;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, WAIT_POLL_MS));
    latest = await api.getDataset(datasetId);
    if (latest?.data?.status !== "collecting") {
      printJson(latest);
      return true;
    }
  }
  note("Still running after 15 minutes; giving up on waiting (the job keeps going).");
  printJson(latest);
  return true;
}

export async function datasetsCollect(argv: {
  source: string;
  target?: string;
  title?: string;
  maxRows?: number;
  keywords?: string;
  bioKeywords?: string;
  minFollowers?: number;
  requireWebsite?: boolean;
  requireCanDm?: boolean;
  sinceDays?: number;
  sort?: string;
  account?: string;
  wait?: boolean;
}): Promise<void> {
  const splitList = (raw?: string) =>
    raw === undefined
      ? undefined
      : raw
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);

  const filters: Record<string, unknown> = {};
  const keywords = splitList(argv.keywords);
  if (keywords) filters.keywords = keywords;
  const bioKeywords = splitList(argv.bioKeywords);
  if (bioKeywords) filters.bio_keywords = bioKeywords;
  if (argv.minFollowers !== undefined) filters.min_followers = argv.minFollowers;
  if (argv.requireWebsite !== undefined) filters.require_website = argv.requireWebsite;
  if (argv.requireCanDm !== undefined) filters.require_can_dm = argv.requireCanDm;
  if (argv.sinceDays !== undefined) filters.since_days = argv.sinceDays;
  if (argv.sort !== undefined) filters.sort = argv.sort;

  const body: Record<string, unknown> = { source: argv.source };
  if (argv.target) body.target = argv.target;
  if (argv.title) body.title = argv.title;
  if (argv.maxRows !== undefined) body.max_rows = argv.maxRows;
  if (argv.account) body.account_id = argv.account;
  if (Object.keys(filters).length > 0) body.filters = filters;

  const api = new SuperXAPI(getConfig());
  const started = await api.createDataset(body);

  if (argv.wait && (await waitForDataset(api, started))) return;
  printJson(started);
}

/**
 * Research people into outreach briefs saved as a dataset. Exactly one
 * source: --handles, --list, --agent or --dataset. More than 5 profiles run
 * in the background, which `--wait` polls. Costs 1 credit per profile
 * actually researched.
 */
export async function datasetsResearch(argv: {
  handles?: string;
  list?: string;
  agent?: number;
  dataset?: string;
  max?: number;
  focus?: string;
  title?: string;
  account?: string;
  wait?: boolean;
}): Promise<void> {
  const body: Record<string, unknown> = { source: "research" };
  if (argv.handles !== undefined) {
    body.handles = argv.handles
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
  }
  if (argv.list) body.list_id = argv.list;
  if (argv.agent !== undefined) body.agent_id = argv.agent;
  if (argv.dataset) body.dataset_id = argv.dataset;
  if (argv.max !== undefined) body.max_rows = argv.max;
  if (argv.focus) body.focus = argv.focus;
  if (argv.title) body.title = argv.title;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  const started = await api.createDataset(body);

  if (argv.wait && (await waitForDataset(api, started))) return;
  printJson(started);
}

/**
 * Write one personalized message per person in a research dataset. The
 * drafts are TEXT: they are stored on the dataset and a person sends them
 * from the SuperX app. Nothing here sends a DM.
 */
export async function datasetsOutreachDrafts(argv: {
  id: string;
  format: string;
  instructions?: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { format: argv.format };
  if (argv.instructions) body.instructions = argv.instructions;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.draftOutreachDms(argv.id, body));
}

/**
 * Filter a dataset by what each person wrote into a NEW dataset. The source
 * is untouched. Big refinements run in the background, which `--wait` polls.
 */
export async function datasetsRefine(argv: {
  id: string;
  criterion: string;
  keep?: boolean;
  sort?: string;
  limit?: number;
  title?: string;
  account?: string;
  wait?: boolean;
}): Promise<void> {
  const body: Record<string, unknown> = { criterion: argv.criterion };
  // yargs boolean: only sent when the flag was actually given.
  if (argv.keep !== undefined) body.keep_matching = argv.keep;
  if (argv.sort) body.sort_by = argv.sort;
  if (argv.limit !== undefined) body.limit = argv.limit;
  if (argv.title) body.title = argv.title;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  const started = await api.refineDataset(argv.id, body);

  if (argv.wait && (await waitForDataset(api, started))) return;
  printJson(started);
}
