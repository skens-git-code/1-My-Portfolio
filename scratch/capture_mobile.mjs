import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const userDataDir = '/Users/sarthakmathapati/Desktop/skens-code-git/Full_stack_project/1-My-Portfolio/.chrome-temp';
const port = 9335;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=390,844',
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

  await sleep(1500);

  // Force hide loading screen for clean settled screenshots
  await sendSession('Runtime.evaluate', {
    expression: 'window.forceHideLoading ? window.forceHideLoading() : (document.getElementById("loadingScreen")?.remove())'
  });
  await sleep(600);

  // Set device metrics to mobile
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });

  async function capture(filename) {
    const res = await sendSession('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    fs.writeFileSync(`/Users/sarthakmathapati/.gemini/antigravity-ide/brain/e36009d1-b150-4b5b-b495-5a7f0b7a9469/scratch/${filename}`, buffer);
    console.log(`Saved: ${filename}`);
  }

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

  // Mobile Light Hero
  await capture('capture_mobile_01_hero_light.png');

  // Mobile Light About Container
  await scrollTo('#about');
  await capture('capture_mobile_02_about_light.png');

  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
