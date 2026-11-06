/* Static production gate for the dependency-light Projects website.
 * No build system needed: node tests/static-audit.cjs
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));

const htmlFiles = ["index.html", "rackflow.html"];
const scripts = ["assets/js/portal.js", "assets/js/premium.js", "assets/js/rackflow.js"];
const styles = ["assets/css/styles.css", "assets/css/rackflow.css", "assets/css/world-nav.css", "assets/css/responsive.css"];
const vendors = ["assets/vendor/gsap.min.js", "assets/vendor/ScrollTrigger.min.js"];
const warnings = [];

for (const file of [...htmlFiles, ...scripts, ...styles, ...vendors, "assets/img/favicon.svg"]) {
  assert(exists(file), "Required file is missing: " + file);
}

for (const file of scripts) {
  assert.doesNotThrow(() => new Function(read(file)), "Invalid JavaScript syntax in " + file);
}

function checkCSS(file) {
  const css = read(file);
  let depth = 0, quote = "", inComment = false, escaped = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i], next = css[i + 1];
    if (inComment) {
      if (c === "*" && next === "/") { inComment = false; i++; }
      continue;
    }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === "\\") { escaped = true; continue; }
      if (c === quote) quote = "";
      continue;
    }
    if (c === "/" && next === "*") { inComment = true; i++; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      assert(depth >= 0, "Unexpected } in " + file);
    }
  }
  assert.equal(depth, 0, "CSS rules not balanced: " + file);
  assert(!quote && !inComment, "Unterminated CSS token: " + file);
  return css;
}
styles.forEach(checkCSS);

function attribute(tag, name) {
  const match = tag.match(new RegExp("\\b" + name + '="([^"]*)"'));
  return match?.[1] || null;
}
for (const file of htmlFiles) {
  const html = read(file);
  assert.match(html, /<html[^>]*lang="fr"/i, "Missing page language in " + file);
  assert.match(html, /<meta name="description"/, "Missing meta description in " + file);
  assert.match(html, /<link rel="canonical"/, "Missing canonical URL in " + file);
  assert.match(html, /<main(?:\s|>)/, "Missing main landmark in " + file);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, "Expected one h1 in " + file);

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, "Duplicate IDs in " + file);
  const idSet = new Set(ids);

  for (const match of html.matchAll(/<(?:a|link|script|img|source)\b[^>]*>/g)) {
    const tag = match[0];
    const value = attribute(tag, "src") || attribute(tag, "href");
    if (!value) continue;
    if (/^(?:mailto:|tel:|data:|javascript:)/i.test(value)) continue;
    const url = new URL(value, "https://audit.invalid/" + file);
    if (url.origin !== "https://audit.invalid") continue;
    const destination = decodeURIComponent(url.pathname).replace(/^\//, "");
    if (destination) {
      assert(exists(destination), "Broken internal asset or link: " + file + " → " + value);
    }
    if ((!destination || destination === file) && url.hash) {
      assert(idSet.has(decodeURIComponent(url.hash.slice(1))),
        "Broken in-page hash: " + file + " → " + value);
    }
  }
  for (const tag of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert(/\brel="[^"]*noopener/.test(tag[0]), "Missing rel=noopener in " + file);
  }
}
const homeCss = read("assets/css/styles.css");
for (const stale of [".portal-overlay", ".portal-vignette", ".portal-particles", ".portal-launch", ".launching"]) {
  assert(!homeCss.includes(stale), "Obsolete CSS from previous navigation system: " + stale);
}
assert(read("assets/css/rackflow.css").includes("[hidden]"), "Interactive demo hidden panels require a real [hidden] rule");

const firstPartyBytes = [...scripts, ...styles, ...htmlFiles].reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
const vendorBytes = vendors.reduce((sum, file) => sum + fs.statSync(path.join(root, file)).size, 0);
if (exists("docs/banner.svg")) {
  const linked = [...htmlFiles, "README.md"].some(file => read(file).includes("docs/banner.svg"));
  if (!linked) warnings.push("docs/banner.svg is not referenced by the site or README (candidate for removal)");
}
console.log("PASS static source and asset audit");
console.log("Source size (uncompressed): " + (firstPartyBytes / 1024).toFixed(1) + " KiB");
console.log("Vendored GSAP and ScrollTrigger: " + (vendorBytes / 1024).toFixed(1) + " KiB");
warnings.forEach(message => console.warn("WARN " + message));
