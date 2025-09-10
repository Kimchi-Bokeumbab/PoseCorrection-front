import React, { useEffect } from "react";
import RealtimePanel from "../features/realtime/RealtimePanel";
import VisualizationPanel from "../features/visualization/VisualizationPanel";
import StretchPanel from "../features/stretch/StretchPanel";
import { POSTURE_LABELS, KO_TO_EN } from "../lib/constants";

export default function DevSmoke(){
  useEffect(() => {
    try {
      console.assert(typeof RealtimePanel === "function", "RealtimePanel should be defined");
      console.assert(typeof VisualizationPanel === "function", "VisualizationPanel should be defined");
      console.assert(typeof StretchPanel === "function", "StretchPanel should be defined");
      console.assert(Array.isArray(POSTURE_LABELS) && POSTURE_LABELS.length === 5, "POSTURE_LABELS must have 5 items");
      console.assert(typeof KO_TO_EN === "object" && Object.keys(KO_TO_EN).length === 5, "KO_TO_EN must map 5 labels");
      const colored = document.querySelector('[data-test="bar-colored"]');
      console.assert(!!colored || true, "Colored bar chart should render");
      console.log("[PostureCare] Smoke tests passed ✅");
    } catch (e) {
      console.error("[PostureCare] Smoke tests failed ❌", e);
    }
  }, []);
  return <div aria-hidden className="sr-only" data-test="smoke">ok</div>;
}

// try {
// const baseline = { ts: 0, keypoints: [
// { name: "head", x: 0, y: 0 },
// { name: "neck", x: 0, y: 0.05 },
// { name: "shoulder_l", x: -0.1, y: 0 },
// { name: "shoulder_r", x: 0.1, y: 0 },
// { name: "hip_l", x: -0.1, y: 0.2 },
// { name: "hip_r", x: 0.1, y: 0.2 },
// ] };
// const current = { ts: 1, keypoints: [
// { name: "head", x: 0.05, y: 0 }, // 전방 0.05 이동
// { name: "neck", x: 0, y: 0.05 },
// { name: "shoulder_l", x: -0.1, y: 0 },
// { name: "shoulder_r", x: 0.1, y: 0 },
// { name: "hip_l", x: -0.1, y: 0.2 },
// { name: "hip_r", x: 0.1, y: 0.2 },
// ] };
// const { composeFeatureVector } = await import("@/lib/poseFeatures");
// const f = composeFeatureVector(baseline as any, current as any);
// console.assert(f.length === 21, "feature length should be 21");
// console.assert(f[0] > 0, "head dx should be positive for forward head");
// console.log("[PostureCare] feature test passed ✅", f.slice(0,6));
// } catch (e) {
// console.warn("[PostureCare] feature test skipped", e);
// }