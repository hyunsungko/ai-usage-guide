# Deck build architecture

이 프로젝트는 작업 편의를 위해 슬라이드 단위 소스와 최종 단일 HTML을 함께 관리합니다.

## 구조

- `src/template.html`: 최종 `index.html`의 외곽 템플릿
- `src/styles/deck.css`: 발표자료 전체 스타일
- `src/slides/*.html`: 슬라이드 단위 HTML 조각. 파일명 앞의 번호가 빌드 순서입니다.
- `scripts/build-deck.ps1`: 위 소스를 합쳐 단일 `index.html`을 생성합니다.
- `index.html`: 브라우저에서 여는 최종 산출물입니다.

## 작업 방식

1. 슬라이드를 수정할 때는 가능하면 `src/slides/NN-*.html`을 수정합니다.
2. 공통 스타일은 `src/styles/deck.css`를 수정합니다.
3. 수정 후 아래 명령으로 단일 파일을 다시 생성합니다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-deck.ps1
```

여러 세션이 동시에 작업할 때는 서로 다른 `src/slides/NN-*.html` 파일을 맡으면 충돌을 줄일 수 있습니다.
