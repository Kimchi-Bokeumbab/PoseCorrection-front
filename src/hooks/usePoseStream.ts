// src/hooks/usePoseStream.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { pick7LandmarksV, KP7V } from "@/pose/mediapipe";

export type PoseFrame = { ts: number; keypoints: KP7V };

export function usePoseStream(opts?: { onFrame?: (f: PoseFrame) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [landmarkerReady, setLandmarkerReady] = useState(false);
  const [lastFrame, setLastFrame] = useState<PoseFrame | null>(null);

  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRunning(false);
    startingRef.current = false;
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    setLandmarkerReady(false);

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      },
      numPoses: 1,
      runningMode: "VIDEO",
      minPoseDetectionConfidence: 0.3,
      minPosePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });
    landmarkerRef.current = landmarker;
    setLandmarkerReady(true);
    return landmarker;
  }, []);

  const waitLoadedMetadata = (v: HTMLVideoElement) =>
    new Promise<void>((resolve) => {
      if (v.readyState >= 1 && v.videoWidth > 0 && v.videoHeight > 0) {
        resolve();
      } else {
        const onLoaded = () => {
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            v.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          }
        };
        v.addEventListener("loadedmetadata", onLoaded);
      }
    });

  const startDetect = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      stop();

      const v = videoRef.current;
      if (!v) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      v.srcObject = stream;

      try {
        await v.play();
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.warn("[usePoseStream] video.play() error", e);
        }
      }
      await waitLoadedMetadata(v);

      streamRef.current = stream;
      setIsRunning(true);

      await ensureLandmarker();

      const loop = () => {
        if (!v || v.readyState < 2 || !landmarkerRef.current) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const now = performance.now();
        const res: PoseLandmarkerResult = landmarkerRef.current.detectForVideo(v, now);
        // 최신 Tasks-vision은 res.landmarks 배열에 화면 좌표가 들어옵니다.
        const raw = (res.landmarks ?? res.poseLandmarks)?.[0];
        const kp7 = raw ? pick7LandmarksV(raw) : null;
        if (kp7) {
          const frame = { ts: Date.now(), keypoints: kp7 };
          setLastFrame(frame);
          opts?.onFrame?.(frame);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } finally {
      startingRef.current = false;
    }
  }, [ensureLandmarker, stop, opts]);

  const getLastFrame = useCallback(() => lastFrame, [lastFrame]);

  return {
    videoRef,
    isRunning,
    landmarkerReady,
    lastFrame,
    getLastFrame,
    startDetect,
    stop,
  };
}
