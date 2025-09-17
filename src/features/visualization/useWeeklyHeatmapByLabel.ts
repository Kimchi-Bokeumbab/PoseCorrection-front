// src/features/visualization/useWeeklyHeatmapByLabel.ts
import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/data/db";
import { POSTURE_LABELS, type PostureLabel } from "@/model/RuleClassifier";

const BAD_LABELS = POSTURE_LABELS.filter((l) => l !== "정상");

function toMon0Sun6(day: number) {
  // Date.getDay(): 0=Sun..6=Sat → 0=Mon..6=Sun
  return (day + 6) % 7;
}

export type CellCounts = Record<PostureLabel, number>;
export type WeeklyGridByLabel = CellCounts[][]; // 7(rows: Mon..Sun) x 24(cols: hour)

export function useWeeklyHeatmapByLabel(opts?: { sinceTs?: number; excludeNormal?: boolean }) {
  const sinceTs = opts?.sinceTs;
  const excludeNormal = opts?.excludeNormal ?? true;

  const [grid, setGrid] = useState<WeeklyGridByLabel>(
    Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () =>
        Object.fromEntries(POSTURE_LABELS.map((l) => [l, 0])) as CellCounts
      )
    )
  );
  const [maxCellTotal, setMaxCellTotal] = useState(1);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const q = sinceTs ? db.events.where("ts").above(sinceTs) : db.events;
      const rows = await q.toArray();

      const g: WeeklyGridByLabel = Array.from({ length: 7 }, () =>
        Array.from({ length: 24 }, () =>
          Object.fromEntries(POSTURE_LABELS.map((l) => [l, 0])) as CellCounts
        )
      );

      for (const r of rows) {
        if (excludeNormal && r.label === "정상") continue;
        const d = new Date(r.ts);
        const dow = toMon0Sun6(d.getDay());
        const h = d.getHours();
        // @ts-expect-error label narrowing at runtime
        g[dow][h][r.label] = (g[dow][h][r.label] ?? 0) + 1;
      }

      let maxTot = 1;
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 24; j++) {
          const cell = g[i][j];
          const total = BAD_LABELS.reduce((acc, l) => acc + (cell[l] ?? 0), 0);
          if (total > maxTot) maxTot = total;
        }
      }
      return { g, maxTot };
    }).subscribe({
      next: ({ g, maxTot }) => {
        setGrid(g);
        setMaxCellTotal(maxTot || 1);
      },
      error: (e) => console.error("[useWeeklyHeatmapByLabel] liveQuery error:", e),
    });

    return () => sub.unsubscribe();
  }, [sinceTs, excludeNormal]);

  return { grid, maxCellTotal, badLabels: BAD_LABELS };
}
