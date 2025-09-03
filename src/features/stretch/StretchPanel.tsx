import React from "react";
import { StretchHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StretchCard({ title, focus, minutes }:{ title:string; focus:string; minutes:number }){
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><StretchHorizontal className="h-4 w-4"/>{title}</span>
          <Badge variant="outline">{minutes}분</Badge>
        </CardTitle>
        <CardDescription>주된 불량: {focus}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="aspect-video rounded-xl border bg-muted grid place-items-center text-xs text-muted-foreground">
          (동작 예시 영상 자리)
        </div>
        <ol className="text-sm list-decimal list-inside space-y-1 text-muted-foreground">
          <li>자세를 곧게 펴고, 호흡을 안정화합니다.</li>
          <li>지시된 부위를 20~30초간 부드럽게 늘립니다.</li>
          <li>반대쪽도 동일하게 수행합니다. 무리하지 않습니다.</li>
        </ol>
      </CardContent>
    </Card>
  );
}

export default function StretchPanel(){
  const recs = [
    { title: "상부승모근 스트레칭", focus: "거북목/목전방", minutes: 4 },
    { title: "흉추 신전 스트레칭", focus: "등 말림", minutes: 5 },
    { title: "햄스트링/둔근 이완", focus: "장시간 좌식", minutes: 6 },
  ];
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {recs.map((r)=> <StretchCard key={r.title} {...r} />)}
    </div>
  );
}