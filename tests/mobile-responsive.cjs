/* Touch-first responsive regression suite for Android Chromium + iOS WebKit.
 * Run against a static server with: node tests/mobile-responsive.cjs
 * Requires Playwright Chromium/Chrome and WebKit installed.
 */
"use strict";
const assert=require("node:assert/strict");
const {chromium,webkit}=require("playwright");
const BASE=process.env.PROJECTS_TEST_URL||"http://127.0.0.1:8123/";

const cases=[
  {name:"Android 360",engine:"chromium",width:360,height:800,roundTrips:2},
  {name:"Android 412",engine:"chromium",width:412,height:915,roundTrips:1},
  {name:"Android landscape",engine:"chromium",width:844,height:390,roundTrips:1},
  {name:"iPhone SE",engine:"webkit",width:375,height:667,roundTrips:2},
  {name:"iPhone 13",engine:"webkit",width:390,height:844,roundTrips:2},
  {name:"iPad",engine:"webkit",width:768,height:1024,roundTrips:1},
  {name:"Narrow phone",engine:"chromium",width:320,height:568,roundTrips:1}
];
async function inspectOverflow(page,context){
  const result=await page.evaluate(()=>{
    const width=innerWidth;
    const failures=[...document.querySelectorAll("body *")].filter(el=>{
      if(getComputedStyle(el).position==="fixed")return false;
      const r=el.getBoundingClientRect();
      return r.right>width+5 && r.width>0 && r.left>=0;
    }).slice(0,8).map(el=>({tag:el.tagName,selector:el.id||String(el.className).slice(0,90),right:Math.round(el.getBoundingClientRect().right)}));
    return {width,scrollWidth:document.documentElement.scrollWidth,failures};
  });
  assert(result.scrollWidth<=result.width+5,context+" horizontal overflow "+JSON.stringify(result));
}
(async()=>{
 const browsers={};
 try{
   browsers.chromium=await chromium.launch({headless:true,channel:process.env.PROJECTS_TEST_CHROME?"chrome":undefined,args:["--no-sandbox"]});
   browsers.webkit=await webkit.launch({headless:true});
   for(const spec of cases){
     if(process.env.PROJECTS_TEST_ONLY && !spec.name.includes(process.env.PROJECTS_TEST_ONLY)) continue;
     const browser=browsers[spec.engine];
     const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:2,hasTouch:true,isMobile:true,reducedMotion:"no-preference"});
     const page=await context.newPage();
     const errors=[];page.on("pageerror",error=>errors.push(error.message));
     try{
       await page.goto(BASE,{waitUntil:"domcontentloaded",timeout:15000});
       await page.waitForFunction(()=>!!window.ProjectsPortal?.frameActive&&!!window.ProjectsWorldCamera?.preloaded,null,{timeout:18000});
       const headerLink=page.locator('.site-header nav a[href="#catalogue"]');
       assert(await headerLink.isVisible(),spec.name+": primary navigation hidden");
       await inspectOverflow(page,spec.name+" home top");
       const phase0=await page.evaluate(()=>window.ProjectsPortal.phase);
       const paint0=await page.evaluate(()=>window.ProjectsPortal.paintCount);
       // WebKit can take longer to start its first foreground animation frame
       // under CI load; test eventual frame advancement, not a fixed 230 ms.
       await page.waitForFunction(({phase0,paint0})=>
         window.ProjectsPortal.phase>phase0 &&
         window.ProjectsPortal.paintCount>paint0,
         {phase0,paint0},{timeout:5000});
       const animated=await page.evaluate(()=>({phase:window.ProjectsPortal.phase,paint:window.ProjectsPortal.paintCount}));
       if(!(animated.phase>phase0 && animated.paint>paint0)){
         const diag=await page.evaluate(()=>({
           y:scrollY,height:innerHeight,hidden:document.hidden,
           ready:document.readyState,
           inView:window.ProjectsPortal?.inView,
           frameActive:window.ProjectsPortal?.frameActive,
           triggerProgress:window.ScrollTrigger?.getAll()[0]?.progress,
           triggerActive:window.ScrollTrigger?.getAll()[0]?.isActive,
           phase:window.ProjectsPortal?.phase,
           paint:window.ProjectsPortal?.paintCount
         }));
         console.log("TORUS MOBILE DIAG "+spec.name,JSON.stringify({phase0,paint0,animated,diag}));
       }
       assert(animated.phase>phase0&&animated.paint>paint0,spec.name+": torus not animated on first view");
       const enhanced=await page.evaluate(()=>document.documentElement.classList.contains("enhanced"));
       assert(enhanced,spec.name+": scroll experience disabled on a supported mobile viewport");

       // A vertical resize is often Safari/Chrome address-bar contraction.
       // Its animation instance must stay mounted rather than being rebuilt.
       await page.evaluate(()=>window.__pinnedTrigger=window.ScrollTrigger.getAll()[0]);
       await page.setViewportSize({width:spec.width,height:Math.max(360,spec.height-58)});
       await page.waitForTimeout(420);
       const stable=await page.evaluate(()=>window.ScrollTrigger.getAll()[0]===window.__pinnedTrigger);
       assert(stable,spec.name+": browser chrome resize destroyed pinned ScrollTrigger");
       await page.setViewportSize({width:spec.width,height:spec.height});
       await page.waitForTimeout(420);

       await page.evaluate(()=>window.ProjectsPortal.goTo(0,true));
       await page.waitForFunction(()=>document.querySelector(".rackflow-card")?.classList.contains("active"),null,{timeout:14000});
       await page.waitForTimeout(450);
       const card=await page.locator(".rackflow-card.active").boundingBox();
       assert(card&&card.width>150,spec.name+": active card missing");
       assert(card.x+card.width>spec.width*.6 && card.x<spec.width*.5,spec.name+": active card not centered");
       const routeLink=page.locator('[data-cinematic="rackflow"]');
       assert(await routeLink.isVisible(),spec.name+": RackFlow discover link missing");
       for(let i=0;i<spec.roundTrips;i++){
         await routeLink.tap({timeout:16000});
         await page.waitForURL("**/rackflow.html",{timeout:16000});
         await page.waitForFunction(()=>window.ProjectsWorldCamera.open===true,null,{timeout:14000});
         const frame=page.frameLocator(".world-route iframe");
         const back=frame.locator('header nav a[href^="index.html"]');
         assert(await back.isVisible(),spec.name+": return button hidden on RackFlow");
         await inspectOverflow(page,spec.name+" camera shell");
         // Verify the actual page inside the immersive route, not the scaled outer shell.
         const inner=await frame.locator("body").evaluate(body=>({
           scrollWidth:body.ownerDocument.documentElement.scrollWidth,
           viewport:body.ownerDocument.defaultView.innerWidth
         }));
         assert(inner.scrollWidth<=inner.viewport+5,spec.name+": RackFlow iframe horizontal overflow "+JSON.stringify(inner));
         const port=frame.locator('[data-port="1:0"]');
         const size=await port.boundingBox();
         assert(size&&size.width>=24&&size.height>=24,spec.name+": rack ports are too small for touch");
         await back.tap({timeout:14000});
         await page.waitForFunction(()=>!window.ProjectsWorldCamera.open &&
           document.querySelector(".world-route")?.getAttribute("aria-hidden")==="true" &&
           !!window.ProjectsPortal.frameActive,null,{timeout:16000});
         assert(await routeLink.isVisible(),spec.name+": project card vanished on return");
       }
       await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
       await page.waitForTimeout(1800);
       const restored=await page.evaluate(()=>({
         progress:window.ScrollTrigger.getAll()[0]?.progress,
         center:window.ProjectsPortal.animationState?.center,
         intro:Number(getComputedStyle(document.querySelector(".intro")).opacity),
         frameActive:window.ProjectsPortal.frameActive
       }));
       assert(restored.progress<.025&&restored.intro>.85&&restored.frameActive,
         spec.name+": hero animation did not return after RackFlow "+JSON.stringify(restored));
       assert.deepEqual(errors,[],spec.name+": uncaught JS errors");
       console.log("PASS "+spec.name+" "+spec.width+"x"+spec.height+" · touch, cinematic, return, responsive");
     } finally{await context.close();}
   }
   console.log("PASS Android Chromium and iPhone/iPad WebKit responsive regression");
 } finally{
   await Promise.all(Object.values(browsers).map(browser=>browser.close()));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
