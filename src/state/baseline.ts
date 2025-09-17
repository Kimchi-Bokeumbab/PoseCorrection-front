// src/state/baseline.ts
import type { PoseFrame } from "@/lib/model";

const KEY = "posturecare_baseline_v1";
let _baseline: PoseFrame | null = null;

export function setBaseline(frame: PoseFrame) {
  _baseline = frame;
  try {
    localStorage.setItem(KEY, JSON.stringify(frame));
  } catch {}
}

export function getBaseline(): PoseFrame | null {
  if (_baseline) return _baseline;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) _baseline = JSON.parse(raw) as PoseFrame;
  } catch {}
  return _baseline;
}

export function clearBaseline() {
  _baseline = null;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function hasBaseline(): boolean {
  return !!getBaseline();
}
