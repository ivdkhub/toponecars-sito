/**
 * Avvio del browser condiviso da autotest e confronto al pixel.
 *
 * Si usa il Chrome gia' installato, con le impostazioni NORMALI. In particolare
 * NON si passa --autoplay-policy=no-user-gesture-required: se un difetto colpisce
 * l'utente deve colpire anche il test, altrimenti si verificherebbe una pagina
 * che nella realta' non esiste.
 */
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function chromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const p of CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error('Chrome non trovato: imposta CHROME_PATH');
}

export const BASE = process.env.BASE_URL || 'http://localhost:5173';

export async function launch({ width = 1440, height = 810, scale = 1, headless = 'new' } = {}) {
  return puppeteer.launch({
    executablePath: chromePath(),
    headless,
    defaultViewport: { width, height, deviceScaleFactor: scale },
    args: [
      '--hide-scrollbars',
      '--force-device-scale-factor=' + scale,
      '--disable-gpu-vsync',
      // Nessun flag sull'autoplay: il comportamento deve restare quello reale.
    ],
  });
}

/** Attende che il motore abbia finito il boot e l'intro. */
export async function waitReady(page, { scene = null, timeout = 30000 } = {}) {
  await page.waitForFunction(() => !!window.__TOC__, { timeout });
  await page.waitForFunction(
    () => document.documentElement.dataset.state === 'idle',
    { timeout, polling: 50 },
  );
  if (scene !== null) {
    await page.waitForFunction(
      (s) => document.documentElement.dataset.scene === String(s)
        && document.documentElement.dataset.state === 'idle',
      { timeout, polling: 50 }, scene,
    );
  }
}
