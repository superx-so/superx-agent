import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

export async function listsList(argv: { account?: string }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.listContactLists({ account_id: argv.account }));
}

export async function listsMembers(argv: {
  id: string;
  account?: string;
  q?: string;
  limit?: number;
  page?: number;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.listListMembers(argv.id, {
      account_id: argv.account,
      q: argv.q,
      limit: argv.limit,
      page: argv.page,
    })
  );
}

export async function listsAddMember(argv: {
  id: string;
  handle?: string;
  xUserId?: string;
}): Promise<void> {
  if ((argv.handle && argv.xUserId) || (!argv.handle && !argv.xUserId)) {
    throw new Error("Provide exactly one of --handle or --x-user-id.");
  }
  const api = new SuperXAPI(getConfig());
  const body = argv.handle
    ? { handle: argv.handle }
    : { x_user_id: argv.xUserId };
  printJson(await api.addListMember(argv.id, body));
}

export async function listsRemoveMember(argv: {
  id: string;
  memberId: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  // The API returns 204 with no body; print a stable JSON confirmation so
  // stdout stays jq-clean.
  await api.removeListMember(argv.id, argv.memberId);
  printJson({ data: { id: argv.memberId, removed: true } });
}

export async function listsCreate(argv: {
  name: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { name: argv.name };
  if (argv.account) body.account_id = argv.account;
  const api = new SuperXAPI(getConfig());
  printJson(await api.createList(body));
}

export async function listsRename(argv: {
  id: string;
  name: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { name: argv.name };
  if (argv.account) body.account_id = argv.account;
  const api = new SuperXAPI(getConfig());
  printJson(await api.renameList(argv.id, body));
}

export async function listsDelete(argv: {
  id: string;
  account?: string;
}): Promise<void> {
  const api = new SuperXAPI(getConfig());
  // The API returns 204 with no body; print a stable JSON confirmation so
  // stdout stays jq-clean.
  await api.deleteList(argv.id, { account_id: argv.account });
  printJson({ data: { id: argv.id, deleted: true } });
}

/** Split a comma-list flag into non-empty trimmed values. */
function commaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function listsAddMembers(argv: {
  id: string;
  xUserIds: string;
  account?: string;
}): Promise<void> {
  const ids = commaList(argv.xUserIds || "");
  if (ids.length === 0) {
    note("Provide at least one id: --x-user-ids 44196397,1234567890");
    process.exit(1);
  }
  const body: Record<string, unknown> = { x_user_ids: ids };
  if (argv.account) body.account_id = argv.account;
  const api = new SuperXAPI(getConfig());
  printJson(await api.addListMembers(argv.id, body));
}

export async function listsRemoveMembers(argv: {
  id: string;
  memberIds: string;
  account?: string;
}): Promise<void> {
  const ids = commaList(argv.memberIds || "");
  if (ids.length === 0) {
    note("Provide at least one id: --member-ids abc123,def456");
    process.exit(1);
  }
  const body: Record<string, unknown> = { member_ids: ids };
  if (argv.account) body.account_id = argv.account;
  const api = new SuperXAPI(getConfig());
  printJson(await api.removeListMembers(argv.id, body));
}
