// src/features/realtime/RealtimePanel.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import CameraPlaceholder from "../../components/CameraPlaceholder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { usePoseStream } from "@/hooks/usePoseStream";
import { KP7_CONNECTIONS, validateKP7, stripXYZ } from "@/pose/mediapipe";
import { predictPosture, setInitialBaseline } from "@/lib/api";
import { captureStableKP7 } from "@/lib/baseline";

export default function RealtimePanel({
  enabled,
  onToggle,
  userEmail,
  onBaselineStored,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  userEmail: string;
  onBaselineStored?: (value: boolean) => void;
}) {
  const { videoRef, startDetect, stop, lastFrame, isRunning, getLastFrame } = usePoseStream(); // ✅ isRunning 사용
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "collect" | "predict" | "error">("idle");
  const [lastLabel, setLastLabel] = useState<string>("-");
  const [errMsg, setErrMsg] = useState<string>("");
  const [baselineFeedback, setBaselineFeedback] = useState<
    | {
        kind: "success" | "error";
        message: string;
      }
    | null
  >(null);
  const [baselineBusy, setBaselineBusy] = useState(false);

  const bufRef = useRef<[number, number, number][][]>([]);
  const sendTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const w = v.videoWidth || v.clientWidth;
      const h = v.videoHeight || v.clientHeight;
      if (w && h) {
        c.width = w;
        c.height = h;
      }
      ctx.clearRect(0, 0, c.width, c.height);

      const kf = lastFrame?.keypoints;
      if (kf) {
        const val = validateKP7(kf);
        const vMin = 0.5;

        // 라인
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#22c55e";
        KP7_CONNECTIONS.forEach(([a, b]) => {
          const p1 = kf[a];
          const p2 = kf[b];
          if (p1.v >= vMin && p2.v >= vMin) {
            ctx.beginPath();
            ctx.moveTo(p1.x * c.width, p1.y * c.height);
            ctx.lineTo(p2.x * c.width, p2.y * c.height);
            ctx.stroke();
          }
        });

        // 점
        kf.forEach((p) => {
          const x = p.x * c.width;
          const y = p.y * c.height;
          const ok =
            p.v >= vMin &&
            p.x >= 0 &&
            p.x <= 1 &&
            p.y >= 0 &&
            p.y <= 1 &&
            Number.isFinite(p.z);
          ctx.fillStyle = ok ? "#3b82f6" : "#ef4444";
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        });

        if (val.ok) {
          const xyz7 = stripXYZ(kf);
          bufRef.current.push(xyz7);
          if (bufRef.current.length > 20) bufRef.current.shift();
        }
      }
      requestAnimationFrame(draw);
    };

    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [lastFrame, videoRef]);

  useEffect(() => {
    async function start() {
      try {
        await startDetect();
        setStatus("collect");
        setErrMsg("");
      } catch (e: any) {
        console.error(e);
        setStatus("error");
        setErrMsg("카메라 시작 실패");
      }
    }
    async function stopAll() {
      try {
        if (sendTimerRef.current) {
          window.clearInterval(sendTimerRef.current);
          sendTimerRef.current = null;
        }
        bufRef.current = [];
        await stop();
        setStatus("idle");
      } catch (e) {
        console.error(e);
      }
    }

    if (enabled) {
      start();
      sendTimerRef.current = window.setInterval(async () => {
        try {
          if (!userEmail) return;
          const B = bufRef.current;
          if (B.length < 3) return;
          setStatus("predict");

          const n = B.length;
          const frames = [B[0], B[Math.floor(n / 2)], B[n - 1]];
          const data = await predictPosture({
            email: userEmail,
            frames,
            recordedAt: new Date().toISOString(),
          });
          if (data?.label) {
            setLastLabel(data.label);
            setStatus("collect");
          }
          bufRef.current = B.slice(-3);
        } catch (e) {
          console.error(e);
          const message = e instanceof Error ? e.message : "네트워크 오류";
          setErrMsg(message);
          setStatus("error");
        }
      }, 800) as unknown as number;
    } else {
      stopAll();
    }

    return () => {
      if (sendTimerRef.current) {
        window.clearInterval(sendTimerRef.current);
        sendTimerRef.current = null;
      }
    };
  }, [enabled, startDetect, stop, userEmail]);

  const statusText = useMemo(() => {
    if (!enabled) return "OFF";
    if (status === "collect") return "분석 대기중";
    if (status === "predict") return "예측 중…";
    if (status === "error") return `오류: ${errMsg || "-"}`;
    return "대기";
  }, [enabled, status, errMsg]);

  const handleSetBaseline = useCallback(async () => {
    if (!isRunning) {
      setBaselineFeedback({
        kind: "error",
        message: "카메라를 켜고 기준 자세를 유지한 뒤 다시 시도하세요.",
      });
      return;
    }

    setBaselineBusy(true);
    setBaselineFeedback(null);
    try {
      const kps = await captureStableKP7(getLastFrame, 1500);
      if (!kps) {
        setBaselineFeedback({
          kind: "error",
          message: "기준 좌표 추출 실패: 1초간 정면에서 자세를 유지해주세요.",
        });
        return;
      }

      await setInitialBaseline({ email: userEmail, keypoints: stripXYZ(kps) });
      setBaselineFeedback({ kind: "success", message: "기준 좌표가 설정되었습니다." });
      onBaselineStored?.(true);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "기준 좌표 설정에 실패했습니다.";
      setBaselineFeedback({ kind: "error", message: `기준 좌표 설정 실패: ${message}` });
    } finally {
      setBaselineBusy(false);
    }
  }, [getLastFrame, isRunning, onBaselineStored, userEmail]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />실시간 자세교정</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{enabled ? "ON" : "OFF"}</span>
              <Switch checked={enabled} onCheckedChange={onToggle} />
            </div>
          </CardTitle>
          <CardDescription>카메라 기반 실시간 분석</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* ✅ aspect-video로 높이 확보 + Placeholder 조건 개선 */}
          <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-black/5">
            {(!enabled || !isRunning) && (
              <div className="absolute inset-0 grid place-items-center bg-white z-10">
                <CameraPlaceholder />
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: enabled ? "block" : "none" }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ display: enabled && isRunning ? "block" : "none" }}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            상태: {statusText}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={handleSetBaseline} disabled={baselineBusy} size="sm">
              {baselineBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              기준 자세 다시 설정
            </Button>
            {baselineFeedback && (
              <p
                className={`text-sm ${
                  baselineFeedback.kind === "error" ? "text-destructive" : "text-emerald-600"
                }`}
              >
                {baselineFeedback.message}
              </p>
            )}
          </div>
          <div className="text-sm">
            최근 예측: <span className="font-medium">{lastLabel}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상태</CardTitle>
          <CardDescription>서비스 요약</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>실행 상태: {enabled ? "동작" : "중지"}</div>
          <div>백엔드 연결: {status === "error" ? "오류" : "정상"}</div>
        </CardContent>
      </Card>
    </div>
  );
}
