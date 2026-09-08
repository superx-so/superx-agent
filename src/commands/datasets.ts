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
