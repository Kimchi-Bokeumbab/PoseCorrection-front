// src/engine/PostureEngine.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { PoseFrame } from "@/lib/model";
import { POSTURE_LABELS, PostureLabel, predictLabel } from "@/model/RuleClassifier";

type EngineState = {
  ready: boolean;                 // baseline 준비됨
  label: PostureLabel;
  score: number;
  counts: Record<PostureLabel, number>;
  metrics?: ReturnType<typeof predictLabel>["metrics"];
};

const emptyCounts = () =>
  POSTURE_LABELS.reduce((acc, k) => ((acc[k] = 0), acc), {} as Record<PostureLabel, number>);

function averageFrames(frames: PoseFrame[]): PoseFrame {
  const n = frames.length || 1;
  const names = frames[0].keypoints.map(k => k.name);
  const sums = new Map<string, { x: number; y: number }>();
  for (const name of names) sums.set(name, { x: 0, y: 0 });

  for (const f of frames) {
    for (const k of f.keypoints) {
      const s = sums.get(k.name)!;
      s.x += k.x; s.y += k.y;
    }
  }
  return {
    ts: Date.now(),
    keypoints: names.map(name => {
      const s = sums.get(name)!;
      return { name, x: s.x / n, y: s.y / n };
    }),
  };
}

function majority(arr: PostureLabel[]): PostureLabel {
  const m = new Map<PostureLabel, number>();
  for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
  let best: PostureLabel = "정상", bestN = -1;
  for (const [k, n] of m) if (n > bestN) { best = k; bestN = n; }
  return best;
}

export function usePostureEngine(opts: {
  enabled: boolean;
  baseline?: PoseFrame | null;
  frame: PoseFrame | null;
  smoothWindow?: number;      // default 10
  autoCalibFrames?: number;   // default 30
}) {
  const { enabled, baseline, frame } = opts;
  const smoothN = opts.smoothWindow ?? 10;
  const calibN = opts.autoCalibFrames ?? 30;

  const [state, setState] = useState<EngineState>({
    ready: false,
    label: "정상",
    score: 0,
    counts: emptyCounts(),
  });

  const baselineRef = useRef<PoseFrame | null>(baseline ?? null);
  const windowRef = useRef<PostureLabel[]>([]);
  const calibBuf = useRef<PoseFrame[]>([]);

  useEffect(() => { if (baseline) baselineRef.current = baseline; }, [baseline]);

  // 메인 루프: frame이 갱신될 때마다 호출
  useEffect(() => {
    if (!enabled || !frame) return;

    // baseline 없으면 자동 캘리브레이션
    if (!baselineRef.current) {
      calibBuf.current.push(frame);
      if (calibBuf.current.length >= calibN) {
        baselineRef.current = averageFrames(calibBuf.current);
        calibBuf.current = [];
        setState(s => ({ ...s, ready: true }));
      } else {
        setState(s => ({ ...s, ready: false })); // 아직 준비 안 됨
      }
      return;
    }

    // 예측
    const res = predictLabel(baselineRef.current, frame);
    // 스무딩
    windowRef.current.push(res.label);
    if (windowRef.current.length > smoothN) windowRef.current.shift();
    const smoothLabel = majority(windowRef.current);

    setState(prev => ({
      ready: true,
      label: smoothLabel,
      score: res.score,
      counts: { ...prev.counts, [res.label]: (prev.counts[res.label] ?? 0) + 1 },
      metrics: res.metrics,
    }));
  }, [enabled, frame, smoothN, calibN]);

  // 리셋/기준 재설정용 API
  const api = useMemo(() => ({
    resetCounts() { setState(s => ({ ...s, counts: emptyCounts() })); },
    setBaseline(f: PoseFrame) {
      baselineRef.current = f;
      windowRef.current = [];
      calibBuf.current = [];
      setState(s => ({ ...s, ready: true }));
    },
    clearBaseline() {
      baselineRef.current = null;
      windowRef.current = [];
      calibBuf.current = [];
      setState(s => ({ ...s, ready: false }));
    },
  }), []);

  return { state, api };
}
