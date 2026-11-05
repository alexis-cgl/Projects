/* Playwright smoke regression for the reversible Projects → RackFlow route.
 * Run: npm install --no-save playwright && npx playwright install chromium
 *      python3 -m http.server 8123 & node tests/navigation-smoke.cjs
 */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const BASE = process.env.PROJECTS_TEST_URL || "http://127.0.0.1:8123/";

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const errors = [];
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference"
  });
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.ProjectsPortal?.frameActive, null, { timeout: 12000 });
    assert(await page.locator(".rackflow-card").count(), "RackFlow card missing");

    // Move to the same exact carousel position for all 20 visits.
    await page.evaluate(() => window.ProjectsPortal.goTo(0, true));
    await page.waitForFunction(() => document.querySelector(".rackflow-card")?.classList.contains("active"), null, { timeout: 12000 });
    const before = await page.evaluate(() => window.ProjectsPortal.snapshot());

    for (let i = 1; i <= 20; i++) {
      await page.locator('[data-cinematic="rackflow"]').click({ timeout: 12000 });
      await page.waitForURL("**/rackflow.html", { timeout: 12000 });
      await page.waitForFunction(() => !!document.querySelector(".world-route iframe")?.contentDocument?.querySelector(".rack-hero"), null, { timeout: 12000 });
      assert.equal(await page.locator(".world-route").count(), 1, "Expected one mounted RackFlow route");
      assert.equal(await page.evaluate(() => window.ProjectsPortal.frameActive), false, "Canvas should be suspended inside RackFlow");

      await page.frameLocator(".world-route iframe").locator('header a[href^="index.html"]').click({ timeout: 12000 });
      await page.waitForFunction(() => !document.querySelector(".world-route") && !!window.ProjectsPortal?.frameActive, null, { timeout: 12000 });
      const after = await page.evaluate(() => window.ProjectsPortal.snapshot());

      assert.equal(after.slide, before.slide, "Carousel active card drift at cycle " + i);
      assert(Math.abs(after.scrollY - before.scrollY) <= 8,
        "Scroll drift at cycle " + i + ": " + before.scrollY + " → " + after.scrollY);
      assert(await page.locator(".rackflow-card.active").count(), "Active card lost at cycle " + i);
      assert.equal(await page.locator(".world-flight, .world-backdrop, .world-stars").count(), 0,
        "Transition DOM leaked at cycle " + i);
      const phase0 = await page.evaluate(() => window.ProjectsPortal.phase);
      await page.waitForTimeout(150);
      const phase1 = await page.evaluate(() => window.ProjectsPortal.phase);
      assert(phase1 > phase0, "Portal rotation stuck at cycle " + i);
      console.log("PASS cycle", i, "scrollY", Math.round(after.scrollY), "phase", phase1.toFixed(3));
    }

    assert.deepEqual(errors, [], "Uncaught browser exceptions");
    // Reduced-motion mode must keep a usable page and route.
    const quiet = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    quiet.on("pageerror", error => errors.push(error.message));
    await quiet.goto(BASE, { waitUntil: "domcontentloaded" });
    await quiet.locator('[data-cinematic="rackflow"]').click();
    await quiet.waitForURL("**/rackflow.html");
    await quiet.frameLocator(".world-route iframe").locator('header a[href^="index.html"]').click();
    await quiet.waitForFunction(() => !document.querySelector(".world-route") && !!window.ProjectsPortal?.frameActive);
    assert.deepEqual(errors, [], "Reduced-motion uncaught errors");
    console.log("PASS 20 consecutive round-trips + reduced motion");
    await quiet.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
