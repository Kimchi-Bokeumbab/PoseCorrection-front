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

export interface BaselineStatusResponse {
  ok: boolean;
  has_baseline?: boolean;
  baseline?: unknown;
  baseline21?: unknown;
  updated_at?: string;
  error?: string;
  detail?: string;
}

export interface BaselineStatusResult {
  hasBaseline: boolean;
  updatedAt?: string;
}

export async function setInitialBaseline({
  email,
  keypoints,
}: {
  email: string;
  keypoints: [number, number, number][];
}) {
  const { response, data } = await postJson<BaselineResponse>("/set_initial", { email, keypoints });
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

function coerceBaselinePresence(data: BaselineStatusResponse | null | undefined) {
  if (!data) return false;
  if (typeof data.has_baseline === "boolean") {
    return data.has_baseline;
  }

  const baselineCandidate = (data as { baseline?: unknown }).baseline;
  if (Array.isArray(baselineCandidate)) {
    return baselineCandidate.length > 0;
  }
  if (typeof baselineCandidate === "string") {
    try {
      const parsed = JSON.parse(baselineCandidate);
      if (Array.isArray(parsed)) {
        return parsed.length > 0;
      }
    } catch (error) {
      // ignore parse errors and fall through to other checks
    }
  }

  const baseline21Candidate = (data as { baseline21?: unknown }).baseline21;
  if (Array.isArray(baseline21Candidate)) {
    return baseline21Candidate.length > 0;
  }
  if (typeof baseline21Candidate === "string") {
    try {
      const parsed = JSON.parse(baseline21Candidate);
      if (Array.isArray(parsed)) {
        return parsed.length > 0;
      }
    } catch (error) {
      // ignore parse errors and fall through to default false
    }
  }

  return false;
}

function baselineStatusErrorMessage(code?: string) {
  if (!code) return "기준 좌표 상태를 불러오지 못했습니다.";
  const messages: Record<string, string> = {
    user_not_found: "사용자 정보를 찾을 수 없습니다.",
    email_required: "이메일 정보가 필요합니다.",
  };
  return messages[code] ?? "기준 좌표 상태를 확인하는 중 오류가 발생했습니다.";
}

export async function fetchBaselineStatus(email: string): Promise<BaselineStatusResult> {
  const params = new URLSearchParams({ email });
  const response = await fetch(`${API_BASE_URL}/baseline_status?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let data: BaselineStatusResponse | null = null;
  let rawText = "";
  try {
    rawText = await response.text();
  } catch (error) {
    rawText = "";
  }

  if (rawText) {
    const trimmed = rawText.trim();
    const contentType = response.headers.get("content-type") ?? "";
    const shouldParse =
      contentType.includes("application/json") || trimmed.startsWith("{") || trimmed.startsWith("[");
    if (shouldParse) {
      try {
        data = JSON.parse(trimmed) as BaselineStatusResponse;
      } catch (error) {
        data = null;
      }
    }
  }

  if (!data) {
    if (response.status === 404) {
      return { hasBaseline: false };
    }
    if (!response.ok) {
      throw new Error(`기준 좌표 상태 요청 실패 (${response.status})`);
    }
    return { hasBaseline: false };
  }

  const hasBaseline = coerceBaselinePresence(data);

  if (response.ok) {
    if (data.ok === false) {
      if (data.error === "baseline_not_set" || data.error === "baseline_missing") {
        return { hasBaseline: false };
      }
      throw new Error(baselineStatusErrorMessage(data.error));
    }
    return {
      hasBaseline,
      updatedAt: typeof data.updated_at === "string" ? data.updated_at : undefined,
    };
  }

  if (data.error === "baseline_not_set" || data.error === "baseline_missing") {
    return { hasBaseline: false };
  }

  throw new Error(baselineStatusErrorMessage(data.error));
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
