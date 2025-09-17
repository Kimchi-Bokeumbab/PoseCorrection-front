// src/data/db.ts
import Dexie, { Table } from "dexie";
import type { PostureLabel } from "@/model/RuleClassifier";

export interface EventRow {
  id?: number;
  ts: number;               // unix ms
  label: PostureLabel;
  score?: number;
}

export interface SessionRow {
  id?: number;
  start: number;
  end?: number;
}

class AppDB extends Dexie {
  events!: Table<EventRow, number>;
  sessions!: Table<SessionRow, number>;
  constructor() {
    super("posturecare-db");
    this.version(1).stores({
      // 인덱스: id 자동, ts, label
      events: "++id, ts, label",
      sessions: "++id, start, end",
    });
  }
}

export const db = new AppDB();

// --- helpers ---
export async function logEvent(label: PostureLabel, score?: number) {
  await db.events.add({ ts: Date.now(), label, score });
}

export async function clearEvents() {
  await db.events.clear();
}
