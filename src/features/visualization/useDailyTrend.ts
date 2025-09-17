// src/features/visualization/useDailyTrend.ts
import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/data/db";
import { POSTURE_LABELS, type PostureLabel } from "@/model/RuleClassifier";

const BAD_LABELS = POSTURE_LABELS.filter((l) => l !== "정상");

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function useDailyTrend(opts?: { sinceTs?: number; daysDefault?: number; excludeNormal?: boolean }) {
  const excludeNormal = opts?.excludeNormal ?? true;

  // 범위 계산: sinceTs가 있으면 그 날부터 오늘까지, 없으면 daysDefault(기본 30일)
  const today0 = startOfDay(Date.now());
  const start = opts?.sinceTs ? startOfDay(opts.sinceTs) : today0 - (opts?.daysDefault ?? 30) * 86400000;
  const days = Math.max(1, Math.round((today0 - start) / 86400000) + 1);

  const [labels, setLabels] = useState<string[]>([]);
  const [daily, setDaily] = useState<number[]>([]);
  const [cumulative, setCumulative] = useState<number[]>([]);
  const [maxDaily, setMaxDaily] = useState(1);
  const [maxCumu, setMaxCumu] = useState(1);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const rows = await db.events.where("ts").between(start, today0 + 86400000, true, false).toArray();

      const bucket = new Map<number, number>();
      for (let i = 0; i < days; i++) bucket.set(start + i * 86400000, 0);

      for (const r of rows) {
        if (excludeNormal && r.label === "정상") continue;
        const d0 = startOfDay(r.ts);
        bucket.set(d0, (bucket.get(d0) ?? 0) + 1);
      }

      const labs: string[] = [];
      const vals: number[] = [];
      let cum = 0;
      const cumu: number[] = [];

      for (let i = 0; i < days; i++) {
        const ts = start + i * 86400000;
        const date = new Date(ts);
        labs.push(`${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`);
        const v = bucket.get(ts) ?? 0;
        vals.push(v);
        cum += v;
        cumu.push(cum);
      }

      const m1 = Math.max(1, ...vals);
      const m2 = Math.max(1, ...cumu);

      return { labs, vals, cumu, m1, m2 };
    }).subscribe({
      next: ({ labs, vals, cumu, m1, m2 }) => {
        setLabels(labs);
        setDaily(vals);
        setCumulative(cumu);
        setMaxDaily(m1);
        setMaxCumu(m2);
      },
      error: (e) => console.error("[useDailyTrend] liveQuery error:", e),
    });

    return () => sub.unsubscribe();
  }, [start, today0, days, excludeNormal]);

  return { labels, daily, cumulative, maxDaily, maxCumu };
}
