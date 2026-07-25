좋습니다.
이건 실제 PM(Project Manager) 관점에서 작성하겠습니다.

---

# TASKS.md v1.0

## Project

**KIM GYUNG HOON STUDIO**

---

# Epic 0. Project Setup

### Story

프로젝트 기본 환경 구축

### Tasks

* [ ] Next.js(App Router) 프로젝트 생성
* [ ] TypeScript 설정
* [ ] TailwindCSS 설정
* [ ] ESLint 설정
* [ ] Prettier 설정
* [ ] 절대경로(alias) 설정
* [ ] Cloudflare Pages 배포 환경 구성
* [ ] Git Repository 생성
* [ ] README 작성

---

# Epic 1. Design System

### Story

사이트 전체 디자인 규칙 정의

### Tasks

* [ ] Color Palette 정의
* [ ] Typography 정의
* [ ] Spacing System 정의
* [ ] Radius 규칙 정의
* [ ] Shadow 규칙 정의
* [ ] Button Variant 정의
* [ ] Link Style 정의
* [ ] Card Style 정의
* [ ] Responsive Breakpoint 정의

---

# Epic 2. Global Layout

### Story

사이트 공통 레이아웃 제작

### Tasks

* [ ] Layout 구성
* [ ] Header 제작
* [ ] Navigation 제작
* [ ] Footer 제작
* [ ] Mobile Navigation 제작
* [ ] Scroll To Top
* [ ] Active Menu 표시
* [ ] 404 페이지
* [ ] Loading UI
* [ ] Error UI

---

# Epic 3. Home

### Story

메인 홈페이지 제작

---

## Hero

* [ ] Hero 배경
* [ ] Hero Title
* [ ] Hero Subtitle
* [ ] Hero CTA 버튼
* [ ] Hero Animation(최소)

---

## Featured Music

* [ ] Music Card Component
* [ ] Music List
* [ ] Hover 효과
* [ ] 반응형

---

## Latest Diary

* [ ] Diary Card Component
* [ ] 최신 글 표시
* [ ] 날짜 표시
* [ ] 요약 표시

---

## Philosophy

* [ ] 소개 문구
* [ ] Quote 디자인

---

# Epic 4. Music

### Story

음악 라이브러리 구축

---

## Music List

* [ ] Music 목록
* [ ] Card Grid
* [ ] Pagination(향후)

---

## Music Detail

* [ ] 앨범아트
* [ ] 제목
* [ ] 설명
* [ ] Youtube Embed
* [ ] 가사
* [ ] 제작노트

---

## Related

* [ ] 관련 Diary 표시

---

# Epic 5. Composition Diary

### Story

작곡일기 시스템 구축

---

## List

* [ ] Diary 목록
* [ ] 최신순 정렬
* [ ] Tag 표시

---

## Detail

* [ ] Markdown 렌더링
* [ ] 제목
* [ ] 날짜
* [ ] 본문
* [ ] Related Music

---

## Tags

* [ ] Tag Component
* [ ] Tag Page

---

# Epic 6. About

### Story

작곡가 소개

### Tasks

* [ ] Profile
* [ ] Biography
* [ ] Timeline
* [ ] Philosophy

---

# Epic 7. Contact

### Tasks

* [ ] Contact Page
* [ ] Email
* [ ] Youtube Link
* [ ] Github(Optional)

---

# Epic 8. SEO

### Tasks

* [ ] Metadata
* [ ] OpenGraph
* [ ] Twitter Card
* [ ] robots.txt
* [ ] sitemap.xml
* [ ] favicon

---

# Epic 9. Performance

### Tasks

* [ ] Image Optimization
* [ ] Lazy Loading
* [ ] Font Optimization
* [ ] Lighthouse 90+

---

# Epic 10. CMS

### Story

콘텐츠 관리

### Tasks

* [ ] Markdown 구조
* [ ] Music JSON
* [ ] Diary Markdown
* [ ] Frontmatter 정의

---

# Epic 11. Future

### Tasks

* [ ] Search
* [ ] Categories
* [ ] Projects
* [ ] Awards
* [ ] Gallery
* [ ] Score Library
* [ ] MIDI Library

---

# MVP 범위

**반드시 먼저 완성할 기능입니다.**

```
✅ Home
✅ Music
✅ Diary
✅ About
✅ Contact
```

---

# Version 1.1

```
Related Music

Related Diary

Markdown

SEO
```

---

# Version 1.2

```
Tag

Search

Timeline
```

---

# Version 2.0

```
Score

MIDI

Projects

Media

Awards
```

---

# 우선순위 (개발 순서)

```
1. 프로젝트 생성
        ↓
2. 디자인 시스템
        ↓
3. 공통 레이아웃
        ↓
4. Home
        ↓
5. Music
        ↓
6. Diary
        ↓
7. About
        ↓
8. Contact
        ↓
9. SEO
        ↓
10. 배포
```

---

## 제가 한 가지 수정하고 싶은 부분이 있습니다.

이 프로젝트는 일반 회사 홈페이지와 달리 **콘텐츠가 핵심**입니다. 그래서 **Epic 순서를 조금 바꾸는 것**을 추천합니다.

제가 추천하는 실제 개발 순서는 다음과 같습니다.

1. **프로젝트 세팅**
2. **Design System + Layout**
3. **콘텐츠 모델(Music, Diary 데이터 구조) 먼저 확정**
4. **Home**
5. **Music**
6. **Diary**
7. **About / Contact**
8. **SEO 및 최적화**
9. **배포**

즉, 화면부터 만들기보다 **"음악과 작곡일기를 어떻게 저장하고 연결할 것인가"**를 먼저 정하면, 나중에 기능을 추가해도 구조가 흔들리지 않습니다.

이 순서대로 진행하면 홈페이지가 단순한 소개 사이트가 아니라, 앞으로 수십 곡과 수백 개의 작곡일기를 쌓아도 유지보수가 쉬운 **창작 아카이브**로 성장할 수 있습니다.
