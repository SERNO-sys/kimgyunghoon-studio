# TASKS_v2.md

# Project

KIM GYUNG HOON STUDIO

---

# Development Rule

모든 개발은 Phase 단위로 진행한다.

각 Phase는

- Goal
- Deliverables
- Done Criteria
- Test
- Git Commit

을 만족해야 완료로 인정한다.

AI는 절대 다음 Phase를 임의로 진행하지 않는다.

---

# PHASE 0
Project Bootstrap

Priority : Highest

Goal

프로젝트 개발환경 구축

Deliverables

- Next.js (Latest Stable)
- App Router
- TypeScript
- TailwindCSS
- ESLint
- Prettier
- Git
- Cloudflare Pages 설정

Tasks

□ 프로젝트 생성

□ TypeScript 적용

□ Tailwind 설치

□ ESLint 적용

□ Prettier 적용

□ Alias 설정 (@/*)

□ Git 초기화

□ README 생성

Done Criteria

✓ npm install 성공

✓ npm run dev 성공

✓ Tailwind 정상 적용

✓ Git Commit 완료

Commit

chore: initialize project

---

# PHASE 1
Content Architecture

Priority : Highest

Goal

콘텐츠 저장 구조 확정

Deliverables

content/

music/

diary/

assets/

Tasks

□ music 폴더 생성

□ diary 폴더 생성

□ assets 생성

□ sample music markdown 작성

□ sample diary markdown 작성

□ Frontmatter 규격 작성

Done Criteria

✓ Markdown Parsing 성공

✓ Frontmatter Parsing 성공

✓ Sample Rendering 성공

Commit

feat: content architecture

---

# PHASE 2
Data Layer

Goal

모든 데이터를 읽을 수 있도록 한다.

Deliverables

lib/

markdown.ts

music.ts

diary.ts

relations.ts

types/

music.ts

diary.ts

common.ts

Tasks

□ Markdown Parser

□ Music Loader

□ Diary Loader

□ Relation Loader

□ Type 정의

Done Criteria

✓ Music Load

✓ Diary Load

✓ Related Music

✓ Related Diary

Commit

feat: data layer

---

# PHASE 3
Global UI

Goal

사이트 공통 UI 제작

Deliverables

Header

Navigation

Footer

Button

Card

Badge

Tasks

□ Header

□ Navigation

□ Footer

□ Mobile Menu

□ Button

□ Card

□ Badge

Done Criteria

✓ Desktop

✓ Tablet

✓ Mobile

✓ Responsive

Commit

feat: global ui

---

# PHASE 4
Home

Goal

메인페이지 제작

Deliverables

Hero

Featured Music

Latest Diary

Quote

Tasks

□ Hero

□ CTA

□ Featured Music

□ Latest Diary

□ Philosophy

Done Criteria

✓ Desktop

✓ Mobile

✓ Animation 최소 적용

Commit

feat: home page

---

# PHASE 5
Music

Goal

음악 아카이브 제작

Deliverables

Music List

Music Detail

Youtube Player

Lyrics

Production Note

Related Diary

Tasks

□ Music List

□ Music Detail

□ Player

□ Lyrics

□ Production Note

□ Related Diary

Done Criteria

✓ 모든 Markdown 렌더링

✓ Youtube 정상 재생

Commit

feat: music archive

---

# PHASE 6
Diary

Goal

작곡일기 구축

Deliverables

Diary List

Diary Detail

Markdown

Related Music

Tasks

□ Diary List

□ Diary Detail

□ Markdown

□ Related Music

□ Tag

Done Criteria

✓ Markdown 정상

✓ Related 정상

Commit

feat: composition diary

---

# PHASE 7
About

Goal

작곡가 소개

Deliverables

Profile

Biography

Timeline

Philosophy

Done Criteria

✓ Responsive

Commit

feat: about page

---

# PHASE 8
Contact

Goal

연락 페이지

Deliverables

Email

Youtube

Social

Commit

feat: contact page

---

# PHASE 9
SEO

Goal

검색 최적화

Tasks

□ Metadata

□ OpenGraph

□ Sitemap

□ Robots

□ Favicon

□ JSON-LD

Done Criteria

✓ Lighthouse SEO 100

Commit

feat: seo

---

# PHASE 10
Optimization

Goal

최적화

Tasks

□ Image Optimization

□ Lazy Loading

□ Font Optimization

□ Code Split

□ Dynamic Import

Done Criteria

✓ Lighthouse 90+

Commit

perf: optimization

---

# PHASE 11
Deploy

Goal

서비스 배포

Tasks

□ Build

□ Cloudflare Pages

□ Domain 연결

□ SSL 확인

□ Canonical URL 확인

Done Criteria

✓ Live

Commit

chore: deploy

---

# Future Roadmap

Version 1.1

□ Search

□ Tags

□ Timeline

Version 1.2

□ Related Contents

□ Reading Time

□ Dark Mode

Version 2.0

□ Score Library

□ MIDI Archive

□ Projects

□ Awards

□ Gallery

Version 3.0

□ AI Composer Journal

□ Interactive Timeline

□ Works Database

## AI Development Rules

- 한 번에 하나의 Phase만 수행한다.
- 완료되지 않은 Phase를 건너뛰지 않는다.
- 임의로 새로운 라이브러리를 추가하지 않는다.
- Architecture.md의 폴더 구조를 변경하지 않는다.
- PRD에 없는 기능은 구현하지 않는다.
- 구현이 끝나면 변경 사항을 요약하고 다음 Phase 진행 여부를 사용자에게 묻는다.