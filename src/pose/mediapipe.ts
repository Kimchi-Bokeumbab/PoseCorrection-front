// src/pose/mediapipe.ts
import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import type { PoseFrame, Keypoint } from "@/lib/model";

export async function createPoseLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    },
    numPoses: 1,
    runningMode: "VIDEO",
  });
  return landmarker;
}

function kp(name: string, x: number, y: number): Keypoint { return { name, x, y }; }

export function toPoseFrame(res: PoseLandmarkerResult): PoseFrame | null {
  const lms = (res as any).poseLandmarks ?? (res as any).landmarks;
  if (!lms || !lms[0]) return null;
  const lm = lms[0];

  // BlazePose index 참고: nose(0) left_shoulder(11) right_shoulder(12) left_hip(23) right_hip(24)
  const nose = lm[0], ls = lm[11], rs = lm[12], lh = lm[23], rh = lm[24];
  if (!nose || !ls || !rs || !lh || !rh) return null;

  const neckX = (ls.x + rs.x) / 2;
  const neckY = (ls.y + rs.y) / 2;

  const keypoints: Keypoint[] = [
    kp("head", nose.x, nose.y),
    kp("neck", neckX, neckY),
    kp("shoulder_l", ls.x, ls.y),
    kp("shoulder_r", rs.x, rs.y),
    kp("hip_l", lh.x, lh.y),
    kp("hip_r", rh.x, rh.y),
  ];
  return { ts: Date.now(), keypoints };
}
