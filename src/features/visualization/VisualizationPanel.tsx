import React, { useMemo } from "react";
import { ChartBar } from "lucide-react";
import { brand, POSTURE_LABELS, KO_TO_EN, PostureLabel } from "../../lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from "recharts";

export default function VisualizationPanel(){
  const hourly = useMemo(() => (
    Array.from({length: 12}).map((_,i)=>({
      t: `${8+i}:00`,
      score: Math.round(60 + 30*Math.sin(i/2)),
      bad: Math.max(0, Math.round(10*Math.cos(i)))
    }))
  ),[]);

  const weekly = useMemo(() => (
    [
      { day: "월", bad: 6 },
      { day: "화", bad: 4 },
      { day: "수", bad: 8 },
      { day: "목", bad: 5 },
      { day: "금", bad: 9 },
      { day: "토", bad: 3 },
      { day: "일", bad: 2 },
    ]
  ),[]);

  const colorMap: Record<PostureLabel, string> = {
    "정상": "#9CA3AF",
    "목꺾임": "#F97316",
    "거북목": "#EF4444",
    "어깨 기울어짐": "#8B5CF6",
    "뒤로 기대서 앉음": "#0EA5E9",
  };

  const counts = useMemo(() => {
    const demo: Record<PostureLabel, number> = {
      "정상": 42,
      "목꺾임": 7,
      "거북목": 11,
      "어깨 기울어짐": 5,
      "뒤로 기대서 앉음": 8,
    };
    return (POSTURE_LABELS as PostureLabel[])
      .filter(l => l !== "정상")
      .map(name => ({ name: KO_TO_EN[name], rawName: name, cnt: demo[name], color: colorMap[name] }));
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ChartBar className="h-4 w-4"/>시간대별 자세 점수</CardTitle>
          <CardDescription>어느 시간대에 자세가 나빠지는지 확인</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourly} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="t" />
                <YAxis domain={[0,100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke={brand.primary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">평균 점수: 72</Badge>
            <Badge variant="secondary">집중 필요 시간대: 13:00, 16:00</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>요일별 불량 자세 빈도</CardTitle>
          <CardDescription>일주일 패턴 파악</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bad" fill={brand.primary} radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>가장 자주 발생한 나쁜 자세</CardTitle>
          <CardDescription>최근 집계 기준(데모) • 항목별 색상 구분</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full" data-test="bar-colored">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cnt" radius={[8,8,0,0]}>
                  {counts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            {counts.map((c)=> (
              <span key={c.rawName} className="inline-flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

