import React, { useState } from "react";
import { Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthStep({ onNext }: { onNext: (name: string) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-3 py-1">
            <Dumbbell className="h-4 w-4"/> <span className="text-sm font-semibold">PostureCare</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">웹캠 기반 AI 자세교정</p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="signup">회원가입</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardContent className="space-y-4 p-6">
                <Label className="sr-only" htmlFor="email">이메일</Label>
                <Input id="email" placeholder="you@example.com" type="email" />

                <Label className="sr-only" htmlFor="password">비밀번호</Label>
                <Input id="password" placeholder="••••••••" type="password" />

                <Button className="w-full" onClick={() => onNext(name || "사용자")}>다음 단계</Button>

                <div className="flex items-center justify-between text-xs">
                  <button className="underline text-muted-foreground" type="button">이메일 찾기</button>
                  <button className="underline text-muted-foreground" type="button">비밀번호 찾기</button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardContent className="space-y-4 p-6">
                <Input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="이메일" type="email" />
                <Input placeholder="비밀번호" type="password" value={pw} onChange={(e)=>setPw(e.target.value)} />
                <Input placeholder="비밀번호 확인" type="password" value={pw2} onChange={(e)=>setPw2(e.target.value)} />
                <Button className="w-full" disabled={pw.length>0 && pw!==pw2} onClick={() => onNext(name || "사용자")}>
                  계정 만들기
                </Button>
                {pw.length>0 && pw!==pw2 && (
                  <p className="text-xs text-red-600">비밀번호가 일치하지 않습니다.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
