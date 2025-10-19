// src/lib/baseline.ts
import type { PoseFrame } from "@/hooks/usePoseStream";
import { validateKP7 } from "@/pose/mediapipe";

export async function captureStableKP7(
  getLastFrame: () => PoseFrame | null,
  timeoutMs = 1500
) {
  const end = performance.now() + timeoutMs;
  while (performance.now() < end) {
    const lf = getLastFrame();
    const kps = lf?.keypoints;
    if (kps) {
      const val = validateKP7(kps);
      if (val.ok) return kps;
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  return null;
}
