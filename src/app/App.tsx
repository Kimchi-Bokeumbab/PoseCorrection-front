import React, { useState } from "react";
import AppShell from "./AppShell";
import AuthStep from "../features/auth/AuthStep";
import OnboardingStep from "../features/onboarding/OnboardingStep";
import DevSmoke from "../test/DevSmoke";

export default function App(){
  const [step, setStep] = useState<"auth" | "ob" | "app">("auth");
  const [baselineSet, setBaselineSet] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      <DevSmoke />
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {step === "auth" && (
          <AuthStep
            onAuthenticated={(email) => {
              setUserEmail(email);
              setStep("ob");
            }}
          />
        )}
        {step === "ob" && (
          <OnboardingStep
            onNext={({ baseline }) => {
              setBaselineSet(baseline);
              setStep("app");
            }}
          />
        )}
        {step === "app" && userEmail && (
          <AppShell baselineSet={baselineSet} userEmail={userEmail} />
        )}
      </div>
    </div>
  );
}
