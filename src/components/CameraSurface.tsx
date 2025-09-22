// src/components/CameraSurface.tsx
import React from "react";
import CameraPlaceholder from "./CameraPlaceholder";

type Props = {
  cameraOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  placeholder?: React.ReactNode;
};

export default function CameraSurface({
  cameraOn,
  videoRef,
  canvasRef,
  placeholder,
}: Props) {
  return (
    <div className="relative w-full">
      {/* 16:9 비율 유지용 스페이서 */}
      <div style={{ paddingTop: "56.25%" }} /> {/* 9 / 16 * 100 = 56.25% */}

      {/* 실제 렌더 박스 */}
      <div className="absolute inset-0 rounded-md border overflow-hidden bg-black/5">
        {/* 카메라 OFF일 때 Placeholder */}
        {!cameraOn && (
          <div className="absolute inset-0 grid place-items-center bg-white z-10">
            {placeholder ?? <CameraPlaceholder />}
          </div>
        )}

        {/* 비디오 / 캔버스 (카메라 ON일 때만 표시) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain"
          style={{ display: cameraOn ? "block" : "none" }}
        />
        {canvasRef && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ display: cameraOn ? "block" : "none" }}
          />
        )}
      </div>
    </div>
  );
}
