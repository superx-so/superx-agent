import { SuperXAPI, printJson } from "../api";
import { getConfig } from "../config";

export async function contactsList(argv: {
  account?: string;
  sort?: string;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listContacts({
      account_id: argv.account,
      sort: argv.sort,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function contactsReplies(argv: {
  id: string;
  account?: string;
  sort?: string;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.contactReplies(argv.id, {
      account_id: argv.account,
      sort: argv.sort,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function contactsGet(argv: {
  id: string;
  account?: string;
  refresh?: boolean;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.getContact(argv.id, {
      account_id: argv.account,
      // Only send the flag when asked: the default read is cache-only and
      // costs no enrichment.
      refresh: argv.refresh ? "true" : undefined,
    })
  );
}

export async function contactsNotes(argv: {
  id: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listContactNotes(argv.id, { account_id: argv.account }));
}

export async function contactsNotesAdd(argv: {
  id: string;
  body: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { body: argv.body };
  if (argv.account) body.account_id = argv.account;
  const api = new SuperXAPI(getConfig());
  printJson(await api.addContactNote(argv.id, body));
}

export async function contactsNotesUpdate(argv: {
  id: string;
  noteId: string;
  body: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { body: argv.body };
  if (argv.account) body.account_id = argv.account;
  const api = new SuperXAPI(getConfig());
  printJson(await api.updateContactNote(argv.id, argv.noteId, body));
}

export async function contactsNotesDelete(argv: {
  id: string;
  noteId: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  // The API returns 204 with no body; print a stable JSON confirmation so
  // stdout stays jq-clean.
  await api.deleteContactNote(argv.id, argv.noteId, { account_id: argv.account });
  printJson({ data: { id: argv.noteId, deleted: true } });
}
