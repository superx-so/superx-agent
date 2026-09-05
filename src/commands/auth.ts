import * as readline from "readline";
import { SuperXAPI, printJson, note } from "../api";
import {
  CREDENTIALS_PATH,
  deleteCredentials,
  getConfig,
  loadCredentials,
  resolveApiUrl,
  saveCredentials,
} from "../config";

function promptForKey(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr, // keep the prompt off stdout
    });
    rl.question("Paste your API key (sxk_...): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function login(argv: { key?: string }): Promise<void> {
  const apiUrl = resolveApiUrl(loadCredentials()?.apiUrl);

  let key = (argv.key || "").trim();
  if (!key) {
    note("Create or copy an API key at:");
    note("  https://app.superx.so/account?tab=api");
    note("");
    key = await promptForKey();
  }
  if (!key) {
    note("No API key provided.");
    process.exit(1);
  }
  if (!key.startsWith("sxk_")) {
    note("That does not look like a SuperX API key (expected an sxk_ prefix).");
    process.exit(1);
  }

  // Validate before saving anything.
  const api = new SuperXAPI({ apiKey: key, apiUrl });
  const me = await api.me();

  saveCredentials({ apiKey: key, apiUrl });
  note(`Logged in as ${me?.data?.owner?.name || me?.data?.owner?.id || "unknown"}.`);
  note(`Credentials saved to ${CREDENTIALS_PATH}`);
  printJson(me);
}

export async function logout(): Promise<void> {
  const removed = deleteCredentials();
  note(removed ? `Removed ${CREDENTIALS_PATH}` : "No credentials file found; nothing to remove.");
  printJson({ logged_out: true, credentials_removed: removed });
}

export async function status(): Promise<void> {
  const config = getConfig();
  const api = new SuperXAPI(config);
  const me = await api.me();
  printJson({
    authenticated: true,
    auth_source: config.source,
    api_url: config.apiUrl,
    owner: me?.data?.owner ?? null,
    plan: me?.data?.plan ?? null,
    credits: me?.data?.credits ?? null,
    key: me?.data?.key ?? null,
    rate_limit: api.lastRateLimit,
  });
}
