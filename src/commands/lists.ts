import { SuperXAPI, printJson } from "../api";
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
