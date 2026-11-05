(function premium() {
  "use strict";
  // One physical camera surface; one GSAP timeline; reverse uses the same frames.
  // RackFlow stays mounted inside an inert, preloaded same-origin document.
  const cards = [...document.querySelectorAll(".project-card")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const rackURL = new URL("./rackflow.html", location.href);
  const HOME_STATE = "projects-world-state";
  const homeTitle = document.title;
  const description = document.querySelector('meta[name="description"]');
  const homeDescription = description?.content;
  const canonical = document.querySelector('link[rel="canonical"]');
  const homeCanonical = canonical?.href;
  const rackTitle = "RackFlow — Expérience interactive | Mes Projets";
  const rackDescription = "Découvrez RackFlow : présentation et démonstration interactive des baies et connexions réseau.";
  function setDocumentRoute(project) {
    document.title = project ? rackTitle : homeTitle;
    if (description) description.content = project ? rackDescription : homeDescription;
    if (canonical) canonical.href = project ? rackURL.href : homeCanonical;
    const nav = document.querySelector('.site-header nav a[href="rackflow.html"]');
    if (project) nav?.setAttribute("aria-current", "page");
    else nav?.removeAttribute("aria-current");
  }
  let route = null, busy = false, cameraCount = 0;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const homeRegions = [
    document.querySelector("main"), document.querySelector(".site-header"),
    document.querySelector(".site-footer")
  ].filter(Boolean);
  function setHomeInactive(inactive) {
    homeRegions.forEach(region => { region.inert = inactive; });
  }
  const portal = () => window.ProjectsPortal;
  const rackCard = () => portal()?.getCard("rackflow") || document.querySelector(".rackflow-card");
  const isRackRoute = url => url.origin === location.origin && url.pathname === rackURL.pathname;
  function ease(a, b, v) { const t = Math.max(0, Math.min(1, (v-a)/(b-a))); return t*t*(3-2*t); }
  function lerp(a,b,p) {return a+(b-a)*p;}
  function rememberHome() {
    const saved = portal()?.snapshot() || {scrollY:window.scrollY,slide:0};
    try {sessionStorage.setItem(HOME_STATE,JSON.stringify(saved));} catch(_){}
    return saved;
  }
  cards.forEach(card => {
    const shell = card.querySelector(".card-shell");
    if(!shell)return;
    let raf=0, resetTimer=0;
    card.addEventListener("pointermove",event=>{
      if(!finePointer.matches || motion.matches || busy || route)return;
      const r=card.getBoundingClientRect(); if(!r.width||!r.height)return;
      const px=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));
      const py=Math.max(0,Math.min(1,(event.clientY-r.top)/r.height));
      card.style.setProperty("--mx",`${px*100}%`);
      card.style.setProperty("--my",`${py*100}%`);
      clearTimeout(resetTimer);
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{shell.style.transform=`perspective(1200px) rotateX(${((.5-py)*6).toFixed(2)}deg) rotateY(${((px-.5)*7).toFixed(2)}deg) translateZ(8px) scale(1.018)`;});
    },{passive:true});
    card.addEventListener("pointerleave",()=>{
      cancelAnimationFrame(raf);
      shell.style.transition="transform 380ms cubic-bezier(.2,.8,.2,1)";
      shell.style.transform="";
      clearTimeout(resetTimer);
      resetTimer=setTimeout(()=>{shell.style.transition="";},390);
    });
  });
  // Preload, never fetch during the actual camera flight.
  const layer=document.createElement("div");
  layer.className="world-route";
  layer.setAttribute("role", "region");
  layer.setAttribute("aria-hidden","true");
  layer.setAttribute("aria-label","Page projet RackFlow");
  layer.setAttribute("inert","");
  layer.style.opacity="0";
  layer.style.pointerEvents="none";
  const frame=document.createElement("iframe");
  frame.title="RackFlow — expérience interactive";
  frame.setAttribute("loading","eager");
  frame.setAttribute("tabindex","-1");
  layer.append(frame);
  document.body.append(layer);
  let frameReady=false;
  let resolveLoaded;
  const loaded=new Promise(resolve=>{resolveLoaded=resolve;});
  const loadTimeout=setTimeout(()=>resolveLoaded(false),8500);
  function returnHome(){
    if(!route||busy)return;
    if(history.state?.projectsRoute==="rackflow")history.back();
    else closeRackFlow();
  }
  function attachFrame(){
    try{
      const doc=frame.contentDocument;
      if(!doc?.querySelector(".rackflow-page .rack-hero"))return false;
      doc.addEventListener("click",event=>{
        const link=event.target.closest?.("a[href]");
        if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        const url=new URL(link.href,frame.contentWindow.location.href);
        if(url.origin!==location.origin)return;
        const goBack=url.pathname.endsWith("/index.html")||(url.pathname.endsWith("/")&&url.hash==="#catalogue");
        if(goBack){event.preventDefault();returnHome();}
        else if(isRackRoute(url)&&url.hash){
          const node=doc.getElementById(decodeURIComponent(url.hash.slice(1)));
          if(node){event.preventDefault();node.scrollIntoView({behavior:motion.matches?"instant":"smooth"});}
        }
      },true);
      doc.addEventListener("keydown",event=>{
        if(event.key==="Escape"&&!event.defaultPrevented){event.preventDefault();returnHome();}
      });
      frameReady=true;
      return true;
    }catch(_){return false;}
  }
  frame.addEventListener("load",()=>{clearTimeout(loadTimeout);resolveLoaded(attachFrame());},{once:true});
  frame.addEventListener("error",()=>{clearTimeout(loadTimeout);resolveLoaded(false);},{once:true});
  frame.src=rackURL.href;

  function createVisual(card,b){
    const visual=card.cloneNode(true);
    visual.classList.add("world-card-visual");
    visual.removeAttribute("inert");
    visual.setAttribute("aria-hidden","true");
    visual.querySelectorAll("a,button").forEach(el=>{
      el.removeAttribute("href");el.setAttribute("tabindex","-1");
    });
    Object.assign(visual.style,{
      position:"absolute",top:"0",left:"0",width:`${b.width}px`,height:`${b.height}px`,
      maxHeight:"none",margin:"0",opacity:"1",transformOrigin:"top left",
      transform:`scale(${innerWidth/b.width},${innerHeight/b.height})`,
      overflow:"hidden",borderRadius:"27px",pointerEvents:"none",filter:"none",transition:"none"
    });
    const shell=visual.querySelector(".card-shell");
    if(shell){shell.style.transform="none";shell.style.transition="none";shell.style.height="100%";}
    layer.append(visual);
    return visual;
  }
  function renderCamera(){
    if(!route)return;
    const p=route.camera.p,b=route.bounds;
    const sx=lerp(b.width/innerWidth,1,p);
    const sy=lerp(b.height/innerHeight,1,p);
    // This single affine transformation is the whole spatial animation.
    layer.style.transform=`translate3d(${(b.left*(1-p)).toFixed(3)}px,${(b.top*(1-p)).toFixed(3)}px,0) scale(${sx.toFixed(6)},${sy.toFixed(6)})`;
    const radius=27*(1-ease(.36,.96,p));
    layer.style.borderRadius=`${(radius/sx).toFixed(2)}px / ${(radius/sy).toFixed(2)}px`;
    const reveal=ease(.24,.76,p);
    route.visual.style.opacity=String(1-reveal);
    frame.style.opacity=String(ease(.20,.72,p));
    route.backdrop.style.opacity=String(Math.sin(Math.PI*p)*.78);
    route.light.style.opacity=String(Math.sin(Math.PI*p)*.82);
    const dim=ease(.04,.57,p);
    route.siblings.forEach((node,i)=>{node.style.opacity=String(route.siblingOpacity[i]*(1-dim));});
    layer.style.setProperty("--camera-energy",String(Math.sin(Math.PI*p)));
  }
  function completeEntry(){
    if(!route)return;
    route.camera.p=1;
    renderCamera();
    frame.style.opacity="1";
    frame.style.pointerEvents="auto";
    route.visual.style.opacity="0";
    layer.style.pointerEvents="auto";
    layer.removeAttribute("inert");
    layer.setAttribute("aria-hidden","false");
    frame.removeAttribute("tabindex");
    try { frame.contentWindow.ProjectsRackFlow?.setActive(true); } catch (_) {}
    setDocumentRoute(true);
    document.documentElement.classList.remove("world-navigating");
    document.documentElement.classList.add("world-route-open");
    route.open=true;
    busy=false;
    if(route.push)history.pushState({projectsRoute:"rackflow",state:route.state},"",rackURL.href);
    route.push=false;
    try {
      frame.contentWindow.focus();
      frame.contentDocument?.querySelector('header nav a[href^="index.html"]')?.focus({ preventScroll: true });
    } catch (_) {}
  }
  function completeExit(){
    if(!route)return;
    const {card,savedVisibility,siblings,siblingInlineOpacity,visual,backdrop,light,state}=route;
    portal()?.restore(state);
    portal()?.resume();
    portal()?.restore(state);
    card.style.visibility=savedVisibility;
    siblings.forEach((node,i)=>{node.style.opacity=siblingInlineOpacity[i];});
    try { frame.contentWindow.ProjectsRackFlow?.setActive(false); } catch (_) {}
    setDocumentRoute(false);
    frame.style.opacity="0";
    layer.style.opacity="0";
    layer.style.pointerEvents="none";
    layer.setAttribute("inert","");
    layer.setAttribute("aria-hidden","true");
    layer.style.transform="none";
    layer.style.borderRadius="0";
    visual.remove();backdrop.remove();light.remove();
    document.documentElement.classList.remove("world-navigating","world-route-open");
    layer.style.removeProperty("--camera-energy");
    route.timeline?.kill();
    route=null;busy=false;
    setHomeInactive(false);
    rackCard()?.querySelector('[data-cinematic="rackflow"]')?.focus({preventScroll:true});
  }
  async function ensureCardReady(){
    if(!document.documentElement.classList.contains("enhanced")||rackCard()?.classList.contains("active"))return;
    portal()?.goTo(0);
    await new Promise(resolve=>{
      const start=performance.now();
      const check=()=>{
        if(rackCard()?.classList.contains("active")||performance.now()-start>1800)resolve();
        else requestAnimationFrame(check);
      };check();
    });
  }
  async function openRackFlow({push=true}={}){
    if(busy||route)return;
    busy=true;
    const ready=frameReady||await loaded;
    if(!ready){
      busy=false;
      if(push)location.assign(rackURL.href);
      return;
    }
    await ensureCardReady();
    const card=rackCard(),bounds=card?.getBoundingClientRect();
    if(!card||!bounds?.width||!bounds?.height){
      busy=false;location.assign(rackURL.href);return;
    }
    const state=rememberHome();
    const shell=card.querySelector(".card-shell");if(shell)shell.style.transform="";
    const visual=createVisual(card,bounds);
    const backdrop=document.createElement("div");backdrop.className="world-backdrop";
    const light=document.createElement("div");light.className="world-light";
    document.body.append(backdrop,light);
    const siblings=cards.filter(node=>node!==card);
    const siblingInlineOpacity=siblings.map(el=>el.style.opacity);
    const siblingOpacity=siblings.map(el=>Number(getComputedStyle(el).opacity));
    const savedVisibility=card.style.visibility;
    try{frame.contentWindow.scrollTo({top:0,behavior:"instant"});}catch(_){}
    const camera={p:0};
    route={card,bounds,visual,backdrop,light,siblings,siblingOpacity,siblingInlineOpacity,savedVisibility,camera,state,push,open:false,timeline:null};
    frame.style.pointerEvents="none";
    frame.style.opacity="0";
    layer.style.opacity="1";
    layer.style.pointerEvents="none";
    layer.setAttribute("aria-hidden","true");
    layer.setAttribute("inert","");
    document.documentElement.classList.add("world-navigating");
    portal()?.suspend();
    setHomeInactive(true);
    renderCamera();
    card.style.visibility="hidden";
    if(motion.matches||!window.gsap){camera.p=1;completeEntry();return;}
    cameraCount++;
    // ONE timeline and ONE tween. No midpoint, pause, nested zoom or second page motion.
    const tl=gsap.timeline({paused:true,onUpdate:renderCamera,onComplete:completeEntry,onReverseComplete:completeExit})
      .to(camera,{p:1,duration:1.48,ease:"expo.inOut"},0);
    route.timeline=tl;tl.play(0);
  }
  function closeRackFlow(){
    if(!route||busy)return;
    busy=true;
    layer.style.pointerEvents="none";
    layer.setAttribute("inert","");
    document.documentElement.classList.remove("world-route-open");
    document.documentElement.classList.add("world-navigating");
    portal()?.restore(route.state);
    route.bounds=rackCard()?.getBoundingClientRect()||route.bounds;
    if(motion.matches||!window.gsap||!route.timeline){route.camera.p=0;renderCamera();completeExit();return;}
    route.timeline.reverse();
  }
  window.addEventListener("popstate",event=>{
    if(event.state?.projectsRoute==="rackflow"){if(!route&&!busy)openRackFlow({push:false});}
    else if(route&&!busy)closeRackFlow();
  });
  document.addEventListener("click",event=>{
    const link=event.target.closest?.("a[href]");
    if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
    const url=new URL(link.href,location.href);
    if(!isRackRoute(url))return;
    event.preventDefault();openRackFlow();
  });
  window.addEventListener("pageshow",event=>{
    if (!event.persisted) return;
    // BFCache can restore a page while a camera flight was in progress.
    // Resume the same timeline instead of leaving the route permanently busy.
    if (route?.timeline?.paused() && busy) route.timeline.resume();
    else if (!route) portal()?.resume();
  });
  window.addEventListener("pagehide",()=>{
    if (route?.timeline?.isActive()) route.timeline.pause();
  });
  window.ProjectsWorldCamera={
    get progress(){return route?.camera.p??0;},
    get open(){return !!route?.open;},
    get transitioning(){return !!route&&!route.open;},
    get cameraCount(){return cameraCount;},
    get preloaded(){return frameReady;},
    get surfaceCount(){return document.querySelectorAll(".world-route").length;}
  };
})();