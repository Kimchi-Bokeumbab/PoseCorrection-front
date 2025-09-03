import React, { useState } from "react";
import { Activity, Camera, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "../../components/SectionHeader";
import CameraPlaceholder from "../../components/CameraPlaceholder";

export default function OnboardingStep({ onNext }: { onNext: (opts: { baseline: boolean }) => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [camera, setCamera] = useState("default");
  const [baselineCaptured, setBaselineCaptured] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionHeader
        icon={Settings}
        title={`최초설정 – 데스크톱 환경 준비 (${stepIdx + 1}/2)`}
        desc="흐름: 카메라 영역 확인 → 기준 좌표 캡처(초기자세)"
      />

      <div className="grid grid-cols-2 gap-2">
        {["카메라 확인", "기준 좌표 캡처"].map((t, i) => (
          <div key={t} className={`rounded-xl p-3 text-center text-sm border ${i === stepIdx ? "bg-emerald-50 border-emerald-300" : "bg-white"}`}>
            {i + 1}. {t}
          </div>
        ))}
      </div>

      {stepIdx === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4"/>카메라 영역 확인</CardTitle>
            <CardDescription>실제 카메라 접근은 하지 않고, 자리만 확보합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CameraPlaceholder/>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>웹캠 선택</Label>
                <Select value={camera} onValueChange={setCamera}>
                  <SelectTrigger>
                    <SelectValue placeholder="웹캠을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">기본 웹캠</SelectItem>
                    <SelectItem value="cam2">외장 웹캠</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground self-end">※ 가상의 선택 UI입니다. 실제 장치 접근/권한 요청은 구현 단계에서 처리합니다.</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStepIdx(1)}>다음</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stepIdx === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4"/>기준 좌표 캡처(초기자세)</CardTitle>
            <CardDescription>기준자세에서 관절 좌표를 "스냅샷" 하여 이후 움직임의 기준으로 사용합니다. (데모: 실제 추출 없음)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CameraPlaceholder>
              <div className="h-full w-full">
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-30">
                  {Array.from({length: 12*6}).map((_,i)=> (
                    <div key={i} className="border border-emerald-300/40"/>
                  ))}
                </div>
                <svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 100 56" preserveAspectRatio="none">
                  {[[50,10],[40,18],[60,18],[35,28],[65,28],[40,40],[60,40]].map(([x,y],idx)=> (
                    <circle key={idx} cx={x} cy={y} r="1.5" fill="#10b981" />
                  ))}
                  <polyline points="50,10 40,18 35,28 40,40" fill="none" stroke="#10b981" strokeWidth="0.6" />
                  <polyline points="50,10 60,18 65,28 60,40" fill="none" stroke="#10b981" strokeWidth="0.6" />
                </svg>
              </div>
            </CameraPlaceholder>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border p-3">
                <div className="font-medium mb-1">추적할 관절(예)</div>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>머리 중심, 목 기저부</li>
                  <li>좌/우 어깨, 좌/우 골반</li>
                  <li>척추 기준점 (흉추)</li>
                </ul>
              </div>
              <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">좌표 시스템</div>
                <div>기준 프레임의 각 관절 (x,y)을 저장하고, 이후 프레임의 Δx, Δy 벡터를 계산해 기울어짐(목, 어깨, 골반 등)을 판단합니다.</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStepIdx(0)}>이전</Button>
              <div className="flex items-center gap-3">
                {baselineCaptured ? <Badge variant="secondary">기준 좌표 설정됨</Badge> : <Badge variant="outline">미설정</Badge>}
                <Button onClick={() => setBaselineCaptured(true)}>기준 좌표 캡처 (데모)</Button>
                <Button disabled={!baselineCaptured} onClick={() => onNext({ baseline: baselineCaptured })}>프로그램 시작</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
