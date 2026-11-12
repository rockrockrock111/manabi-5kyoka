'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../_site');
const prefix = '/manabi-5kyoka/';
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json')));
const questions = catalog.units.flatMap(u => u.file ? JSON.parse(fs.readFileSync(path.join(root,'data',u.file))) : []);
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  const url = new URL(req.url, 'http://localhost');
  const target=path.resolve(root, '.' + url.pathname.slice(prefix.length-1));
  if(!url.pathname.startsWith(prefix)||!target.startsWith(root+path.sep)&&target!==root){res.writeHead(404).end();return;}
  const file=target===root?path.join(root,'index.html'):target;
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async()=>{
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}${prefix}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try {
const context=await browser.newContext({viewport:{width:320,height:740},isMobile:true,hasTouch:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);await page.locator('[data-grade="1"]').waitFor();
assert.equal(await page.evaluate(()=>QUESTIONS.length),questions.length);
for(const grade of [1,2,3])for(const subject of ['英語','数学','国語','理科','社会']){
 await page.locator('[data-page="home"]').click();await page.locator(`[data-grade="${grade}"]`).click();await page.locator(`[data-subject="${subject}"]`).click();
 await page.locator('[data-unit]').first().click();assert.match(await page.locator('.tag').innerText(),new RegExp(`中${grade}`));
 await page.locator('[data-choice="0"]').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${grade} ${subject}`);
}
console.log('PASS: all 15 grade/subject combinations, answer UI and mobile layout');
// Import exactly the old v2 shape, including a pre-split question ID.
const old=questions.find(q=>q.id==='q006');
const fixture={version:2,attempts:{q006:{tries:2,correct:0,last:'2026-01-01'}},review:{q006:{level:0,due:'2026-01-01'}},sessions:[{date:'2026-01-01',mode:'単元学習',count:1,correct:0}],goal:5};
await page.evaluate(data=>localStorage.setItem('manabi-v2-progress',JSON.stringify(data)),fixture);await page.reload();await page.locator('[data-page="review"]').click();
await page.locator('details').filter({has:page.locator('[data-single="q006"]')}).locator('summary').click();
await page.locator('[data-single="q006"]').click();assert.equal(await page.locator('h1').innerText(),old.question);
await page.locator(`[data-choice="${old.answer}"]`).click();await page.locator('[data-action="next"]').click();
let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('manabi-v2-progress')));
assert.equal(saved.attempts.q006.tries,3);assert.equal(saved.review.q006.level,1);assert.equal(saved.sessions.length,2);
await page.locator('[data-page="home"]').click();await page.locator('[data-grade="1"]').click();await page.locator('[data-subject="数学"]').click();
await page.locator('[data-unit="数学|1|空間図形"]').click();
const added=questions.find(q=>q.id==='math-g1-u06-001');assert.equal(await page.locator('h1').innerText(),added.question);
await page.locator('[data-action="skip"]').click();await page.locator('[data-back]').click();assert.match(await page.locator('.tag').innerText(),/平面図形/);
await page.locator('[data-page="review"]').click();await page.locator('details').filter({has:page.locator(`[data-single="${added.id}"]`)}).locator('summary').click();
await page.locator(`[data-single="${added.id}"]`).click();await page.locator(`[data-choice="${added.answer}"]`).click();await page.locator('[data-action="next"]').click();
saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('manabi-v2-progress')));assert.equal(saved.review[added.id].level,1);
assert.equal(saved.sessions.at(-1).correct,1);assert.equal(saved.sessions.at(-1).count,1);
await page.reload();await page.locator('[data-page="progress"]').click();assert.match(await page.locator('#app').innerText(),/2026-01-01/);
await page.locator('[data-page="settings"]').click();
const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="export"]').click();const download=await downloadPromise;
const backup=JSON.parse(fs.readFileSync(await download.path()));assert.equal(backup.format,'manabi-v2');assert.deepEqual(backup.data,saved);
page.on('dialog',dialog=>dialog.accept());
await page.locator('[data-action="reset"]').click();
assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('manabi-v2-progress')).review),{});
await page.locator('#importFile').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
await page.waitForFunction(expected=>JSON.stringify(JSON.parse(localStorage.getItem('manabi-v2-progress')))===JSON.stringify(expected),saved);
await page.locator('[data-page="curriculum"]').click();await page.locator('details').first().locator('summary').click();assert.match(await page.locator('#app').innerText(),/入試 0問/);assert.match(await page.locator('#app').textContent(),/未収録/);
console.log('PASS: old review IDs and history, new mistakes, prerequisites, scoring, persistence, backup round trip and curriculum gaps');
await page.evaluate(async()=>{await navigator.serviceWorker.ready;await caches.open('unrelated-app');});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
await context.setOffline(true);await page.reload();await page.locator('[data-grade="1"]').waitFor();assert.equal(await page.evaluate(()=>QUESTIONS.length),questions.length);
await page.locator('[data-subject="英語"]').click();await page.locator('[data-unit="英語|1|短い英文の読解"]').click();await page.locator('[data-choice="0"]').click();
assert.equal(await page.evaluate(async()=>(await caches.keys()).includes('unrelated-app')),true);assert.deepEqual(errors,[]);
await context.close();
// A missing split file must produce an explicit failure, not a partial bank.
const broken=await browser.newContext({serviceWorkers:'block'});const errorPage=await broken.newPage();
await errorPage.route('**/data/questions/grade-1/math/unit-01.json',route=>route.fulfill({status:404,body:'not found'}));
await errorPage.goto(base);await errorPage.getByRole('heading',{name:'読み込みエラー'}).waitFor();await broken.close();
console.log('PASS: complete offline split bank, subdirectory PWA, unrelated caches and failed-file error handling');
} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
