import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, StretchHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchPostureStats, PostureStatsSummary } from "@/lib/api";

type StretchId =
  | "head_tilt"
  | "shoulder_drop"
  | "knee_hug"
  | "chin_tuck";

interface StretchGuide {
  id: StretchId;
  label: string;
  title: string;
  video: string;
  duration: string;
  purposes: string[];
  steps: string[];
  tips?: string[];
}

interface StretchWithStats extends StretchGuide {
  count: number;
  ratio: number;
  rank: number;
}

const STRETCH_LIBRARY: Record<StretchId, StretchGuide> = {
  head_tilt: {
    id: "head_tilt",
    label: "목꺾임",
    title: "목 측면 스트레칭 (Head Tilt)",
    video: "head_tilt_stretching.mp4",
    duration: "20~30초 × 각 2회",
    purposes: [
      "목 빗근근(흉쇄유돌근)과 승모근 측면의 긴장 완화",
      "좌우 근육 밸런스 회복",
    ],
    steps: [
      "의자에 똑바로 앉습니다.",
      "오른손으로 머리의 왼쪽을 잡고 천천히 오른쪽으로 기울입니다.",
      "왼쪽 목 옆이 늘어나는 느낌을 유지한 채 호흡을 이어갑니다.",
      "20~30초 유지 후 천천히 돌아오고, 각 방향 2회 반복합니다.",
    ],
    tips: ["반대쪽도 동일하게 진행하고, 어깨 힘을 빼며 턱을 살짝 뒤로 당겨주세요."],
  },
  shoulder_drop: {
    id: "shoulder_drop",
    label: "어깨 기울어짐",
    title: "상부승모근 & 광배근 스트레칭",
    video: "shoulder_tilt_stretching.mp4",
    duration: "20~30초 × 2회",
    purposes: [
      "한쪽 어깨에 하중이 실리는 습관 교정",
      "키보드·마우스 사용 시 비대칭 완화",
    ],
    steps: [
      "한 팔을 머리 위로 곧게 올립니다.",
      "반대 손으로 팔꿈치를 잡고 몸통을 천천히 반대 방향으로 기울입니다.",
      "옆구리부터 어깨 옆면까지 당김이 느껴질 때 20~30초 유지합니다.",
      "천천히 제자리로 돌아오고, 반대쪽도 동일하게 2회 반복합니다.",
    ],
    tips: ["몸통이 앞으로 무너지지 않도록 복부에 힘을 주고, 어깨에 과도한 힘이 들어가지 않도록 주의합니다."],
  },
  knee_hug: {
    id: "knee_hug",
    label: "뒤로 기대서 앉음",
    title: "무릎 당기기 (Lower-back stretch)",
    video: "leaning_back_stretching.mp4",
    duration: "20~30초 × 2회",
    purposes: [
      "허리 과신전 및 요추 전만 증가 완화",
      "복근 활성화와 허리 주변 긴장 완화",
    ],
    steps: [
      "의자에 앉은 상태에서 허리를 곧게 세웁니다.",
      "한쪽 무릎을 가슴 쪽으로 끌어안습니다.",
      "허리 뒤쪽이 부드럽게 늘어나는 느낌을 유지하며 20~30초 버팁니다.",
      "천천히 다리를 내리고 반대쪽도 2회 반복합니다.",
    ],
  },
  chin_tuck: {
    id: "chin_tuck",
    label: "거북목",
    title: "턱 당기기 (Chin Tuck)",
    video: "forward_head_chin_tuck.mp4",
    duration: "5초 유지 × 10회",
    purposes: [
      "SCM, 사각근, 흉근 스트레칭",
      "심부 목 굴곡근(Deep Neck Flexor) 강화",
    ],
    steps: [
      "정면을 바라보고 바르게 앉습니다.",
      "턱을 아래로 숙이지 말고 수평으로 뒤쪽으로 당겨 이중턱을 만듭니다.",
      "5초간 유지한 뒤 힘을 뺍니다.",
      "10회 반복하며 목 주변에 불필요한 긴장을 피합니다.",
    ],
    tips: ["어깨를 끌어내리고, 눈높이를 유지한 채 턱만 뒤로 당겨주세요."],
  },
};

const LABEL_TO_STRETCH_ID: Record<string, StretchId> = {
  목꺾임: "head_tilt",
  "어깨 기울어짐": "shoulder_drop",
  "뒤로 기대서 앉음": "knee_hug",
  거북목: "chin_tuck",
};

function normalizeLabel(label: string) {
  return label.trim();
}

function createRecommendations(summary: PostureStatsSummary | null): StretchWithStats[] {
  if (!summary) return [];

  const counts = summary.labels
    .map((entry) => ({
      label: normalizeLabel(entry.label),
      count: entry.count ?? 0,
    }))
    .filter((entry) => entry.count > 0 && LABEL_TO_STRETCH_ID[entry.label]);

  if (counts.length === 0) {
    return [];
  }

  const totalBad = counts.reduce((sum, entry) => sum + entry.count, 0) || 1;

  return counts
    .sort((a, b) => b.count - a.count)
    .map((entry, index) => {
      const id = LABEL_TO_STRETCH_ID[entry.label];
      const guide = STRETCH_LIBRARY[id];
      return {
        ...guide,
        count: entry.count,
        ratio: entry.count / totalBad,
        rank: index + 1,
      };
    });
}

function StretchCard({ data }: { data: StretchWithStats }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <StretchHorizontal className="h-4 w-4" />
            {data.title}
          </span>
          <Badge variant="outline">{data.duration}</Badge>
        </CardTitle>
        <CardDescription className="space-y-1">
          <div>주된 불량: {data.label}</div>
          <div>
            최근 7일간 {data.count}회 감지 (우선순위 {data.rank})
            {data.ratio > 0 ? ` · 비중 ${(data.ratio * 100).toFixed(0)}%` : null}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">영상 파일명</div>
          <div>{data.video} (추가 예정)</div>
          <p>
            준비된 영상이 있다면 <code>public/videos/{data.video}</code> 경로에 파일을 추가하고,
            필요 시 카드 컴포넌트를 수정해 플레이어를 연결하세요.
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-emerald-700">🎯 목적</div>
          <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
            {data.purposes.map((purpose) => (
              <li key={purpose}>{purpose}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-emerald-700">🧘 동작</div>
          <ol className="text-sm list-decimal list-inside space-y-1 text-muted-foreground">
            {data.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        {data.tips && data.tips.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-emerald-700">추가 팁</div>
            <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
              {data.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function StretchPanel({ userEmail }: { userEmail: string }) {
  const [summary, setSummary] = useState<PostureStatsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!userEmail) {
        setSummary(null);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const stats = await fetchPostureStats(userEmail, 7);
        if (!active) return;
        setSummary(stats);
      } catch (err) {
        if (!active) return;
        setSummary(null);
        setError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [userEmail]);

  const recommendations = useMemo(() => createRecommendations(summary), [summary]);

  if (!userEmail) {
    return (
      <div className="grid place-items-center py-16 text-center text-muted-foreground">
        스트레칭 추천을 확인하려면 로그인 후 자세 데이터를 수집하세요.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-16 text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          최근 자세 데이터를 기반으로 추천을 계산 중입니다…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center text-red-600">
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="grid gap-4 text-sm text-muted-foreground">
        <div className="rounded-lg border bg-muted/40 p-6">
          최근 7일 동안 두드러진 불량 자세가 감지되지 않았습니다. 좋은 자세를 유지하고 예방 차원에서
          아래 스트레칭을 순환하며 수행해 보세요.
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {Object.values(STRETCH_LIBRARY).map((guide) => (
            <Card key={guide.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <StretchHorizontal className="h-4 w-4" />
                    {guide.title}
                  </span>
                  <Badge variant="outline">{guide.duration}</Badge>
                </CardTitle>
                <CardDescription>
                  {guide.label} 자세가 자주 관찰될 때 완화를 돕는 스트레칭
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">영상 파일명</div>
                  <div>{guide.video} (추가 예정)</div>
                  <p>
                    실제 촬영 영상을 <code>public/videos/{guide.video}</code> 경로에 배치한 뒤,
                    필요하면 카드에 플레이어를 추가해 재생할 수 있습니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-emerald-700">🎯 목적</div>
                  <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                    {guide.purposes.map((purpose) => (
                      <li key={purpose}>{purpose}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-emerald-700">🧘 동작</div>
                  <ol className="text-sm list-decimal list-inside space-y-1 text-muted-foreground">
                    {guide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                {guide.tips && guide.tips.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-emerald-700">추가 팁</div>
                    <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                      {guide.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {recommendations.map((recommendation) => (
        <StretchCard key={recommendation.id} data={recommendation} />
      ))}
    </div>
  );
}

