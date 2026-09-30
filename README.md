# 📖 P.D.S Canvas — 플랜두씨 다이어리 (PDS Diary)

> **계획(Plan) → 실제로 한 일(Do) → 돌아보기(See)** 가 하나로 이어지는 실제 양장본 감성의 웹 다이어리입니다.  
> 단순한 할 일 체크리스트를 넘어, 내가 세운 계획과 실제 실행 사이의 시간 오차와 막힌 지점(Blocker)을 시각화하고 다음 계획으로 피드백을 전달하는 자기 성장 도구입니다.

* 🌐 **서비스 배포 URL (GitHub Pages)**: [https://hayul0611.github.io/PDS-Diary/](https://hayul0611.github.io/PDS-Diary/)
* 📦 **소스 코드 저장소**: [https://github.com/HaYul0611/PDS-Diary](https://github.com/HaYul0611/PDS-Diary)

---

## 🌟 주요 기능 및 특징

### 1. 계획 (Plan)
* **목표 수립**: 제목, 기간(시작일~종료일), 우선순위(높음/보통/낮음), 구체적 성공 기준, 예상 소요 시간 등록
* **수정 이력 보존 (`plan_history`)**: 계획을 수정하더라도 처음 세웠던 원본 계획과 변경 이력이 서버 DB에 안전하게 보존

### 2. 다이어리 캘린더 (Calendar)
* **빠른 연도/월 이동**: 셀렉트 드롭다운을 통해 원하는 연도와 월로 한 번에 탐색
* **연속 일정 형광펜 스티커**: 여러 날에 걸친 계획을 하나의 부드러운 형광펜 라인으로 연결 시각화
* **날짜 클릭 등록**: 캘린더 빈칸 클릭 시 해당 날짜의 할 일을 바로 등록

### 3. 할 일 다루기 (Do)
* **세부 속성 관리**: 마감일, 우선순위, 태그, 예상 시간 입력 및 완료/되돌리기/수정/삭제
* **검색 & 다중 필터**: 실시간 텍스트 검색, 상태별(진행중/완료) 및 우선순위별 필터링
* **명확한 정렬 기준**: 최신순, 마감일순, 우선순위순 등 정렬 기준이 화면에 항상 투명하게 명시

### 4. 실행 기록 (Do)
* **독립된 실행 기록**: 시작 시각, 끝난 시각, 실제 걸린 시간, 막혔던 이유(Blocker)를 별도로 기록하여 원래 계획을 덮어쓰지 않음
* **중복 완료 방지 (멱등성)**: 완료 버튼을 연달아 눌러도 `idempotency_key`를 통해 완료 기록과 집계가 정확히 1회만 증가

### 5. 사진 · Vlog 일기 (Photolog)
* **폴라로이드 & 캐러셀 슬라이더**: 다중 사진/영상 업로드 시 좌우 내비게이션과 도트 인디케이터가 포함된 캐러셀 지원
* **손글씨 감성 타이포그래피**: 한글 어절 분리 방지(`word-break: keep-all`) 및 편안한 행간
* **지능형 자동 서식**:
  * `# 문장` 입력 시 부드러운 테라코타 포인트 해시 목록으로 자동 변환
  * `<도서명 / 저자>` 입력 시 북마크 아이콘이 포함된 고급 인용구 뱃지로 자동 변환

### 6. 돌아보기 (See & Next Action)
* **심층 분석 대시보드**: 계획 수, 완료 수, 지연 수, 막힘 수, 예상 시간 합계, 실제 소요 시간, 시간 오차 자동 계산
* **근거 기록 드릴다운**: 집계 카드를 클릭하면 해당 수치를 만들어낸 구체적인 할 일 목록을 즉시 확인
* **다음 계획으로 피드백 넘기기**: 이번 회고에서 얻은 통찰을 한 줄 피드백(`next_action`)으로 남겨 다음 계획에 전달

### 7. 감성 다이어리 북 디자인 & 3D 책장 넘김
* **양장본 다이어리 디자인**: 모눈종이 내지 질감, 중앙 제본선, 바인더 스티칭, 가름끈 리본, 양면 페이지 번호
* **부드러운 3D 앞장/뒷장 북 플립 & 페이퍼 컬(Page Curl)**: 탭 전환 시 실제 종이 모서리가 입체적으로 말려 넘어가며 원통형 곡면 음영이 생기는 실시간 3D 페이지 턴 연출

### 8. 데이터 보호 및 내보내기
* **원클릭 전체 JSON 내보내기**: 상단 `내보내기` 버튼으로 내 모든 계획, 할 일, 실행 기록을 단일 JSON 파일로 백업
* **보안 및 XSS 방어**: 스크립트 형태의 입력값 자동 이스케이프 처리(`U.esc`), 안전한 Supabase RLS 정책 적용

---

## 🛠️ 기술 스택

* **Frontend**: HTML5, Vanilla CSS3 (Custom Design System, 3D CSS Transform), Vanilla JavaScript (ES6+)
* **Database & Cloud**: Supabase (PostgreSQL), Supabase Storage
* **Typography**: Nanum Pen Script, Gaegu, Noto Sans KR (Google Fonts)
* **Icons**: 100% Custom Pure SVG Icons (외부 이모지 라이브러리 의존성 없음)

---

## 🗄️ 데이터베이스 구조 (Supabase)

```
plans (계획)
 ├── plan_history (수정 이력)
 ├── todos (할 일)
 │    └── records (실행 기록)
 └── vlog_entries (사진·Vlog 다이어리)

storage.buckets
 └── vlog-media (사진/동영상 미디어 저장소)
```

상세한 스키마 정의 및 계약 명세는 다음 파일에서 확인하실 수 있습니다:
* SQL 스키마 (v2): [`contracts/pds-schema-v2.sql`](contracts/pds-schema-v2.sql)
* 데이터 스키마 명세 (v2): [`contracts/pds-schema-v2.json`](contracts/pds-schema-v2.json)
* 인증 및 사용자 격리 RLS 스키마 (v3): [`contracts/pds-schema-v3.sql`](contracts/pds-schema-v3.sql)

---

## 📜 과제 7: 인증 구현 설명서 및 채점용 실증 보고서

과제 7의 평가 기준(카드 1~5)에 맞추어 작성된 공식 제출문 전문은 다음 링크에서 확인하실 수 있습니다:
👉 **[과제 7 공식 제출 설명서 바로가기 (`과제7_제출문.md`)](과제7_제출문.md)**

* **카드 1 (인증 수단 선택)**: Supabase Auth (GoTrue v2.x) 채택 및 미선택 기술 대비 이유, 계정 열거 방지 통일 문구
* **카드 2 (비밀번호 보관)**: `bcrypt` (Cost 10) 암호화, 계정별 고유 Salt로 인한 동일 비번 해시 상이 실증, 네트워크/로그 평문 부재
* **카드 3 (토큰 관리)**: JWT Bearer Access Token (3600초 만료), 동일 주소 로그인 성공(`200`) vs 로그아웃 거절(`403`) 대조, Secret Key 서버 격리
* **카드 4 (타인 자료 403 차단)**: 계정 간 양방향 읽기/수정/삭제 0건 격리, 위조 user_id 주입 시 `403 Forbidden` RLS 차단, 차단 소스 위치 명시
* **카드 5 (5일 실제 사용 & 규칙 변경)**: Asia/Seoul 기준 5일 실기록, 2일차 뒤 3일차 앞 "2시간 단위 분할 규칙" 변경, 시간 오차율(%) 비교 (41.5% → 14.8%), 수기 합계 일치 검증, 단일 JSON 내보내기 및 회원 탈퇴(DB 영구 삭제)

---

## 🚀 실행 방법

1. 저장소를 클론합니다:
   ```bash
   git clone https://github.com/HaYul0611/PDS-Diary.git
   cd PDS-Diary
   ```
2. 별도의 빌드 도구 설치 없이 브라우저에서 바로 열거나 로컬 웹 서버(VS Code Live Server 등)로 실행합니다:
   * `index.html` 파일을 브라우저로 열기
3. Supabase 데이터베이스 설정:
   * Supabase 프로젝트 생성 후 `contracts/pds-schema-v2.sql` 및 `contracts/pds-schema-v3.sql`의 SQL 코드를 SQL Editor에 붙여넣고 실행(Run)합니다.

---

## 📄 라이선스
MIT License

