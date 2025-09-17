// src/features/visualization/useHourlyHeatmap.ts
import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/data/db";

export function useHourlyHeatmap(opts?: { sinceTs?: number; excludeNormal?: boolean }) {
  const sinceTs = opts?.sinceTs;
  const excludeNormal = opts?.excludeNormal ?? true;

  const [hours, setHours] = useState<number[]>(Array(24).fill(0));
  const [max, setMax] = useState(0);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const q = sinceTs ? db.events.where("ts").above(sinceTs) : db.events;
      const rows = await q.toArray();
      const arr = Array(24).fill(0) as number[];
      for (const r of rows) {
        if (excludeNormal && r.label === "정상") continue;
        const h = new Date(r.ts).getHours();
        arr[h] = (arr[h] ?? 0) + 1;
      }
      const m = Math.max(0, ...arr);
      return { arr, m };
    }).subscribe({
      next: ({ arr, m }) => {
        setHours(arr);
        setMax(m || 1);
      },
      error: (e) => console.error("[useHourlyHeatmap] liveQuery error:", e),
    });
    return () => sub.unsubscribe();
  }, [sinceTs, excludeNormal]);

  return { hours, max };
}
