import { SuperXAPI, printJson, note } from "../api";
import { getConfig } from "../config";

/**
 * The composer tools: text in, text out. None of these posts, schedules or
 * sends anything, and each one costs a small measured number of AI credits.
 */

export async function toolsInlineEdit(argv: {
  text: string;
  full?: string;
  instruction?: string;
  type?: string;
  account?: string;
}): Promise<void> {
  if (!argv.instruction && !argv.type) {
    note("Provide --instruction \"...\" or --type <preset> (or both).");
    process.exit(1);
  }
  const body: Record<string, unknown> = { text: argv.text };
  if (argv.full) body.full_text = argv.full;
  if (argv.instruction) body.instruction = argv.instruction;
  if (argv.type) body.edit_type = argv.type;
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.inlineEdit(body));
}

export async function toolsRephrase(argv: {
  type: string;
  text: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { type: argv.type, text: argv.text };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.rephrase(body));
}

export async function toolsFactcheck(argv: {
  text: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { text: argv.text };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.factCheck(body));
}

export async function toolsPredict(argv: {
  a: string;
  b: string;
  account?: string;
}): Promise<void> {
  const body: Record<string, unknown> = { version_a: argv.a, version_b: argv.b };
  if (argv.account) body.account_id = argv.account;

  const api = new SuperXAPI(getConfig());
  printJson(await api.predictAlgorithm(body));
}
