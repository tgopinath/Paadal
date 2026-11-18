// Shared screenshot helper (adapted from farmer-friend/tools/shots.mjs): headless Chrome over CDP.
// Phone shots: 390x849 @2x, saved as 600-wide JPEGs. Desktop shot: 1440x900 saved as web.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function capture(root, { phone = [], desktop = null, scheme = 'dark', args = [] }) {
  const SHOTS = path.join(root, 'prototype', 'shots');
  fs.mkdirSync(SHOTS, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(root, '.shots-'));
  const dbg = 6700 + Math.floor(Math.random() * 200);
  const chrome = spawn(CHROME, ['--headless=new', ...(args.length ? args : ['--disable-gpu']), '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${dbg}`, `--user-data-dir=${tmp}/profile`, 'about:blank'], { stdio: 'ignore' });
  try {
    let ws;
    for (let i = 0; i < 60 && !ws; i++) {
      try { const p = (await (await fetch(`http://127.0.0.1:${dbg}/json`)).json()).find(t => t.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch {}
      if (!ws) await sleep(250);
    }
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let id = 0; const pending = {};
    ws.onmessage = e => { const m = JSON.parse(e.data); if (pending[m.id]) { pending[m.id](m); delete pending[m.id]; } };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
    const grab = async ({ url, file, wait = 5000, js, width = 600 }) => {
      await send('Page.navigate', { url }); await sleep(wait);
      if (js) { await send('Runtime.evaluate', { expression: js, awaitPromise: true }); await sleep(2000); }
      const s = await send('Page.captureScreenshot', { format: 'png' });
      const png = path.join(tmp, file + '.png');
      fs.writeFileSync(png, Buffer.from(s.result.data, 'base64'));
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84', '--resampleWidth', String(width), png, '--out', path.join(SHOTS, file + '.jpg')], { stdio: 'pipe' });
    };
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 849, deviceScaleFactor: 2, mobile: true });
    for (const s of phone) await grab(s);
    if (desktop) {
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await grab({ ...desktop, file: 'web', width: 1440 });
    }
    console.log('captured', fs.readdirSync(SHOTS).join(', '));
    ws.close();
  } finally {
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
