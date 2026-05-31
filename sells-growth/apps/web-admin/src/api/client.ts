import { getApiKey } from "./storage";

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

async function parseError(res: Response): Promise<ApiError> {
  try {
    const data = await res.json();
    const error = data?.error;
    if (error?.code && error?.message) return error;
  } catch {
    //
  }
  return { code: "http_error", message: `HTTP ${res.status}` };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
  const url = `${baseUrl}${path}`;
  const headers = new Headers(init?.headers);

  if (!init?.skipAuth) {
    const apiKey = getApiKey();
    if (apiKey) headers.set("X-API-Key", apiKey);
  }

  if (init?.body && !(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
