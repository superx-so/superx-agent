import { SuperXAPI } from "../api";
import { DEFAULT_API_URL, loadCredentials, resolveApiUrl } from "../config";

/**
 * `superx docs` prints the API quickstart as markdown (the one command whose
 * stdout is not JSON). It hits the unauthenticated GET /docs endpoint, so it
 * works before login too.
 */
export async function docs(): Promise<void> {
  const apiUrl = resolveApiUrl(loadCredentials()?.apiUrl || DEFAULT_API_URL);
  const api = new SuperXAPI({ apiKey: "", apiUrl });
  process.stdout.write(await api.docs());
}
