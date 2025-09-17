// src/features/visualization/useWeeklyHeatmap.ts
import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/data/db";

// 월(0)~일(6) 순서로 만들기
function toMon0Sun6(day: number) {
  // Date.getDay(): 0=Sun..6=Sat → 0=Mon..6=Sun 로 변환
  return (day + 6) % 7;
}

export function useWeeklyHeatmap(opts?: { sinceTs?: number; excludeNormal?: boolean }) {
  const sinceTs = opts?.sinceTs;
  const excludeNormal = opts?.excludeNormal ?? true;

  // 7(rows: 월~일) x 24(cols: 시)
  const [grid, setGrid] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)));
  const [max, setMax] = useState(0);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const q = sinceTs ? db.events.where("ts").above(sinceTs) : db.events;
      const rows = await q.toArray();
      const g = Array.from({ length: 7 }, () => Array(24).fill(0)) as number[][];
      for (const r of rows) {
        if (excludeNormal && r.label === "정상") continue;
        const d = new Date(r.ts);
        const dow = toMon0Sun6(d.getDay()); // 0~6 (월~일)
        const h = d.getHours(); // 0~23
        g[dow][h] = (g[dow][h] ?? 0) + 1;
      }
      const m = Math.max(0, ...g.flat());
      return { g, m };
    }).subscribe({
      next: ({ g, m }) => {
        setGrid(g);
        setMax(m || 1);
      },
      error: (e) => console.error("[useWeeklyHeatmap] liveQuery error:", e),
    });
    return () => sub.unsubscribe();
  }, [sinceTs, excludeNormal]);

  return { grid, max };
}
