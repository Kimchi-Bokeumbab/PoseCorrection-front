import React, { useMemo, useState } from "react";
import { Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginUser, registerUser } from "@/lib/api";

type AuthMode = "login" | "signup";

type FeedbackScope = "login" | "signup";

interface FeedbackState {
  type: "error" | "success";
  text: string;
  scope: FeedbackScope;
}

const ERROR_MESSAGES: Record<string, string> = {
  email_and_password_required: "이메일과 비밀번호를 모두 입력해 주세요.",
  email_required: "이메일을 입력해 주세요.",
  password_too_short: "비밀번호는 6자 이상이어야 합니다.",
  email_already_used: "이미 가입된 이메일입니다.",
  user_not_found: "존재하지 않는 계정입니다.",
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  invalid_response: "서버 응답을 해석할 수 없습니다.",
};

function getErrorMessage(code?: string) {
  if (!code) return "서버 요청 처리 중 오류가 발생했습니다.";
  return ERROR_MESSAGES[code] ?? "요청 처리 중 알 수 없는 오류가 발생했습니다.";
}

export default function AuthStep({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [loading, setLoading] = useState<FeedbackScope | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const passwordsMatch = useMemo(
    () => signupPassword.length === 0 || signupPassword === signupConfirm,
    [signupPassword, signupConfirm],
  );

  async function handleLogin() {
    const email = loginEmail.trim();
    if (!email || !loginPassword) {
      setFeedback({ type: "error", text: "이메일과 비밀번호를 모두 입력해 주세요.", scope: "login" });
      return;
    }

    try {
      setLoading("login");
      setFeedback(null);
      const result = await loginUser(email, loginPassword);
      if (result.ok) {
        onNext();
        return;
      }
      setFeedback({ type: "error", text: getErrorMessage(result.error), scope: "login" });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", text: "로그인 요청 중 네트워크 오류가 발생했습니다.", scope: "login" });
    } finally {
      setLoading(null);
    }
  }

  async function handleSignup() {
    const email = signupEmail.trim();
    if (!email || !signupPassword) {
      setFeedback({ type: "error", text: "이메일과 비밀번호를 모두 입력해 주세요.", scope: "signup" });
      return;
    }
    if (!passwordsMatch) {
      setFeedback({ type: "error", text: "비밀번호가 일치하지 않습니다.", scope: "signup" });
      return;
    }

    try {
      setLoading("signup");
      setFeedback(null);
      const result = await registerUser(email, signupPassword);
      if (result.ok) {
        setMode("login");
        setLoginEmail(email);
        setLoginPassword("");
        setSignupPassword("");
        setSignupConfirm("");
        setFeedback({
          type: "success",
          text: "회원가입이 완료되었습니다. 로그인해 주세요.",
          scope: "login",
        });
        return;
      }
      setFeedback({ type: "error", text: getErrorMessage(result.error), scope: "signup" });
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", text: "회원가입 요청 중 네트워크 오류가 발생했습니다.", scope: "signup" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-3 py-1">
            <Dumbbell className="h-4 w-4"/> <span className="text-sm font-semibold">PostureCare</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">웹캠 기반 AI 자세교정</p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as AuthMode)} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardContent className="space-y-4 p-6">
                <Label className="sr-only" htmlFor="login-email">이메일</Label>
                <Input
                  id="login-email"
                  placeholder="you@example.com"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoComplete="email"
                />

                <Label className="sr-only" htmlFor="login-password">비밀번호</Label>
                <Input
                  id="login-password"
                  placeholder="••••••••"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <Button className="w-full" onClick={handleLogin} disabled={loading === "login"}>
                  {loading === "login" ? "로그인 중…" : "다음 단계"}
                </Button>

                {feedback && feedback.scope === "login" && (
                  <p
                    role="alert"
                    className={`text-xs ${feedback.type === "error" ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {feedback.text}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardContent className="space-y-4 p-6">
                <Input
                  placeholder="이름"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  autoComplete="name"
                />
                <Input
                  placeholder="이메일"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  placeholder="비밀번호"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <Input
                  placeholder="비밀번호 확인"
                  type="password"
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  autoComplete="new-password"
                />
                <Button
                  className="w-full"
                  disabled={loading === "signup" || !passwordsMatch || signupPassword.length === 0}
                  onClick={handleSignup}
                >
                  {loading === "signup" ? "가입 처리 중…" : "계정 만들기"}
                </Button>
                {!passwordsMatch && (
                  <p className="text-xs text-red-600" role="alert">비밀번호가 일치하지 않습니다.</p>
                )}
                {feedback && feedback.scope === "signup" && (
                  <p
                    role="alert"
                    className={`text-xs ${feedback.type === "error" ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {feedback.text}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
