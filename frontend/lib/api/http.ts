// Thin fetch wrapper for the Docks2Doc Node/Express/MongoDB backend.
// Base URL + feature flag come from env so the app can run purely on the
// in-memory mock (default) or against the real API (backend/).

export const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://winggs.com/docksapi/api"
    : "http://192.168.168.41:7002/api";
// export const API_BASE_URL =  "http://192.168.168.41:7002/api";
// The app always talks to the real MongoDB-backed API — there is no
// in-memory/mock fallback. All reads and writes go through the backend.
export const USE_BACKEND = true;

const TOKEN_KEY = "d2d-token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { query?: Record<string, unknown> } = {}
): Promise<T> {
  const { query, headers, ...rest } = options;

  let url = `${API_BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)));
      else params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const token = getToken();
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body?.message || `Request failed with status ${res.status}`, res.status);
  }
  return body as T;
}

export const http = {
  get: <T>(path: string, query?: Record<string, unknown>) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
