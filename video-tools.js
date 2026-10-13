/* 视频工具前端：左侧准备素材与参数，右侧仅展示完成结果。 */
(() => {
  'use strict';
  const tools=[
    {id:'video-removal',name:'字幕/水印去除',icon:'eraser',description:'选择字幕、水印或智能全消模式，支持多段视频批量处理。',videoTool:'removal'},
    {id:'video-enhance',name:'视频增强',icon:'expand',description:'批量提升视频清晰度，统一选择高清或超清输出。',videoTool:'enhance'}
  ].map(t=>({...t,group:'视频应用',category:'video',uploads:[],fields:[]}));
  aiApplications.splice(aiApplications.findIndex(a=>a.group==='视频应用'),0,...tools);
  const q=s=>document.querySelector(s),esc=escapeHtml,drafts=new Map(),completed=new Map();
  const MAX_FILES=20,MAX_BYTES=50*1024*1024;
  const uid=()=>crypto.randomUUID?.()||`vt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tool=()=>tools.find(t=>t.id===activeAiApplicationId);
  let modalState=null;
  function draft(app=tool()){
    if(!drafts.has(app.id))drafts.set(app.id,{mode:'all',model:'video_removal_std',resolution:'UPS_1080P',files:[],advanced:false});
    return drafts.get(app.id);
  }
  const selected=d=>d.files.filter(f=>f.selected);
  const formatTime=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const totalTime=d=>selected(d).reduce((n,f)=>n+(f.duration||0),0);
  function invalidFile(app,d,f){
    if(f.status==='reading')return '正在读取视频信息';
    if(f.status==='failed')return f.error;
    return '';
  }
  function batchError(app,d){
    const list=selected(d);if(!list.length)return '请选择需要处理的视频。';
    const f=list.find(f=>invalidFile(app,d,f));return f?`${f.name}：${invalidFile(app,d,f)}`:'';
  }
  const option=(key,value,title,subtitle,active)=>`<button type="button" class="vt-option ${active?'active':''}" data-vt-option="${key}" data-value="${value}" aria-pressed="${active}"><strong>${title}</strong><small>${subtitle}</small></button>`;
  function renderEditor(app){
    const d=draft(app),list=d.files,error=batchError(app,d);
    q('#aiAppEditor').innerHTML=`<div class="ai-app-editor-header"><div class="ai-app-editor-name">${aiApplicationIcon(app.icon)}<h2>${app.name}</h2></div><span class="vt-badge">批量处理</span></div><p class="ai-app-editor-description vt-description">${app.description}</p>
      <section class="ai-app-input-panel"><h3>批量上传视频</h3><div class="ai-app-input-panel-body"><input type="file" id="vtFile" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" multiple hidden>
        <button type="button" class="ai-app-upload vt-batch-upload" data-vt-upload data-vt-drop>${aiApplicationIcon('video')}<strong>${list.length?'继续添加视频':'多选上传或拖入多个视频'}</strong><small>最多 ${MAX_FILES} 个 · 每个 50MB 以内</small><small>MP4、MOV、WebM</small></button>
        ${list.length?`<div class="vt-batch-toolbar"><span>已添加 ${list.length} 个</span><button type="button" class="vt-link" data-vt-select-all>${list.filter(f=>f.status==='ready').every(f=>f.selected)?'取消全选':'全选'}</button></div><div class="vt-file-list">${list.map(f=>`<div class="vt-file-row"><input type="checkbox" data-vt-check="${f.id}" ${f.selected?'checked':''} ${f.status!=='ready'?'disabled':''} aria-label="选择${esc(f.name)}"><div class="vt-file-main"><button type="button" class="vt-file-open" data-vt-view="${f.id}" ${f.status!=='ready'?'disabled':''} title="${esc(f.name)}"><strong>${esc(f.name)}</strong></button><small class="vt-file-description">${f.status==='ready'?`${formatTime(f.duration)} · ${f.width} × ${f.height}`:f.status==='reading'?'读取中…':esc(f.error)}</small><div class="vt-file-status-line"><span class="vt-file-status ${f.status==='failed'?'error':''}">${f.status==='ready'?'待处理':f.status==='reading'?'读取中':'读取失败'}</span></div></div><button type="button" class="vt-file-remove" data-vt-remove="${f.id}" aria-label="移除${esc(f.name)}">×</button></div>`).join('')}</div>`:''}
      </div></section>
      <section class="ai-app-input-panel"><h3>${app.videoTool==='enhance'?'输出清晰度':'模式选择'}</h3><div class="ai-app-input-panel-body"><div class="vt-options ${app.videoTool==='removal'?'vt-modes':''}">${app.videoTool==='enhance'?option('resolution','UPS_1080P','1080P 高清','提升画面细节',d.resolution==='UPS_1080P')+option('resolution','UPS_2K','2K 超清','更高分辨率输出',d.resolution==='UPS_2K'):option('mode','subtitle','字幕去除','处理视频字幕',d.mode==='subtitle')+option('mode','watermark','水印去除','处理固定或移动水印',d.mode==='watermark')+option('mode','all','智能全消','字幕和水印一起去除',d.mode==='all')}</div>${app.videoTool==='enhance'?'<p class="vt-helper">保持每段视频的画面比例，统一使用所选清晰度。</p>':''}</div></section>
      ${app.videoTool==='enhance'?'':`<details class="vt-advanced" ${d.advanced?'open':''}><summary>高级设置<span>${d.model==='video_removal_std'?'效果优先':'速度优先'}</span></summary><div class="vt-options">${option('model','video_removal_std','效果优先','推荐 · 细致修复',d.model==='video_removal_std')}${option('model','video_removal_pro','速度优先','优先处理速度',d.model==='video_removal_pro')}</div></details>`}
      <div class="vt-batch-summary"><span>已选 <strong>${selected(d).length}</strong> 个视频</span><span>总时长 <strong>${formatTime(totalTime(d))}</strong></span></div><div id="vtError" class="vt-error" role="alert" ${error&&list.length?'':'hidden'}>${esc(error)}</div>
      <div class="vt-actions vt-actions-single"><button type="button" class="vt-button primary" data-vt-start ${error?'disabled':''}>开始批量处理${list.length?`（${selected(d).length}）`:''}</button></div><p class="vt-ready-note">处理服务暂未开放</p>`;
    q('.vt-advanced')?.addEventListener('toggle',event=>{d.advanced=event.target.open;});
  }
  function renderResults(app){
    const container=q('.ai-app-results');let area=q('#vtWorkbench');
    if(!area){area=document.createElement('div');area.id='vtWorkbench';container.append(area);}
    container.querySelector('.ai-app-results-empty').hidden=Boolean(app);area.hidden=!app;
    const ordinary=aiApplications.find(item=>item.id===activeAiApplicationId);
    q('#aiAppResultsTitle').textContent=app?'处理结果':ordinary?.purpose==='review'?'审核结果':'生成结果';
    if(!app){q('#aiAppResultsEmptyTitle').textContent=ordinary?.purpose==='review'?'暂无审核记录':'暂无生成记录';container.querySelector('.ai-app-results-empty p').textContent=ordinary?.purpose==='review'?'审核完成后，结果会显示在这里。':'生成完成后，结果会显示在这里。';return;}
    const results=completed.get(app.id)||[];
    area.innerHTML=results.length?`<div class="vt-completed-toolbar"><span>已完成 ${results.length} 个视频</span><button type="button" class="vt-button" data-vt-download-all>批量下载</button></div><div class="vt-completed-grid">${results.map(r=>`<article class="vt-completed-card"><button type="button" class="vt-result-cover" data-vt-result="${esc(r.id)}" aria-label="预览${esc(r.fileName)}"><video src="${esc(r.resultUrl)}" preload="metadata" muted playsinline></video><span>▶</span></button><div class="vt-completed-body"><strong title="${esc(r.fileName)}">${esc(r.fileName)}</strong><small>${formatTime(r.duration)} · ${r.width} × ${r.height}</small><div class="vt-completed-actions"><button type="button" class="vt-link" data-vt-result="${esc(r.id)}">预览</button><button type="button" class="vt-link" data-vt-download="${esc(r.id)}">下载</button></div></div></article>`).join('')}</div>`:`<div class="vt-completed-empty" role="status">${aiApplicationIcon('video')}<strong>暂无处理结果</strong><p>处理完成后，视频会显示在这里。</p></div>`;
  }
  function render(){const app=tool();if(app)renderEditor(app);renderResults(app);}
  function closeModal(){const dialog=q('#vtModal');dialog?.close();dialog?.querySelectorAll('video').forEach(v=>v.pause());modalState=null;}
  const oldEditor=renderAiAppEditor;
  renderAiAppEditor=function(){closeModal();const app=tool();if(app)renderEditor(app);else oldEditor();renderResults(app);};
  function modal(){let dialog=q('#vtModal');if(!dialog){dialog=document.createElement('dialog');dialog.id='vtModal';dialog.className='vt-modal vt-media-modal';dialog.setAttribute('aria-labelledby','vtModalTitle');dialog.addEventListener('cancel',closeModal);document.body.append(dialog);}return dialog;}
  function openFile(id){
    const app=tool(),d=draft(app),f=d.files.find(f=>f.id===id);if(!f||f.status!=='ready')return;
    modalState={appId:app.id,fileId:id};
    const dialog=modal();dialog.innerHTML=`<div class="vt-modal-heading"><div><h3 id="vtModalTitle">原视频预览</h3><p>${esc(f.name)} · ${formatTime(f.duration)} · ${f.width} × ${f.height}</p></div><button type="button" class="vt-file-remove" data-vt-close aria-label="关闭">×</button></div><div class="vt-stage" style="aspect-ratio:${f.width}/${f.height};width:min(100%,${480*f.width/f.height}px);margin-inline:auto"><video id="vtModalVideo" src="${esc(f.url)}" controls playsinline preload="metadata"></video></div><div class="vt-modal-footer"><div><button type="button" class="vt-button" data-vt-neighbor="-1" ${d.files.slice(0,d.files.indexOf(f)).some(item=>item.status==='ready')?'':'disabled'}>上一个</button><button type="button" class="vt-button" data-vt-neighbor="1" ${d.files.slice(d.files.indexOf(f)+1).some(item=>item.status==='ready')?'':'disabled'}>下一个</button></div><button type="button" class="vt-button" data-vt-close>关闭</button></div>`;
    if(!dialog.open)dialog.showModal();
  }
  async function readMetadata(f){
    const video=document.createElement('video');video.preload='metadata';let timer;
    try{return await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('读取超时，请重新添加')),15000);video.onloadedmetadata=()=>resolve({duration:video.duration,width:video.videoWidth,height:video.videoHeight});video.onerror=()=>reject(new Error('无法播放，请使用可播放的 MP4'));video.src=f.url;});}
    finally{clearTimeout(timer);video.onloadedmetadata=video.onerror=null;video.removeAttribute('src');video.load();}
  }
  async function loadFiles(input){
    const app=tool();if(!app)return;const d=draft(app),added=[];let skipped=0;
    for(const raw of Array.from(input||[])){
      if(d.files.length>=MAX_FILES||!/\.(mp4|mov|webm)$/i.test(raw.name)||raw.size>MAX_BYTES||d.files.some(f=>f.name===raw.name&&f.size===raw.size&&f.lastModified===raw.lastModified)){skipped++;continue;}
      const f={id:uid(),name:raw.name,size:raw.size,lastModified:raw.lastModified,raw,url:URL.createObjectURL(raw),selected:true,status:'reading'};d.files.push(f);added.push(f);
    }
    if(!added.length){showToast('未添加新视频，请检查格式、大小、重复文件或数量上限。');return;}
    if(tool()?.id===app.id)renderEditor(app);
    for(const f of added){
      if(!d.files.includes(f))continue;
      try{const meta=await readMetadata(f);if(!Number.isFinite(meta.duration)||meta.duration<=0||!meta.width||!meta.height)throw new Error('无法读取有效视频信息');if(d.files.includes(f))Object.assign(f,meta,{status:'ready'});}
      catch(e){if(d.files.includes(f)){f.status='failed';f.error=e.message;f.selected=false;URL.revokeObjectURL(f.url);f.url='';}}
      if(tool()?.id===app.id)renderEditor(app);
    }
    if(skipped)showToast(`已添加 ${added.length} 个视频，另有 ${skipped} 个未添加，请检查格式、大小、重复文件或数量上限。`);
  }
  // mode 是产品模式，后端接入时需单独适配，不作为供应商接口参数直接传入。
  function buildIntents(){
    const app=tool();if(!app)throw new Error('请选择视频工具');const d=draft(app),error=batchError(app,d);if(error)throw new Error(error);
    const batchId=uid();return selected(d).map(f=>({batchId,sourceId:f.id,appId:app.id,fileName:f.name,operation:app.videoTool==='enhance'?'video_upscale':'video_removal',...(app.videoTool==='removal'?{mode:d.mode,range:'all_area'}:{}),parameters:app.videoTool==='enhance'?{upscale_option:d.resolution}:{model:d.model,method:'all_area'}}));
  }
  function safeMediaUrl(value){if(typeof value!=='string'||!value.trim())return null;try{const url=new URL(value,location.href);return ['http:','https:','blob:'].includes(url.protocol)?url.href:null;}catch{return null;}}
  // 完成结果由后续处理服务提供；不在前端伪造任务或生成结果。
  function setCompletedResults(appId,items){
    if(!tools.some(app=>app.id===appId)||!Array.isArray(items))return;
    completed.set(appId,items.filter(r=>r&&r.status==='success'&&typeof r.id==='string'&&typeof r.fileName==='string'&&safeMediaUrl(r.resultUrl)&&Number.isFinite(r.duration)&&r.duration>0&&Number.isFinite(r.width)&&r.width>0&&Number.isFinite(r.height)&&r.height>0).map(r=>({...r,resultUrl:safeMediaUrl(r.resultUrl),originalUrl:r.originalUrl?safeMediaUrl(r.originalUrl):null})));
    if(tool()?.id===appId)renderResults(tool());
  }
  function openResult(r){
    const dialog=modal();modalState=null;
    dialog.innerHTML=`<div class="vt-modal-heading"><div><h3 id="vtModalTitle">结果预览</h3><p>${esc(r.fileName)}</p></div><button type="button" class="vt-file-remove" data-vt-close aria-label="关闭">×</button></div><div class="vt-comparison ${r.originalUrl?'':'single'}">${r.originalUrl?`<div><span>原视频</span><video src="${esc(r.originalUrl)}" controls playsinline preload="metadata"></video></div>`:''}<div><span>处理结果</span><video src="${esc(r.resultUrl)}" controls playsinline preload="metadata" ${r.originalUrl?'muted':''}></video></div></div><div class="vt-modal-footer"><small>${formatTime(r.duration)} · ${r.width} × ${r.height}</small><button type="button" class="vt-button primary" data-vt-download="${esc(r.id)}">下载结果</button></div>`;dialog.showModal();
  }
  let downloading=false;
  async function downloadResults(list){
    if(downloading)return;downloading=true;
    try{for(const r of list){const response=await fetch(r.resultUrl);if(!response.ok)throw new Error('下载失败');const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=r.fileName.endsWith('.mp4')?r.fileName:r.fileName+'.mp4';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}}
    catch{showToast('下载未完成，请稍后重试。');}finally{downloading=false;}
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-vt-close]')){closeModal();return;}
    const app=tool();if(!app)return;const d=draft(app);
    if(event.target.closest('[data-vt-upload]')){q('#vtFile').click();return;}
    const remove=event.target.closest('[data-vt-remove]');if(remove){const f=d.files.find(f=>f.id===remove.dataset.vtRemove);if(f){URL.revokeObjectURL(f.url);d.files=d.files.filter(item=>item!==f);}renderEditor(app);return;}
    const view=event.target.closest('[data-vt-view]');if(view){openFile(view.dataset.vtView);return;}
    if(event.target.closest('[data-vt-select-all]')){const list=d.files.filter(f=>f.status==='ready'),value=!list.every(f=>f.selected);list.forEach(f=>f.selected=value);renderEditor(app);return;}
    const setting=event.target.closest('[data-vt-option]');if(setting){d[setting.dataset.vtOption]=setting.dataset.value;renderEditor(app);return;}
    const neighbor=event.target.closest('[data-vt-neighbor]');if(neighbor&&modalState){const i=d.files.findIndex(f=>f.id===modalState.fileId),step=Number(neighbor.dataset.vtNeighbor),list=d.files.filter((f,n)=>(step>0?n>i:n<i)&&f.status==='ready'),next=step>0?list[0]:list.at(-1);if(next){q('#vtModalVideo')?.pause();openFile(next.id);}return;}
    if(event.target.closest('[data-vt-start]')){showToast('处理服务暂未开放，当前可上传视频并设置参数。');return;}
    const results=completed.get(app.id)||[],preview=event.target.closest('[data-vt-result]'),download=event.target.closest('[data-vt-download]');
    if(preview){const r=results.find(r=>r.id===preview.dataset.vtResult);if(r)openResult(r);return;}
    if(download){const r=results.find(r=>r.id===download.dataset.vtDownload);if(r)downloadResults([r]);return;}
    if(event.target.closest('[data-vt-download-all]'))downloadResults(results);
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='vtFile'){loadFiles(event.target.files);return;}
    if(event.target.matches('[data-vt-check]')&&tool()){const f=draft().files.find(f=>f.id===event.target.dataset.vtCheck);if(f)f.selected=event.target.checked;renderEditor(tool());}
  });
  document.addEventListener('dragover',event=>{const t=event.target.closest('[data-vt-drop]');if(t){event.preventDefault();t.classList.add('drag-over');}});
  document.addEventListener('dragleave',event=>{const t=event.target.closest('[data-vt-drop]');if(t&&!t.contains(event.relatedTarget))t.classList.remove('drag-over');});
  document.addEventListener('drop',event=>{const t=event.target.closest('[data-vt-drop]');if(t){event.preventDefault();t.classList.remove('drag-over');loadFiles(event.dataTransfer.files);}});
  window.addEventListener('beforeunload',()=>drafts.forEach(d=>d.files.forEach(f=>URL.revokeObjectURL(f.url))));
  window.VideoToolsFrontend=Object.freeze({buildIntents,getSourceFiles:()=>tool()?selected(draft()).filter(f=>f.status==='ready').map(f=>({sourceId:f.id,file:f.raw})):[],setCompletedResults});
  const saved=readNavigationState().aiApplicationId,aliases=['video-subtitle-remove','video-watermark-remove'];
  if(saved==='image-to-video'){activeAiApplicationId='qianchuan-video-review';saveNavigationState({aiApplicationId:activeAiApplicationId});}
  else if(aliases.includes(saved)){activeAiApplicationId='video-removal';saveNavigationState({aiApplicationId:activeAiApplicationId});}
  else if(tools.some(a=>a.id===saved))activeAiApplicationId=saved;
  else if(!aiApplications.some(a=>a.id===saved))activeAiApplicationId='video-removal';
  renderAiApplications();renderAiAppEditor();
})();
