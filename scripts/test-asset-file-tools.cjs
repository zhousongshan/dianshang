/* Original asset layout, direct file upload and optional list view. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),temp=fs.mkdtempSync(path.join(os.tmpdir(),'asset-folder-'));
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.argv[2]||'http://127.0.0.1:8768/index.html',{waitUntil:'domcontentloaded'});await page.evaluate(()=>{document.querySelector('[data-platform="creation"]').click();showPage('assets');});
 await page.locator('.asset-card-lite').first().waitFor();assert.equal(await page.locator('.am-app').count(),0);assert.deepEqual(await page.locator('[data-asset-scope]').allTextContents(),['我的素材','我的收藏','公共素材','标签管理']);
 const personalChooser=page.waitForEvent('filechooser');await page.locator('#assetUploadBtn').click();const personalInput=await personalChooser;assert.equal(await personalInput.element().evaluate(n=>n.webkitdirectory),false);await personalInput.setFiles([]);
 assert.equal(await page.locator('[data-asset-upload-menu],input[webkitdirectory]').count(),0);
 await page.locator('[data-asset-view="list"]').click();assert.equal(await page.locator('#page-assets').evaluate(n=>n.classList.contains('asset-list-view')),true);assert.equal(await page.locator('.asset-card-lite').first().evaluate(n=>n.getBoundingClientRect().height<110),true);
 await page.locator('[data-asset-scope="favorites"]').click();
 const alignment=await page.locator('.asset-folder-card').first().evaluate(row=>{
  const title=row.querySelector('h3'),range=document.createRange();range.selectNodeContents(title);
  const headings=[...document.querySelectorAll('.asset-list-heading>span')],meta=row.querySelector('.asset-folder-meta');
  return {name:range.getBoundingClientRect().left,nameHeader:headings[0].getBoundingClientRect().left,iconRight:row.querySelector('.asset-folder-icon').getBoundingClientRect().right,count:meta.firstElementChild.getBoundingClientRect().left,countHeader:headings[1].getBoundingClientRect().left,date:meta.lastElementChild.getBoundingClientRect().left,dateHeader:headings[2].getBoundingClientRect().left};
 });
 assert.ok(Math.abs(alignment.name-alignment.nameHeader)<=2,JSON.stringify(alignment));
 assert.ok(alignment.name-alignment.iconRight<26);
 assert.ok(Math.abs(alignment.count-alignment.countHeader)<=2);
 assert.ok(Math.abs(alignment.date-alignment.dateHeader)<=2);
 await page.screenshot({path:'/tmp/chaoren-public-assets-check/favorites-list-aligned.png'});
 await page.locator('[data-asset-scope="generated"]').click();
 await page.screenshot({path:'/tmp/chaoren-public-assets-check/restored-assets-list.png'});await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('#page-assets').evaluate(n=>n.classList.contains('asset-list-view')),true);
 await page.evaluate(()=>switchReviewIdentity('supervisor'));await page.locator('[data-asset-scope="public"]').click();await page.locator('[data-public-folder="public-product"]').first().click();assert.equal(await page.locator('.public-image-card').count(),2);await page.locator('[data-public-folder="public-root"]').first().click();
 await page.locator('[data-public-folder="public-product"]').first().click();
 await page.locator('.public-library-actions [data-public-upload]').click();const chooser=page.waitForEvent('filechooser');await page.locator('#publicUploadDropzone').click();const fileInput=await chooser;assert.equal(await fileInput.element().evaluate(n=>n.webkitdirectory),false);await fileInput.setFiles({name:'6941234567890_商品.png',mimeType:'image/png',buffer:fs.readFileSync(path.resolve(__dirname,'../watch-product.png'))});
 await page.waitForFunction(()=>!document.querySelector('#publicUploadConfirm').disabled);await page.locator('#publicUploadConfirm').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('已上传'));
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-asset-scope="public"]').click();await page.locator('[data-public-folder="public-product"]').first().click();assert.equal(await page.locator('.public-image-card').filter({hasText:'6941234567890_商品.png'}).locator('img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.evaluate(()=>showPage('config'));await page.locator('#mainPrompt').fill('@6941234567890');await page.locator('#publicMentionMenu').waitFor();await page.locator('#mainPrompt').press('Enter');assert.equal(await page.locator('#mainImageList .selected-image-item').count(),1);
 await page.evaluate(()=>showPage('assets'));
 await page.locator('[data-asset-view="grid"]').click();await page.locator('[data-asset-scope="public"]').click();await page.screenshot({path:'/tmp/chaoren-public-assets-check/restored-assets-grid.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-page="assets"]').click();await page.locator('[data-asset-view="list"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/chaoren-public-assets-check/restored-assets-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: original tabs/layout, direct file upload, no directory picker, binary persistence, @69, list view persistence, mobile bounds.');
}finally{await browser.close();fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
