# Wodle Alpha 진행 상황

## 프로젝트 정보
- **스택**: Next.js 16 + Supabase + Groq API
- **배포**: Vercel (GitHub 연동)
- **프로젝트명**: wodle-alpha
- **구조**: `src/` 기반 (app, components, styles, utils)

---

## DB 구조 (Supabase)

### 테이블 목록
| 테이블 | 설명 |
|--------|------|
| `profile` | 유저 정보 (username, lv, coin, exp, streak, last_login_at, is_admin, ban) |
| `wordbook` | 단어장 |
| `word` | 단어 |
| `setting` | 유저 설정 (dark_mode, notifications_on) |
| `owner` | 유저 소유 아이템 (items: int[]) |
| `notice` | 공지사항 (title, content, is_important, target_user_id, read) |

### 트리거
- 회원가입 시 `profile`, `setting`, `owner` row 자동 생성

### Realtime 활성화
- `profile`, `setting` 테이블 Realtime 구독 활성화

---

## ✅ 완료된 기능

### 인증
- 회원가입 / 로그인 / 로그아웃 / 세션 유지
- 이메일 인증 없이 바로 로그인 (개발용)
- 로그아웃 시 다크모드 클래스 제거
- `proxy.ts` 로 라우트 보호

### 랜딩 페이지 (`app/page.tsx`)
- 로그인/회원가입 버튼
- 주황색 디자인

### 상단바 (`components/TopNav.tsx`)
- 아바타, 이름, Lv, EXP 바
- 코인 표시 (Realtime 구독)
- 알림(종) 버튼 → NoticePopup
- 설정 버튼 → setting 페이지
- sticky 고정

### 공지 팝업 (`components/NoticePopup.tsx`)
- 블러 오버레이
- 주황 헤더
- 중요 공지 파란 뱃지
- 공지 클릭 시 상세 보기

### 설정 페이지 (`app/[id]/setting/page.tsx`)
- 다크모드 토글 (DB 저장 + 즉시 적용)
- 알림 토글
- 닉네임 변경
- 로그아웃
- 계정 삭제 (`/api/delete-account`)

### 테마 시스템
- `ThemeProvider` — auth 상태 변화 감지해서 자동 적용
- CSS 변수 (`--bg`, `--text`, `--orange` 등)
- `html.dark` 클래스로 다크모드 전환
- 랜딩/로그인/회원가입은 항상 라이트 고정

### CSS 구조
- `src/styles/landing.css`
- `src/styles/auth.css`
- `src/styles/topnav.css`
- `src/styles/setting.css`
- `src/styles/notice.css`

---

## 🔄 진행 중인 기능

### Admin 페이지 (`app/[id]/admin/page.tsx`)
- `is_admin` 컬럼 추가 완료
- `ban` 컬럼 추가 예정 (0: 정상, 1: 소프트밴, 2: 하드밴)
- 구현 예정:
  - 공지 작성 (전체 / 특정 유저)
  - 유저 검색 (username / 이메일)
  - 유저 밴 (소프트밴 / 하드밴 → 계정 삭제)
  - 코인 / 레벨 직접 수정
  - 아이템 강제 지급 (owner 테이블)

---

## 📋 해야 할 것

### 기능
- [ ] `ban` 컬럼 추가 + proxy.ts에서 밴 체크 로직
- [ ] Admin 페이지 완성
- [ ] 하단 탭바 (`BottomNav`) — 홈 / 통계 / 퀘스트 / 상점
- [ ] 홈 페이지 본격 구현 (단어장 목록, 퀘스트 현황 등)
- [ ] 단어장 페이지 (wordbook, word CRUD)
- [ ] 학습 페이지 (study, review)
- [ ] 코인 시스템 (`utils/coin.ts`) 연동
- [ ] 스트릭 시스템 (`utils/streak.ts`) 연동
- [ ] 정답 체크 (`utils/checkAnswer.ts`) — 띄어쓰기/대소문자/괄호/쉼표 처리
- [ ] AI 단어 뜻 추천 (`api/suggest`) — Groq
- [ ] 사진으로 단어 추가 (`api/vision`) — Groq Vision (Llama 4 Scout)
- [ ] 퀘스트 시스템 (일일 4개 / 월별 3개)
- [ ] 상점 시스템
- [ ] 통계 페이지
- [ ] 비밀번호 재설정

### 나중에 (Beta)
- [ ] 하단 탭바 배지 시스템 (빨간 숫자 / 하늘색 !)
- [ ] PWA (manifest, service worker)
- [ ] 전체 UI 디자인 개선
- [ ] 다크모드 색상 지정
- [ ] PLUS 모드 (현질) — 영영 뜻풀이, 예문, ## 마스킹
- [ ] 파티모드 (풍선 + 다트)
- [ ] 상점 현질 / 광고
- [ ] 이벤트 탭

---

## 개발 컨벤션
- 항상 전체 코드로 제공 (부분 X)
- 파일 상단에 `// src/path/to/file.tsx` 주석
- CSS는 `src/styles/` 에 기능별로 분리
- CSS 변수 사용 (`var(--bg)` 등)
- UI는 mockup 먼저 보여주고 확정 후 구현
- UI 폴리시는 beta 때
- 모바일 퍼스트
