// src/model/RuleClassifier.ts
import type { PoseFrame } from "@/lib/model";

export type PostureLabel =
  | "정상"
  | "목꺾임"
  | "거북목"
  | "어깨 기울어짐"
  | "뒤로 기대서 앉음";

export const POSTURE_LABELS: PostureLabel[] = [
  "정상",
  "목꺾임",
  "거북목",
  "어깨 기울어짐",
  "뒤로 기대서 앉음",
];

// ---- helpers -------------------------------------------------
type XY = { x: number; y: number };
const get = (f: PoseFrame, name: string): XY | null => {
  const k = f.keypoints.find((k) => k.name === name);
  return k ? { x: k.x, y: k.y } : null;
};
const mid = (a: XY, b: XY): XY => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: XY, b: XY): number => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const toDeg = (rad: number) => (rad * 180) / Math.PI;

// ---- 특징량 계산 ---------------------------------------------
export function extractFeatures(base: PoseFrame, cur: PoseFrame) {
  const headB = get(base, "head")!, neckB = get(base, "neck")!;
  const slB = get(base, "shoulder_l")!, srB = get(base, "shoulder_r")!;
  const hlB = get(base, "hip_l")!, hrB = get(base, "hip_r")!;
  const head = get(cur, "head")!, neck = get(cur, "neck")!;
  const sl = get(cur, "shoulder_l")!, sr = get(cur, "shoulder_r")!;
  const hl = get(cur, "hip_l")!, hr = get(cur, "hip_r")!;

  const shoulderWidthB = Math.max(1e-6, dist(slB, srB));
  const shoulderWidth = Math.max(1e-6, dist(sl, sr));
  const hipMidB = mid(hlB, hrB);
  const hipMid = mid(hl, hr);
  const neckMidB = neckB; // already midpoint
  const neckMid = neck;

  // (1) 어깨 기울기: 좌/우 어깨 y 차이를 어깨폭으로 정규화
  const shoulderTilt = (sr.y - sl.y) / shoulderWidth;

  // (2) 목/머리 기울기: (neck->head) 벡터의 수직(위쪽) 대비 각도
  const vNH = { x: head.x - neck.x, y: head.y - neck.y };
  const neckTiltDeg = toDeg(Math.atan2(vNH.x, -vNH.y)); // 0=수직, 좌우로 기울면 커짐
  const absNeckTiltDeg = Math.abs(neckTiltDeg);

  // (3) 거북목(대리치): (head.x - neck.x)의 기준 대비 변화(좌우 쏠림 포함) + (head.y - neck.y) 기준 대비 변화
  const dxBase = headB.x - neckB.x;
  const dxNow = head.x - neck.x;
  const dyBase = headB.y - neckB.y;
  const dyNow = head.y - neck.y;
  const headDeltaX = (dxNow - dxBase) / shoulderWidth; // 좌우 쏠림/회전성분
  const headDeltaY = (dyNow - dyBase) / shoulderWidth; // 위/아래 상대 거리 변화
  // 한쪽으로 치우치거나, 목 길이가 유의미하게 짧아지면 '거북목' 신호로 취급
  const fwdHeadScore = Math.max(Math.abs(headDeltaX), Math.max(0, -headDeltaY));

  // (4) 뒤로 기대서 앉음: 목↔엉덩이(중심) 세로 거리의 기준 대비 감소량
  const torsoLenBase = Math.abs(neckMidB.y - hipMidB.y);
  const torsoLenNow = Math.abs(neckMid.y - hipMid.y);
  const torsoReduce = (torsoLenBase - torsoLenNow) / Math.max(1e-6, shoulderWidthB); // 양수면 짧아짐(뒤로 기대/등받이)
  // ----------------------------------------------------------------
  return {
    shoulderTilt,           // (+) 오른쪽이 더 낮음
    absNeckTiltDeg,         // 목 기울기 절대각도(°)
    fwdHeadScore,           // 거북목 대리 점수(정규화)
    torsoReduce,            // 상체 길이 감소 비율(정규화)
    shoulderWidth, shoulderWidthB,
  };
}

// ---- 룰/임계값 (초기값, 추후 튜닝) ----------------------------
const T_SHOULDER_TILT = 0.08;   // 어깨 y 차이가 어깨폭의 8%↑
const T_NECK_TILT_DEG = 12;     // 목 기울기 12°↑
const T_FWD_HEAD = 0.18;        // 거북목 대리치 0.18↑
const T_TORSO_REDUCE = 0.12;    // 상체 길이 기준 대비 12%↓

// ---- 예측 -----------------------------------------------------
export function predictLabel(base: PoseFrame, cur: PoseFrame): {
  label: PostureLabel;
  score: number;   // 0~1
  metrics: ReturnType<typeof extractFeatures>;
} {
  const m = extractFeatures(base, cur);

  // 우선순위: 어깨기울기 > 목꺾임 > 거북목 > 뒤로 기대
  if (Math.abs(m.shoulderTilt) > T_SHOULDER_TILT) {
    const s = clamp01((Math.abs(m.shoulderTilt) - T_SHOULDER_TILT) / (0.25));
    return { label: "어깨 기울어짐", score: s, metrics: m };
  }
  if (m.absNeckTiltDeg > T_NECK_TILT_DEG) {
    const s = clamp01((m.absNeckTiltDeg - T_NECK_TILT_DEG) / 20);
    return { label: "목꺾임", score: s, metrics: m };
  }
  if (m.fwdHeadScore > T_FWD_HEAD) {
    const s = clamp01((m.fwdHeadScore - T_FWD_HEAD) / 0.3);
    return { label: "거북목", score: s, metrics: m };
  }
  if (m.torsoReduce > T_TORSO_REDUCE) {
    const s = clamp01((m.torsoReduce - T_TORSO_REDUCE) / 0.25);
    return { label: "뒤로 기대서 앉음", score: s, metrics: m };
  }
  return { label: "정상", score: 0, metrics: m };
}
