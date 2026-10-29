/* Exercise the tag vocabulary, file assignments and public-library filtering. */
const {chromium}=require('playwright'), assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const p=await browser.newPage({viewport:{width:1600,height:1050}}), errors=[]; p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.argv[2]||'http://127.0.0.1:8768/index.html',{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>{document.querySelector('[data-platform="creation"]').click();showPage('assets');});
  assert.equal(await p.locator('[data-page="assets"]').innerText(),'素材库');
  assert.equal(await p.locator('#assetDateFilter').locator('..').innerText(),'创建日期');
  assert.equal(await p.locator('[data-asset-note],#assetNoteDrawer').count(),0);
  const scope=async s=>p.locator(`[data-asset-scope="${s}"]`).click();
  const create=async name=>{await p.locator('[data-tag-create]').click();await p.locator('#assetTagName').fill(name);await p.locator('#assetTagSave').click();};
  const assign=async (selector,names)=>{await p.locator(selector).first().click();for(const name of names)await p.locator('#assetTagOptions').getByLabel(name,{exact:true}).check();await p.locator('#assetTagSave').click();};
  await scope('tags');assert(await p.locator('#assetTagManager').isVisible());assert(!await p.locator('#assetFileShell').isVisible());
  await create('潮玩盲盒');await create('商品实拍');await create('场景');await create('潮玩盲盒');assert.match(await p.locator('#assetTagError').innerText(),/已存在/);await p.keyboard.press('Escape');
  await p.screenshot({path:'/tmp/chaoren-public-assets-check/tags-management.png'});
  await scope('generated');const first=p.locator('[data-asset-tags]').first(), id=await first.getAttribute('data-asset-tags');
  await assign(`[data-asset-tags="${id}"]`,['潮玩盲盒','商品实拍']);assert.equal(await p.locator('.asset-card-lite').first().locator('.asset-tag-chip').count(),2);
  await first.click();await p.locator('#assetTagOptions').getByLabel('潮玩盲盒',{exact:true}).uncheck();await p.keyboard.press('Escape');assert.equal(await p.locator('.asset-card-lite').first().locator('.asset-tag-chip').count(),2);
  await p.locator('#assetTypeSelect').selectOption('video');await assign('[data-asset-tags]',['场景']);
  await p.reload();await scope('generated');assert.equal(await p.locator('.asset-card-lite').first().locator('.asset-tag-chip').count(),2);
  await p.locator('#assetTypeSelect').selectOption('video');assert.equal(await p.locator('.asset-card-lite').first().locator('.asset-tag-chip').innerText(),'场景');
  await scope('public');await p.locator('[data-public-folder="public-product"]').first().click();
  await assign('[data-asset-tags="public:public-teddy"]',['潮玩盲盒','商品实拍']);
  await assign('[data-asset-tags="public:public-white"]',['商品实拍']);
  await p.locator('#assetTagFilterButton').click();await p.locator('#assetTagFilterSearch').fill('潮玩');assert.equal(await p.locator('[data-tag-filter]').count(),1);await p.locator('#assetTagFilterOptions').getByLabel('潮玩盲盒',{exact:true}).check();assert.equal(await p.locator('.public-image-card').count(),1);
  await p.locator('#assetTagFilterSearch').fill('');await p.locator('#assetTagFilterOptions').getByLabel('商品实拍',{exact:true}).check();assert.equal(await p.locator('.public-image-card').count(),2);
  await p.screenshot({path:'/tmp/chaoren-public-assets-check/tags-public-filter.png'});
  await p.keyboard.press('Escape');await p.locator('[data-public-folder="public-root"]').first().click();assert.equal(await p.locator('.public-folder-card').count(),1);
  assert.equal(await p.locator('#assetSourceFilter').isVisible(),false);
  await scope('tags');const row=p.locator('#assetTagTable tr').filter({hasText:'潮玩盲盒'});await row.locator('[data-tag-rename]').click();await p.locator('#assetTagName').fill('潮玩新品');await p.locator('#assetTagSave').click();
  await scope('public');await p.locator('[data-public-folder="public-product"]').first().click();assert.equal(await p.locator('#assetGrid .asset-tag-chip').filter({hasText:'潮玩新品'}).count(),1);
  await p.reload();await scope('public');await p.locator('[data-public-folder="public-product"]').first().click();assert.equal(await p.locator('#assetGrid .asset-tag-chip').filter({hasText:'潮玩新品'}).count(),1);
  await p.locator('[data-asset-view="list"]').click();await p.screenshot({path:'/tmp/chaoren-public-assets-check/tags-public-list.png'});
  await scope('tags');await p.locator('#assetTagTable tr').filter({hasText:'潮玩新品'}).locator('[data-tag-delete]').click();await p.locator('#assetTagSave').click();await scope('public');assert.equal(await p.locator('#assetGrid .asset-tag-chip').filter({hasText:'潮玩新品'}).count(),0);assert.equal(await p.locator('.public-image-card').count(),2);
  await p.setViewportSize({width:390,height:844});await p.locator('[data-page="assets"]').click();await p.locator('#assetTagFilterButton').click();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'/tmp/chaoren-public-assets-check/tags-mobile.png'});
  await p.keyboard.press('Escape');await scope('tags');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('[data-tag-create]').click();const box=await p.locator('#assetTagDialog').boundingBox();assert(box.x>=0&&box.x+box.width<=390);await p.keyboard.press('Escape');
  assert.deepEqual(errors,[]);console.log('PASS: tag create/duplicate/rename/delete; image/video assignment, cancel and persistence; public multi-select/search/folder filters; list/mobile; notes removed; labels updated.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
