// Visual check: drive the real upload → analyze flow and screenshot the result.
// Usage: node scripts/shot.mjs [samplePath] [outPath]
// Requires the dev server running on :3000 and a valid OPENAI_API_KEY.
import { chromium } from "playwright";
import path from "node:path";

const sample = process.argv[2] || "samples/apple.png";
const out = process.argv[3] || "/tmp/shot.png";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 1280, height: 1500 },
  deviceScaleFactor: 2,
});

await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.locator('input[type="file"]').setInputFiles(path.resolve(sample));
await page.getByRole("button", { name: /analyze photo/i }).click();

// Wait for the rendered label section.
await page
  .locator('section[aria-label^="Nutrition Facts for"]')
  .waitFor({ timeout: 60000 });
await page.waitForTimeout(500);

await page.screenshot({ path: out, fullPage: true });
const label = page.locator('section[aria-label^="Nutrition Facts for"]');
await label.screenshot({ path: out.replace(/\.png$/, "-label.png") });

await browser.close();
console.log("saved", out, "and", out.replace(/\.png$/, "-label.png"));
