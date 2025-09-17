import React, { useState } from "react";
import { Dumbbell, LogIn, Sparkles, ChartBar, Leaf } from "lucide-react";
import { brand } from "../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RealtimePanel from "../features/realtime/RealtimePanel";
import VisualizationPanel from "../features/visualization/VisualizationPanel";
import StretchPanel from "../features/stretch/StretchPanel";
import type { PoseFrame } from "@/lib/model";

type Props = {
  baselineSet: boolean;
  baselineFrame?: PoseFrame | null;
  onRequestRecalibrate: () => void;     // ✅ 추가
};

export default function AppShell({ baselineSet, baselineFrame = null, onRequestRecalibrate }: Props) {
  const [tab, setTab] = useState("realtime");
  const [minimized, setMinimized] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-30 border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white grid place-items-center shadow">
              <Dumbbell className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold">{brand.name}</div>
              <div className="text-xs text-muted-foreground">
                데스크톱 모드 • {realtimeEnabled ? "모니터링 중" : "대기"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {baselineSet ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">기준 좌표 설정됨</Badge>
            ) : (
              <Badge variant="outline" className="hidden sm:inline-flex">기준 좌표 미설정</Badge>
            )}
            <Badge variant="secondary" className="hidden sm:inline-flex">백그라운드 실행</Badge>
            {/* ✅ 재설정 */}
            <Button variant="outline" onClick={onRequestRecalibrate}>기준 좌표 재설정</Button>
            <Button className="gap-2" onClick={() => setMinimized(true)}>
              <LogIn className="h-4 w-4" />
              트레이로 최소화
            </Button>
          </div>
        </div>
      </header>

      {!minimized && (
        <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-xl">
              <TabsTrigger value="realtime" className="gap-2">
                <Sparkles className="h-4 w-4" />
                실시간 교정
              </TabsTrigger>
              <TabsTrigger value="viz" className="gap-2">
                <ChartBar className="h-4 w-4" />
                데이터 시각화
              </TabsTrigger>
              <TabsTrigger value="stretch" className="gap-2">
                <Leaf className="h-4 w-4" />
                스트레칭 추천
              </TabsTrigger>
            </TabsList>

            <div className="pt-4">
              {/* forceMount 유지: 탭 이동해도 RealtimePanel 유지 */}
              <TabsContent value="realtime" forceMount className={tab === "realtime" ? "" : "hidden"}>
                <RealtimePanel baseline={baselineFrame ?? null} onEnabledChange={setRealtimeEnabled} />
              </TabsContent>

              <TabsContent value="viz" forceMount className={tab === "viz" ? "" : "hidden"}>
                <VisualizationPanel />
              </TabsContent>

              <TabsContent value="stretch" forceMount className={tab === "stretch" ? "" : "hidden"}>
                <StretchPanel />
              </TabsContent>
            </div>
          </Tabs>
        </main>
      )}

      {minimized && (
        <div className="max-w-3xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>트레이에서 실행 중</CardTitle>
              <CardDescription>창을 닫아도 모니터링은 계속됩니다(데모). 알림은 OS 알림/팝업으로 가정.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">서비스 상태: {realtimeEnabled ? "실행 중" : "중지"}</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMinimized(false)}>복원</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {realtimeEnabled && (
        <div className="fixed bottom-4 right-4">
          <div className="rounded-full shadow px-3 py-2 bg-white border text-xs flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> 모니터링 동작 중
          </div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto p-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} PostureCare. 데모 UI – 카메라/AI 기능 미연동.
      </footer>
    </div>
  );
}
