/**
 * SuperX API client (pure HTTPS client, global fetch, no server imports).
 *
 * Output convention used across the CLI:
 *  - stdout carries clean JSON only (or markdown for `superx docs`), so
 *    every data command pipes through `jq .` untouched.
 *  - Human/status lines go to stderr.
 *  - Exit code 0 on success, 1 on any error.
 */

export interface ApiClientConfig {
  apiKey: string;
  apiUrl: string;
}

export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
}

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfter: number | null;

  constructor(status: number, code: string, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiResponse {
  status: number;
  headers: Headers;
  json: any;
}

export class SuperXAPI {
  private apiKey: string;
  private apiUrl: string;

  /** Rate-limit headers from the most recent authenticated response. */
  lastRateLimit: RateLimitInfo | null = null;

  constructor(config: ApiClientConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl.replace(/\/+$/, "");
  }

  private buildUrl(endpoint: string, query?: RequestOptions["query"]): string {
    let url = `${this.apiUrl}${endpoint}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private captureRateLimit(headers: Headers): void {
    const num = (name: string): number | null => {
      const v = headers.get(name);
      if (v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    if (headers.get("x-ratelimit-limit") !== null) {
      this.lastRateLimit = {
        limit: num("x-ratelimit-limit"),
        remaining: num("x-ratelimit-remaining"),
        reset: num("x-ratelimit-reset"),
      };
    }
  }

  /** Perform a request. Non-2xx responses throw ApiError with the API's code. */
  async request(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse> {
    const url = this.buildUrl(endpoint, options.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (err: any) {
      throw new ApiError(0, "network_error", `Could not reach ${this.apiUrl} (${err?.message || err})`);
    }

    this.captureRateLimit(response.headers);

    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const retryHeader = response.headers.get("retry-after");
      const retryAfter = retryHeader !== null && Number.isFinite(Number(retryHeader)) ? Number(retryHeader) : null;
      let code = `http_${response.status}`;
      let message = `Request failed with HTTP ${response.status}`;
      const errField = json?.error;
      if (errField && typeof errField === "object" && typeof errField.code === "string") {
        code = errField.code;
        if (typeof errField.message === "string") message = errField.message;
      } else if (typeof errField === "string") {
        // Legacy string envelope, e.g. "subscription_required: ..."
        code = errField.split(":")[0].trim() || code;
        message = errField;
      }
      throw new ApiError(response.status, code, message, retryAfter);
    }

    return { status: response.status, headers: response.headers, json };
  }

  // --- Identity ---

  async me(): Promise<any> {
    return (await this.request("/me")).json;
  }

  async accounts(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/accounts", { query })).json;
  }

  // --- Posts and analytics ---

  async listPosts(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/posts", { query })).json;
  }

  async postsAnalytics(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/posts/analytics", { query })).json;
  }

  async listReplies(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/replies", { query })).json;
  }

  async receivedReplies(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/replies/received", { query })).json;
  }

  // --- Drafting ---

  /** Write post drafts in the account's voice. Nothing is scheduled. */
  async draftPost(body: unknown): Promise<any> {
    return (await this.request("/posts/draft", { method: "POST", body })).json;
  }

  // --- Inspiration ---

  async searchInspiration(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/inspiration", { query })).json;
  }

  // --- Contacts ---

  async listContacts(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/contacts", { query })).json;
  }

  async contactReplies(contactId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/contacts/${encodeURIComponent(contactId)}/replies`, { query })).json;
  }

  // --- Contact lists ---

  async listContactLists(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/contact-lists", { query })).json;
  }

  async listListMembers(listId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/contact-lists/${encodeURIComponent(listId)}/members`, { query })).json;
  }

  async addListMember(listId: string, body: unknown): Promise<any> {
    return (await this.request(`/contact-lists/${encodeURIComponent(listId)}/members`, { method: "POST", body })).json;
  }

  async removeListMember(listId: string, memberId: string): Promise<any> {
    return (
      await this.request(
        `/contact-lists/${encodeURIComponent(listId)}/members/${encodeURIComponent(memberId)}`,
        { method: "DELETE" }
      )
    ).json;
  }

  // --- Signals ---

  async listSignalAgents(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/signals/agents", { query })).json;
  }

  async listSignalLeads(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/signals/leads", { query })).json;
  }

  async createSignalAgent(body: unknown, idempotencyKey?: string): Promise<{ json: any; replayed: boolean }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await this.request("/signals/agents", { method: "POST", body, headers });
    return { json: res.json, replayed: res.headers.get("idempotency-replayed") === "true" };
  }

  async setSignalAgentStatus(id: number, status: string): Promise<any> {
    return (await this.request(`/signals/agents/${id}`, { method: "PATCH", body: { status } })).json;
  }

  async deleteSignalAgent(id: number): Promise<any> {
    return (await this.request(`/signals/agents/${id}`, { method: "DELETE" })).json;
  }

  // --- Engage ---

  async listEngageFeeds(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/engage/feeds", { query })).json;
  }

  async getEngageFeedPosts(feedId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/engage/feeds/${encodeURIComponent(feedId)}/posts`, { query })).json;
  }

  // --- Scheduled posts ---

  async listScheduled(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/scheduled-posts", { query })).json;
  }

  async createScheduled(body: unknown, idempotencyKey?: string): Promise<{ json: any; replayed: boolean }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await this.request("/scheduled-posts", { method: "POST", body, headers });
    return { json: res.json, replayed: res.headers.get("idempotency-replayed") === "true" };
  }

  async updateScheduled(id: string, body: unknown): Promise<any> {
    return (await this.request(`/scheduled-posts/${encodeURIComponent(id)}`, { method: "PATCH", body })).json;
  }

  async deleteScheduled(id: string): Promise<any> {
    return (await this.request(`/scheduled-posts/${encodeURIComponent(id)}`, { method: "DELETE" })).json;
  }

  // --- Plug templates ---

  async listPlugTemplates(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/plug-templates", { query })).json;
  }

  // --- Context settings ---

  async getContext(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/context", { query })).json;
  }

  async updateContext(body: unknown): Promise<any> {
    return (await this.request("/context", { method: "PATCH", body })).json;
  }

  async updateContextProduct(idOrUrl: string, body: unknown): Promise<any> {
    return (
      await this.request(`/context/products/${encodeURIComponent(idOrUrl)}`, { method: "PATCH", body })
    ).json;
  }

  async deleteContextProduct(id: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (
      await this.request(`/context/products/${encodeURIComponent(id)}`, { method: "DELETE", query })
    ).json;
  }

  // --- Queue settings ---

  async getQueueSettings(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/queue-settings", { query })).json;
  }

  async updateQueueSettings(body: unknown): Promise<any> {
    return (await this.request("/queue-settings", { method: "PATCH", body })).json;
  }

  // --- Media ---

  async createMediaUpload(body: unknown): Promise<any> {
    return (await this.request("/media", { method: "POST", body })).json;
  }

  // --- Tags ---

  async listTags(): Promise<any> {
    return (await this.request("/tags")).json;
  }

  async createTag(body: unknown): Promise<any> {
    return (await this.request("/tags", { method: "POST", body })).json;
  }

  async updateTag(id: string, body: unknown): Promise<any> {
    return (await this.request(`/tags/${encodeURIComponent(id)}`, { method: "PATCH", body })).json;
  }

  async deleteTag(id: string): Promise<any> {
    return (await this.request(`/tags/${encodeURIComponent(id)}`, { method: "DELETE" })).json;
  }

  // --- Articles ---

  async listArticles(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/articles", { query })).json;
  }

  async getArticle(id: string): Promise<any> {
    return (await this.request(`/articles/${encodeURIComponent(id)}`)).json;
  }

  async createArticle(body: unknown): Promise<any> {
    return (await this.request("/articles", { method: "POST", body })).json;
  }

  async updateArticle(id: string, body: unknown): Promise<any> {
    return (await this.request(`/articles/${encodeURIComponent(id)}`, { method: "PATCH", body })).json;
  }

  async deleteArticle(id: string): Promise<any> {
    return (await this.request(`/articles/${encodeURIComponent(id)}`, { method: "DELETE" })).json;
  }

  async publishArticle(id: string): Promise<any> {
    return (await this.request(`/articles/${encodeURIComponent(id)}/publish`, { method: "POST", body: {} })).json;
  }

  async scheduleArticle(id: string, body: unknown): Promise<any> {
    return (await this.request(`/articles/${encodeURIComponent(id)}/schedule`, { method: "POST", body })).json;
  }

  async unscheduleArticle(id: string): Promise<any> {
    return (await this.request(`/articles/${encodeURIComponent(id)}/unschedule`, { method: "POST", body: {} })).json;
  }

  async generateArticleCover(id: string, body: unknown): Promise<any> {
    return (await this.request(`/articles/${encodeURIComponent(id)}/cover`, { method: "POST", body })).json;
  }

  // --- Docs (unauthenticated markdown) ---

  async docs(): Promise<string> {
    const url = this.buildUrl("/docs");
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err: any) {
      throw new ApiError(0, "network_error", `Could not reach ${this.apiUrl} (${err?.message || err})`);
    }
    if (!response.ok) {
      throw new ApiError(response.status, `http_${response.status}`, `Docs request failed with HTTP ${response.status}`);
    }
    return response.text();
  }
}

// --- Shared output helpers (stdout = JSON only, stderr = human lines) ---

export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

export function note(message: string): void {
  process.stderr.write(message + "\n");
}
