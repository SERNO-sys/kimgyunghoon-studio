# Cloudflare Pages 배포 가이드

이 프로젝트는 Cloudflare Pages + D1 + R2 기반의 Edge SaaS로 동작합니다.

## 1. 필수 설치

```bash
npm install
```

## 2. Wrangler 로그인

```bash
npx wrangler login
```

## 3. D1 데이터베이스 생성 및 스키마 적용

```bash
# D1 데이터베이스 생성
npx wrangler d1 create kimgyunghoon-studio-db

# 출력된 database_id를 wrangler.toml의 [[d1_databases]] database_id에 붙여넣기

# 스키마 적용 (원격)
npx wrangler d1 execute DB --file=./src/lib/db/schema.sql

# 로컬에서 테스트할 때
npx wrangler d1 execute DB --local --file=./src/lib/db/schema.sql
```

## 4. R2 버킷 생성

```bash
npx wrangler r2 bucket create kimgyunghoon-studio-media
```

- R2 버킷을 Public Access 가능하도록 설정하거나, 미디어용 커스텀 도메인을 연결합니다.
- `wrangler.toml`의 `[vars]` 섹션 `R2_PUBLIC_URL`을 실제 퍼블릭 URL로 변경합니다.

## 5. Pages 프로젝트 생성

```bash
npx wrangler pages project create kimgyunghoon-studio
```

## 6. Secrets 등록

`.dev.vars.example`을 참고하여 `.dev.vars` 파일을 만들고, Pages Secret도 등록합니다.

```bash
# Pages Secret (필수)
npx wrangler pages secret put SESSION_SECRET
npx wrangler pages secret put GOOGLE_CLIENT_ID
npx wrangler pages secret put GOOGLE_CLIENT_SECRET
npx wrangler pages secret put GEMINI_API_KEY
```

## 7. 로컬 개발

```bash
npm run pages:build
npm run pages:dev
```

`wrangler pages dev`는 자체 D1/R2 에뮬레이터를 사용합니다.

## 8. 배포

```bash
npm run pages:build
npm run pages:deploy
```

## 주의사항

- `next dev`만으로는 D1/R2 바인딩을 사용할 수 없습니다. 반드시 `wrangler pages dev`를 사용하세요.
- `src/lib/db/client.ts`는 D1 바인딩이 없을 때 자동으로 in-memory DB로 폴백합니다.
- local에서 만든 데이터는 in-memory이므로 D1으로 마이그레이션하지 않으면 배포 후 사라집니다.
