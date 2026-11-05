/* Browser quality gate: route semantics, lifecycle, demo, keyboard and responsive.
 * Run with the same Playwright installation as navigation-smoke.cjs.
 */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const BASE = process.env.PROJECTS_TEST_URL || "http://127.0.0.1:8123/";
const repoHome = new URL("./", BASE).href;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PROJECTS_TEST_CHROME ? "chrome" : undefined,
    args: ["--no-sandbox"]
  });
  const errors = [];
  const watch = page => page.on("pageerror", err => errors.push(err.message));
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    watch(page);
    await page.goto(repoHome, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.ProjectsWorldCamera?.preloaded, null, { timeout: 15000 });

    assert.equal(await page.evaluate(() => window.ScrollTrigger?.getAll().length), 1,
      "Home should own one scoped ScrollTrigger");
    const frameStartsInactive = await page.evaluate(() =>
      document.querySelector(".world-route iframe").contentWindow.ProjectsRackFlow?.active === false);
    assert(frameStartsInactive, "Preloaded RackFlow must not animate in the background");

    const initialTitle = await page.title();
    await page.evaluate(() => document.querySelector('[data-cinematic="rackflow"]').click());
    await page.waitForURL("**/rackflow.html");
    assert.match(await page.title(), /^RackFlow/, "Document title must follow in-app route");
    assert(await page.evaluate(() => document.querySelector("main").inert), "Background main must be inert");
    assert(await page.evaluate(() => document.querySelector(".site-header").inert), "Background navigation must be inert");

    const iframe = page.frameLocator(".world-route iframe");
    await page.waitForFunction(() =>
      document.querySelector(".world-route iframe")?.contentWindow?.ProjectsRackFlow?.active === true);
    const triggers = await page.evaluate(() => document.querySelector(".world-route iframe").contentWindow.ScrollTrigger?.getAll().length || 0);
    assert(triggers > 0, "RackFlow must activate its own ScrollTriggers after entering");

    await iframe.locator('footer a[href^="index.html"]').click();
    await page.waitForFunction(() =>
      window.ProjectsWorldCamera?.open === false &&
      document.querySelector(".world-route")?.getAttribute("aria-hidden") === "true");
    assert.equal(await page.title(), initialTitle, "Home title must be restored");
    assert(!(await page.evaluate(() => document.querySelector("main").inert)), "Home main must become interactive again");
    assert(await page.evaluate(() => document.querySelector(".world-route iframe").contentWindow.ProjectsRackFlow?.active === false),
      "RackFlow should suspend animations and observers after leaving");
    console.log("PASS shared route metadata, home inertness, focus and iframe animation lifecycle");

    // RackFlow also has its own fully navigable public document.
    await page.goto(new URL("rackflow.html", repoHome).href);
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator(".demo-device").count(), 4);
    await page.locator("#addDevice").click();
    assert.equal(await page.locator(".demo-device").count(), 5, "Demo add device failed");

    const firstPort = page.locator('[data-port="1:2"]');
    await firstPort.click();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.port), "1:2",
      "Rerendering a rack must not drop keyboard focus");
    await page.locator('[data-port="3:1"]').click();
    await page.locator('[data-view="cables"]').click();
    assert.equal(await page.locator("[data-remove-cable]").count(), 3, "New link missing");
    await page.locator('[data-remove-cable="2"]').click();
    assert.equal(await page.locator("[data-remove-cable]").count(), 2, "Remove link failed");
    await page.locator("#resetDemo").click();
    assert.equal(await page.locator(".demo-device").count(), 4, "Reset must restore original equipment");
    console.log("PASS RackFlow device, cable, inspector and keyboard focus workflows");

    // Confirm that the no-GSAP fallback remains accessible, not blank or stuck.
    const fallback = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    watch(fallback);
    await fallback.route("**/assets/vendor/*.js", route => route.abort());
    await fallback.goto(repoHome, { waitUntil: "domcontentloaded" });
    assert.equal(await fallback.locator(".project-card").count(), 2);
    await fallback.locator('[data-cinematic="rackflow"]').click();
    await fallback.waitForURL("**/rackflow.html", { timeout: 15000 });
    assert(await fallback.frameLocator(".world-route iframe").locator("h1").count(),
      "No-GSAP fallback should still open RackFlow");
    console.log("PASS no-GSAP navigation fallback");
    await fallback.close();

    for (const width of [320, 390, 768, 1440]) {
      const responsive = await browser.newPage({
        viewport: { width, height: 840 },
        reducedMotion: "reduce"
      });
      watch(responsive);
      for (const pathname of ["index.html", "rackflow.html"]) {
        await responsive.goto(new URL(pathname, repoHome).href, { waitUntil: "domcontentloaded" });
        const shape = await responsive.evaluate(() => {
          const title = document.querySelector("h1")?.getBoundingClientRect();
          const overflow = [...document.querySelectorAll("body *")].map(el => {
            const r = el.getBoundingClientRect();
            return { tag: el.tagName.toLowerCase(), selector: (el.id ? "#" + el.id : el.className?.baseVal || el.className || "").toString().slice(0, 75),
              left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
          }).filter(el => el.right > innerWidth + 5 && el.width > 0).slice(0, 12);
          return { h1Right: title?.right, innerWidth, main: !!document.querySelector("main"), hasHorizontalScroll: document.documentElement.scrollWidth > innerWidth + 4, overflow };
        });
        assert(shape.main, pathname + " is missing main landmark at width " + width);
        assert(shape.h1Right <= shape.innerWidth + 8,
          pathname + " title is clipped at width " + width + ": " + JSON.stringify(shape));
        assert(!shape.hasHorizontalScroll,
          pathname + " has unexpected horizontal overflow at width " + width + ": " + JSON.stringify(shape));
      }
      await responsive.close();
    }
    assert.deepEqual(errors, [], "Browser threw unhandled JavaScript exceptions");
    console.log("PASS 320/390/768/1440px responsive routes and reduced motion");
    console.log("PASS browser quality gate");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
