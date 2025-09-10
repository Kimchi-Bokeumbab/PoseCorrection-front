// src/components/PoseOverlay.tsx
import React, { useEffect, useRef } from "react";
import type { PoseFrame } from "@/lib/model";

export default function PoseOverlay({
  videoRef,
  frame,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  frame: PoseFrame | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = video.clientWidth || video.videoWidth || 640;
    const h = video.clientHeight || video.videoHeight || 360;

    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!frame) return;

    const P: Record<string, { x: number; y: number }> = {};
    for (const k of frame.keypoints) P[k.name] = { x: k.x * canvas.width, y: k.y * canvas.height };

    const line = (a: string, b: string) => {
      const p = P[a], q = P[b];
      if (!p || !q) return;
      ctx.strokeStyle = "rgba(16,185,129,0.9)"; // emerald
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    };
    const dot = (a: string) => {
      const p = P[a]; if (!p) return;
      ctx.fillStyle = "#10b981";
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 * dpr, 0, Math.PI * 2); ctx.fill();
    };

    line("head", "neck");
    line("shoulder_l", "shoulder_r");
    line("neck", "shoulder_l");
    line("neck", "shoulder_r");
    line("hip_l", "hip_r");
    line("shoulder_l", "hip_l");
    line("shoulder_r", "hip_r");

    ["head", "neck", "shoulder_l", "shoulder_r", "hip_l", "hip_r"].forEach(dot);
  }, [videoRef, frame]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none transform -scale-x-100" />;
}
