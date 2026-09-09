import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

/**
 * Audience: the four system people-lists SuperX keeps for an account
 * (followers, following, repliers, reposters). `lists:members` does not
 * serve these — they live in SuperX's own audience store — so this is where
 * they are read.
 *
 * Paging is by CURSOR, not page number: take `pagination.next_cursor` from
 * one call and pass it as `--cursor` to the next.
 */

const KINDS = ["followers", "following", "repliers", "reposters"];

export async function audienceList(argv: {
  kind: string;
  account?: string;
  cursor?: string;
  limit?: number;
}): Promise<void> {
  const kind = String(argv.kind || "").trim();
  if (!KINDS.includes(kind)) {
    note(`kind must be one of: ${KINDS.join(", ")}`);
    process.exit(1);
  }
  const api = new SuperXAPI(getConfig());
  printJson(
    await api.getAudience(kind, {
      account_id: argv.account,
      cursor: argv.cursor,
      limit: argv.limit,
    })
  );
}
