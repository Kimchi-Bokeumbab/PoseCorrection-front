// src/pose/mediapipe.ts

export type KP = { x: number; y: number; z: number; v: number };
export type KP7V = [KP, KP, KP, KP, KP, KP, KP];

export const KP_NAMES = [
  "left_shoulder",
  "right_shoulder",
  "left_ear",
  "right_ear",
  "left_eye",
  "right_eye",
  "nose",
] as const;

const MP_IDX = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
} as const;

function num(v: any, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function pick7LandmarksV(raw: any[]): KP7V | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length <= MP_IDX.RIGHT_SHOULDER) return null;

  const sel = [
    raw[MP_IDX.LEFT_SHOULDER],
    raw[MP_IDX.RIGHT_SHOULDER],
    raw[MP_IDX.LEFT_EAR],
    raw[MP_IDX.RIGHT_EAR],
    raw[MP_IDX.LEFT_EYE],
    raw[MP_IDX.RIGHT_EYE],
    raw[MP_IDX.NOSE],
  ];

  const out = sel.map((lm) => {
    const x = Number(lm?.x);
    const y = Number(lm?.y);
    const z = num(lm?.z, 0);
    const vRaw = lm?.visibility ?? lm?.presence ?? 1;
    const v = num(vRaw, 1);
    return { x, y, z, v };
  });

  // x/y가 숫자가 아니면 이 프레임은 실패로 처리(다음 프레임에서 다시 시도)
  for (const p of out) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  }
  return out as KP7V;
}

/** 임시 완화 버전: x/y만 검사 (화면 밖/visibility 검사는 잠시 비활성화) */
export function validateKP7(kps: KP[] | KP7V) {
  const reasons: string[] = [];

  if (!Array.isArray(kps)) return { ok: false, reasons: ["keypoints not array"] };
  if (kps.length !== 7) return { ok: false, reasons: [`expected 7, got ${kps.length}`] };

  kps.forEach((p, i) => {
    if (!p || typeof p.x !== "number" || typeof p.y !== "number") {
      reasons.push(`${KP_NAMES[i]} invalid coords`);
    }
  });

  return { ok: reasons.length === 0, reasons };
}

/** 7개 포인트가 "잡혔는지"만 판단 (가시성/좌표 유효성 기준) */
export function presenceReport(kps: KP7V, vMin = 0.5) {
  const missing: string[] = [];
  for (let i = 0; i < 7; i++) {
    const p = kps[i];
    const xOk = Number.isFinite(p.x);
    const yOk = Number.isFinite(p.y);
    const visOk = Number.isFinite(p.v) && p.v >= vMin;
    // 필요 시 화면 범위 체크도 같이(원하면 아래 주석 해제)
    // const inFrame = p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;

    if (!xOk || !yOk || !visOk /* || !inFrame */) {
      missing.push(KP_NAMES[i]);
    }
  }
  return { ok: missing.length === 0, missing };
}

/** 7 x [x,y,z] */
export function stripXYZ(kps: KP[] | KP7V): [number, number, number][] {
  return kps.map((p) => [p.x, p.y, Number.isFinite(p.z) ? p.z : 0]);
}

// 귀-어깨 연결 없음
export const KP7_CONNECTIONS: [number, number][] = [
  [0, 1],
  [6, 4],
  [6, 5],
  [4, 2],
  [5, 3],
];
