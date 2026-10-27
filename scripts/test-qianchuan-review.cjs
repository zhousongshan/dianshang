/* NODE_PATH=/path/to/node_modules node scripts/test-qianchuan-review.cjs [fixture.mp4]
   Local UI checks only; no model calls or uploads. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const fs = require('node:fs');
const out = '/tmp/qianchuan-review-check';
fs.mkdirSync(out,{recursive:true});
(async () => {
 const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const page = await browser.newPage({viewport:{width:1600,height:1100}});
  const errors=[]; page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.locator('[data-platform="creation"]').click();
  await page.locator('[data-page="ai-apps"]').click();
  await page.locator('[data-ai-app-open="qianchuan-video-review"]').click();
  const latest = () => page.locator('.qc-video-card').first();
  const finish = async () => { await page.locator('#qcSubmit').click(); assert(await page.locator('#qcSubmit').isDisabled()); await page.waitForFunction(() => !document.querySelector('#qcSubmit').disabled); };
  assert(await page.locator('#qcSubmit').isDisabled());
  assert.match(await page.locator('#aiAppEditor').innerText(), /作品描述\s*选填/);
  assert.match(await page.locator('#qcResults').innerText(), /不代表.*真实审核结论/);
  assert.equal(await page.locator('.console-notice').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(239, 240, 255)');
  assert.equal(await page.locator('.main').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  await page.screenshot({path:path.join(out,'empty.png'),fullPage:true});
  for(const [mode,expected] of [['pass','审核通过：无'],['fail','审核没有通过'],['uncertain','不确定'],['mixed','审核没有通过']]) {
   await page.locator('#qcScenario').selectOption(mode);
   assert.equal(await latest().locator('.qc-summary strong').innerText(),expected);
   assert(await latest().locator('.qc-result-media').isVisible());
   const media = await latest().locator('.qc-result-media').boundingBox(), content = await latest().locator('.qc-result-content').boundingBox();
   assert(content.y >= media.y + media.height);
   if(mode==='mixed') assert.equal(await latest().locator('.qc-card').count(),2);
   if(mode==='fail') {
    assert.equal(await latest().locator('.qc-details').getAttribute('open'),null);
    await latest().locator('.qc-details summary').click();
    assert(await latest().getByText('原因以及依据：',{exact:true}).isVisible());
    await latest().locator('.qc-details summary').click();
   }
  }
  await page.locator('#qcVideoFile').setInputFiles({name:'invalid.mp4',mimeType:'video/mp4',buffer:Buffer.from('not video')});
  await page.waitForFunction(() => !document.querySelector('#qcInputError').hidden);
  assert(await page.locator('#qcSubmit').isDisabled());
  await page.locator('#qcVideoFile').setInputFiles(process.argv[2] || path.join(out,'sample.mp4'));
  await page.waitForFunction(() => !document.querySelector('#qcSubmit').disabled);
  await page.locator('#qcCoverFile').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:fs.readFileSync(path.join(out,'empty.png'))});
  await page.locator('.qc-cover-upload img').waitFor();
  await page.waitForFunction(() => !document.querySelector('#qcSubmit').disabled);
  await page.locator('[data-qc="remove-cover"]').click();
  await page.locator('#qcScenario').selectOption('fail');
  await finish();
  assert(!await latest().locator('[data-qc-seek]').isDisabled());
  await latest().locator('[data-qc-seek]').click();
  await page.waitForFunction(() => document.querySelector('.qc-video-card .qc-result-media video').currentTime >= 7);
  assert(await page.locator('#qcVideo').evaluate(v=>v.paused));
  const oldUrl = await latest().locator('video').getAttribute('src');
  await page.locator('#qcTitle').fill('更新标题');
  assert.match(await page.locator('.qc-stale').innerText(),/重新提交/);
  // Historical video stays independently playable after input edits/replacement.
  assert(!await latest().locator('[data-qc-seek]').isDisabled());
  await page.locator('#qcVideoFile').setInputFiles(process.argv[2] || path.join(out,'sample.mp4'));
  await page.waitForFunction(() => !document.querySelector('#qcSubmit').disabled);
  assert.equal(await latest().locator('video').getAttribute('src'),oldUrl);
  await latest().locator('[data-qc-seek]').click();
  await page.waitForFunction(() => document.querySelector('.qc-video-card .qc-result-media video').currentTime >= 7);
  assert.equal(await page.locator('#qcCategory').count(),0);
  await page.locator('#qcDescription').fill('展示商品的使用场景');
  await page.waitForFunction(() => document.querySelector('#qcVideo').readyState >= 2);
  await page.locator('[data-qc="capture"]').click();
  await page.locator('.qc-cover-upload img').waitFor();
  await page.locator('[data-qc="remove-cover"]').click();
  await page.locator('#qcScenario').selectOption('mixed');
  await finish();
  assert.equal(await latest().locator('.qc-card').count(),2);
  await page.locator('[data-ai-app-open="white-background"]').click();
  assert.equal(await page.locator('#qcResults').isVisible(),false);
  assert.equal(await page.locator('#wbResults').isVisible(),true);
  await page.locator('[data-ai-app-open="qianchuan-video-review"]').click();
  assert.equal(await page.locator('#qcTitle').inputValue(),'更新标题');
  assert.equal(await page.locator('#qcDescription').inputValue(),'展示商品的使用场景');
  assert.equal(await page.locator('#wbResults').isVisible(),false);
  await page.locator('#qcScenario').selectOption('error');
  assert.match(await page.locator('.qc-failure').innerText(),/审核未完成/);
  await page.locator('[data-qc="retry"]').click();
  await page.waitForFunction(() => !document.querySelector('#qcSubmit').disabled);
  assert.equal(await page.locator('.qc-failure').count(),0);
  assert.equal(await latest().locator('.qc-summary strong').innerText(),'审核没有通过');
  // Clean gallery of all three types for visual verification.
  await page.reload();
  await page.locator('#qcVideoFile').setInputFiles(process.argv[2] || path.join(out,'sample.mp4'));
  await page.waitForFunction(() => !document.querySelector('#qcSubmit').disabled);
  for (const mode of ['pass','fail','mixed']) await page.locator('#qcScenario').selectOption(mode);
  assert.equal(await page.locator('.qc-video-card').count(),3);
  await page.setViewportSize({width:2560,height:1352});
  await page.waitForFunction(() => [...document.querySelectorAll('.qc-result-media video')].every(v=>v.readyState >= 2));
  await page.screenshot({path:path.join(out,'cards-desktop.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  const desktopCards = await page.locator('.qc-video-card').evaluateAll(nodes => nodes.map(n=>n.getBoundingClientRect().x));
  assert.equal(desktopCards[1],desktopCards[0], 'Narrow result area uses one readable column');
  assert((await latest().boundingBox()).width > 500, 'Card should use the available width');
  await page.screenshot({path:path.join(out,'cards-1440.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  if(await page.locator('.console-menu-toggle').getAttribute('aria-expanded') === 'true') await page.locator('.console-menu-toggle').click();
  await page.screenshot({path:path.join(out,'cards-mobile.png'),fullPage:true});
  const widths=await page.evaluate(() => ({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(widths.scroll <= widths.client+1,JSON.stringify(widths));
  await page.locator('[data-qc="remove-video"]').click();
  assert(await page.locator('#qcSubmit').isDisabled());
  assert.equal(await page.locator('.qc-result-media video').count(),3);
  await latest().locator('video').evaluate(v=>v.play());
  assert.deepEqual(errors,[]);
  console.log('PASS: video cards, three outcomes, independent media, seek, optional fields, capture, retry, lavender notice, navigation and responsive layout');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
