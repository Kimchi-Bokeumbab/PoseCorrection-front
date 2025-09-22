// src/pose/select7.ts
// 33 포인트에서 우리가 쓰는 7 포인트 인덱스:
// NOSE:0, L_EYE:2, R_EYE:5, L_EAR:7, R_EAR:8, L_SH:11, R_SH:12
const WANTED = [11, 12, 7, 8, 2, 5, 0];

let loggedOnce = false;

// (x,y,z) 형태의 포인트인지 검사
function isPoint(p: any) {
  return p && typeof p.x === "number" && typeof p.y === "number";
}

// 배열이 33개 포인트인지 검사
function looksLike33(arr: any): boolean {
  return Array.isArray(arr) && arr.length >= 33 && isPoint(arr[0]);
}

// 객체를 얕게 훑어서 33포인트 배열을 찾아봄
function shallowScan(obj: any): any[] | null {
  if (!obj || typeof obj !== "object") return null;

  // 1) 전형적인 케이스들
  const candidates = [
    obj.landmarks,
    obj.poseLandmarks,
    obj.keypoints,
    obj.results?.landmarks,
    obj.results?.poseLandmarks,
  ].filter(Boolean);

  for (const c of candidates) {
    if (Array.isArray(c)) {
      // [[33]] 또는 [33]
      if (Array.isArray(c[0])) {
        if (looksLike33(c[0])) return c[0];
      } else if (looksLike33(c)) {
        return c;
      }
    }
  }

  // 2) 객체의 모든 값 중에서 33포인트 배열을 찾아봄(얕은 탐색)
  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) {
      if (Array.isArray(v[0])) {
        if (looksLike33(v[0])) return v[0];
      } else if (looksLike33(v)) {
        return v;
      }
    }
  }
  return null;
}

/** frame 내부 어디에 있든 33 포인트 배열을 찾아 반환 */
export function extract33(frame: any): any[] | null {
  if (!frame) return null;

  const l33 = shallowScan(frame);
  if (!l33 && !loggedOnce) {
    loggedOnce = true;
    // 개발 확인용: 한 번만 구조를 로깅
    // eslint-disable-next-line no-console
    console.warn("[select7] landmarks를 찾지 못했습니다. frame 샘플:", JSON.parse(JSON.stringify(frame)));
  }
  if (!l33) return null;

  // z가 없는 구현도 있어 0 보정
  return l33.map((p: any) => ({ x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 }));
}

/** 33개에서 7 포인트만 골라 [x,y,z]*7 = 21 숫자로 평탄화 */
export function to21FromLandmarks(lms: any[]): number[] {
  if (!Array.isArray(lms) || lms.length < 13) return [];
  const out: number[] = [];
  for (const i of WANTED) {
    const p = lms[i];
    if (!p) return [];
    out.push(p.x ?? 0, p.y ?? 0, p.z ?? 0);
  }
  return out;
}

/** frame(임의 구조) → 21 숫자 배열 (실패 시 빈 배열) */
export function to21FromFrame(frame: any): number[] {
  const l33 = extract33(frame);
  if (!l33) return [];
  return to21FromLandmarks(l33);
}
