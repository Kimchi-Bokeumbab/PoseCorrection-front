export type Keypoint = { x: number; y: number; name: string; score?: number };
export type PoseFrame = { ts: number; keypoints: Keypoint[] };

export interface PostureModel {
/** 초기화(가중치/런타임 로딩 등) */
init(opts?: Record<string, unknown>): Promise<void>;
/**
* 기준 좌표(baseline)와 현재 프레임(current)의 차이(델타)를 사용하여 5라벨 중 하나를 예측합니다.
* 구현체 내부에서 특징 추출/정규화/윈도잉을 수행해도 됩니다.
*/
predict(baseline: PoseFrame, current: PoseFrame): Promise<{
label: import("@/lib/constants").PostureLabel;
score: number; // 신뢰도(0~1)
extras?: Record<string, unknown>;
}>;
dispose?(): Promise<void>;
}
