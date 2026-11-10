const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const root = require('node:path').resolve(__dirname, '..');
const code = fs.readFileSync(root + '/batch-video.js', 'utf8');
function harness() {
  const dom = new JSDOM('<select id="videoNamingCategory"><option>盲盒</option><option>生活百货</option><option>TME</option></select><div class="ai-app-workspace"><aside class="ai-app-directory"></aside></div>', { runScripts:'outside-only',url:'https://prototype.test/' });
  const w=dom.window, timers=[];
  w.escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  w.activeAiApplicationId='batch-video';w.renderAiApplications=()=>{};w.renderAiAppEditor=()=>{};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.HTMLMediaElement.prototype.pause=function(){};
  w.HTMLAnchorElement.prototype.click=function(){};
  w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};
  w.setTimeout=fn=>{timers.push(fn);return timers.length;};w.clearTimeout=()=>{};
  w.PublicAssets={getBatchVideoVideos:()=>({loaded:true,videos:[{id:'v1',name:'已审核视频',url:'https://example.test/video.mp4',duration:5}]}),getBatchVideoImages:()=>({loaded:true,images:[{id:'i1',name:'真实库图片',url:'https://example.test/product.png'}]})};
  const photo={name:'商品正面图',previewUrl:'blob:my-product',favorite:true};
  w.getSelectorImageRecords=()=>[{item:photo,index:0}];
  w.createAssetImageDescriptor=(item,index)=>({id:'asset-image-'+index,name:item.name,url:item.previewUrl});
  let imageRequest;
  w.openSingleImageMenu=(_anchor, request)=>{imageRequest=request;};
  const pickImage=(image={id:'i1',name:'真实库图片',url:'https://example.test/product.png'})=>imageRequest.apply(image);
  const saved=[];
  w.BatchVideoResults={owner:()=> 'designer',folders:()=>[{id:'root',name:'我的素材（根目录）'}],list:()=>saved,
    favoriteState:id=>Boolean(saved.find(item=>item.id===id)?.favorite),
    finish:(record,asset,region,ok)=>{const file={...record,url:`blob:${record.id}`};saved.push(file);ok(file);}};
  w.eval(code);
  const q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
  const click=(action,id)=>{const el=q(`[data-w-action="${action}"]${id?`[data-id="${id}"]`:''}`);assert.ok(el,action);assert.notEqual(el.disabled,true,action);el.click();};
  const modal=(action,id)=>{const el=q(`[data-modal-action="${action}"]${id?`[data-id="${id}"]`:''}`);assert.ok(el,action);assert.notEqual(el.disabled,true,action);el.click();};
  const change=(el,value)=>{if(typeof el==='string')el=q(el);el.checked=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
  const input=(el,value)=>{if(typeof el==='string')el=q(el);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
  const flush=()=>{let n=0;while(timers.length){assert.ok(++n<1000,'timers converge');timers.shift()();}};
  const text=()=>q('#batchVideoApp').textContent.replace(/\s+/g,' ');
  const setup=()=>{click('next');click('samples');click('next');};
  const assignAll=()=>{change('[data-w-change="select-all"]',true);click('bulk-product');modal('choose-image');pickImage({id:'my-photo',name:photo.name,url:photo.previewUrl});modal('apply-products');};
  return {w,q,qa,click,modal,change,input,flush,text,setup,assignAll,pickImage};
}

test('four steps show only current stage and gate navigation',()=>{
  const h=harness();assert.match(h.text(),/你想替换什么/);assert.equal(h.q('.bw-config-table'),null);
  assert.equal(h.q('[data-step="3"]').disabled,true);
  h.click('next');assert.match(h.text(),/添加参考视频/);assert.equal(h.q('[data-w-action="next"]').disabled,true);
  h.click('samples');h.click('next');assert.ok(h.q('.bw-config-table'));assert.equal(h.q('.bw-drop'),null);assert.equal(h.q('[data-w-action="start"]').disabled,true);
  h.click('back');assert.equal(h.qa('.bw-source-row').length,4);h.click('back');assert.match(h.text(),/你想替换什么/);
});

test('mode changes the replacement column, preserves mode-specific materials, and disables missing setups',()=>{
  const h=harness();h.setup();h.assignAll();assert.equal(h.q('[data-w-action="start"]').disabled,false);
  h.click('back');h.click('back');h.q('[data-mode="background"]').click();h.click('next');h.click('next');
  assert.match(h.text(),/新背景/);assert.equal(h.q('[data-w-action="start"]').disabled,true);
  h.change('[data-w-change="select-all"]',true);h.click('bulk-asset');h.pickImage();
  assert.equal(h.q('[data-w-action="start"]').disabled,false);
  h.click('back');h.click('back');h.q('[data-mode="product"]').click();h.click('next');h.click('next');
  assert.equal(h.qa('#batchVideoApp .bw-image-tile').length,4);assert.equal(h.q('#batchVideoApp .bw-image-tile img').alt,'商品正面图');
});

test('link import accepts Douyin only, deduplicates, escapes names, and preserves invalid lines',()=>{
  const h=harness();h.click('next');h.click('toggle-links');
  h.input('#bwLinks','https://v.douyin.com/abc/\nhttps://v.douyin.com/abc/\nhttps://www.douyin.com/video/123\nhttps://evil-douyin.com/x\nnot a URL');h.click('add-links');
  assert.equal(h.qa('.bw-source-row').length,2);assert.match(h.text(),/忽略 1 条重复.*2 行无效/);assert.match(h.q('#bwLinks').value,/evil-douyin/);
});

test('asset library supports multi-selection import and avoids duplicates',()=>{
  const h=harness();h.click('next');h.click('video-library');
  h.q('[data-modal-action="modal-scope"][data-scope="public"]').click();h.modal('toggle-video','v1');h.modal('modal-add-videos');assert.match(h.text(),/已审核视频/);assert.equal(h.qa('.bw-source-row').length,1);
  h.click('video-library');h.q('[data-modal-action="modal-scope"][data-scope="public"]').click();h.modal('toggle-video','v1');h.modal('modal-add-videos');assert.equal(h.qa('.bw-source-row').length,1);
  h.click('preview',h.q('[data-w-action="preview"]').dataset.id);assert.equal(h.q('dialog video').getAttribute('src'),'https://example.test/video.mp4');
});

test('bulk material and notes affect selected rows only; single-row configuration is independent',()=>{
  const h=harness();h.setup();const ids=h.qa('[data-w-change="select"]').map(e=>e.dataset.id);
  h.change(h.q(`[data-w-change="select"][data-id="${ids[0]}"]`),true);h.change(h.q(`[data-w-change="select"][data-id="${ids[1]}"]`),true);
  h.click('bulk-product');h.modal('choose-image');h.pickImage();h.modal('apply-products');assert.equal(h.qa('#batchVideoApp .bw-image-tile').length,2);
  h.click('bulk-notes');h.input('[data-modal-input="notes"]','保留手部动作');h.modal('modal-apply-notes');
  assert.deepEqual(h.qa('[data-w-input="notes"]').map(e=>e.value),['保留手部动作','保留手部动作','','']);
  h.click('choose-image',ids[2]);h.pickImage();
  assert.equal(h.qa('#batchVideoApp .bw-image-tile img')[2].alt,'真实库图片');assert.equal(h.qa('#batchVideoApp .bw-image-tile').length,3);
});

test('starting analyses automatically, high risk stays blocked, all other rows finish',()=>{
  const h=harness();h.setup();h.assignAll();h.click('start');h.flush();
  assert.equal(h.q('[data-step="3"]').disabled,true);assert.match(h.text(),/已完成 3 \/ 4 条/);
  h.q('[data-filter="confirm"]').click();assert.equal(h.qa('.bw-review-table tbody tr').length,1);assert.match(h.text(),/手部遮挡产品/);
  const id=h.q('[data-w-action="approve"]').dataset.id;h.click('approve',id);h.flush();assert.match(h.text(),/已完成 4 \/ 4 条/);
  h.q('[data-filter="done"]').click();assert.equal(h.qa('.bw-review-table tbody tr').length,4);assert.match(h.text(),/已完成 · 第 1 次制作/);assert.equal(h.qa('.bw-review-table a[download]').length,4);
});

test('editing high risk reanalyses instead of bypassing confirmation; skip does not block completed work',()=>{
  const h=harness();h.setup();h.assignAll();h.click('start');h.flush();h.q('[data-filter="confirm"]').click();
  const id=h.q('[data-w-action="edit-risk"]').dataset.id;h.click('edit-risk',id);h.modal('choose-image');h.pickImage();h.input('[data-modal-input="notes"]','保留手指');h.modal('modal-apply');h.flush();
  assert.equal(h.qa('.bw-review-table tbody tr').length,1);assert.match(h.text(),/保留手指/);h.click('cancel-task',id);
  assert.match(h.text(),/已完成 3 \/ 4 条/);assert.match(h.text(),/已取消 1 条/);assert.equal(h.q('[data-w-action="new"]').disabled,false);
  h.q('[data-filter="done"]').click();h.click('export');assert.match(h.text(),/已导出任务清单/);
  h.click('new');assert.match(h.text(),/你想替换什么/);
});

test('background replacement has its own risk wording and uses background assets',()=>{
  const h=harness();h.q('[data-mode="background"]').click();h.setup();h.change('[data-w-change="select-all"]',true);h.click('bulk-asset');h.pickImage();h.click('start');h.flush();h.q('[data-filter="confirm"]').click();
  assert.match(h.text(),/主体边缘与背景接近/);assert.doesNotMatch(h.text(),/产品 logo 可能变形/);
});

test('no live generation API is called and CSS parses',()=>{
  assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
  const dom=new JSDOM(`<style>${fs.readFileSync(root+'/batch-video.css','utf8')}</style>`);assert.ok(dom.window.document.styleSheets[0].cssRules.length>100);
  const h=harness();assert.doesNotMatch(h.text(),/本地交互演示/);
});


test('redo keeps V1, cancellation preserves all tasks, and confirmation saves V2 for only one row',()=>{
  const h=harness();h.setup();h.assignAll();h.click('start');h.flush();h.q('[data-filter="confirm"]').click();
  h.click('approve',h.q('[data-w-action="approve"]').dataset.id);h.flush();
  const id=h.q('[data-w-action="redo"]').dataset.id;
  h.click('redo',id);h.input('[data-modal-input="notes"]','更换动作');h.modal('modal-close');
  assert.equal(h.w.BatchVideoResults.list().length,4);
  h.click('redo',id);assert.equal(h.q('[data-modal-input="notes"]').value,'');
  h.input('[data-modal-input="notes"]','保留手部动作');h.modal('modal-apply');h.flush();
  assert.equal(h.w.BatchVideoResults.list().length,4);assert.equal(h.qa('.bw-review-table tbody tr').length,1);
  h.click('approve',id);h.flush();
  const versions=h.w.BatchVideoResults.list().filter(v=>v.rowId===id);
  assert.deepEqual(versions.map(v=>v.version),[1,2]);assert.equal(versions[1].notes,'保留手部动作');
  h.click('play-result',id);assert.equal(h.q('dialog video').getAttribute('src'),versions[1].url);
  assert.equal(h.qa('[data-modal-version] option').length,2);
});

test('editing a flagged row uses a cancellable reference draft and preserves notes across the library picker',()=>{
  const h=harness();h.setup();h.assignAll();h.click('start');h.flush();h.q('[data-filter="confirm"]').click();
  const id=h.q('[data-w-action="edit-risk"]').dataset.id;
  h.click('edit-risk',id);h.input('[data-modal-input="notes"]','保留光影');h.modal('video-library');
  h.q('[data-modal-action="modal-scope"][data-scope="public"]').click();h.modal('toggle-video','v1');h.modal('modal-add-videos');
  assert.equal(h.q('[data-modal-input="notes"]').value,'保留光影');assert.match(h.q('dialog').textContent,/已审核视频/);
  h.modal('modal-close');assert.match(h.q('.bw-review-table').textContent,/手持开箱/);
  h.click('edit-risk',id);assert.equal(h.q('[data-modal-input="notes"]').value,'');
  h.modal('toggle-links');h.input('[data-modal-input="link"]','https://example.test/not-douyin');h.modal('add-links');assert.match(h.q('dialog').textContent,/有效的抖音/);
  h.input('[data-modal-input="link"]','https://v.douyin.com/replace/');h.modal('add-links');
  h.input('[data-modal-input="notes"]','保留运镜');h.modal('modal-apply');h.flush();
  assert.match(h.q('.bw-review-table').textContent,/v.douyin.com\/replace/);assert.match(h.q('.bw-review-table').textContent,/保留运镜/);
  assert.match(h.text(),/已完成 3 \/ 4 条/);
});

test('naming category applies to selected rows, individual overrides reach saved output names',()=>{
  const h=harness();h.setup();const rows=h.qa('[data-w-change="select"]');
  [0,1].forEach(i=>h.change(h.qa('[data-w-change="select"]')[i],true));
  const bulk=h.q('[data-w-change="bulk-category"]');
  bulk.value='TME';bulk.dispatchEvent(new h.w.Event('change',{bubbles:true}));
  assert.equal(h.q('dialog').open,false);
  const categories=h.qa('[data-w-change="category"]');assert.deepEqual(categories.map(e=>e.value),['TME','TME','盲盒','盲盒']);
  categories[1].value='生活百货';categories[1].dispatchEvent(new h.w.Event('change',{bubbles:true}));h.assignAll();h.click('start');h.flush();
  assert.deepEqual(h.qa('[data-filter]').slice(0,4).map(e=>e.dataset.filter),['running','confirm','cancelled','done']);
  h.q('[data-filter="confirm"]').click();h.click('cancel-task',rows[0].dataset.id);
  assert.equal(h.q('[data-filter="cancelled"]').getAttribute('aria-selected'),'true');
  h.q('[data-filter="done"]').click();const file=h.w.BatchVideoResults.list().find(v=>v.rowId===rows[1].dataset.id);
  assert.equal(file.category,'生活百货');assert.ok(file.name.includes('生活百货'));
  assert.equal(h.q('.bw-review-actions [data-w-action="play-result"]'),null);h.click('play-result',rows[1].dataset.id);assert.equal(h.q('dialog video').getAttribute('src'),file.url);
});

test('copy creates one independent output, adding or removing images keeps the row count',()=>{
  const h=harness();
  h.click('next');h.click('mapping-example');
  const rows=()=>h.qa('[data-task-id]');
  const first=rows()[0].dataset.taskId;
  assert.equal(rows().length,4);
  assert.equal(rows()[0].querySelectorAll('.bw-image-tile').length,2);
  h.click('copy-row',first);
  const copy=rows()[1].dataset.taskId;
  assert.equal(rows().length,5);
  h.input(rows()[1].querySelector('textarea'),'保留图2，另加图3');
  h.click('remove-image',copy);
  const add=rows()[1].querySelector('.bw-add-image');add.click();
  h.pickImage({id:'bag',name:'新产品',url:'blob:test'});
  assert.deepEqual([...rows()[1].querySelectorAll('.bw-image-tile small')].map(el=>el.textContent),['图2','图3']);
  assert.deepEqual([...rows()[0].querySelectorAll('.bw-image-tile small')].map(el=>el.textContent),['图1','图2']);
  assert.equal(h.q('[data-w-action="subject-mode"]'),null);
  assert.equal(rows().length,5);
  assert.equal(rows()[1].querySelectorAll('.bw-image-tile').length,2);
  h.click('start');h.flush();
  const outputs=h.w.BatchVideoResults.list();
  assert.equal(outputs.length,5);
  assert.equal(outputs.find(item=>item.rowId===first).images.length,2);
  const copied=outputs.find(item=>item.rowId===copy);
  assert.equal(copied.notes,'保留图2，另加图3');
  assert.deepEqual(Array.from(copied.images,ref=>ref.number),[2,3]);
  h.click('redo',copy);h.modal('remove-image');h.modal('modal-close');
  h.click('redo',copy);assert.equal(h.qa('dialog .bw-image-tile').length,2);
});

test('a shared product set replaces all photos of checked tasks, preserving notes, count and independent editing',()=>{
  const h=harness();
  h.click('next');h.click('mapping-example');
  const rows=()=>h.qa('[data-task-id]');
  const images=i=>Array.from(rows()[i].querySelectorAll('.bw-image-tile button[title]'),button=>button.title);
  const otherImages=images(2);
  const notes=rows()[0].querySelector('textarea').value;
  for(const i of [0,1])h.change(rows()[i].querySelector('input[type="checkbox"]'),true);
  const choose=name=>{h.q('dialog .bw-add-image').click();h.pickImage({id:name,name,url:'blob:'+name});};
  h.click('bulk-product');choose('新杯子');h.modal('modal-close');
  assert.equal(images(0).length,2);
  h.click('bulk-product');choose('新杯子');choose('杯子侧面');h.modal('apply-products');
  assert.deepEqual(images(0),['更换图1 · 新杯子','更换图2 · 杯子侧面']);
  assert.deepEqual(images(1),images(0));assert.deepEqual(images(2),otherImages);
  assert.equal(rows()[0].querySelector('textarea').value,notes);
  assert.equal(rows().length,4);
  rows()[0].querySelector('[data-w-action="remove-image"]').click();
  assert.equal(images(1).length,2);
});
