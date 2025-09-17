import React, { useEffect, useState } from "react";
import AppShell from "./AppShell";
import AuthStep from "../features/auth/AuthStep";
import OnboardingStep from "../features/onboarding/OnboardingStep";
import DevSmoke from "../test/DevSmoke";
import type { PoseFrame } from "@/lib/model";
import { getBaseline, clearBaseline } from "@/state/baseline";   // ✅ 추가

export default function App(){
  const [step, setStep] = useState<"auth" | "ob" | "app">("auth");
  const [baselineSet, setBaselineSet] = useState(false);
  const [baselineFrame, setBaselineFrame] = useState<PoseFrame | null>(null);

  // 시작 시 저장된 기준좌표 로드(있으면 이후 온보딩 스킵)
  useEffect(() => {
    const saved = getBaseline();
    if (saved) {
      setBaselineFrame(saved);
      setBaselineSet(true);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <DevSmoke />
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {step === "auth" && (
          <AuthStep
            onNext={() => setStep(baselineFrame ? "app" : "ob")}   // ✅ 저장돼 있으면 바로 메인
          />
        )}
        {step === "ob" && (
          <OnboardingStep
            onNext={({ baseline, frame }) => {
              setBaselineSet(!!baseline);
              if (frame) setBaselineFrame(frame as PoseFrame);
              setStep("app");
            }}
          />
        )}
        {step === "app" && (
          <AppShell
            baselineSet={baselineSet}
            baselineFrame={baselineFrame}
            onRequestRecalibrate={() => {                    // ✅ 메인에서 재설정
              clearBaseline();
              setBaselineFrame(null);
              setBaselineSet(false);
              setStep("ob");
            }}
          />
        )}
      </div>
    </div>
  );
}
