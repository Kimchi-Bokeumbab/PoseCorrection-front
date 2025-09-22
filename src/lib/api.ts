// src/lib/api.ts
export async function predictPosture(frames: number[][]) {
  const res = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frames }),
  });
  if (!res.ok) {
    throw new Error("Prediction API request failed");
  }
  const data = await res.json();
  return data.prediction as string; // 예: "good_posture"
}
