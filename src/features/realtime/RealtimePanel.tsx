// src/features/realtime/RealtimePanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChartBar } from "lucide-react";
import type { PoseFrame } from "@/lib/model";
import { usePoseStream } from "@/hooks/usePoseStream";
import { usePostureEngine } from "@/engine/PostureEngine";
import { POSTURE_LABELS, type PostureLabel } from "@/model/RuleClassifier";
import { logEvent } from "@/data/db";

export default function RealtimePanel({
  baseline,
  onEnabledChange,
}: {
  baseline?: PoseFrame | null;
  onEnabledChange?: (v: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const { videoRef, isRunning, landmarkerReady, startDetect, stop, lastFrame } = usePoseStream();

  // 엔진
  const { state, api } = usePostureEngine({
    enabled,
    baseline: baseline ?? null,
    frame: lastFrame,
    smoothWindow: 10,
    autoCalibFrames: 30,
  });

  // enabled 변화에 따라 카메라/분석 시작·정지
  useEffect(() => {
    if (enabled && !isRunning) startDetect();
    if (!enabled && isRunning) stop();
  }, [enabled, isRunning, startDetect, stop]);

  // 언마운트 시 자원 정리(안전)
  useEffect(() => () => stop(), [stop]);

  // 초기 렌더 시 상위(AppShell)와 상태 동기화
  useEffect(() => {
    onEnabledChange?.(enabled);
    // 초기 한 번만 동기화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 실데이터 로깅: 라벨이 바뀌었거나 최소 2초마다 기록 ----
  const lastLogAtRef = useRef<number>(0);
  const lastLabelRef = useRef<PostureLabel | null>(null);

  useEffect(() => {
    if (!enabled || !state.ready) return;
    const now = Date.now();
    const changed = state.label !== lastLabelRef.current;
    const due = now - (lastLogAtRef.current || 0) > 2000; // 2s

    if (changed || due) {
      logEvent(state.label, state.score).catch((e) =>
        console.error("[RealtimePanel] logEvent error:", e)
      );
      lastLogAtRef.current = now;
      lastLabelRef.current = state.label;
    }
  }, [enabled, state.label, state.score, state.ready]);

  // 라벨 색상 팔레트(고정)
  const palette = useMemo(
    () => ({
      정상: "#10b981",
      목꺾임: "#ef4444",
      거북목: "#f59e0b",
      "어깨 기울어짐": "#3b82f6",
      "뒤로 기대서 앉음": "#8b5cf6",
    }),
    []
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ChartBar className="h-5 w-5" /> 실시간 자세 교정
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <span>{enabled ? "ON" : "OFF"} (백그라운드 포함)</span>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                setEnabled(v);
                onEnabledChange?.(v); // 상위와 동기화
              }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 비디오 (분석 모드) */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border bg-black/60">
            <video
              ref={videoRef}
              className="h-full w-full object-cover transform -scale-x-100"
              autoPlay
              muted
              playsInline
            />
            {/* 필요하면 PoseOverlay 추가 가능 */}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant={isRunning ? "secondary" : "outline"}>
              카메라: {isRunning ? "동작" : "정지"}
            </Badge>
            <Badge variant={landmarkerReady ? "secondary" : "outline"}>
              Mediapipe: {landmarkerReady ? "준비됨" : "대기"}
            </Badge>
            <Badge variant={state.ready ? "secondary" : "outline"}>
              Baseline: {state.ready ? "OK" : "캘리브레이션 중"}
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-muted-foreground">카운트 리셋</span>
              <Button size="sm" variant="outline" onClick={() => api.resetCounts()}>
                Reset
              </Button>
            </div>
          </div>

          {/* 현재 라벨 */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">현재 상태</div>
            <Badge style={{ background: palette[state.label], color: "white" }}>
              {state.label} {state.score > 0 ? `(${Math.round(state.score * 100)}%)` : ""}
            </Badge>
          </div>

          {/* 라벨별 누적 카운트 미니 막대 */}
          <div className="grid gap-2">
            {POSTURE_LABELS.map((lab) => {
              const v = state.counts[lab] ?? 0;
              const w = Math.min(100, v); // 단순 비율 시각화(최대 100%)
              return (
                <div key={lab} className="flex items-center gap-3">
                  <div className="w-36 text-sm">{lab}</div>
                  <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-3" style={{ width: `${w}%`, background: palette[lab] }} />
                  </div>
                  <div className="w-10 tabular-nums text-right text-sm">{v}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
