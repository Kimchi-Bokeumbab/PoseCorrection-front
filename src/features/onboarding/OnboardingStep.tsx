import React, { useEffect, useState } from "react";
import { Activity, Camera, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SectionHeader from "@/components/SectionHeader";
import type { PoseFrame } from "@/lib/model";
import { usePoseStream } from "@/hooks/usePoseStream";
import PoseOverlay from "@/components/PoseOverlay";
import { Switch } from "@/components/ui/switch";              // ✅ 추가
import { setBaseline } from "@/state/baseline";               // ✅ 추가

export default function OnboardingStep({ onNext }: { onNext: (opts: { baseline: boolean; frame?: PoseFrame }) => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [baselineCaptured, setBaselineCaptured] = useState(false);
  const [baselineFrame, setBaselineFrame] = useState<PoseFrame | null>(null);
  const [saveDefault, setSaveDefault] = useState(true);       // ✅ 기본 저장 ON

  const { videoRef, isRunning, landmarkerReady, startPreview, startDetect, stop, lastFrame } = usePoseStream();

  useEffect(() => () => stop(), [stop]);

  const CameraBlock = (withOverlay: boolean) => (
    <div className="relative z-0 aspect-video w-full rounded-2xl overflow-hidden border bg-black/60">
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

  const ControlsPreview = (
    <div className="relative z-10 pointer-events-auto flex flex-wrap items-center gap-3">
      {!isRunning ? (
        <Button type="button" onClick={() => startPreview()}>카메라 시작(미리보기)</Button>
      ) : (
        <Button type="button" onClick={() => { stop(); setStepIdx(1); }}>다음</Button>
      )}
      <Badge variant={isRunning ? "secondary" : "outline"}>카메라: {isRunning ? "동작" : "정지"}</Badge>
    </div>
  );

  const ControlsDetect = (
    <div className="relative z-10 pointer-events-auto flex flex-wrap items-center gap-3">
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
            {CameraBlock(false)}
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
            {CameraBlock(true)}
            <div className="flex flex-wrap items-center gap-3">
              {ControlsDetect}
              <Button
                variant="secondary"
                onClick={() => {
                  if (lastFrame) {
                    setBaselineFrame(lastFrame);
                    setBaselineCaptured(true);
                  }
                }}
                disabled={!lastFrame || !landmarkerReady}
              >
                기준 좌표 캡처
              </Button>
              {baselineCaptured ? <Badge variant="secondary">기준 좌표 설정됨</Badge> : <Badge variant="outline">미설정</Badge>}
            </div>

            {/* ✅ 저장 여부 스위치 (캡처 후 노출) */}
            {baselineCaptured && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">이 좌표를 기본값으로 저장</div>
                  <div className="text-xs text-muted-foreground">다음 실행부터 온보딩 없이 바로 사용합니다. (설정에서 언제든 재설정 가능)</div>
                </div>
                <Switch checked={saveDefault} onCheckedChange={setSaveDefault} />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => { stop(); setStepIdx(0); }}>이전</Button>
              <div className="flex items-center gap-3">
                <Button
                  disabled={!baselineCaptured}
                  onClick={() => {
                    stop();
                    if (baselineCaptured && baselineFrame && saveDefault) {
                      setBaseline(baselineFrame);  // ✅ 영구 저장
                    }
                    onNext({ baseline: baselineCaptured, frame: baselineFrame! });
                  }}
                >
                  프로그램 시작
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
