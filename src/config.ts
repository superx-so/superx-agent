import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const DEFAULT_API_URL = "https://api.superx.so/v1";

export const CONFIG_DIR = path.join(os.homedir(), ".superx");
export const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");

export interface Credentials {
  apiKey: string;
  apiUrl: string;
}

export interface ResolvedConfig {
  apiKey: string;
  apiUrl: string;
  source: "credentials_file" | "env";
}

/** Read ~/.superx/credentials.json. Returns null if absent or unreadable. */
export function loadCredentials(): Credentials | null {
  try {
    const raw = fs.readFileSync(CREDENTIALS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.apiKey === "string" && parsed.apiKey) {
      return {
        apiKey: parsed.apiKey,
        apiUrl: typeof parsed.apiUrl === "string" && parsed.apiUrl ? parsed.apiUrl : DEFAULT_API_URL,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Write credentials with restrictive permissions (dir 0700, file 0600). */
export function saveCredentials(creds: Credentials): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2) + "\n", { mode: 0o600 });
  // mkdir/writeFile modes are ignored if the paths already existed; enforce.
  fs.chmodSync(CONFIG_DIR, 0o700);
  fs.chmodSync(CREDENTIALS_PATH, 0o600);
}

/** Delete the credentials file. Returns true if a file was removed. */
export function deleteCredentials(): boolean {
  try {
    fs.unlinkSync(CREDENTIALS_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Base URL resolution: SUPERX_API_URL env (full base, including path) wins,
 * then the URL stored at login, then the production default.
 */
export function resolveApiUrl(storedUrl?: string): string {
  const envUrl = process.env.SUPERX_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (storedUrl) return storedUrl.replace(/\/+$/, "");
  return DEFAULT_API_URL;
}

/**
 * Auth resolution: credentials file first, then the SUPERX_API_KEY env var.
 * Exits with code 1 (message on stderr) when neither is present.
 */
export function getConfig(): ResolvedConfig {
  const creds = loadCredentials();
  if (creds) {
    return { apiKey: creds.apiKey, apiUrl: resolveApiUrl(creds.apiUrl), source: "credentials_file" };
  }

  const envKey = process.env.SUPERX_API_KEY;
  if (envKey) {
    return { apiKey: envKey, apiUrl: resolveApiUrl(), source: "env" };
  }

  process.stderr.write("Not authenticated. Either:\n");
  process.stderr.write("  1. Run: superx login\n");
  process.stderr.write("  2. Or set: export SUPERX_API_KEY=sxk_...\n");
  process.stderr.write("Create an API key at https://app.superx.so/account?tab=api\n");
  process.exit(1);
}
