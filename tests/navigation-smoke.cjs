/* Playwright smoke regression for the reversible Projects → RackFlow route.
 * Run: npm install --no-save playwright && npx playwright install chromium
 *      python3 -m http.server 8123 & node tests/navigation-smoke.cjs
 */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const BASE = process.env.PROJECTS_TEST_URL || "http://127.0.0.1:8123/";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.env.PROJECTS_TEST_CHROME ? "chrome" : undefined, args: ["--no-sandbox"] });
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
    await page.waitForFunction(() => !!window.ProjectsWorldCamera?.preloaded, null, { timeout: 12000 });
    assert.equal(await page.evaluate(() => window.ProjectsWorldCamera.surfaceCount), 1, "Preloaded camera plane missing");

    // Regression: the hero torus must visibly rotate while the page stays
    // completely at the top. Moving the meridians on a symmetric torus alone
    // changed its phase, but left the on-screen shape looking stationary.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 5000 });
    const heroReading = () => ({
      yaw: window.ProjectsPortal.ringYaw,
      pitch: window.ProjectsPortal.ringPitch,
      roll: window.ProjectsPortal.ringRoll,
      spin: window.ProjectsPortal.ringSpin,
      frames: window.ProjectsPortal.paintCount
    });
    const initialHero = await page.evaluate(heroReading);
    await page.waitForTimeout(1000);
    const movingHero = await page.evaluate(heroReading);
    assert(movingHero.frames > initialHero.frames + 3, "Hero Canvas should render continuously at scroll 0");
    assert(Math.abs(movingHero.spin - initialHero.spin) > 0.3, "Torus material must spin at scroll 0");
    for (const axis of ["yaw", "pitch", "roll"]) {
      assert(Math.abs(movingHero[axis] - initialHero[axis]) < .025,
        "Torus axis must NOT tumble at the hero: " + axis + " " + JSON.stringify({ initialHero, movingHero }));
    }
    console.log("PASS clockwise torus spin with fixed original hero axis", JSON.stringify({ initialHero, movingHero }));

    // Move to the same exact carousel position for all 20 visits.
    await page.evaluate(() => window.ProjectsPortal.goTo(0, true));
    await page.waitForFunction(() => document.querySelector(".rackflow-card")?.classList.contains("active"), null, { timeout: 12000 });
    const before = await page.evaluate(() => window.ProjectsPortal.snapshot());

    for (let i = 1; i <= 20; i++) {
      const hit = await page.evaluate(() => {
        const link = document.querySelector('[data-cinematic="rackflow"]');
        const r = link.getBoundingClientRect();
        const node = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width),
          height: Math.round(r.height), tag: node?.tagName, classes: node?.className?.baseVal ?? node?.className,
          canClick: !!node && (link === node || link.contains(node)) };
      });
      if (i === 1) console.log("First project link hit-test:", JSON.stringify(hit));
      const previousCameras = await page.evaluate(() => window.ProjectsWorldCamera.cameraCount);
      await page.evaluate(() => document.querySelector('[data-cinematic="rackflow"]').click());
      if (i === 1) {
        await page.waitForFunction(() => window.ProjectsWorldCamera?.progress > 0.23, null, { timeout: 12000 });
        const shared = await page.evaluate(() => ({
          p: window.ProjectsWorldCamera.progress,
          cardInsideCamera: !!document.querySelector(".world-route > .world-card-visual"),
          pageInsideCamera: !!document.querySelector(".world-route > iframe"),
          pageOpacity: parseFloat(document.querySelector(".world-route > iframe")?.style.opacity || "0")
        }));
        assert(shared.cardInsideCamera && shared.pageInsideCamera, "Card and page must occupy the SAME camera plane");
        assert(shared.pageOpacity > 0, "RackFlow content should emerge during, not after, the zoom");
        console.log("PASS continuous camera handoff", JSON.stringify(shared));
      }
      await page.waitForURL("**/rackflow.html", { timeout: 12000 });
      await page.waitForFunction(() => !!document.querySelector(".world-route iframe")?.contentDocument?.querySelector(".rack-hero"), null, { timeout: 12000 });
      assert.equal(await page.locator(".world-route").count(), 1, "Expected one mounted RackFlow route");
      assert.equal(await page.evaluate(() => window.ProjectsWorldCamera.cameraCount), previousCameras + 1, "Expected one camera tween per entry");
      assert.equal(await page.evaluate(() => window.ProjectsWorldCamera.progress), 1, "Camera must end at fullscreen");
      assert.equal(await page.evaluate(() => window.ProjectsPortal.frameActive), false, "Canvas should be suspended inside RackFlow");

      await page.frameLocator(".world-route iframe").locator('header nav a[href^="index.html"]').click({ timeout: 12000 });
      await page.waitForFunction(() =>
        document.querySelector(".world-route")?.getAttribute("aria-hidden") === "true" &&
        !document.querySelector(".world-card-visual") &&
        !!window.ProjectsPortal?.frameActive, null, { timeout: 12000 });
      assert.equal(await page.evaluate(() => window.ProjectsWorldCamera.cameraCount), previousCameras + 1, "Return must reverse SAME timeline, not start another");
      const after = await page.evaluate(() => window.ProjectsPortal.snapshot());

      assert.equal(after.slide, before.slide, "Carousel active card drift at cycle " + i);
      assert(Math.abs(after.scrollY - before.scrollY) <= 8,
        "Scroll drift at cycle " + i + ": " + before.scrollY + " → " + after.scrollY);
      assert(await page.locator(".rackflow-card.active").count(), "Active card lost at cycle " + i);
      assert.equal(await page.locator(".world-card-visual, .world-backdrop, .world-light").count(), 0,
        "Transition DOM leaked at cycle " + i);
      const beforeTick = await page.evaluate(() => ({
        phase: window.ProjectsPortal.phase, paint: window.ProjectsPortal.paintCount
      }));
      await page.waitForTimeout(200);
      const afterTick = await page.evaluate(() => ({
        phase: window.ProjectsPortal.phase, paint: window.ProjectsPortal.paintCount,
        inView: window.ProjectsPortal.inView,
        active: window.ScrollTrigger?.getAll()?.some(t => t.isActive)
      }));
      assert(afterTick.phase > beforeTick.phase, "Portal rotation stuck at cycle " + i + ": " + JSON.stringify({ beforeTick, afterTick }));
      assert(afterTick.paint > beforeTick.paint, "Portal rendering stuck at cycle " + i + ": " + JSON.stringify({ beforeTick, afterTick }));
      console.log("PASS cycle", i, "scrollY", Math.round(after.scrollY), "phase", afterTick.phase.toFixed(3), "frames", afterTick.paint - beforeTick.paint);
    }

    assert.deepEqual(errors, [], "Uncaught browser exceptions");
    // The autonomous 3D rotation also returns after exploring the carousel.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 5000 });
    // ScrollTrigger deliberately eases the geometry back into the hero angle;
    // let that scroll-dependent tilt finish before checking axis invariance.
    await page.waitForTimeout(1800);
    const axisBefore = await page.evaluate(() => ({ spin: window.ProjectsPortal.ringSpin, yaw: window.ProjectsPortal.ringYaw }));
    await page.waitForTimeout(950);
    const axisAfter = await page.evaluate(() => ({ spin: window.ProjectsPortal.ringSpin, yaw: window.ProjectsPortal.ringYaw }));
    assert(Math.abs(axisAfter.spin - axisBefore.spin) > .28, "Top-of-page surface spin failed to resume after 20 visits");
    assert(Math.abs(axisAfter.yaw - axisBefore.yaw) < .025, "Torus axis tilted after returning to the top");
    console.log("PASS correctly aligned top-of-page spin after 20 visits");
    // Reduced-motion mode must keep a usable page and route.
    const quiet = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    quiet.on("pageerror", error => errors.push(error.message));
    await quiet.goto(BASE, { waitUntil: "domcontentloaded" });
    await quiet.locator('[data-cinematic="rackflow"]').click();
    await quiet.waitForURL("**/rackflow.html");
    await quiet.frameLocator(".world-route iframe").locator('header nav a[href^="index.html"]').click();
    await quiet.waitForFunction(() =>
      document.querySelector(".world-route")?.getAttribute("aria-hidden") === "true" &&
      !!window.ProjectsPortal?.frameActive);
    assert.deepEqual(errors, [], "Reduced-motion uncaught errors");
    console.log("PASS 20 consecutive round-trips + reduced motion");
    await quiet.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
