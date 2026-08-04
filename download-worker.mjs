import { writeFileSync } from 'node:fs';

// Credentials must be provided via environment variables — never hardcode them.
// Usage (PowerShell):
//   $env:CF_ACCOUNT_ID = '...'; $env:CF_PAGES_PROJECT = '...'; $env:CF_API_TOKEN = '...'
//   node download-worker.mjs
const ACCOUNT = process.env.CF_ACCOUNT_ID;
const PROJECT = process.env.CF_PAGES_PROJECT;
const TOKEN = process.env.CF_API_TOKEN;

if (!ACCOUNT || !PROJECT || !TOKEN) {
  console.error(
    'Missing env vars: CF_ACCOUNT_ID, CF_PAGES_PROJECT and CF_API_TOKEN are required.'
  );
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}` };

// 1. Get project details to find the project id
const projRes = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/pages/projects/${PROJECT}`,
  { headers }
);
const proj = await projRes.json();
if (!proj.success) {
  console.error('project fetch failed', JSON.stringify(proj));
  process.exit(1);
}
const projectId = proj.result.id;
console.log('project id:', projectId);

// 2. Fetch the Pages Worker script
const scriptName = `pages-worker--${projectId}-production`;
console.log('script name:', scriptName);
const scriptRes = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${scriptName}`,
  { headers }
);
if (!scriptRes.ok) {
  console.error('script fetch failed', scriptRes.status, await scriptRes.text());
  process.exit(1);
}
const content = await scriptRes.text();
writeFileSync('_worker.js', content, 'utf8');
console.log('saved _worker.js, bytes:', content.length);
