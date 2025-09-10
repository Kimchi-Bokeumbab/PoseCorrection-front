import React, { useEffect, useState } from "react";
import { Activity, Camera, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/SectionHeader";
import type { PoseFrame } from "@/lib/model";
import { usePoseStream } from "@/hooks/usePoseStream";
import PoseOverlay from "@/components/PoseOverlay";

export default function OnboardingStep({ onNext }: { onNext: (opts: { baseline: boolean }) => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [baselineCaptured, setBaselineCaptured] = useState(false);
  const [baselineFrame, setBaselineFrame] = useState<PoseFrame | null>(null);

  const { videoRef, isRunning, landmarkerReady, startPreview, startDetect, stop, lastFrame } = usePoseStream();

  useEffect(() => () => stop(), [stop]);

  const CameraBlock = (withOverlay: boolean) => (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border bg-black/60">
      <video
        ref={videoRef}
        className="h-full w-full object-cover transform -scale-x-100"
        autoPlay
        muted
        playsInline
      />
      {withOverlay && <PoseOverlay videoRef={videoRef} frame={lastFrame} />}
    </div>
  );

  // 1단계: 미리보기만 (분석 X)
  const ControlsPreview = (
    <div className="flex flex-wrap items-center gap-3">
      {!isRunning ? (
        <Button onClick={() => startPreview()}>카메라 시작(미리보기)</Button>
      ) : (
        <Button variant="outline" onClick={() => { stop(); setStepIdx(1); }}>다음</Button>
      )}
      <Badge variant={isRunning ? "secondary" : "outline"}>카메라: {isRunning ? "동작" : "정지"}</Badge>
    </div>
  );

  // 2단계: 분석 시작 (Mediapipe 스켈레톤 표시)
  const ControlsDetect = (
    <div className="flex flex-wrap items-center gap-3">
      {!isRunning ? (
        <Button onClick={() => startDetect()}>카메라 시작(분석)</Button>
      ) : (
        <>
          {!landmarkerReady ? (
            <Button variant="secondary" onClick={() => startDetect()}>분석 시작</Button>
          ) : (
            <Button variant="outline" onClick={() => stop()}>카메라 정지</Button>
          )}
        </>
      )}
      <Badge variant={isRunning ? "secondary" : "outline"}>카메라: {isRunning ? "동작" : "정지"}</Badge>
      <Badge variant={landmarkerReady ? "secondary" : "outline"}>Mediapipe: {landmarkerReady ? "준비됨" : "대기"}</Badge>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionHeader
        icon={Settings}
        title={`최초설정 – 데스크톱 환경 준비 (${stepIdx + 1}/2)`}
        desc="흐름: 카메라 확인(미리보기) → 기준 좌표 캡처(분석)"
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
            <CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4" />카메라 확인(미리보기)</CardTitle>
            <CardDescription>분석 없이 카메라 프리뷰만 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CameraBlock(false) /* 오버레이 X */}
            {ControlsPreview}
          </CardContent>
        </Card>
      )}

      {stepIdx === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />기준 좌표 캡처(분석)</CardTitle>
            <CardDescription>카메라 분석을 켠 뒤, 기준자세에서 “기준 좌표 캡처”를 누르세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CameraBlock(true) /* 오버레이 O */}
            <div className="flex flex-wrap items-center gap-3">
              {ControlsDetect}
              <Button
                variant="secondary"
                onClick={() => { if (lastFrame) { setBaselineFrame(lastFrame); setBaselineCaptured(true); } }}
                disabled={!lastFrame || !landmarkerReady}
              >
                기준 좌표 캡처
              </Button>
              {baselineCaptured ? <Badge variant="secondary">기준 좌표 설정됨</Badge> : <Badge variant="outline">미설정</Badge>}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => { stop(); setStepIdx(0); }}>이전</Button>
              <div className="flex items-center gap-3">
                <Button disabled={!baselineCaptured} onClick={() => { stop(); onNext({ baseline: baselineCaptured }); }}>프로그램 시작</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
