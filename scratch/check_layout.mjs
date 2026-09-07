import { spawn } from 'child_process';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const userDataDir = '/Users/sarthakmathapati/Desktop/skens-code-git/Full_stack_project/1-My-Portfolio/.chrome-temp';
const port = 9333;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=1440,900',
  'about:blank'
]);

let targetWsUrl = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
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

  console.log('Connected to Chrome via CDP:', targetWsUrl);

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

  // Create new target for our page
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

  // Evaluate bounding rects of header, hero, about
  const layoutInfo = await sendSession('Runtime.evaluate', {
    expression: `JSON.stringify({
      window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight, scrollY: window.scrollY },
      header: document.querySelector('header')?.getBoundingClientRect(),
      headerStyle: window.getComputedStyle(document.querySelector('header')),
      navContainer: document.querySelector('.nav-container')?.getBoundingClientRect(),
      navContainerStyle: {
        position: window.getComputedStyle(document.querySelector('.nav-container')).position,
        top: window.getComputedStyle(document.querySelector('.nav-container')).top,
        display: window.getComputedStyle(document.querySelector('.nav-container')).display
      },
      hero: document.querySelector('.hero')?.getBoundingClientRect(),
      about: document.querySelector('#about')?.getBoundingClientRect(),
      aboutContainer: document.querySelector('#about .container')?.getBoundingClientRect()
    })`,
    returnByValue: true
  });

  console.log('LAYOUT INFO:', JSON.parse(layoutInfo.result.result.value));

  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  chrome.kill();
  process.exit(1);
});
