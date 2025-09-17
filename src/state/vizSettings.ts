// src/state/vizSettings.ts
export type WeekMode = "sum" | "byLabel";
export type TrendMode = "daily" | "cumulative";

export type VizSettings = {
  showBar: boolean;        // 라벨별 누적 막대
  showHourly: boolean;     // 시간대 히트맵(0~23시)
  showWeekly: boolean;     // 주간 히트맵(요일×시간)
  weeklyMode: WeekMode;    // 주간 히트맵 모드
  showDailyStack: boolean; // 최근 7일 스택 막대
  showTrend: boolean;      // 일자별 추이선
  trendMode: TrendMode;    // 추이선 모드
};

const KEY = "posturecare_viz_settings_v1";

export const defaultVizSettings: VizSettings = {
  showBar: true,
  showHourly: true,
  showWeekly: true,
  weeklyMode: "byLabel",
  showDailyStack: true,
  showTrend: true,
  trendMode: "daily",
};

export function loadVizSettings(): VizSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultVizSettings };
    const parsed = JSON.parse(raw) as Partial<VizSettings>;
    // 기본값과 병합
    return { ...defaultVizSettings, ...parsed };
  } catch {
    return { ...defaultVizSettings };
  }
}

export function saveVizSettings(s: VizSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

// 간단 훅: settings + 부분 업데이트 함수 제공
import { useEffect, useState } from "react";
export function useVizSettings() {
  const [settings, setSettings] = useState<VizSettings>(() => loadVizSettings());
  useEffect(() => { saveVizSettings(settings); }, [settings]);

  function update(partial: Partial<VizSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }
  function reset() {
    setSettings({ ...defaultVizSettings });
  }
  return { settings, update, reset };
}
