// src/features/visualization/useDailyStack.ts
import { useEffect, useMemo, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/data/db";
import { POSTURE_LABELS, type PostureLabel } from "@/model/RuleClassifier";

const BAD_LABELS = POSTURE_LABELS.filter(l => l !== "정상");

type DayStack = {
  dayKey: string;                 // 'MM/DD'
  counts: Record<PostureLabel, number>;
  total: number;                  // 정상 제외
};

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function useDailyStack(opts?: { days?: number; sinceTs?: number }) {
  const days = opts?.days ?? 7;
  const sinceTs = opts?.sinceTs;

  const [series, setSeries] = useState<DayStack[]>([]);
  const [maxTotal, setMaxTotal] = useState(1);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const baseSince = sinceTs ?? (Date.now() - 1000 * 60 * 60 * 24 * days);
      const rows = await db.events.where("ts").above(baseSince).toArray();

      // 날짜별 버킷
      const buckets = new Map<number, DayStack>();
      // 최근 days일 버킷 미리 생성 (빈 칸 보장)
      for (let i = days - 1; i >= 0; i--) {
        const dayTs = startOfDay(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = new Date(dayTs);
        const dayKey = `${String(key.getMonth() + 1).padStart(2, "0")}/${String(key.getDate()).padStart(2, "0")}`;
        const counts = Object.fromEntries(POSTURE_LABELS.map(l => [l, 0])) as Record<PostureLabel, number>;
        buckets.set(dayTs, { dayKey, counts, total: 0 });
      }

      for (const r of rows) {
        const dayTs = startOfDay(r.ts);
        if (!buckets.has(dayTs)) {
          const key = new Date(dayTs);
          const dayKey = `${String(key.getMonth() + 1).padStart(2, "0")}/${String(key.getDate()).padStart(2, "0")}`;
          const counts = Object.fromEntries(POSTURE_LABELS.map(l => [l, 0])) as Record<PostureLabel, number>;
          buckets.set(dayTs, { dayKey, counts, total: 0 });
        }
        const b = buckets.get(dayTs)!;
        b.counts[r.label as PostureLabel] = (b.counts[r.label as PostureLabel] ?? 0) + 1;
      }

      // 총합 계산(정상 제외)
      for (const b of buckets.values()) {
        b.total = BAD_LABELS.reduce((acc, l) => acc + (b.counts[l] ?? 0), 0);
      }

      const list = Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(-days)
        .map(([, v]) => v);

      const maxT = Math.max(1, ...list.map(v => v.total));
      return { list, maxT };
    }).subscribe({
      next: ({ list, maxT }) => {
        setSeries(list);
        setMaxTotal(maxT);
      },
      error: (e) => console.error("[useDailyStack] liveQuery error:", e),
    });

    return () => sub.unsubscribe();
  }, [days, sinceTs]);

  return { series, maxTotal, badLabels: BAD_LABELS };
}
