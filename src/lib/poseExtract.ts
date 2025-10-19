// src/lib/poseExtract.ts
// Mediapipe Pose 인덱스(웹): nose=0, left_eye=2, right_eye=5, left_ear=7, right_ear=8, left_shoulder=11, right_shoulder=12
const IDX = {
  nose: 0,
  left_eye: 2,
  right_eye: 5,
  left_ear: 7,
  right_ear: 8,
  left_shoulder: 11,
  right_shoulder: 12,
};

// lastFrame.landmarks: [{x,y,z?}, ...] (길이 33)
export function extract21FromLastFrame(lastFrame: any): number[] | null {
  try {
    const lms = lastFrame?.landmarks;
    if (!lms || lms.length < 13) return null;

    const pick = (i: number) => {
      const p = lms[i];
      const x = p?.x ?? 0;
      const y = p?.y ?? 0;
      // Mediapipe Web에서 z가 없을 수도 있어 기본 0
      const z = p?.z ?? 0;
      return [x, y, z];
    };

    const order = [
      IDX.left_shoulder,
      IDX.right_shoulder,
      IDX.left_ear,
      IDX.right_ear,
      IDX.left_eye,
      IDX.right_eye,
      IDX.nose,
    ];

    const arr: number[] = [];
    order.forEach((i) => arr.push(...pick(i)));
    // 길이 21
    return arr;
  } catch {
    return null;
  }
}
