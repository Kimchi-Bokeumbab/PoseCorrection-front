// src/features/visualization/Legend.tsx
import React from "react";
import { POSTURE_LABELS } from "@/model/RuleClassifier";

const palette: Record<string, string> = {
  "정상": "#10b981",
  "목꺾임": "#ef4444",
  "거북목": "#f59e0b",
  "어깨 기울어짐": "#3b82f6",
  "뒤로 기대서 앉음": "#8b5cf6",
};

export default function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {POSTURE_LABELS.map((l) => (
        <div key={l} className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: palette[l] }} />
          <span className="text-muted-foreground">{l}</span>
        </div>
      ))}
    </div>
  );
}
