import { writeFileSync } from 'node:fs';

const ACCOUNT = 'a7d07d413295043712df1a0ae1a166bd';
const PROJECT = 'kimgyunghoon-studio';
const TOKEN = 'cfoat_9B9Qu55xLMGYMw94SRpAZkPWZ0FJt09Vi9aoVET9rx0.j_tR3JgPeBO1VsTlS8pJbc2Rl5GtG13DRMQiJIW1o2Y';

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
