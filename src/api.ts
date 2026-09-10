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

  /**
   * Authenticated request whose 2xx body is NOT JSON (the CSV export). Same
   * auth, rate-limit capture and error envelope as request(); the difference
   * is that a successful body comes back as raw text.
   */
  private async requestText(
    endpoint: string,
    query?: RequestOptions["query"]
  ): Promise<{ text: string; headers: Headers }> {
    const url = this.buildUrl(endpoint, query);
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
    } catch (err: any) {
      throw new ApiError(0, "network_error", `Could not reach ${this.apiUrl} (${err?.message || err})`);
    }

    this.captureRateLimit(response.headers);

    const text = await response.text();
    if (!response.ok) {
      const retryHeader = response.headers.get("retry-after");
      const retryAfter = retryHeader !== null && Number.isFinite(Number(retryHeader)) ? Number(retryHeader) : null;
      let code = `http_${response.status}`;
      let message = `Request failed with HTTP ${response.status}`;
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      const errField = json?.error;
      if (errField && typeof errField === "object" && typeof errField.code === "string") {
        code = errField.code;
        if (typeof errField.message === "string") message = errField.message;
      } else if (typeof errField === "string") {
        code = errField.split(":")[0].trim() || code;
        message = errField;
      }
      throw new ApiError(response.status, code, message, retryAfter);
    }

    return { text, headers: response.headers };
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

  async getContact(contactId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/contacts/${encodeURIComponent(contactId)}`, { query })).json;
  }

  // --- Contact notes ---

  async listContactNotes(contactId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/contacts/${encodeURIComponent(contactId)}/notes`, { query })).json;
  }

  async addContactNote(contactId: string, body: unknown): Promise<any> {
    return (await this.request(`/contacts/${encodeURIComponent(contactId)}/notes`, { method: "POST", body })).json;
  }

  async updateContactNote(contactId: string, noteId: string, body: unknown): Promise<any> {
    return (
      await this.request(
        `/contacts/${encodeURIComponent(contactId)}/notes/${encodeURIComponent(noteId)}`,
        { method: "PATCH", body }
      )
    ).json;
  }

  async deleteContactNote(contactId: string, noteId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (
      await this.request(
        `/contacts/${encodeURIComponent(contactId)}/notes/${encodeURIComponent(noteId)}`,
        { method: "DELETE", query }
      )
    ).json;
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

  async createList(body: unknown): Promise<any> {
    return (await this.request("/contact-lists", { method: "POST", body })).json;
  }

  async renameList(listId: string, body: unknown): Promise<any> {
    return (await this.request(`/contact-lists/${encodeURIComponent(listId)}`, { method: "PATCH", body })).json;
  }

  async deleteList(listId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/contact-lists/${encodeURIComponent(listId)}`, { method: "DELETE", query })).json;
  }

  async addListMembers(listId: string, body: unknown): Promise<any> {
    return (
      await this.request(`/contact-lists/${encodeURIComponent(listId)}/members/bulk`, { method: "POST", body })
    ).json;
  }

  async removeListMembers(listId: string, body: unknown): Promise<any> {
    return (
      await this.request(`/contact-lists/${encodeURIComponent(listId)}/members/bulk-delete`, { method: "POST", body })
    ).json;
  }

  // --- Signals ---

  async listSignalAgents(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/signals/agents", { query })).json;
  }

  /** One live keyword search for people on X now. Saves nothing. */
  async searchLeads(body: unknown): Promise<any> {
    return (await this.request("/signals/leads/search", { method: "POST", body })).json;
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

  /** Edit an agent's name, ICP, precision mode, destination list or status. */
  async updateSignalAgent(id: number, body: unknown): Promise<any> {
    return (await this.request(`/signals/agents/${id}`, { method: "PATCH", body })).json;
  }

  async deleteSignalAgent(id: number): Promise<any> {
    return (await this.request(`/signals/agents/${id}`, { method: "DELETE" })).json;
  }

  async addSignalAgentSignal(id: number, body: unknown): Promise<any> {
    return (await this.request(`/signals/agents/${id}/signals`, { method: "POST", body })).json;
  }

  async removeSignalAgentSignal(id: number, signalId: number): Promise<any> {
    return (await this.request(`/signals/agents/${id}/signals/${signalId}`, { method: "DELETE" })).json;
  }

  /** Record (or clear, with null) the verdict on one lead. */
  async setLeadFeedback(leadId: number, body: unknown): Promise<any> {
    return (await this.request(`/signals/leads/${leadId}/feedback`, { method: "POST", body })).json;
  }

  // --- Engage ---

  async listEngageFeeds(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/engage/feeds", { query })).json;
  }

  async getEngageFeedPosts(feedId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/engage/feeds/${encodeURIComponent(feedId)}/posts`, { query })).json;
  }

  async createEngageFeed(body: unknown): Promise<any> {
    return (await this.request("/engage/feeds", { method: "POST", body })).json;
  }

  async updateEngageFeed(feedId: string, body: unknown): Promise<any> {
    return (await this.request(`/engage/feeds/${encodeURIComponent(feedId)}`, { method: "PATCH", body })).json;
  }

  async deleteEngageFeed(feedId: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/engage/feeds/${encodeURIComponent(feedId)}`, { method: "DELETE", query })).json;
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

  /**
   * Publish immediately: the create endpoint with scheduled_for "now". The
   * Idempotency-Key is REQUIRED by the API (a retry must never post twice),
   * so it is a plain parameter here rather than an optional one.
   */
  async publishNow(body: unknown, idempotencyKey: string): Promise<{ json: any; replayed: boolean }> {
    const res = await this.request("/scheduled-posts", {
      method: "POST",
      body,
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return { json: res.json, replayed: res.headers.get("idempotency-replayed") === "true" };
  }

  // --- Scheduled posts: bulk queue operations ---

  async bulkRetimeScheduled(body: unknown): Promise<any> {
    return (await this.request("/scheduled-posts/bulk/retime", { method: "POST", body })).json;
  }

  async bulkEnableAutoRetweet(body: unknown): Promise<any> {
    return (await this.request("/scheduled-posts/bulk/auto-retweet", { method: "POST", body })).json;
  }

  async bulkDeleteScheduled(body: unknown): Promise<any> {
    return (await this.request("/scheduled-posts/bulk/delete", { method: "POST", body })).json;
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

  /** Full replace of the account's product list (max 5). */
  async setContextProducts(body: unknown): Promise<any> {
    return (await this.request("/context/products", { method: "PUT", body })).json;
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

  /** Saved article cover styles (pass an id as style_id to the cover call). */
  async listCoverStyles(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/cover-styles", { query })).json;
  }

  // --- Datasets (Ask SuperX collections) ---

  async listDatasets(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/datasets", { query })).json;
  }

  async getDataset(id: string): Promise<any> {
    return (await this.request(`/datasets/${encodeURIComponent(id)}`)).json;
  }

  async getDatasetRows(id: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/datasets/${encodeURIComponent(id)}/rows`, { query })).json;
  }

  /** CSV export. Raw text, with the server's filename from Content-Disposition. */
  async exportDatasetCsv(id: string): Promise<{ filename: string; text: string }> {
    const { text, headers } = await this.requestText(
      `/datasets/${encodeURIComponent(id)}/export`,
      { format: "csv" }
    );
    const disposition = headers.get("content-disposition") || "";
    const match = /filename="([^"]+)"/.exec(disposition);
    return { filename: match ? match[1] : `superx-dataset-${id}.csv`, text };
  }

  async addDatasetToList(id: string, body: unknown): Promise<any> {
    return (
      await this.request(`/datasets/${encodeURIComponent(id)}/contacts`, { method: "POST", body })
    ).json;
  }

  /** Start a collection. Answers a ready dataset, or a collecting one (202). */
  async createDataset(body: unknown): Promise<any> {
    return (await this.request("/datasets", { method: "POST", body })).json;
  }

  /** Draft one outreach message per row of a research dataset. Text only. */
  async draftOutreachDms(id: string, body: unknown): Promise<any> {
    return (
      await this.request(`/datasets/${encodeURIComponent(id)}/outreach-drafts`, {
        method: "POST",
        body,
      })
    ).json;
  }

  /** Filter a dataset by each row's text into a NEW dataset (200 or 202). */
  async refineDataset(id: string, body: unknown): Promise<any> {
    return (
      await this.request(`/datasets/${encodeURIComponent(id)}/refine`, {
        method: "POST",
        body,
      })
    ).json;
  }

  // --- Audience (the four system people-lists) ---

  /** kind: followers | following | repliers | reposters. Cursor paging. */
  async getAudience(
    kind: string,
    query: RequestOptions["query"] = {}
  ): Promise<any> {
    return (await this.request(`/audience/${encodeURIComponent(kind)}`, { query })).json;
  }

  /** Posts @-mentioning the account, read live. Costs 3 feed fetches. */
  async getMentions(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/engage/mentions", { query })).json;
  }

  // --- Live X lookups (read X now, not SuperX's stored data) ---

  async lookupXPost(id: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/x/posts/${encodeURIComponent(id)}`, { query })).json;
  }

  async getXPostReplies(id: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/x/posts/${encodeURIComponent(id)}/replies`, { query })).json;
  }

  async lookupXUser(handle: string): Promise<any> {
    return (await this.request(`/x/users/${encodeURIComponent(handle)}`)).json;
  }

  async getXUserPosts(handle: string, query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request(`/x/users/${encodeURIComponent(handle)}/posts`, { query })).json;
  }

  // --- Inspiration media (cross-platform media index) ---

  async searchInspirationMedia(query: RequestOptions["query"] = {}): Promise<any> {
    return (await this.request("/inspiration/media", { query })).json;
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
