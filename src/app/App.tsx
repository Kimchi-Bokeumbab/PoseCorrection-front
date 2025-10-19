import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AppShell from "./AppShell";
import AuthStep from "../features/auth/AuthStep";
import OnboardingStep from "../features/onboarding/OnboardingStep";
import DevSmoke from "../test/DevSmoke";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchBaselineStatus, type BaselineStatusResult } from "@/lib/api";

type Step = "auth" | "baseline-check" | "ob" | "app";

const BASELINE_CACHE_PREFIX = "baseline-status:v1:";

function baselineCacheKey(email: string) {
  return `${BASELINE_CACHE_PREFIX}${email}`;
}

function readBaselineCache(email: string): BaselineStatusResult | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(baselineCacheKey(email));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<BaselineStatusResult>;
    if (typeof parsed.hasBaseline === "boolean") {
      return {
        hasBaseline: parsed.hasBaseline,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
      };
    }
  } catch (error) {
    console.warn("Failed to read cached baseline status", error);
  }
  return null;
}

function writeBaselineCache(email: string, value: BaselineStatusResult | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (value && value.hasBaseline) {
      const payload: BaselineStatusResult = {
        hasBaseline: true,
        updatedAt: value.updatedAt ?? new Date().toISOString(),
      };
      window.localStorage.setItem(baselineCacheKey(email), JSON.stringify(payload));
    } else {
      window.localStorage.removeItem(baselineCacheKey(email));
    }
  } catch (error) {
    console.warn("Failed to persist baseline status", error);
  }
}

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
    const cachedBaseline = readBaselineCache(userEmail);

    fetchBaselineStatus(userEmail)
      .then((result) => {
        if (!active) return;
        if (result.hasBaseline) {
          const payload: BaselineStatusResult = {
            hasBaseline: true,
            updatedAt: result.updatedAt ?? cachedBaseline?.updatedAt,
          };
          writeBaselineCache(userEmail, payload);
          setBaselineSet(true);
          setStep("app");
          return;
        }

        writeBaselineCache(userEmail, null);
        if (cachedBaseline?.hasBaseline) {
          setBaselineSet(true);
          setStep("app");
        } else {
          setBaselineSet(false);
          setStep("ob");
        }
      })
      .catch((error) => {
        if (!active) return;
        const message =
          error instanceof Error
            ? error.message
            : "기준 좌표 상태를 확인하는 중 오류가 발생했습니다.";
        if (cachedBaseline?.hasBaseline) {
          setBaselineSet(true);
          setStep("app");
        } else {
          setBaselineCheckError(message);
        }
      })
      .finally(() => {
        if (!active) return;
        setBaselineChecking(false);
      });

    return () => {
      active = false;
    };
  }, [baselineCheckAttempts, step, userEmail]);

  const handleBaselineStored = useCallback(
    (value: boolean) => {
      setBaselineSet(value);
      if (!userEmail) {
        return;
      }
      if (value) {
        writeBaselineCache(userEmail, { hasBaseline: true });
      } else {
        writeBaselineCache(userEmail, null);
      }
    },
    [userEmail],
  );

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
              handleBaselineStored(baseline);
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
