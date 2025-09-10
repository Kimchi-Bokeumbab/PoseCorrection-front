// src/hooks/usePoseStream.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseFrame } from "@/lib/model";
import { createPoseLandmarker, toPoseFrame } from "@/pose/mediapipe";

export function usePoseStream() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [landmarkerReady, setLandmarkerReady] = useState(false);
  const [lastFrame, setLastFrame] = useState<PoseFrame | null>(null);

  const landmarkerRef = useRef<Awaited<ReturnType<typeof createPoseLandmarker>> | null>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const ensureLandmarker = useCallback(async () => {
    if (!landmarkerRef.current) {
      landmarkerRef.current = await createPoseLandmarker();
      setLandmarkerReady(true);
    }
    return landmarkerRef.current;
  }, []);

  const loop = useCallback(() => {
    const video = videoRef.current;
    const lm = landmarkerRef.current;

    // 미리보기만 하는 단계에서는 lm이 없으므로 lastFrame 갱신 안 됨(=스켈레톤 없음)
    if (video && video.readyState >= 2 && lm) {
      try {
        const res = lm.detectForVideo(video, performance.now());
        const pf = toPoseFrame(res);
        if (pf) setLastFrame(pf);
      } catch (e) {
        console.warn("[mediapipe] detect error", e);
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  /** 미리보기만 시작 (스켈레톤 X) */
  const startPreview = useCallback(async () => {
    if (isRunning) return;
    const video = videoRef.current;
    if (!video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setIsRunning(true);
    } catch (e) {
      console.error("[camera] getUserMedia failed", e);
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [isRunning, loop]);

  /** 분석 시작 (스켈레톤 O) */
  const startDetect = useCallback(async () => {
    // 카메라가 꺼져 있으면 먼저 미리보기부터
    if (!isRunning) {
      await startPreview();
    }
    // 그 다음 Mediapipe 로더
    try {
      await ensureLandmarker();
    } catch (e) {
      console.warn("[mediapipe] load failed", e);
    }
  }, [ensureLandmarker, isRunning, startPreview]);

  const stop = useCallback(() => {
    setIsRunning(false);
    cancelAnimationFrame(rafRef.current);
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) v.srcObject = null;
    setLastFrame(null);
    setLandmarkerReady(false);
    landmarkerRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, isRunning, landmarkerReady, startPreview, startDetect, stop, lastFrame };
}
