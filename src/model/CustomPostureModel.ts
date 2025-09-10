import type { PoseFrame, Keypoint } from "@/lib/model";
HIP_L: "hip_l",
HIP_R: "hip_r",
} as const;
export type KeyName = typeof KP[keyof typeof KP];

export function getKP(frame: PoseFrame, name: string): Keypoint | undefined {
return frame.keypoints.find((k) => k.name === name);
}

function dist(a: Keypoint, b: Keypoint) {
const dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy);
}

export function shoulderWidth(frame: PoseFrame) {
const L = getKP(frame, KP.SHO_L); const R = getKP(frame, KP.SHO_R);
return L && R ? Math.max(dist(L, R), 1e-6) : 1; // zero-div 방지
}

export function deltasNorm(baseline: PoseFrame, current: PoseFrame) {
const sw = shoulderWidth(baseline);
const names: KeyName[] = [KP.HEAD, KP.NECK, KP.SHO_L, KP.SHO_R, KP.HIP_L, KP.HIP_R];
const out: number[] = [];
for (const n of names) {
const b = getKP(baseline, n), c = getKP(current, n);
const dx = (c?.x ?? 0) - (b?.x ?? 0);
const dy = (c?.y ?? 0) - (b?.y ?? 0);
out.push(dx / sw, dy / sw, Math.hypot(dx, dy) / sw);
}
return out; // length = 6 * 3 = 18
}

export function tiltAngles(frame: PoseFrame) {
const L = getKP(frame, KP.SHO_L), R = getKP(frame, KP.SHO_R);
const HL = getKP(frame, KP.HIP_L), HR = getKP(frame, KP.HIP_R);
const N = getKP(frame, KP.NECK), H = getKP(frame, KP.HEAD);
const ang = (a?: Keypoint, b?: Keypoint) => (a && b ? Math.atan2(b.y - a.y, b.x - a.x) : 0);
const shoulder = ang(L, R); // 라디안
const hip = ang(HL, HR);
const neck = ang(N, H);
return [shoulder, hip, neck];
}

/** 최종 입력 벡터 생성(정규화된 델타 + 각도들) */
export function composeFeatureVector(baseline: PoseFrame, current: PoseFrame): Float32Array {
const d = deltasNorm(baseline, current); // 18
const [aS, aH, aN] = tiltAngles(current); // 3
return new Float32Array([
...d,
aS, aH, aN,
]); // 총 21차원
}

/** 지터 제거용 EMA */
export class EMA {
private v: number[] | null = null;
constructor(private alpha = 0.3) {}
next(x: number[]): number[] {
if (!this.v) { this.v = x.slice(); return this.v; }
for (let i = 0; i < x.length; i++) this.v[i] = this.v[i]! * (1 - this.alpha) + x[i] * this.alpha;
return this.v.slice();
}
}
