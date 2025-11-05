# PoseCorrention-front

# 자세교정 AI 프로그램

## 프로젝트 소개
본 프로젝트는 AI를 활용한 자세교정 프로그램을 개발하기 위해 진행하였습니다. 사용자는 프로그램을 활용하여 자신이 습관적으로 취하는 옳지 못한 자세를 교정할 수 있도록 도움을 줍니다.
그외 자세 데이터 분석 및 스트레칭 추천을 통하여 보다 효과적인 자세 교정을 진행할 수 있습니다.

## 팀원 소개
### - 송호진
### - 김진혁
### - 박찬호


## 주요 기능
- **실시간 자세 분석**: 웹캠을 사용하여 사용자의 자세를 실시간으로 분석.
- **자세 교정 피드백**: 잘못된 자세를 감지하여 올바른 자세를 제안.
- **기록 기능**: 자세 개선 이력을 저장 및 추적.

## 기술 스택
- **프레임워크**: React 19, Vite 7, TypeScript
- **데스크톱**: Electron 38 (Vite 개발 서버와 연동)
- **스타일링**: Tailwind CSS, Radix UI, class-variance-authority
- **시각화**: Recharts
- **포즈 추적**: `@mediapipe/tasks-vision`

## 디렉터리 구조
```
├── electron/           # Electron 메인 프로세스 코드
├── src/
│   ├── app/            # 전역 App Shell 및 진입 컴포넌트
│   ├── components/     # 재사용 가능한 UI 컴포넌트
│   ├── engine/         # 실시간 추적 엔진 및 포즈 분석 로직
│   ├── features/       # 인증, 온보딩, 실시간 분석 등 도메인 단위 화면
│   ├── lib/            # API 래퍼 등 유틸리티
│   └── types/          # 공통 타입 정의
└── pose/, model/       # 포즈 분석 관련 에셋 및 샘플 데이터
```

## 개발 환경 준비
- Node.js 18 이상 (Node 20 LTS 권장)
- npm 9 이상
- 카메라가 연결된 환경 (실시간 자세 추적 기능 개발 시 필요)

## 설치 및 실행 방법
1. 의존성 설치
    ```bash
    npm install
    ```
2. 개발 서버 실행 (Vite + Electron 동시 실행)
    ```bash
    npm run dev
    ```
    - `npm:dev:renderer` 스크립트가 Vite 개발 서버를 띄우고,
    - Electron이 동일한 포트를 바라보도록 설정됩니다.
3. Electron 미리보기 (프로덕션 모드)
    ```bash
    npm run build
    npm run preview:electron
    ```

## 환경 변수
- `VITE_API_BASE_URL`: 백엔드 API의 기본 주소. 미설정 시 `http://127.0.0.1:5000`을 사용합니다.
    ```bash
    # 예시 (.env.local)
    VITE_API_BASE_URL=http://localhost:8000
    ```

## 추가 정보
- API 통신 로직은 `src/lib/api.ts`에 구현되어 있습니다.
- 실시간 포즈 측정 및 시각화 구성 요소는 `src/features/realtime/`, `src/features/visualization/`에서 확인할 수 있습니다.
- Electron 설정은 `electron/main.js`를 참고하세요.

실행 중 문제가 발생하거나 개선 아이디어가 있다면 이슈로 남겨 주세요!
    
