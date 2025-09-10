import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import type { PoseFrame, Keypoint } from "@/lib/model";

export async function createPoseLandmarker() {
const vision = await FilesetResolver.forVisionTasks(
// CDN 경로(개발용). 배포 시 로컬 자산으로 교체 권장
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

function toKP(name: string, x: number, y: number): Keypoint { return { name, x, y }; }

export function toPoseFrame(res: PoseLandmarkerResult): PoseFrame | null {
const lms = (res as any).poseLandmarks ?? (res as any).landmarks; // 호환 처리
if (!lms || !lms[0]) return null;
const lm = lms[0];
// BlazePose 인덱스: nose(0), left_shoulder(11), right_shoulder(12), left_hip(23), right_hip(24)
const nose = lm[0];
const ls = lm[11];
const rs = lm[12];
const lh = lm[23];
const rh = lm[24];
if (!nose || !ls || !rs || !lh || !rh) return null;
const neckX = (ls.x + rs.x) / 2;
const neckY = (ls.y + rs.y) / 2;
const kp: Keypoint[] = [
toKP("head", nose.x, nose.y),
toKP("neck", neckX, neckY),
toKP("shoulder_l", ls.x, ls.y),
toKP("shoulder_r", rs.x, rs.y),
toKP("hip_l", lh.x, lh.y),
toKP("hip_r", rh.x, rh.y),
];
return { ts: Date.now(), keypoints: kp };
}