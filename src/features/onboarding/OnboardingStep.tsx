// src/features/onboarding/OnboardingStep.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Camera, Check } from "lucide-react";
import { usePoseStream, PoseFrame } from "@/hooks/usePoseStream";
import {
  KP7_CONNECTIONS,
  validateKP7,
  stripXYZ,
} from "@/pose/mediapipe";
import CameraPlaceholder from "@/components/CameraPlaceholder";

async function captureStableKP7(
  getLastFrame: () => PoseFrame | null,
  timeoutMs = 1500
) {
  const end = performance.now() + timeoutMs;
  while (performance.now() < end) {
    const lf = getLastFrame();
    const kps = lf?.keypoints;
    if (kps) {
      const val = validateKP7(kps);
      if (val.ok) return kps;
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  return null;
}

export default function OnboardingStep({
  onNext,
}: {
  onNext: (p: { baseline: boolean }) => void;
}) {
  const [cameraOn, setCameraOn] = useState(false);
  const [videoReady, setVideoReady] = useState(false); // ✅ 비디오 준비 여부
  const [busy, setBusy] = useState(false);
  const [debugReasons, setDebugReasons] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    videoRef,
    isRunning,
    landmarkerReady,
    lastFrame,
    getLastFrame,
    startDetect,
    stop,
  } = usePoseStream();

  const statusText = useMemo(() => {
    if (!cameraOn) return "카메라 꺼짐";
    if (!videoReady) return "카메라 초기화 중…";
    if (!landmarkerReady) return "모델 로딩 중…";
    if (isRunning && lastFrame?.keypoints) return "검출 중";
    if (isRunning) return "카메라 켜짐";
    return "대기";
  }, [cameraOn, videoReady, landmarkerReady, isRunning, lastFrame]);

  // 오버레이: 점 + 연결선 + 디버그 텍스트
  useEffect(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      // 비디오 사이즈에 맞춰 캔버스 리사이즈 (비율 유지)
      const w = v.videoWidth || v.clientWidth || 1280;
      const h = v.videoHeight || v.clientHeight || 720;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      ctx.clearRect(0, 0, c.width, c.height);

      const kf = lastFrame?.keypoints;
      if (kf) {
        const val = validateKP7(kf);
        setDebugReasons(val.ok ? [] : val.reasons);

        const vMin = 0.1; // 다소 완화

        // 연결선
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#22c55e";
        KP7_CONNECTIONS.forEach(([a, b]) => {
          const p1 = kf[a];
          const p2 = kf[b];
          if (p1 && p2 && p1.v >= vMin && p2.v >= vMin) {
            ctx.beginPath();
            ctx.moveTo(p1.x * c.width, p1.y * c.height);
            ctx.lineTo(p2.x * c.width, p2.y * c.height);
            ctx.stroke();
          }
        });

        // 점
        kf.forEach((p) => {
          if (!p) return;
          const x = p.x * c.width;
          const y = p.y * c.height;
          const ok =
            p.v >= vMin &&
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x > -0.05 &&
            p.x < 1.05 &&
            p.y > -0.05 &&
            p.y < 1.05;

          ctx.fillStyle = ok ? "#3b82f6" : "#ef4444";
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        });

        // 검증 실패 메시지 (좌측 상단, 아주 작게)
        if (!val.ok) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
          ctx.font = "12px system-ui, sans-serif";
          ctx.fillText("7개 포인트가 선명히 보여야 합니다.", 10, 18);
        }
      }
      requestAnimationFrame(draw);
    };
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [lastFrame, videoRef]);

  const handleStartCam = useCallback(async () => {
    try {
      setBusy(true);
      setVideoReady(false);  // ✅ 켤 때 초기화
      await startDetect();
      setCameraOn(true);
    } catch (e) {
      console.error(e);
      alert("카메라 시작 실패");
    } finally {
      setBusy(false);
    }
  }, [startDetect]);

  const handleStopCam = useCallback(async () => {
    try {
      setBusy(true);
      await stop();
      setCameraOn(false);
      setVideoReady(false); // ✅ 끄면 초기화
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [stop]);

  const handleCaptureBaseline = useCallback(async () => {
    try {
      setBusy(true);
      const kps = await captureStableKP7(getLastFrame, 1500);
      if (!kps) {
        // 디버깅 로그
        const lf = getLastFrame();
        if (lf?.keypoints) {
          const val = validateKP7(lf.keypoints);
          console.log("[VALIDATE FAIL]", val.reasons);
        }
        alert("좌표 추출 실패: 얼굴·어깨가 모두 보이도록 정면에서 1초간 고정해 주세요.");
        return;
      }
      const resp = await fetch("http://127.0.0.1:5000/set_initial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keypoints: stripXYZ(kps) }), // 7 x [x,y,z]
      });
      const txt = await resp.text();
      console.log("[BASELINE] response:", resp.status, txt);

      if (!resp.ok) {
        alert("서버 오류로 기준 좌표 설정 실패 (Network 탭 확인).");
        return;
      }
      alert("기준 좌표가 설정되었습니다.");
      onNext({ baseline: true });
    } catch (e) {
      console.error(e);
      alert("기준 좌표 설정 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [getLastFrame, onNext]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* 좌측: 카메라/스켈레톤(비율 고정 + 플레이스홀더) */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            초기 기준 자세 설정
          </CardTitle>
          <CardDescription>
            정면을 바라보고 어깨와 얼굴이 프레임에 잘 들어오게 맞춘 뒤, 기준 좌표를 캡처해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="relative w-full aspect-video min-h-[260px] rounded-md border overflow-hidden bg-black"
            style={{ aspectRatio: "16/9" }}
          >
            {/* ✅ 카메라 OFF이거나, 비디오가 아직 준비 안된 경우 플레이스홀더 표시 */}
            {(!cameraOn || !videoReady) && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-white">
                <CameraPlaceholder />
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain bg-black"
              onLoadedData={() => setVideoReady(true)} // ✅ 비디오 준비 신호
              onCanPlay={() => setVideoReady(true)}    // ✅ 일부 브라우저 대비
              style={{ opacity: cameraOn ? 1 : 0 }}     // 카메라 OFF이면 투명 처리
            />

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ display: cameraOn && videoReady ? "block" : "none" }}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            상태: {statusText}
            {cameraOn && !landmarkerReady && <> • 모델 로딩 중…</>}
            {!cameraOn && <> • 카메라를 켜 주세요.</>}
            {cameraOn && !videoReady && <> • 카메라 초기화 중…</>}
          </div>

          {/* 필요 시 디버그 이유 표시 (개발용) */}
          {cameraOn && debugReasons.length > 0 && (
            <div className="text-xs text-red-600">
              유효성 실패 원인: {debugReasons.slice(0, 3).join(", ")}
              {debugReasons.length > 3 && " ..."}
            </div>
          )}

          <div className="flex gap-2">
            {!cameraOn ? (
              <Button onClick={handleStartCam} disabled={busy}>
                카메라 켜기
              </Button>
            ) : (
              <Button variant="outline" onClick={handleStopCam} disabled={busy}>
                카메라 끄기
              </Button>
            )}
            <Button onClick={handleCaptureBaseline} disabled={!cameraOn || busy}>
              기준 좌표 캡처
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            • 기준 좌표는 7개 포인트(양 어깨·양 귀·양 눈·코)가 모두 화면에 <b>선명히</b> 보일 때만 설정됩니다.
          </div>
        </CardContent>
      </Card>

      {/* 우측: 가이드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            캡처 가이드
          </CardTitle>
          <CardDescription>정확한 분석을 위한 가이드</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>얼굴(좌/우 눈·귀·코)과 양쪽 어깨가 모두 화면에 보여야 합니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>좌표가 흔들리지 않도록 캡처 전 1초간 자세를 유지해 주세요.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
