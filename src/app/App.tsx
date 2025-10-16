import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AppShell from "./AppShell";
import AuthStep from "../features/auth/AuthStep";
import OnboardingStep from "../features/onboarding/OnboardingStep";
import DevSmoke from "../test/DevSmoke";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchBaselineStatus } from "@/lib/api";

type Step = "auth" | "baseline-check" | "ob" | "app";

export default function App() {
  const [step, setStep] = useState<Step>("auth");
  const [baselineSet, setBaselineSet] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [baselineChecking, setBaselineChecking] = useState(false);
  const [baselineCheckError, setBaselineCheckError] = useState<string | null>(null);
  const [baselineCheckAttempts, setBaselineCheckAttempts] = useState(0);

  const handleAuthenticated = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    setUserEmail(normalized);
    setBaselineSet(false);
    setBaselineCheckError(null);
    setStep("baseline-check");
    setBaselineCheckAttempts((attempts) => attempts + 1);
  }, []);

  useEffect(() => {
    if (step !== "baseline-check" || !userEmail || baselineCheckAttempts === 0) {
      return;
    }

    let active = true;
    setBaselineChecking(true);
    setBaselineCheckError(null);

    fetchBaselineStatus(userEmail)
      .then(({ hasBaseline }) => {
        if (!active) return;
        setBaselineSet(hasBaseline);
        setStep(hasBaseline ? "app" : "ob");
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : "기준 좌표 상태를 확인하는 중 오류가 발생했습니다.";
        setBaselineCheckError(message);
      })
      .finally(() => {
        if (!active) return;
        setBaselineChecking(false);
      });

    return () => {
      active = false;
    };
  }, [baselineCheckAttempts, step, userEmail]);

  const handleBaselineStored = useCallback((value: boolean) => {
    setBaselineSet(value);
  }, []);

  const handleRetryBaselineCheck = useCallback(() => {
    setBaselineCheckAttempts((attempts) => attempts + 1);
  }, []);

  return (
    <div className="min-h-screen">
      <DevSmoke />
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {step === "auth" && (
          <AuthStep onAuthenticated={handleAuthenticated} />
        )}
        {step === "baseline-check" && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>기준 좌표 확인 중</CardTitle>
                <CardDescription>이전에 저장된 기준 자세가 있는지 확인하고 있어요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {baselineChecking && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>기준 좌표 상태를 확인하는 중…</span>
                  </div>
                )}
                {!baselineChecking && baselineCheckError && (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600">{baselineCheckError}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button onClick={handleRetryBaselineCheck}>다시 시도</Button>
                      <Button variant="outline" onClick={() => setStep("ob")}>직접 기준 좌표 설정</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {step === "ob" && userEmail && (
          <OnboardingStep
            userEmail={userEmail}
            onNext={({ baseline }) => {
              setBaselineSet(baseline);
              setStep("app");
            }}
          />
        )}
        {step === "app" && userEmail && (
          <AppShell
            baselineSet={baselineSet}
            userEmail={userEmail}
            onBaselineStored={handleBaselineStored}
          />
        )}
      </div>
    </div>
  );
}
