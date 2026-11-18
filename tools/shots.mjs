// Portfolio screenshots of the live web app: node tools/shots.mjs
// Phone shots (600-wide JPEGs) use ?app=android / ?app=ios to show the native looks; web.jpg is 1440x900.
import path from 'node:path';
import { capture } from './shots-core.mjs';

const LIVE = 'https://paadal-two.vercel.app';
const ROOT = path.resolve(import.meta.dirname, '..');
const playThenOpen = `(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms));
  const play = [...document.querySelectorAll('[role=button]')].find(b => /^(Play|Shuffle play)/.test(b.getAttribute('aria-label') || ''));
  play && play.click(); await s(1500);
  const mini = [...document.querySelectorAll('[aria-label^="Now playing"]')][0]; mini && mini.click(); await s(1500);
})()`;
await capture(ROOT, {
  phone: [
    { url: `${LIVE}/?app=ios`, file: 'home-ios', wait: 7000 },
    { url: `${LIVE}/playlist/pl-daily?app=android`, file: 'playlist-android', wait: 6000 },
    { url: `${LIVE}/playlist/pl-drive?app=ios`, file: 'player-ios', wait: 6000, js: playThenOpen },
    { url: `${LIVE}/search?app=android`, file: 'search-android', wait: 6000 },
  ],
  desktop: { url: `${LIVE}/`, wait: 7000 },
});
