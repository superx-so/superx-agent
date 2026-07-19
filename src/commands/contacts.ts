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
