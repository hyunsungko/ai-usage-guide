# 교육평가 출제분야 AI 활용 가이드

Deeprootree가 제작한 교육평가 출제분야 시험위원용 AI 활용 가이드 HTML 슬라이드 덱입니다.

본 자료는 "GAI 활용 저작물"입니다. 공개된 저장소를 통해 누구나 AI를 활용하여 가공하고 편집하여 활용할 수 있습니다. 단, 본 자료를 허가없이 복제하거나 무단으로 사용하지는 마십시오.

## 바로 보기

`index.html`을 브라우저에서 열면 최종 슬라이드를 확인할 수 있습니다.

로컬 서버로 확인할 때는 프로젝트 루트에서 실행합니다.

```powershell
python -m http.server 3000
```

그 다음 `http://localhost:3000`으로 접속합니다.

## 편집 구조

- `index.html`: 배포용 단일 HTML 슬라이드 원문
- `src/slides/`: 슬라이드별 HTML 원본
- `src/styles/deck.css`: 공통 디자인/레이아웃 스타일
- `src/template.html`: `index.html` 생성 템플릿
- `assets/`: 슬라이드에서 사용하는 이미지와 SVG
- `uploads/`: Pretendard 폰트와 로컬 서명 이미지
- `scripts/build-deck.ps1`: 슬라이드 원본을 `index.html`로 빌드
- `scripts/check-layout.mjs`: 1920x1080 기준 레이아웃 검증

## 수정 방법

슬라이드 내용은 `src/slides/*.html`을 수정하고, 공통 스타일은 `src/styles/deck.css`를 수정합니다. 수정 후 아래 명령으로 단일 HTML을 다시 생성합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-deck.ps1
```

레이아웃 검증은 다음 명령으로 실행합니다.

```powershell
npm.cmd run check:layout
```

## 설치

레이아웃 검증을 실행하려면 Node.js 환경에서 의존성을 설치합니다.

```powershell
npm install
```

단순히 `index.html`을 보는 것만으로는 별도 설치가 필요하지 않습니다.
