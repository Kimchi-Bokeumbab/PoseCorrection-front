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

export interface PredictResponse {
  label: string;
  [key: string]: unknown;
}

export async function predictPosture(frames: [number, number, number][][]): Promise<PredictResponse> {
  const { response, data } = await postJson<PredictResponse>("/predict", { frames });
  if (!response.ok) {
    throw new Error(`Prediction API request failed (${response.status})`);
  }
  if (!data || typeof data.label !== "string") {
    throw new Error("Invalid prediction response");
  }
  return data;
}
