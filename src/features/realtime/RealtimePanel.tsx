import React from "react";
import { Sparkles } from "lucide-react";
import CameraPlaceholder from "../../components/CameraPlaceholder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function RealtimePanel({ enabled, onToggle }: { enabled:boolean; onToggle: (v:boolean)=>void }){
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4"/>실시간 자세교정</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{enabled ? "ON" : "OFF"} (백그라운드 포함)</span>
              <Switch checked={enabled} onCheckedChange={onToggle} />
            </div>
          </CardTitle>
          <CardDescription>카메라 기반 실시간 분석 (데모: 영상 미사용)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CameraPlaceholder/>
          <p className="text-xs text-muted-foreground">※ 실시간 교정을 끄면 백그라운드에서도 분석을 중단합니다.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상태</CardTitle>
          <CardDescription>서비스 요약</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>실행 상태: {enabled ? "동작" : "중지"}</div>
          <div>백그라운드: 기본 실행</div>
        </CardContent>
      </Card>
    </div>
  );
}
