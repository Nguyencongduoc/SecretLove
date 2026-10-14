import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const source = 'references/heart/particle-heart-reference.mp4';
const out = 'references/heart/frames';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<video muted></video>');
  const metadata = await page.evaluate(
    async (data) => {
      const video = document.querySelector('video');
      video.src = data;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error('Reference video cannot be decoded'));
      });
      return { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
    },
    `data:video/mp4;base64,${(await readFile(source)).toString('base64')}`,
  );
  const times = [0.2, 2, 4, 6, 8, metadata.duration - 0.3].filter(
    (t) => t > 0 && t < metadata.duration,
  );
  for (const time of times) {
    const png = await page.evaluate(async (t) => {
      const video = document.querySelector('video');
      await new Promise((resolve) => {
        video.onseeked = resolve;
        video.currentTime = t;
      });
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, time);
    await writeFile(`${out}/frame-${time.toFixed(2)}.png`, Buffer.from(png, 'base64'));
  }
  await writeFile(`${out}/metadata.json`, JSON.stringify({ ...metadata, times }, null, 2));
  console.log(JSON.stringify({ ...metadata, times }));
} finally {
  await browser.close();
}
