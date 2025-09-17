// src/features/visualization/VisualizationPanel.tsx
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon } from "lucide-react";
import { POSTURE_LABELS, type PostureLabel } from "@/model/RuleClassifier";
import { useCounts } from "./useCounts";
import { clearEvents } from "@/data/db";
import Legend from "./Legend";
import { useHourlyHeatmap } from "./useHourlyHeatmap";
import { useWeeklyHeatmap } from "./useWeeklyHeatmap";
import { useWeeklyHeatmapByLabel } from "./useWeeklyHeatmapByLabel";
import { useDailyStack } from "./useDailyStack";
import { useDailyTrend } from "./useDailyTrend";
import { useVizSettings, type WeekMode, type TrendMode } from "@/state/vizSettings";

const palette: Record<string, string> = {
  "정상": "#10b981",
  "목꺾임": "#ef4444",
  "거북목": "#f59e0b",
  "어깨 기울어짐": "#3b82f6",
  "뒤로 기대서 앉음": "#8b5cf6",
};
const rgba: Record<string, [number, number, number]> = {
  "정상": [16, 185, 129],
  "목꺾임": [239, 68, 68],
  "거북목": [245, 158, 11],
  "어깨 기울어짐": [59, 130, 246],
  "뒤로 기대서 앉음": [139, 92, 246],
};

type RangeKey = "today" | "7d" | "30d" | "all";
function rangeToSinceTs(key: RangeKey): number | undefined {
  const now = Date.now();
  const d = new Date();
  if (key === "today") { d.setHours(0, 0, 0, 0); return d.getTime(); }
  if (key === "7d") return now - 1000 * 60 * 60 * 24 * 7;
  if (key === "30d") return now - 1000 * 60 * 60 * 24 * 30;
  return undefined;
}

export default function VisualizationPanel() {
  const [range, setRange] = useState<RangeKey>("all");
  const [showSettings, setShowSettings] = useState(false);
  const sinceTs = rangeToSinceTs(range);

  // 🔧 사용자 시각화 환경설정 (localStorage 지속)
  const { settings, update, reset } = useVizSettings();

  // 라벨별 카운트
  const { counts, total, loading } = useCounts({ sinceTs });

  // 시간대(0~23) 히트맵 (정상 제외)
  const { hours, max } = useHourlyHeatmap({ sinceTs, excludeNormal: true });

  // 주간(요일×시간) — 합산/라벨별
  const { grid: gridSum, max: weekMax } = useWeeklyHeatmap({ sinceTs, excludeNormal: true });
  const { grid: gridByLabel } = useWeeklyHeatmapByLabel({ sinceTs, excludeNormal: true });

  // 최근 7일 스택 막대 (정상 제외)
  const { series, maxTotal, badLabels } = useDailyStack({ days: 7, sinceTs });

  // 일자별 추이선 (정상 제외)
  const { labels: trendLabels, daily, cumulative, maxDaily, maxCumu } = useDailyTrend({
    sinceTs,
    daysDefault: 30,
    excludeNormal: true,
  });
  const lineY = settings.trendMode === "daily" ? daily : cumulative;
  const yMax = settings.trendMode === "daily" ? maxDaily : maxCumu;
  const lineColor = settings.trendMode === "daily" ? "#3b82f6" : "#8b5cf6";

  // TOP 3 (정상 제외)
  const rankedBad = useMemo(() => {
    const items = (POSTURE_LABELS as PostureLabel[])
      .filter(l => l !== "정상")
      .map(l => ({ label: l, v: counts[l] ?? 0 }));
    items.sort((a, b) => b.v - a.v);
    return items.slice(0, 3);
  }, [counts]);

  const maxBar = useMemo(() => Math.max(1, ...POSTURE_LABELS.map(l => counts[l] ?? 0)), [counts]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>자세 데이터 시각화</CardTitle>
          <CardDescription>실시간으로 수집된 이벤트를 기간별로 집계합니다.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* 시간 범위 필터 */}
          <div className="flex items-center gap-1 text-xs">
            <FilterButton active={range === "today"} onClick={() => setRange("today")}>오늘</FilterButton>
            <FilterButton active={range === "7d"} onClick={() => setRange("7d")}>7일</FilterButton>
            <FilterButton active={range === "30d"} onClick={() => setRange("30d")}>30일</FilterButton>
            <FilterButton active={range === "all"} onClick={() => setRange("all")}>전체</FilterButton>
          </div>
          <Button variant="outline" size="sm" onClick={() => clearEvents()}>데이터 초기화</Button>
          <Button variant="secondary" size="sm" className="gap-1" onClick={() => setShowSettings(v => !v)}>
            <SettingsIcon className="h-4 w-4" /> 보기 설정
          </Button>
        </div>
      </CardHeader>

      {/* ⚙️ 보기 설정 패널 */}
      {showSettings && (
        <div className="px-6 pb-2">
          <div className="rounded-lg border p-3 grid gap-3 sm:grid-cols-2">
            <SettingSwitch
              label="라벨별 누적 막대"
              checked={settings.showBar}
              onChange={(v) => update({ showBar: v })}
            />
            <SettingSwitch
              label="시간대 히트맵(0–23시)"
              checked={settings.showHourly}
              onChange={(v) => update({ showHourly: v })}
            />
            <SettingSwitch
              label="주간 히트맵(요일×시간)"
              checked={settings.showWeekly}
              onChange={(v) => update({ showWeekly: v })}
            />
            {settings.showWeekly && (
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">주간 히트맵 모드</div>
                <div className="flex items-center gap-1 text-xs">
                  <FilterButton active={settings.weeklyMode === "sum"} onClick={() => update({ weeklyMode: "sum" })}>합산</FilterButton>
                  <FilterButton active={settings.weeklyMode === "byLabel"} onClick={() => update({ weeklyMode: "byLabel" })}>라벨별</FilterButton>
                </div>
              </div>
            )}
            <SettingSwitch
              label="최근 7일 스택 막대"
              checked={settings.showDailyStack}
              onChange={(v) => update({ showDailyStack: v })}
            />
            <SettingSwitch
              label="일자별 추이선"
              checked={settings.showTrend}
              onChange={(v) => update({ showTrend: v })}
            />
            {settings.showTrend && (
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                <div className="text-sm text-muted-foreground">추이선 모드</div>
                <div className="flex items-center gap-1 text-xs">
                  <FilterButton active={settings.trendMode === "daily"} onClick={() => update({ trendMode: "daily" })}>일별</FilterButton>
                  <FilterButton active={settings.trendMode === "cumulative"} onClick={() => update({ trendMode: "cumulative" })}>누적</FilterButton>
                </div>
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={reset}>설정 초기화</Button>
            </div>
          </div>
        </div>
      )}

      <CardContent className="space-y-8">
        <Legend />

        {/* 요약 + TOP3 */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="text-muted-foreground">
            총 이벤트: <span className="tabular-nums">{total}</span>
            {loading && <span className="ml-2">…로딩</span>}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {rankedBad.map(it => {
              const pct = total ? Math.round((it.v / total) * 100) : 0;
              return (
                <span key={it.label} className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs"
                  style={{ background: palette[it.label], color: "white" }}
                  title={`${it.label}: ${it.v}회 (${pct}%)`}>
                  {it.label}
                  <span className="bg-white/25 rounded px-1 tabular-nums">{it.v}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* 라벨별 누적 막대 */}
        {settings.showBar && (
          <section className="space-y-3">
            <div className="text-sm font-medium">라벨별 누적</div>
            <div className="grid gap-3">
              {POSTURE_LABELS.map((lab) => {
                const v = counts[lab] ?? 0;
                const pct = total ? Math.round((v / total) * 100) : 0;
                const barW = `${Math.round((v / maxBar) * 100)}%`;
                return (
                  <div key={lab} className="flex items-center gap-3" title={`${lab}: ${v}회 (${pct}%)`}>
                    <div className="w-36 text-sm">{lab}</div>
                    <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-3 transition-[width] duration-300" style={{ width: barW, background: palette[lab] }} />
                    </div>
                    <div className="w-20 text-right text-sm tabular-nums">
                      {v} <span className="text-muted-foreground">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 시간대 히트맵 */}
        {settings.showHourly && (
          <section className="space-y-2">
            <div className="text-sm font-medium">시간대별 발생(정상 제외)</div>
            <div className="grid grid-cols-12 gap-1 sm:gap-1.5">
              {hours.map((c, h) => {
                const alpha = max ? Math.max(0.1, c / max) : 0;
                return (
                  <div key={h} className="flex flex-col items-center gap-1">
                    <div
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded"
                      style={{ background: `rgba(16,185,129,${alpha})` }}
                      title={`${h}시: ${c}회`}
                    />
                    <div className="text-[10px] text-muted-foreground tabular-nums">{h}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 주간 히트맵 */}
        {settings.showWeekly && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">주간 히트맵(요일×시간, 정상 제외)</div>
              <div className="flex items-center gap-1 text-xs">
                <FilterButton active={settings.weeklyMode === "sum"} onClick={() => update({ weeklyMode: "sum" })}>합산</FilterButton>
                <FilterButton active={settings.weeklyMode === "byLabel"} onClick={() => update({ weeklyMode: "byLabel" })}>라벨별</FilterButton>
              </div>
            </div>

            {settings.weeklyMode === "sum" ? (
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="flex flex-col justify-between py-1">
                  {["월","화","수","목","금","토","일"].map((d) => (
                    <div key={d} className="h-8 sm:h-9 flex items-center justify-end pr-2 text-xs text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <div className="grid" style={{ gridTemplateColumns: `repeat(24, minmax(1.75rem, 1fr))`, gap: "0.25rem" }}>
                    {gridSum.map((row, rIdx) =>
                      row.map((c, h) => {
                        const alpha = weekMax ? Math.max(0.08, c / weekMax) : 0;
                        return (
                          <div
                            key={`${rIdx}-${h}`}
                            className="h-8 sm:h-9 rounded"
                            style={{ background: `rgba(59,130,246,${alpha})` }}
                            title={`${["월","화","수","목","금","토","일"][rIdx]}요일 ${h}시: ${c}회`}
                          />
                        );
                      })
                    )}
                  </div>
                  <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(24, minmax(1.75rem, 1fr))` }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="text-[10px] text-center text-muted-foreground tabular-nums">{h}</div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <div className="flex flex-col justify-between py-1">
                  {["월","화","수","목","금","토","일"].map((d) => (
                    <div key={d} className="h-8 sm:h-9 flex items-center justify-end pr-2 text-xs text-muted-foreground">{d}</div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <div className="grid" style={{ gridTemplateColumns: `repeat(24, minmax(1.75rem, 1fr))`, gap: "0.25rem" }}>
                    {gridByLabel.map((row, rIdx) =>
                      row.map((cell, h) => {
                        const cellTotal = ["목꺾임","거북목","어깨 기울어짐","뒤로 기대서 앉음"].reduce((a,l)=>a+(cell[l as PostureLabel]||0),0);
                        const alphaOf = (lab: PostureLabel) => {
                          const v = cell[lab] ?? 0;
                          if (!cellTotal) return 0;
                          return Math.max(0.08, v / cellTotal);
                        };
                        const quad = (lab: PostureLabel) => {
                          const [r,g,b] = rgba[lab];
                          const a = alphaOf(lab);
                          return `rgba(${r},${g},${b},${a})`;
                        };
                        return (
                          <div key={`${rIdx}-${h}`} className="h-8 sm:h-9 rounded overflow-hidden">
                            <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
                              <div title={`목꺾임 ${cell["목꺾임"]||0}회`} style={{ background: quad("목꺾임" as PostureLabel) }} />
                              <div title={`거북목 ${cell["거북목"]||0}회`} style={{ background: quad("거북목" as PostureLabel) }} />
                              <div title={`어깨 기울어짐 ${cell["어깨 기울어짐"]||0}회`} style={{ background: quad("어깨 기울어짐" as PostureLabel) }} />
                              <div title={`뒤로 기대서 앉음 ${cell["뒤로 기대서 앉음"]||0}회`} style={{ background: quad("뒤로 기대서 앉음" as PostureLabel) }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-1 grid" style={{ gridTemplateColumns: `repeat(24, minmax(1.75rem, 1fr))` }}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div key={h} className="text-[10px] text-center text-muted-foreground tabular-nums">{h}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 최근 7일 스택 막대 */}
        {settings.showDailyStack && (
          <section className="space-y-2">
            <div className="text-sm font-medium">최근 7일(정상 제외)</div>
            <div className="flex items-end gap-2">
              {series.map((d) => {
                const total = Math.max(1, d.total);
                return (
                  <div key={d.dayKey} className="flex flex-col items-center gap-1">
                    <div className="flex flex-col justify-end h-32 w-6 rounded bg-gray-100 overflow-hidden">
                      {badLabels.map((lab) => {
                        const v = d.counts[lab] ?? 0;
                        if (v === 0) return null;
                        const h = Math.max(2, Math.round((v / total) * 128));
                        return <div key={lab} style={{ height: h, background: palette[lab] }} title={`${d.dayKey} ${lab}: ${v}회`} />;
                      })}
                    </div>
                    <div className="text-[10px] tabular-nums text-muted-foreground">{d.dayKey}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 일자별 추이선 */}
        {settings.showTrend && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">일자별 추이선(정상 제외)</div>
              <div className="flex items-center gap-1 text-xs">
                <FilterButton active={settings.trendMode === "daily"} onClick={() => update({ trendMode: "daily" })}>일별</FilterButton>
                <FilterButton active={settings.trendMode === "cumulative"} onClick={() => update({ trendMode: "cumulative" })}>누적</FilterButton>
              </div>
            </div>
            <LineChartSVG
              labels={trendLabels}
              values={lineY}
              color={lineColor}
              maxY={yMax}
              height={160}
              maxXTicks={10}
              rotateLabels={true}
            />
          </section>
        )}

        {total === 0 && (
          <div className="text-sm text-muted-foreground">
            아직 수집된 데이터가 없어요. 실시간 교정을 <b>ON</b>으로 켜고 몇 초간 움직여보세요.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 ${active ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
    >
      {children}
    </button>
  );
}

function SettingSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${checked ? "text-emerald-600" : "text-gray-500"}`}>
          {checked ? "ON" : "OFF"}
        </span>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

/** 간단 SVG 라인차트 (라벨 간격 자동 축소 + 선택적 회전) */
function LineChartSVG({
  labels,
  values,
  maxY,
  height = 160,
  color = "#3b82f6",
  maxXTicks = 10,
  rotateLabels = false,
}: {
  labels: string[];
  values: number[];
  maxY: number;
  height?: number;
  color?: string;
  maxXTicks?: number;
  rotateLabels?: boolean;
}) {
  const n = labels.length;
  const pad = 16;
  const w = Math.max(320, n * 28);

  const xFor = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
  const yFor = (v: number) => height - pad - (v / Math.max(1, maxY)) * (height - pad * 2);

  const step = Math.max(1, Math.ceil(n / maxXTicks));
  const tickSet = new Set<number>();
  for (let i = 0; i < n; i += step) tickSet.add(i);
  tickSet.add(0); tickSet.add(n - 1);

  const points = values.map((v, i) => `${xFor(i)},${yFor(v)}`);

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={height} className="rounded bg-white border">
        <line x1={pad} y1={height - pad} x2={w - pad} y2={height - pad} stroke="#e5e7eb" />
        {[...tickSet].sort((a, b) => a - b).map((i) => (
          <line key={`tick-${i}`} x1={xFor(i)} y1={pad} x2={xFor(i)} y2={height - pad} stroke="#f1f5f9" />
        ))}
        <polyline fill="none" stroke={color} strokeWidth={2} points={points.join(" ")} />
        {values.map((v, i) => <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3} fill={color} />)}
      </svg>
      <div className="mt-1 relative" style={{ width: w, height: rotateLabels ? 28 : 16 }}>
        <div className="absolute left-0 top-0" style={{ width: w - pad * 2, marginLeft: pad, marginRight: pad, display: "flex" }}>
          {labels.map((lb, i) => {
            const show = tickSet.has(i);
            const segW = (w - pad * 2) / Math.max(1, n - 1);
            return (
              <div
                key={i}
                className={`text-[10px] text-muted-foreground tabular-nums ${rotateLabels ? "origin-left -rotate-45" : "text-center"}`}
                style={{ width: segW, paddingLeft: rotateLabels ? 2 : 0, whiteSpace: "nowrap", visibility: show ? "visible" : "hidden" }}
                title={lb}
              >
                {lb}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
