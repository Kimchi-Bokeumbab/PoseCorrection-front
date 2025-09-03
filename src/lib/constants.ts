export const brand = {
    name: "PostureCare",
    tagline: "웹캠 기반 AI 자세교정",
    primary: "#10b981",
    light: "#ecfdf5",
    dark: "#064e3b",
  } as const;
  
  export const POSTURE_LABELS = [
    "정상",
    "목꺾임",
    "거북목",
    "어깨 기울어짐",
    "뒤로 기대서 앉음",
  ] as const;
  
  export type PostureLabel = typeof POSTURE_LABELS[number];
  
  export const KO_TO_EN: Record<PostureLabel, string> = {
    "정상": "Neutral",
    "목꺾임": "Neck Tilt",
    "거북목": "Forward Head",
    "어깨 기울어짐": "Shoulder Tilt",
    "뒤로 기대서 앉음": "Leaning Back",
  };