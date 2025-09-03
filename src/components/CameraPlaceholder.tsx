import React from "react";
import { Camera } from "lucide-react";

export default function CameraPlaceholder({ children }:{ children?: React.ReactNode }){
  return (
    <div className="relative aspect-video w-full rounded-2xl border-2 border-dashed grid place-items-center bg-emerald-50/40 overflow-hidden">
      <div className="text-center pointer-events-none select-none">
        <Camera className="mx-auto mb-2 opacity-60" />
        <p className="text-sm text-muted-foreground">카메라 영역 (현재 비활성화)</p>
      </div>
      {children ? (
        <div className="absolute inset-0 pointer-events-none">{children}</div>
      ) : null}
    </div>
  );
}