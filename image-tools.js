/* 白底图批量前端：仅加载本地图片和设置参数，不执行生成。 */
(() => {
  'use strict';
  const APP_ID='white-background',MAX_FILES=20,MAX_BYTES=50*1024*1024;
  const q=s=>document.querySelector(s),esc=escapeHtml;
  const app=aiApplications.find(item=>item.id===APP_ID);
  if(!app)return;
  const state={files:[],values:aiAppDraft(app).values,previewId:null,results:[]};
  const active=()=>activeAiApplicationId===APP_ID;
  const uid=()=>crypto.randomUUID?.()||`wb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const selected=()=>state.files.filter(f=>f.selected);
  function error(){
    const list=selected();if(!list.length)return '请选择需要生成白底图的图片。';
    const f=list.find(f=>f.status!=='ready');
    return f?`${f.name}：${f.status==='reading'?'正在读取图片信息':f.error}`:'';
  }
  function renderEditor(){
    const list=state.files,message=error(),ready=list.filter(f=>f.status==='ready');
    q('#aiAppEditor').innerHTML=`<div class="ai-app-editor-header"><div class="ai-app-editor-name">${aiApplicationIcon('image')}<h2>白底图生成</h2></div><span class="vt-badge">图片工具</span></div><p class="ai-app-editor-description vt-description">保留商品主体，批量替换为纯白背景，准备商品展示图。</p>
      <section class="ai-app-input-panel"><h3>批量加载图片</h3><div class="ai-app-input-panel-body"><input id="wbFiles" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden>
      <button class="ai-app-upload vt-batch-upload" type="button" data-wb-upload data-wb-drop>${aiApplicationIcon('image')}<strong>${list.length?'继续添加图片':'多选上传或拖入多张图片'}</strong><small>JPG、PNG、WebP · 每张 50MB 以内</small><small>最多 ${MAX_FILES} 张</small></button>
      ${list.length?`<div class="vt-batch-toolbar"><span>已添加 ${list.length} 张</span><button class="vt-link" type="button" data-wb-select-all ${ready.length?'':'disabled'}>${ready.length&&ready.every(f=>f.selected)?'取消全选':'全选'}</button></div><div class="vt-file-list">${list.map(f=>`<div class="wb-file-row"><input type="checkbox" data-wb-check="${f.id}" ${f.selected?'checked':''} ${f.status!=='ready'?'disabled':''} aria-label="选择${esc(f.name)}"><button class="wb-thumbnail" type="button" data-wb-preview="${f.id}" ${f.status!=='ready'?'disabled':''} aria-label="预览${esc(f.name)}">${f.status==='ready'?`<img src="${esc(f.url)}" alt="${esc(f.name)}" loading="lazy">`:aiApplicationIcon('image')}</button><div class="vt-file-main"><button class="vt-file-open" type="button" data-wb-preview="${f.id}" ${f.status!=='ready'?'disabled':''} title="${esc(f.name)}"><strong>${esc(f.name)}</strong></button><small class="vt-file-description">${f.status==='ready'?`${f.width} × ${f.height} · ${(f.size/1024/1024).toFixed(1)} MB`:f.status==='reading'?'读取中…':esc(f.error)}</small><div class="vt-file-status-line"><span class="vt-file-status ${f.status==='failed'?'error':''}">${f.status==='ready'?'待生成':f.status==='reading'?'读取中':'读取失败'}</span></div></div><button class="vt-file-remove" type="button" data-wb-remove="${f.id}" aria-label="移除${esc(f.name)}">×</button></div>`).join('')}</div>`:''}
      </div></section><section class="ai-app-input-panel"><h3>统一输出设置</h3><div class="ai-app-input-panel-body">${app.fields.map(field=>`<div class="ai-app-field"><label class="ai-app-field-label" for="wbField-${field.key}">${esc(field.label)}</label><select id="wbField-${field.key}" data-wb-field="${field.key}">${field.options.map(value=>`<option ${state.values[field.key]===value?'selected':''}>${esc(value)}</option>`).join('')}</select></div>`).join('')}</div></section>
      <div class="vt-batch-summary"><span>已选 <strong>${selected().length}</strong> 张图片</span><span>背景：纯白</span></div><div class="vt-error" role="alert" ${message&&list.length?'':'hidden'}>${esc(message)}</div><div class="vt-actions vt-actions-single"><button class="vt-button primary" type="button" data-wb-start ${message?'disabled':''}>批量生成白底图${list.length?`（${selected().length}张）`:''}</button></div><p class="vt-ready-note">生成服务暂未开放</p>`;
  }
  function renderResults(){
    const container=q('.ai-app-results');let area=q('#wbResults');
    if(!area){area=document.createElement('div');area.id='wbResults';container.append(area);}
    area.hidden=!active();if(!active())return;
    container.querySelector('.ai-app-results-empty').hidden=true;
    q('#aiAppResultsTitle').textContent='生成结果';
    area.innerHTML=state.results.length?`<div class="vt-completed-toolbar"><span>已完成 ${state.results.length} 张白底图</span><button class="vt-button" type="button" data-wb-download-all>批量下载</button></div><div class="vt-completed-grid">${state.results.map(r=>`<article class="vt-completed-card"><button class="wb-result-cover" type="button" data-wb-result="${esc(r.id)}" aria-label="预览${esc(r.fileName)}"><img src="${esc(r.resultUrl)}" alt="${esc(r.fileName)}" loading="lazy"></button><div class="vt-completed-body"><strong title="${esc(r.fileName)}">${esc(r.fileName)}</strong><small>${r.width} × ${r.height}</small><div class="vt-completed-actions"><button class="vt-link" type="button" data-wb-result="${esc(r.id)}">预览</button><button class="vt-link" type="button" data-wb-download="${esc(r.id)}">下载</button></div></div></article>`).join('')}</div>`:`<div class="vt-completed-empty" role="status">${aiApplicationIcon('image')}<strong>暂无生成结果</strong><p>生成完成后，白底图会显示在这里。</p></div>`;
  }
  function closePreview(){q('#wbPreviewModal')?.close();state.previewId=null;}
  function dialog(){
    let modal=q('#wbPreviewModal');
    if(!modal){modal=document.createElement('dialog');modal.id='wbPreviewModal';modal.className='vt-modal vt-media-modal';modal.setAttribute('aria-labelledby','wbPreviewTitle');modal.addEventListener('cancel',closePreview);document.body.append(modal);}
    return modal;
  }
  function previewFile(id){
    const f=state.files.find(f=>f.id===id);if(!f||f.status!=='ready')return;
    state.previewId=id;const modal=dialog(),i=state.files.indexOf(f);
    modal.innerHTML=`<div class="vt-modal-heading"><div><h3 id="wbPreviewTitle">商品原图预览</h3><p>${esc(f.name)} · ${f.width} × ${f.height}</p></div><button class="vt-file-remove" type="button" data-wb-close aria-label="关闭">×</button></div><div class="wb-preview-image"><img src="${esc(f.url)}" alt="${esc(f.name)}"></div><div class="vt-modal-footer"><div><button class="vt-button" type="button" data-wb-neighbor="-1" ${state.files.slice(0,i).some(f=>f.status==='ready')?'':'disabled'}>上一张</button><button class="vt-button" type="button" data-wb-neighbor="1" ${state.files.slice(i+1).some(f=>f.status==='ready')?'':'disabled'}>下一张</button></div><button class="vt-button" type="button" data-wb-close>关闭</button></div>`;
    if(!modal.open)modal.showModal();
  }
  async function readImage(f){
    const image=new Image();let timer;
    try{return await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('读取超时，请重新添加')),15000);image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error('无法读取图片，请检查文件'));image.src=f.url;});}
    finally{clearTimeout(timer);image.onload=image.onerror=null;image.removeAttribute('src');}
  }
  async function loadFiles(input){
    const added=[];let skipped=0;
    for(const raw of Array.from(input||[])){
      if(state.files.length>=MAX_FILES||!/\.(png|jpe?g|webp)$/i.test(raw.name)||raw.size>MAX_BYTES||state.files.some(f=>f.name===raw.name&&f.size===raw.size&&f.lastModified===raw.lastModified)){skipped++;continue;}
      const f={id:uid(),raw,name:raw.name,size:raw.size,lastModified:raw.lastModified,url:URL.createObjectURL(raw),status:'reading',selected:true};state.files.push(f);added.push(f);
    }
    if(!added.length){showToast('未添加新图片，请检查格式、大小、重复文件或数量上限。');return;}
    if(active())renderEditor();
    for(const f of added){
      if(!state.files.includes(f))continue;
      try{const meta=await readImage(f);if(!meta.width||!meta.height)throw new Error('图片尺寸无效');if(state.files.includes(f))Object.assign(f,meta,{status:'ready'});}
      catch(e){if(state.files.includes(f)){f.status='failed';f.error=e.message;f.selected=false;URL.revokeObjectURL(f.url);f.url='';}}
      if(active())renderEditor();
    }
    if(skipped)showToast(`已添加 ${added.length} 张图片，另有 ${skipped} 张因格式、大小、重复或数量限制未添加。`);
  }
  function safeUrl(value){if(typeof value!=='string'||!value.trim())return null;try{const url=new URL(value,location.href);return ['http:','https:','blob:'].includes(url.protocol)?url.href:null;}catch{return null;}}
  function setCompletedResults(items){
    if(!Array.isArray(items))return;
    state.results=items.filter(r=>r&&r.status==='success'&&typeof r.id==='string'&&typeof r.fileName==='string'&&safeUrl(r.resultUrl)&&Number.isFinite(r.width)&&r.width>0&&Number.isFinite(r.height)&&r.height>0).map(r=>({...r,resultUrl:safeUrl(r.resultUrl)}));
    if(active())renderResults();
  }
  function previewResult(r){
    const modal=dialog();state.previewId=null;
    modal.innerHTML=`<div class="vt-modal-heading"><div><h3 id="wbPreviewTitle">白底图预览</h3><p>${esc(r.fileName)} · ${r.width} × ${r.height}</p></div><button class="vt-file-remove" type="button" data-wb-close aria-label="关闭">×</button></div><div class="wb-preview-image"><img src="${esc(r.resultUrl)}" alt="${esc(r.fileName)}"></div><div class="vt-modal-footer"><button class="vt-button" type="button" data-wb-close>关闭</button><button class="vt-button primary" type="button" data-wb-download="${esc(r.id)}">下载白底图</button></div>`;if(!modal.open)modal.showModal();
  }
  let downloading=false;
  async function download(list){
    if(downloading)return;downloading=true;
    try{for(const r of list){const response=await fetch(r.resultUrl);if(!response.ok)throw new Error('下载失败');const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=/\.(png|jpe?g)$/i.test(r.fileName)?r.fileName:r.fileName+(blob.type==='image/jpeg'?'.jpg':'.png');document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}}
    catch{showToast('下载未完成，请稍后重试。');}finally{downloading=false;}
  }
  const previousEditor=renderAiAppEditor;
  renderAiAppEditor=function(){closePreview();previousEditor();if(active())renderEditor();renderResults();};
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-wb-close]')){closePreview();return;}
    if(!active())return;
    if(event.target.closest('[data-wb-upload]')){q('#wbFiles').click();return;}
    const remove=event.target.closest('[data-wb-remove]');if(remove){const f=state.files.find(f=>f.id===remove.dataset.wbRemove);if(f){URL.revokeObjectURL(f.url);state.files=state.files.filter(item=>item!==f);}renderEditor();return;}
    if(event.target.closest('[data-wb-select-all]')){const ready=state.files.filter(f=>f.status==='ready'),value=!ready.every(f=>f.selected);ready.forEach(f=>f.selected=value);renderEditor();return;}
    const preview=event.target.closest('[data-wb-preview]');if(preview){previewFile(preview.dataset.wbPreview);return;}
    const neighbor=event.target.closest('[data-wb-neighbor]');if(neighbor&&state.previewId){const i=state.files.findIndex(f=>f.id===state.previewId),step=Number(neighbor.dataset.wbNeighbor),list=state.files.filter((f,n)=>(step>0?n>i:n<i)&&f.status==='ready'),next=step>0?list[0]:list.at(-1);if(next)previewFile(next.id);return;}
    if(event.target.closest('[data-wb-start]')){showToast('生成服务暂未开放，当前可批量上传图片并设置输出参数。');return;}
    const result=event.target.closest('[data-wb-result]');if(result){const r=state.results.find(r=>r.id===result.dataset.wbResult);if(r)previewResult(r);return;}
    const item=event.target.closest('[data-wb-download]');if(item){const r=state.results.find(r=>r.id===item.dataset.wbDownload);if(r)download([r]);return;}
    if(event.target.closest('[data-wb-download-all]'))download(state.results);
  });
  document.addEventListener('change',event=>{
    if(!active())return;
    if(event.target.id==='wbFiles'){loadFiles(event.target.files);return;}
    if(event.target.matches('[data-wb-check]')){const f=state.files.find(f=>f.id===event.target.dataset.wbCheck);if(f)f.selected=event.target.checked;renderEditor();}
    if(event.target.matches('[data-wb-field]')){const field=app.fields.find(f=>f.key===event.target.dataset.wbField);if(field?.options.includes(event.target.value))state.values[field.key]=event.target.value;}
  });
  document.addEventListener('dragover',event=>{const target=event.target.closest('[data-wb-drop]');if(active()&&target){event.preventDefault();target.classList.add('drag-over');}});
  document.addEventListener('dragleave',event=>{const target=event.target.closest('[data-wb-drop]');if(target&&!target.contains(event.relatedTarget))target.classList.remove('drag-over');});
  document.addEventListener('drop',event=>{const target=event.target.closest('[data-wb-drop]');if(active()&&target){event.preventDefault();target.classList.remove('drag-over');loadFiles(event.dataTransfer.files);}});
  window.addEventListener('beforeunload',()=>state.files.forEach(f=>URL.revokeObjectURL(f.url)));
  window.WhiteBackgroundFrontend=Object.freeze({buildIntents:()=>{const message=error();if(message)throw new Error(message);const batchId=uid();return selected().map(f=>({batchId,sourceId:f.id,fileName:f.name,operation:'white_background',parameters:{background:'#FFFFFF',ratio:state.values.ratio,format:state.values.format}}));},getSourceFiles:()=>selected().filter(f=>f.status==='ready').map(f=>({sourceId:f.id,file:f.raw})),setCompletedResults});
  if(active())renderAiAppEditor();
})();
