import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const userDataDir = '/Users/sarthakmathapati/Desktop/skens-code-git/Full_stack_project/1-My-Portfolio/.chrome-temp';
const port = 9334;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,960',
  'about:blank'
]);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  let targetWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        const data = await res.json();
        targetWsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!targetWsUrl) {
    console.error('Failed to get WebSocket debugger URL');
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(targetWsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  // Create page
  const newTarget = await send('Target.createTarget', {
    url: 'file:///Users/sarthakmathapati/Desktop/skens-code-git/Full_stack_project/1-My-Portfolio/index.html?theme=light&fast=1'
  });
  const targetId = newTarget.result.targetId;
  const session = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = session.result.sessionId;

  function sendSession(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      pending.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  }

  await sleep(1800);

  // Helper to capture current viewport
  async function captureViewport(filename) {
    const res = await sendSession('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const outPath = `/Users/sarthakmathapati/.gemini/antigravity-ide/brain/e36009d1-b150-4b5b-b495-5a7f0b7a9469/scratch/${filename}`;
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved: ${filename} (${buffer.length} bytes)`);
  }

  // Helper to scroll to an element and wait
  async function scrollTo(selector) {
    await sendSession('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('${selector}');
        if (el) {
          document.documentElement.style.scrollBehavior = 'auto';
          document.body.style.scrollBehavior = 'auto';
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      })()`
    });
    await sleep(400);
  }

  // Helper to toggle theme
  async function setTheme(themeName) {
    await sendSession('Runtime.evaluate', {
      expression: `(() => {
        document.documentElement.dataset.theme = '${themeName}';
        if ('${themeName}' === 'light') {
          document.body.classList.add('light-theme');
          document.body.classList.remove('dark-theme');
        } else {
          document.body.classList.remove('light-theme');
          document.body.classList.add('dark-theme');
        }
      })()`
    });
    await sleep(300);
  }

  // 1. Light Mode - Hero
  await setTheme('light');
  await scrollTo('#home');
  await captureViewport('capture_01_hero_light.png');

  // 2. Light Mode - About section container
  await scrollTo('#about');
  await captureViewport('capture_02_about_light.png');

  // 3. Light Mode - Tech Stack section container
  await scrollTo('#tech-stack');
  await captureViewport('capture_03_techstack_light.png');

  // 4. Light Mode - Projects section container
  await scrollTo('#projects');
  await captureViewport('capture_04_projects_light.png');

  // 5. Dark Mode - Hero
  await setTheme('dark');
  await scrollTo('#home');
  await captureViewport('capture_05_hero_dark.png');

  // 6. Dark Mode - About section container
  await scrollTo('#about');
  await captureViewport('capture_06_about_dark.png');

  // 7. Dark Mode - Tech Stack container
  await scrollTo('#tech-stack');
  await captureViewport('capture_07_techstack_dark.png');

  console.log('ALL SECTION SCREENSHOTS CAPTURED SUCCESSFULLY!');
  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
