import { EventEmitter } from "events";
import type { PoseFrame } from "@/lib/model";
import { CustomPostureModel } from "@/model/CustomPostureModel";

export type EngineState = "idle" | "running";
export class PostureEngine extends EventEmitter {
private model = new CustomPostureModel();
private state: EngineState = "idle";
private baseline?: PoseFrame;
private raf = 0 as number;

async start(baseline: PoseFrame) {
if (!baseline) throw new Error("baseline required");
this.baseline = baseline;
await this.model.init();
this.state = "running";
const loop = async () => {
if (this.state !== "running") return;
const current = await this.mockPoseFrame(); // TODO: 실제 키포인트로 교체
const pred = await this.model.predict(this.baseline!, current);
this.emit("prediction", pred); // {label, score, extras}
this.raf = requestAnimationFrame(loop as any);
};
loop();
}

stop(){ this.state = "idle"; cancelAnimationFrame(this.raf); }

// 데모용: 실제 카메라 파이프라인으로 교체 예정
private async mockPoseFrame(): Promise<PoseFrame> {
return { ts: Date.now(), keypoints: [
{ name: "head", x: 0.02*Math.sin(Date.now()/500), y: 0.01*Math.cos(Date.now()/700) },
{ name: "neck", x: 0, y: 0 },
{ name: "shoulder_l", x: -0.1, y: 0 },
{ name: "shoulder_r", x: 0.1, y: 0 },
{ name: "hip_l", x: -0.09, y: 0.2 },
{ name: "hip_r", x: 0.09, y: 0.2 },
] };
}
}