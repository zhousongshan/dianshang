const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const p=await browser.newPage({viewport:{width:1600,height:1050}}), errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const state=()=>p.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('chaoren-public-assets-v1',1);q.onsuccess=()=>r(q.result)});return new Promise(r=>{const q=db.transaction('library').objectStore('library').get('state');q.onsuccess=()=>r(q.result)})});
  await p.goto('file://'+path.join(root,'index.html'));
  await p.evaluate(()=>{document.querySelector('[data-platform="creation"]').click();showPage('assets');});
  await p.locator('[data-asset-scope="public"]').click();
  await p.locator('[data-public-folder="public-product"]').first().waitFor();
  const personalBefore=await p.evaluate(()=>JSON.stringify({assets:mockAssets,videos:mockVideos,records:reviewDemoState.records}));
  await p.locator('[data-public-create]').click();await p.locator('#inputModalField').fill('公共审核测试');await p.locator('#inputModalConfirm').click();await p.locator('.public-folder-card').filter({hasText:'公共审核测试'}).locator('[data-public-folder]').click();
  await p.locator('.public-library-actions [data-public-upload]').click();
  assert.equal(await p.locator('#publicUploadReviewer').inputValue(),'user-2');
  assert.equal(await p.locator('#publicUploadReviewer option[value="user-3"]').count(),0);
  await p.locator('#publicUpload').setInputFiles([
   {name:'待审图片.png',mimeType:'image/png',buffer:fs.readFileSync(path.join(root,'watch-product.png'))},
   {name:'待审视频.mp4',mimeType:'video/mp4',buffer:fs.readFileSync(process.env.VIDEO_FIXTURE||'/tmp/qianchuan-review-check/sample.mp4')},
   {name:'驳回图片.png',mimeType:'image/png',buffer:fs.readFileSync(path.join(root,'watch-product.png'))}
  ]);
  await p.waitForFunction(()=>document.querySelectorAll('.public-upload-progress.ready').length===3);
  await p.screenshot({path:'/tmp/chaoren-public-assets-check/public-review-upload.png'});
  await p.locator('#publicUploadConfirm').click();
  await p.waitForFunction(()=>!document.querySelector('#publicUploadModal').classList.contains('show'));
  const uploaded=(await state()).images.filter(i=>i.name.startsWith('待审')||i.name==='驳回图片.png');
  assert.equal(uploaded.length,3);assert(uploaded.every(i=>i.reviewStatus==='pending'&&i.reviewerId==='user-2'&&i.submitterId==='user-3'));
  assert.equal(await p.locator('.public-image-card').count(),0);
  const ids=uploaded.map(i=>'public-review:'+i.id), folderId=uploaded[0].folderId;
  const image=uploaded.find(i=>i.kind==='image'), video=uploaded.find(i=>i.kind==='video');
  // UI and action guard: pending assets cannot be selected or downloaded through forged library controls.
  let downloads=0;p.on('download',()=>downloads++);
  await p.evaluate(({id,folderId})=>{
   openAssetSelector('main');assetSelectorState.scope='public';assetSelectorState.folderId=folderId;renderAssetSelector();
   for(const action of ['public-select','public-download','public-preview']) {const b=document.createElement('button');b.setAttribute('data-'+action,id);document.body.append(b);b.click();b.remove();}
  },{id:image.id,folderId});
  assert.equal(await p.locator('#assetSelectorContent [data-public-select]').count(),0);
  assert.equal(await p.evaluate(()=>assetSelectorState.draftSelected.size),0);assert.equal(downloads,0);
  await p.evaluate(()=>closeAssetSelector());
  await p.evaluate(ids=>applyReviewDecision(ids,'approved'),ids);
  assert((await state()).images.filter(i=>uploaded.some(u=>u.id===i.id)).every(i=>i.reviewStatus==='pending'));
  await p.locator('[data-page="review"]').click();await p.locator('[data-review-type="public"]').click();assert.equal(await p.locator(`[data-review-row="public-review:${video.id}"]`).count(),1);
  await p.evaluate(()=>switchReviewIdentity('administrator'));
  await p.evaluate(ids=>applyReviewDecision(ids,'approved'),ids); // Not the assigned reviewer.
  assert((await state()).images.filter(i=>uploaded.some(u=>u.id===i.id)).every(i=>i.reviewStatus==='pending'));
  await p.evaluate(()=>switchReviewIdentity('supervisor'));
  assert.equal(await p.locator('#reviewList [data-review-row^="public-review:"]').count(),3);await p.locator('[data-review-media="video"]').click();assert.equal(await p.locator('[data-review-row]').count(),1);assert(await p.locator('.rc-play').isVisible());await p.waitForFunction(()=>document.querySelector('.rc-duration')?.textContent);await p.screenshot({animations:'disabled',path:'/tmp/chaoren-public-assets-check/review-video-filter.png'});await p.locator('[data-review-media="all"]').click();
  await p.locator(`.rc-preview[data-review-preview="public-review:${video.id}"]`).click();
  await p.locator('#reviewDetailBody video').evaluate(v=>v.play());
  await p.waitForFunction(()=>document.querySelector('#reviewDetailBody video').currentTime>1);
  await p.screenshot({path:'/tmp/chaoren-public-assets-check/public-review-video.png'});
  await p.locator(`#reviewDetailActions [data-review-approve="public-review:${video.id}"]`).click();
  await p.waitForFunction(()=>!document.querySelector('#reviewDetailModal').classList.contains('show'));
  await p.evaluate(id=>applyReviewDecision([id],'invalid'),'public-review:'+image.id);
  assert.equal((await state()).images.find(i=>i.id===image.id).reviewStatus,'pending');
  await p.locator(`[data-review-approve="public-review:${image.id}"]`).click();
  await p.waitForFunction(id=>!document.querySelector(`[data-review-row="${id}"]`),'public-review:'+image.id);
  const reject=uploaded.find(i=>i.name==='驳回图片.png');
  await p.locator(`[data-review-reject="public-review:${reject.id}"]`).click();await p.locator('#reviewRejectReason').fill('内容不符合公共素材要求');
  await p.evaluate(()=>confirmReviewReject());
  await p.waitForFunction(id=>!document.querySelector(`[data-review-row="${id}"]`),'public-review:'+reject.id);
  await p.evaluate(()=>showPage('assets'));await p.locator('[data-asset-scope="public"]').click();
  assert.equal(await p.locator('.public-image-card').count(),2);assert.equal(await p.locator('.public-video-card').count(),1);
  assert.equal(await p.locator('[data-public-remove]').count(),0);
  // Supervisors and folder owners cannot delete via forged buttons.
  const forgeDelete=async(id,attribute)=>p.evaluate(({id,attribute})=>{const b=document.createElement('button');b.setAttribute(attribute,id);document.body.append(b);b.click();b.remove();},{id,attribute});
  await forgeDelete(video.id,'data-public-remove');assert(!await p.locator('#confirmModal').isVisible());
  await p.evaluate(()=>switchReviewIdentity('employee'));await forgeDelete(folderId,'data-public-delete-folder');assert(!await p.locator('#confirmModal').isVisible());
  await forgeDelete(video.id,'data-public-remove');assert(!await p.locator('#confirmModal').isVisible());
  assert.equal(await p.evaluate(()=>JSON.stringify({assets:mockAssets,videos:mockVideos,records:reviewDemoState.records})),personalBefore);
  await p.locator('[data-page="review"]').click();await p.locator('[data-review-type="public"]').click();await p.locator(`.rc-preview[data-review-preview="public-review:${reject.id}"]`).click();assert.match(await p.locator('.rc-detail-rejection').innerText(),/内容不符合公共素材要求/);await p.keyboard.press('Escape');
  await p.reload();await p.waitForFunction(()=>window.PublicAssets?.reviewRecords().length===3);
  assert.equal((await state()).images.find(i=>i.id===video.id).reviewStatus,'approved');
  await p.evaluate(()=>{showPage('assets');switchReviewIdentity('administrator');});await p.locator('[data-asset-scope="public"]').click();await p.locator(`[data-public-folder="${folderId}"]`).first().click();
  // Admin delete must recheck role when the confirmation is committed.
  await p.locator('.public-video-card [data-public-menu]').click();await p.locator('.public-video-card [data-public-remove]').click();
  await p.evaluate(()=>switchReviewIdentity('supervisor'));await p.locator('#confirmModalConfirm').click();
  assert.equal((await state()).images.find(i=>i.id===video.id).archived,undefined);
  await p.evaluate(()=>switchReviewIdentity('administrator'));await p.locator('.public-video-card [data-public-menu]').click();await p.locator('.public-video-card [data-public-remove]').click();await p.locator('#confirmModalConfirm').click();
  await p.waitForFunction(()=>!document.querySelector('.public-video-card'));
  await forgeDelete(folderId,'data-public-delete-folder');await p.locator('#confirmModalConfirm').click();
  await p.waitForFunction(id=>!document.querySelector(`[data-public-folder="${id}"]`),folderId);
  const final=await state();assert(!final.folders.some(i=>i.id===folderId));assert(final.images.filter(i=>i.folderId===folderId).every(i=>i.archived));
  assert.deepEqual(errors,[]);
  // Legacy records without audit evidence remain intact but unavailable until reviewed.
  await p.evaluate(async()=>{const db=await new Promise(r=>{const q=indexedDB.open('chaoren-public-assets-v1',1);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('library','readwrite'),s=tx.objectStore('library'),q=s.get('state');q.onsuccess=()=>{const v=q.result;v.images.push({id:'legacy-upload',name:'历史未审核.png',folderId:'public-product',url:'./watch-product.png'});s.put(v,'state')};tx.oncomplete=r})});
  await p.reload();await p.evaluate(()=>switchReviewIdentity('supervisor'));await p.waitForFunction(()=>window.PublicAssets?.reviewRecords().some(i=>i.publicAssetId==='legacy-upload'));
  const migrated=(await state()).images.find(i=>i.id==='legacy-upload');assert.equal(migrated.reviewStatus,'pending');assert.equal(migrated.legacyReview,true);assert.equal(migrated.url,'./watch-product.png');
  console.log('PASS: image/video review gating, playback, assigned reviewer, rejection, persistence, legacy migration, admin-only deletion and confirmation recheck; personal materials unchanged.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
