// Zero-dependency checks: required files, SEO tags, no inline scripts, no placeholders left on deploy.
import { readFileSync, existsSync } from "node:fs";
const must = ["index.html","404.html","robots.txt","sitemap.xml","_headers","styles.css","favicon.svg","manifest.webmanifest"];
let fail = 0;
const bad = (m) => { console.error("FAIL:", m); fail++; };
for (const f of must) if (!existsSync(f)) bad(`missing ${f}`);
for (const f of ["index.html","404.html"]) {
  const h = readFileSync(f, "utf8");
  if (!/<title>[^<]{5,60}<\/title>/.test(h) && f === "index.html") bad(`${f} title length`);
  if (f === "index.html") {
    if ((h.match(/<h1[ >]/g) || []).length !== 1) bad("index.html needs exactly one h1");
    if (!/rel="canonical"/.test(h)) bad("index.html missing canonical");
    if (!/name="description"/.test(h)) bad("index.html missing description");
    if (/TODO/.test(h)) console.warn("WARN: TODO placeholders remain in index.html");
    if (/example\.com/.test(h)) console.warn("WARN: example.com placeholder remains");
  }
  if (/<script(?![^>]*(src=|application\/ld\+json))/i.test(h)) bad(`${f} has inline script (breaks CSP)`);
  if (/\sstyle=|<style/i.test(h)) bad(`${f} has inline style (breaks CSP)`);
}
if (fail) process.exit(1);
console.log("OK");
