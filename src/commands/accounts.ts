import { SuperXAPI, printJson } from "../api";
import { getConfig } from "../config";

export async function me(): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.me());
}

export async function accounts(argv: { limit?: number; page?: number }): Promise<void> {
  const api = new SuperXAPI(getConfig());
  printJson(await api.accounts({ limit: argv.limit, page: argv.page }));
}
