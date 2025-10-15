const DEFAULT_API_BASE_URL = "http://127.0.0.1:5000";

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const envBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE_URL;

export const API_BASE_URL = normalizeBaseUrl(envBaseUrl);

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

async function postJson<T>(path: string, body: JsonValue, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });

  const rawText = await response.text();
  let data: T | null = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as T;
    } catch (error) {
      throw new Error("Invalid JSON response from server");
    }
  }

  return { response, data };
}

async function getJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const rawText = await response.text();
  let data: T | null = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as T;
    } catch (error) {
      throw new Error("Invalid JSON response from server");
    }
  }

  return { response, data };
}

export interface AuthApiResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

export interface AuthResult extends AuthApiResponse {
  status: number;
}

export async function registerUser(email: string, password: string): Promise<AuthResult> {
  const { response, data } = await postJson<AuthApiResponse>("/register", { email, password });
  if (!data) {
    return { ok: false, error: "invalid_response", status: response.status };
  }
  return { status: response.status, ...data };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const { response, data } = await postJson<AuthApiResponse>("/login", { email, password });
  if (!data) {
    return { ok: false, error: "invalid_response", status: response.status };
  }
  return { status: response.status, ...data };
}

export interface BaselineResponse {
  ok: boolean;
  message?: string;
  error?: string;
  detail?: string;
}

export async function setInitialBaseline(keypoints: [number, number, number][]) {
  const { response, data } = await postJson<BaselineResponse>("/set_initial", { keypoints });
  if (!response.ok) {
    const error = data?.error ?? "baseline_failed";
    const detail = data?.detail;
    throw new Error(detail ? `${error}: ${detail}` : error);
  }
  if (!data?.ok) {
    throw new Error(data?.error ?? "baseline_failed");
  }
  return data;
}

export interface PredictApiResponse {
  ok: boolean;
  label?: string;
  stored?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface PredictRequestPayload {
  email: string;
  frames: [number, number, number][][];
  recordedAt?: string;
  score?: number;
}

export async function predictPosture({ email, frames, recordedAt, score }: PredictRequestPayload): Promise<PredictApiResponse> {
  const payload: Record<string, unknown> = {
    email,
    frames,
  };
  if (recordedAt) {
    payload.recorded_at = recordedAt;
  }
  if (typeof score === "number" && Number.isFinite(score)) {
    payload.score = score;
  }

  const { response, data } = await postJson<PredictApiResponse>("/predict", payload);
  if (!data) {
    throw new Error("Invalid prediction response");
  }
  if (!response.ok || (typeof data.ok === "boolean" && !data.ok)) {
    const error = data.error ?? `Prediction API request failed (${response.status})`;
    throw new Error(error);
  }
  if (typeof data.label !== "string") {
    throw new Error("Invalid prediction response");
  }
  return data;
}

export interface PostureStatsSummary {
  range: { start: string; end: string };
  hourly: { hour: string; total: number; bad: number; avg_score?: number | null }[];
  weekday: { weekday: string; total: number; bad: number }[];
  labels: { label: string; count: number }[];
  total_events: number;
}

export interface PostureStatsResponse {
  ok: boolean;
  summary?: PostureStatsSummary;
  error?: string;
}

export async function fetchPostureStats(email: string, days = 7): Promise<PostureStatsSummary> {
  const params = new URLSearchParams({ email, days: String(days) });
  const { response, data } = await getJson<PostureStatsResponse>(`/posture_stats?${params.toString()}`);
  if (!data) {
    throw new Error("Invalid statistics response from server");
  }
  if (!response.ok || !data.ok || !data.summary) {
    const error = data.error ?? `Failed to load posture stats (${response.status})`;
    throw new Error(error);
  }
  return data.summary;
}
