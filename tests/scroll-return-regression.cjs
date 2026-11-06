/* Regression for reverse-scroll animation after returning from RackFlow.
 * Unlike the round-trip smoke test, this checks the SCROLL-TIMELINE
 * itself (state, DOM, and torus), not just that requestAnimationFrame runs.
 */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const BASE = process.env.PROJECTS_TEST_URL || "http://127.0.0.1:8123/";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PROJECTS_TEST_CHROME ? "chrome" : undefined,
    args: ["--no-sandbox"]
  });
  try {
    const page = await browser.newPage({ viewport: {width: 1440,height: 900}, reducedMotion: "no-preference" });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(BASE, {waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => !!window.ProjectsWorldCamera?.preloaded && !!window.ProjectsPortal?.frameActive, null, {timeout: 15000});
    async function state() {
      return page.evaluate(() => ({
        scrollY: window.scrollY,
        progress: window.ScrollTrigger?.getAll()?.[0]?.progress ?? null,
        timeline: window.ScrollTrigger?.getAll()?.[0]?.animation?.progress() ?? null,
        center: window.ProjectsPortal.animationState.center,
        reveal: window.ProjectsPortal.animationState.reveal,
        orbit: window.ProjectsPortal.animationState.orbit,
        introOpacity: Number(getComputedStyle(document.querySelector(".intro")).opacity),
        homeInert: document.querySelector(".intro").inert,
        rotating: window.ProjectsPortal.frameActive,
        cardActive: document.querySelector(".rackflow-card").classList.contains("active")
      }));
    }
    await page.evaluate(() => window.ProjectsPortal.goTo(0, true));
    await page.waitForFunction(() => document.querySelector(".rackflow-card")?.classList.contains("active"), null, {timeout: 12000});
    await page.waitForTimeout(1600);
    console.log("BEFORE entry", JSON.stringify(await state()));
    for(let cycle=1;cycle<=3;cycle++) {
      await page.evaluate(() => document.querySelector('[data-cinematic="rackflow"]').click());
      await page.waitForURL("**/rackflow.html");
      await page.frameLocator(".world-route iframe").locator('header nav a[href^="index.html"]').click();
      await page.waitForFunction(() => window.ProjectsWorldCamera?.open===false &&
        document.querySelector(".world-route")?.getAttribute("aria-hidden")==="true" &&
        window.ProjectsPortal.frameActive, null, {timeout:12000});
      console.log("RETURN cycle "+cycle, JSON.stringify(await state()));
      // Important: ScrollTrigger may scrub for up to 1.2s, so wait for easing.
      await page.evaluate(() => window.scrollTo({top:0,behavior:"instant"}));
      await page.waitForTimeout(1900);
      const top=await state();
      console.log("SCROLLED TO HERO cycle "+cycle,JSON.stringify(top));
      assert(top.scrollY<=2,"At top of page");
      assert(top.progress < .015, "ScrollTrigger must reverse to 0");
      assert(top.timeline < .04,"GSAP timeline must follow reverse-scroll, not stay at carousel");
      assert(top.center < .04, "Ring center must return to hero orientation");
      assert(top.reveal < .05, "Carousel reveal must reverse");
      assert(top.introOpacity>.90, "Hero intro must reappear");
      assert(!top.homeInert,"Hero intro must become interactive again");
      const paintBefore=await page.evaluate(() => window.ProjectsPortal.paintCount);
      await page.waitForTimeout(260);
      const paintAfter=await page.evaluate(() => window.ProjectsPortal.paintCount);
      assert(paintAfter>paintBefore,"Torus must keep drawing after reverse scroll");
      // Fully scroll forward again; this must work after reversing.
      await page.evaluate(() => window.ProjectsPortal.goTo(0,true));
      await page.waitForTimeout(1700);
      const forward=await state();
      console.log("FORWARD AGAIN cycle "+cycle,JSON.stringify(forward));
      assert(forward.timeline > .68,"GSAP timeline must scrub forward again");
      assert(forward.reveal > .90,"Project cards must reappear on forward scroll");
      assert(forward.cardActive,"RackFlow card must be active on forward scroll");
    }
    assert.deepEqual(errors, [],"Unexpected browser errors");
    console.log("PASS scroll animation reverses after 3 RackFlow round trips");
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
