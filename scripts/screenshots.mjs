// Screenshots every screen at 390px and 1440px.
//   npm run build && npm start   (in another terminal)
//   npm run screenshots          (BASE_URL defaults to http://localhost:3000)
// Output: screenshots/<width>/<name>.png. Uses installed Chrome via playwright-core.
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const WIDTHS = [390, 1440];
const CMP = "cars=2017-honda-civic-lx.68400.15900~2016-toyota-corolla-le.74200.14200~2015-ford-focus-se.81500.8900&zip=98201";
const loaded = ".car-card .line:not(.line--sk)";

/** name, path, optional action run before the shot, fullPage */
const SHOTS = [
  ["01-landing", "/"],
  ["02-compare-empty", "/compare"],
  ["03-add-car", "/compare?start=1&model=2016-toyota-corolla"],
  [
    "04-add-car-validation",
    "/compare?start=1",
    async (p) => {
      await p.getByRole("button", { name: /see the real cost/i }).click();
      await p.waitForSelector(".field__error");
    },
  ],
  [
    "05-add-car-vin",
    "/compare?start=1",
    async (p) => {
      await p.getByRole("button", { name: /try a sample vin/i }).click();
      await p.waitForSelector(".vin__found", { timeout: 8000 });
      await p.waitForTimeout(400);
    },
  ],
  ["06-add-car-2-of-3", `/compare?cars=2017-honda-civic-lx.68400.15900&zip=98201&edit=1`],
  ["07-results-loading", `/compare?${CMP}`, async (p) => p.waitForSelector(".car-card__figures", { timeout: 8000 }), false],
  ["08-results", `/compare?${CMP}`, async (p) => p.waitForSelector(loaded, { timeout: 15000 })],
  [
    "09-results-1-year-expanded",
    `/compare?${CMP}`,
    async (p) => {
      await p.waitForSelector(loaded, { timeout: 15000 });
      await p.getByText("1 year", { exact: true }).first().click();
      await p.locator(".breakdown__all").first().click();
    },
  ],
  [
    "10-results-how-sheet",
    `/compare?${CMP}`,
    async (p) => {
      await p.waitForSelector(loaded, { timeout: 15000 });
      await p.locator(".line__how").nth(2).click();
      await p.waitForSelector("dialog[open]");
      await p.waitForTimeout(450);
    },
    false,
  ],
  [
    "11-results-error-car",
    `/compare?cars=2016-toyota-corolla-le.74200.14200~2009-saturn-astra-xr.112000.3900&zip=98105`,
    async (p) => p.waitForSelector(loaded, { timeout: 15000 }),
  ],
  ["12-detail-focus", "/car/2015-ford-focus-se?mileage=81500&price=8900&zip=98201", async (p) => p.waitForSelector(".ychart")],
  ["13-detail-prius", "/car/2014-toyota-prius-two?mileage=128000&price=11900&zip=98201", async (p) => p.waitForSelector(".ychart")],
  ["14-methodology", "/methodology"],
  ["15-states", "/states"],
  ["16-404", "/nope-not-here"],
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
for (const width of WIDTHS) {
  await mkdir(`screenshots/${width}`, { recursive: true });
  // Reduced motion so reveals and count-ups land in their final state for the capture.
  const ctx = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    deviceScaleFactor: width < 600 ? 2 : 1,
    reducedMotion: "reduce",
    isMobile: width < 600,
    hasTouch: width < 600,
  });
  for (const [name, path, action, full = true] of SHOTS) {
    const page = await ctx.newPage();
    page.setDefaultTimeout(12000);
    try {
      await page.goto(BASE + path, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      if (action) await action(page);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `screenshots/${width}/${name}.png`, fullPage: full });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      console.log(`${width} ${name}${overflow > 0 ? `  ⚠ horizontal overflow ${overflow}px` : ""}`);
    } catch (e) {
      console.error(`${width} ${name} FAILED: ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();
