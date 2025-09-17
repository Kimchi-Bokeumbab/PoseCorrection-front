// src/features/visualization/useCounts.ts
import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/data/db";
import { POSTURE_LABELS, type PostureLabel } from "@/model/RuleClassifier";

type Counts = Record<PostureLabel, number>;

const emptyCounts = (): Counts =>
  POSTURE_LABELS.reduce((acc, k) => ((acc[k] = 0), acc), {} as Counts);

export function useCounts(opts?: { sinceTs?: number }) {
  const sinceTs = opts?.sinceTs;
  const [counts, setCounts] = useState<Counts>(() => emptyCounts());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const q = sinceTs ? db.events.where("ts").above(sinceTs) : db.events;
      const rows = await q.toArray();
      const acc = emptyCounts();
      for (const r of rows) acc[r.label] = (acc[r.label] ?? 0) + 1;
      return acc;
    }).subscribe({
      next: (acc) => {
        setCounts(acc);
        setLoading(false);
      },
      error: (e) => console.error("[useCounts] liveQuery error:", e),
    });
    return () => sub.unsubscribe();
  }, [sinceTs]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total, loading };
}
