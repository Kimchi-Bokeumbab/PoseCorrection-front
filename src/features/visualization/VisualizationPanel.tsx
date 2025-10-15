import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChartBar, Loader2, RefreshCcw } from "lucide-react";
import { brand, POSTURE_LABELS, KO_TO_EN, PostureLabel } from "../../lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { fetchPostureStats, PostureStatsSummary } from "@/lib/api";

const STATS_DEFAULT_DAYS = 7;
const NORMAL_LABELS = new Set(["정상", "normal", "Normal"]);

const colorMap: Record<PostureLabel, string> = {
  정상: "#9CA3AF",
  목꺾임: "#F97316",
  거북목: "#EF4444",
  "어깨 기울어짐": "#8B5CF6",
  "뒤로 기대서 앉음": "#0EA5E9",
};

const fallbackPalette = ["#F97316", "#EF4444", "#8B5CF6", "#0EA5E9", "#14B8A6"];

function isKnownLabel(label: string): label is PostureLabel {
  return (POSTURE_LABELS as readonly string[]).includes(label);
}

function formatHourLabel(hour: string) {
  if (!hour) return "";
  if (hour.includes(":")) return hour;
  const numeric = Number(hour);
  if (!Number.isNaN(numeric)) {
    return `${numeric.toString().padStart(2, "0")}:00`;
  }
  return hour;
}

function formatDateLabel(value: string) {
  if (!value) return "";
  const [date] = value.split("T");
  return date ?? value;
}

interface HourlyChartItem {
  t: string;
  score: number;
  bad: number;
  total: number;
}

interface WeeklyChartItem {
  day: string;
  bad: number;
  total: number;
}

interface LabelCountItem {
  name: string;
  rawName: string;
  cnt: number;
  color: string;
}

export default function VisualizationPanel({ userEmail }: { userEmail: string }) {
  const [summary, setSummary] = useState<PostureStatsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const stats = await fetchPostureStats(userEmail, STATS_DEFAULT_DAYS);
        if (!active) return;
        setSummary(stats);
      } catch (err) {
        if (!active) return;
        setSummary(null);
        setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (userEmail) {
      load();
    } else {
      setSummary(null);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [userEmail, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  const hourly = useMemo<HourlyChartItem[]>(() => {
    if (!summary) return [];
    return summary.hourly.map((entry) => {
      const total = entry.total ?? 0;
      const bad = entry.bad ?? 0;
      const fallbackScore = total > 0 ? Math.max(0, Math.round((1 - bad / total) * 100)) : 0;
      const avgScore = entry.avg_score;
      return {
        t: formatHourLabel(entry.hour),
        score: typeof avgScore === "number" ? Math.round(avgScore) : fallbackScore,
        bad,
        total,
      };
    });
  }, [summary]);

  const weekly = useMemo<WeeklyChartItem[]>(() => {
    if (!summary) return [];
    return summary.weekday.map((entry) => ({
      day: entry.weekday,
      bad: entry.bad ?? 0,
      total: entry.total ?? 0,
    }));
  }, [summary]);

  const counts = useMemo<LabelCountItem[]>(() => {
    if (!summary) return [];
    let fallbackIndex = 0;
    return summary.labels
      .filter((entry) => !NORMAL_LABELS.has(entry.label))
      .map((entry) => {
        const rawName = entry.label;
        if (isKnownLabel(rawName)) {
          return {
            name: KO_TO_EN[rawName],
            rawName,
            cnt: entry.count,
            color: colorMap[rawName],
          };
        }
        const color = fallbackPalette[fallbackIndex % fallbackPalette.length];
        fallbackIndex += 1;
        return {
          name: rawName,
          rawName,
          cnt: entry.count,
          color,
        };
      });
  }, [summary]);

  const hasEvents = (summary?.total_events ?? 0) > 0;
  const averageScore = useMemo(() => {
    if (!hourly.length) return null;
    const totalScore = hourly.reduce((acc, item) => acc + item.score, 0);
    return Math.round(totalScore / hourly.length);
  }, [hourly]);

  const focusHours = useMemo(() => {
    return hourly
      .filter((item) => item.bad > 0)
      .sort((a, b) => b.bad - a.bad)
      .slice(0, 3)
      .map((item) => item.t);
  }, [hourly]);

  const rangeText = useMemo(() => {
    if (!summary) return null;
    const start = formatDateLabel(summary.range.start);
    const end = formatDateLabel(summary.range.end);
    return `${start} ~ ${end}`;
  }, [summary]);

  const focusHoursText = focusHours.length ? focusHours.join(", ") : "특이사항 없음";

  const errorBanner = error ? (
    <div className="lg:col-span-2">
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" />
        <div>
          <p className="font-medium">데이터를 불러오지 못했습니다.</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {errorBanner}

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <ChartBar className="h-4 w-4" />시간대별 자세 점수
            </CardTitle>
            <CardDescription>어느 시간대에 자세가 나빠지는지 확인</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-9"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            새로고침
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64">
            {loading ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">데이터를 불러오는 중…</div>
            ) : hasEvents && hourly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourly} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={brand.primary} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                최근 {STATS_DEFAULT_DAYS}일 간 저장된 기록이 없습니다.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">평균 점수: {averageScore ?? "-"}</Badge>
            <Badge variant="secondary">집중 필요 시간대: {focusHoursText}</Badge>
            <Badge variant="outline">총 기록: {summary?.total_events ?? 0}</Badge>
            {rangeText && <Badge variant="outline">기간: {rangeText}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>요일별 불량 자세 빈도</CardTitle>
          <CardDescription>최근 {STATS_DEFAULT_DAYS}일 누적 기록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {loading ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">데이터를 불러오는 중…</div>
            ) : hasEvents && weekly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="bad" fill={brand.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                누적 데이터가 부족합니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>가장 자주 발생한 나쁜 자세</CardTitle>
          <CardDescription>최근 {STATS_DEFAULT_DAYS}일 간 기록 기준</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full" data-test="bar-colored">
            {loading ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">데이터를 불러오는 중…</div>
            ) : hasEvents && counts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={counts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cnt" radius={[8, 8, 0, 0]}>
                    {counts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                나쁜 자세 기록이 없습니다.
              </div>
            )}
          </div>
          {counts.length ? (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {counts.map((c) => (
                <span key={c.rawName} className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: c.color }} />
                  {c.name} ({c.cnt})
                </span>
              ))}
            </div>
          ) : (
            !loading && <p className="mt-3 text-xs text-muted-foreground">현재까지 저장된 나쁜 자세가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
