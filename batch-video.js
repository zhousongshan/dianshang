/* 批量视频四步向导。文件与素材仅在浏览器内预览；链接解析、风险分析、生成均为模拟。 */
(() => {
  'use strict';
  const APP = 'batch-video', $ = (s, r = document) => r.querySelector(s);
  const esc = escapeHtml;
  const svg = (body, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const icons = {
    upload: svg('<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>'),
    folder: svg('<path d="M3 7h7l2 2h9v11H3Zm0 0V4h7l2 3"/>'),
    link: svg('<path d="m10 14 4-4m-6 6-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>'),
    product: svg('<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v10l9 5 9-5V8M12 13v10"/>',28),
    background: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',28),
    check: svg('<path d="m5 12 4 4L19 6"/>',16),
    play: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 8-12 8Z" fill="currentColor"/></svg>',
    arrow: svg('<path d="M4 12h16m-6-6 6 6-6 6"/>',17),
    plus: svg('<path d="M12 5v14M5 12h14"/>',18),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',14)
  };
  const btn = (text, action, extra = '') => `<button type="button" data-w-action="${action}" ${extra}>${text}</button>`;
  const modeName = () => state.mode === 'product' ? '换产品' : '换背景';
  const assetName = () => state.mode === 'product' ? '替换产品' : '新背景';
  let seq = 0;
  const uid = () => `bw-${Date.now().toString(36)}-${++seq}`;
  // Keep the approved mockups intact. Render just the photographic region inside each live UI control.
  const photos = {
    'photo:old':['modes',313,583,285,189], 'photo:mint':['modes',650,583,256,189],
    'photo:desk-cup':['modes',974,584,284,188], 'photo:garden':['modes',1335,584,281,188],
    'photo:hand':['risk',294,572,405,207], 'photo:product':['risk',737,572,386,207],
    'photo:candle':['table',679,535,75,61], 'photo:bag':['table',679,620,75,61],
    'photo:desk':['table',335,539,97,37], 'photo:commute':['table',336,619,112,42], 'photo:recommend':['table',336,708,112,41]
  };
  function picture(url,alt='') {
    const f=photos[url];
    if(!f)return `<img src="${esc(url)}" alt="${esc(alt)}">`;
    return `<svg class="bw-photo" role="img" aria-label="${esc(alt||'素材预览')}" viewBox="${f.slice(1).join(' ')}" preserveAspectRatio="xMidYMid slice"><image href="./batch-video-media/${f[0]}.png" width="1672" height="941"/></svg>`;
  }
  const samples = [
    {name:'手持开箱.mp4',duration:12,thumb:'photo:hand',risk:'high'},
    {name:'桌面展示.mp4',duration:8,thumb:'photo:desk',risk:'low'},
    {name:'通勤随拍.mp4',duration:10,thumb:'photo:commute',risk:'low'},
    {name:'好物推荐.mp4',duration:9,thumb:'photo:recommend',risk:'low'}
  ];
  const results = window.BatchVideoResults;
  function fresh() { return {step:1,maxStep:1,mode:'product',folderId:results.folders()[0].id,batchId:null,batchOwner:null,linksOpen:false,rows:[],selected:new Set(),linkText:'',notice:null,filter:'running',followResults:true,busy:0,started:false,epoch:0}; }
  let state = fresh(), modal = null, composing = false, pending = false;
  const owned = new Set();
  const active = () => activeAiApplicationId === APP;
  const ready = r => Boolean(r.assets[state.mode]);
  const terminal = r => ['done','cancelled'].includes(r.status);
  const getRow = id => state.rows.find(r=>r.id===id);
  const notify = (text, tone='info') => { state.notice={text,tone}; };
  const root = document.createElement('main'); root.id='batchVideoApp'; root.hidden=true; root.setAttribute('aria-label','批量视频四步制作'); $('.ai-app-workspace').append(root);
  const dialog=document.createElement('dialog'); dialog.className='bw-dialog'; document.body.append(dialog);
  const fileInput=document.createElement('input'); fileInput.type='file'; fileInput.hidden=true; fileInput.multiple=true; fileInput.accept='video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm'; document.body.append(fileInput);
  const imageInput=document.createElement('input'); imageInput.type='file'; imageInput.hidden=true; imageInput.accept='image/png,image/jpeg,image/webp'; document.body.append(imageInput);
  const namingCategories = () => Array.from($('#videoNamingCategory').options, option => option.value);
  const categoryOptions = selected => namingCategories().map(value => `<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(value)}</option>`).join('');
  function rowFrom(source) { return {id:uid(),source,category:$('#videoNamingCategory').value,assets:{product:null,background:null},notes:'',status:'ready',progress:0,run:0,analysis:null,versions:[]}; }
  function addSource(source) {
    if(state.rows.some(r=>r.source.key===source.key)) return false;
    state.rows.push(rowFrom(source)); return true;
  }
  function thumb(r) {
    const s=r.source;
    return `<span class="bw-thumb">${s.thumb?picture(s.thumb):s.kind==='link'?icons.link:icons.play}<i>${icons.play}</i>${s.duration?`<small>${Math.round(s.duration)}秒</small>`:''}</span>`;
  }
  function sourceLabel(r) { return r.source.kind==='sample'?'示例视频占位':r.source.kind==='link'?'抖音链接 · 未下载':r.source.kind==='asset'?'资产库视频':'本地视频'; }
  function media(r) {
    const s=r.source;
    if(s.url && ['file','asset'].includes(s.kind)) return `<video data-media="${r.id}" src="${esc(s.url)}" controls playsinline preload="metadata" aria-label="${esc(s.name)}"></video>`;
    return `<div class="bw-video-placeholder">${s.thumb?picture(s.thumb):icons.link}<span>${s.kind==='link'?'链接占位 · 演示不下载':s.kind==='asset'?'素材库示例 · 无视频文件':'示例视频占位'}</span></div>`;
  }
  const footer = (left,right) => `<footer class="bw-footer"><div>${left}</div><div class="bw-footer-right">${right}</div></footer>`;
  function stepper() {
    return `<nav class="bw-stepper" aria-label="制作步骤">${['选择模式','添加视频','配置替换','制作与结果'].map((name,i)=>{
      const n=i+1,complete=n<state.step;
      return `${i?'<span class="bw-step-line"></span>':''}<button type="button" data-w-action="step" data-step="${n}" class="bw-step ${n===state.step?'current':''} ${complete?'complete':''}" ${n===state.step?'aria-current="step"':''} ${state.started||n>state.maxStep?'disabled':''}><span>${complete?icons.check:n}</span><b>${name}</b></button>`;
    }).join('')}</nav>`;
  }
  function modeView() {
    const cards=[['product','换产品','替换视频中的产品，保留原有背景'],['background','换背景','替换视频背景，保留原有产品']];
    return `<section class="bw-panel bw-mode"><div class="bw-center"><h2>你想替换什么？</h2><p>本次批量制作使用同一种替换方式</p></div><div class="bw-mode-grid">${cards.map(([k,name,desc])=>`<button type="button" class="bw-mode-card ${state.mode===k?'chosen':''}" data-w-action="mode" data-mode="${k}" aria-pressed="${state.mode===k}"><span class="bw-mode-top"><span class="bw-mode-icon">${icons[k]}</span><span><strong>${name}</strong><small>${desc}</small></span>${state.mode===k?`<i class="bw-mode-check">${icons.check}</i>`:''}</span><span class="bw-mode-pictures"><span>${picture(k==='product'?'photo:old':'photo:desk-cup','原素材')}<em>${k==='product'?'原产品':'原背景'}</em></span><b>${icons.arrow}</b><span>${picture(k==='product'?'photo:mint':'photo:garden','替换示意')}<em>${k==='product'?'你的产品':'新背景'}</em></span></span></button>`).join('')}</div>${footer(`<span>已选择：<b class="bw-purple">${modeName()}</b></span>`,btn(`下一步：添加视频 ${icons.arrow}`,'next','class="bw-button primary"'))}</section>`;
  }
  const personalVideoIds = new WeakMap();
  function personalVideos() {
    if (typeof mockVideos === 'undefined') return [];
    return mockVideos.filter(item => !item.deleted).map(item => {
      if (!personalVideoIds.has(item)) personalVideoIds.set(item, `personal:${uid()}`);
      return { id: personalVideoIds.get(item), name: item.name, url: item.previewUrl || '',
        duration: parseFloat(item.duration) || 0, favorite: Boolean(item.favorite), scope: 'personal',
        path: item.previewUrl ? '我的素材' : '我的素材 · 示例占位' };
    });
  }
  function videoLibraryData() {
    const data = window.PublicAssets?.getBatchVideoVideos?.();
    const shared = (data?.videos || []).map(item => ({ ...item, scope: 'public' }));
    return { loaded: data?.loaded ?? true, items: [...personalVideos(), ...shared] };
  }
  function addVideoMenu(replace = false) {
    const option = (icon, title, hint, action, extra = '') => btn(
      `<span class="image-source-icon">${icon}</span><span><b>${title}</b><small>${hint}</small></span>`, action, extra
    );
    return `<details class="bw-add-menu"><summary class="bw-button ${replace ? 'outline' : 'primary'}">${replace ? '更换参考视频' : `${icons.plus}添加参考视频`} <span aria-hidden="true">⌄</span></summary>
      <div class="image-source-menu bw-upload-options">
        ${option(icons.upload, '本地上传', replace ? '选择这条任务的新参考视频' : '从电脑选择一个或多个视频', 'upload-video', state.busy ? 'disabled' : '')}
        ${option(icons.folder, '从素材库选择', '从我的素材、我的收藏或公共素材中选择', 'video-library')}
        ${option(icons.link, '粘贴抖音链接', replace ? '使用一个抖音链接或分享文字' : '支持分享文字，一行一条', 'toggle-links')}
      </div></details>`;
  }
  function linkEditor(text, editing = false) {
    const inputId = editing ? 'bwEditLink' : 'bwLinks';
    const label = editing ? '抖音链接或分享文字' : '抖音链接或分享文字，一行一条';
    const binding = editing ? 'data-modal-input="link"' : 'data-w-input="links"';
    return `<div class="bw-links"><label for="${inputId}">${label}</label><textarea id="${inputId}" ${binding} rows="2" placeholder="https://v.douyin.com/…">${esc(text)}</textarea><div><span>链接解析为本地模拟</span><div class="bw-actions">${btn('收起','close-links','class="bw-button text"')}${btn(editing ? '使用此链接' : '加入清单','add-links','class="bw-button primary"')}</div></div></div>`;
  }
  function sourcesView() {
    const hasRows = state.rows.length > 0;
    const linkPanel = state.linksOpen ? linkEditor(state.linkText) : '';
    const rows = state.rows.map(r => `<div class="bw-source-row">${btn(thumb(r),'preview',`data-id="${r.id}" class="bw-media-button" aria-label="预览${esc(r.source.name)}"`)}<div class="bw-source-title"><strong>${esc(r.source.name)}</strong><small>${sourceLabel(r)}</small></div><span class="bw-duration">${r.source.duration?`${Math.round(r.source.duration)}秒`:'—'}</span><span class="bw-ready">${icons.check}已添加</span>${btn('×','remove',`data-id="${r.id}" class="bw-x" aria-label="移除${esc(r.source.name)}"`)}</div>`).join('');
    const list = hasRows ? `<div class="bw-source-list">${rows}</div>` : '';
    const empty = !hasRows && !state.linksOpen ? `<div class="bw-import-empty">${addVideoMenu()}<small>或直接拖入视频文件 · MP4、MOV、WebM</small></div>` : '';
    return `<section class="bw-panel" data-video-drop><div class="bw-panel-head"><h2>参考视频${hasRows ? ` <small>（${state.rows.length}）</small>` : ''}</h2>
      <div class="bw-actions">${btn('添加 4 条示例','samples','class="bw-button text"')}${hasRows || state.linksOpen ? addVideoMenu() : ''}</div></div>
      ${empty}${linkPanel}${state.busy ? '<p class="bw-import-status" role="status">正在读取视频…</p>' : ''}${list}
      ${footer(btn('上一步','back','class="bw-button"'),btn(`下一步：配置替换 ${icons.arrow}`,'next',`class="bw-button primary" ${!hasRows||state.busy?'disabled':''}`))}</section>`;
  }
  function configView() {
    const destinations = results.folders();
    if (!destinations.some(folder => folder.id === state.folderId)) state.folderId = destinations[0].id;
    const missing=state.rows.filter(r=>!ready(r)).length;
    const destination = `<label class="bw-folder-field">${icons.folder}<strong>成片保存位置</strong>
      <select data-w-change="folder" aria-label="保存文件夹">${destinations.map(folder=>`<option value="${esc(folder.id)}" ${state.folderId===folder.id?'selected':''}>${esc(folder.name)}</option>`).join('')}</select></label>`;
    return `<section class="bw-panel bw-config-panel"><div class="bw-panel-head"><h2>为每条视频选择${assetName()}</h2></div>
      <div class="bw-config-toolbar">${destination}<div class="bw-actions">${btn(`批量设置${state.mode==='product'?'产品':'背景'}`,'bulk-asset',`class="bw-button outline" ${!state.selected.size?'disabled':''}`)}${btn('批量设置分类','bulk-category',`class="bw-button outline" ${!state.selected.size?'disabled':''}`)}${btn('批量填写要求','bulk-notes',`class="bw-button outline" ${!state.selected.size?'disabled':''}`)}</div></div>
      <div class="bw-config-meta"><span>${state.selected.size?`已选 ${state.selected.size} 条`: `共 ${state.rows.length} 条视频`}</span><span>${missing?`${missing} 条待选择素材`:'全部已就绪'}</span></div>
      <div class="bw-table-scroll"><table class="bw-config-table"><thead><tr><th><input type="checkbox" data-w-change="select-all" aria-label="全选视频" ${state.rows.length&&state.selected.size===state.rows.length?'checked':''}></th><th>参考视频</th><th>状态</th><th>${assetName()}</th><th>视频命名分类</th><th>特殊要求 <small>（选填）</small></th></tr></thead><tbody>${state.rows.map(r=>{const a=r.assets[state.mode];return `<tr class="${state.selected.has(r.id)?'selected':''}"><td><input type="checkbox" data-w-change="select" data-id="${r.id}" aria-label="选择${esc(r.source.name)}" ${state.selected.has(r.id)?'checked':''}></td><td>${btn(`${thumb(r)}<strong>${esc(r.source.name)}</strong>`,'preview',`data-id="${r.id}" class="bw-ref-button"`)}</td><td><span class="${a?'bw-ready':'bw-pending'}">${a?icons.check:''}${a?'已就绪':'待配置'}</span></td><td>${btn(a?`${picture(a.url,a.name)}<span>${esc(a.name)}</span><em>更换</em>`:`${icons.plus}<span>选择${state.mode==='product'?'产品图':'背景图'}</span>`,'choose-asset',`data-id="${r.id}" class="bw-asset-button ${a?'filled':''}" aria-label="${esc(r.source.name)}的${assetName()}"`)}</td><td><select class="bw-category" data-w-change="category" data-id="${r.id}" aria-label="${esc(r.source.name)}的视频命名分类">${categoryOptions(r.category)}</select></td><td><textarea rows="2" maxlength="1000" data-w-input="notes" data-id="${r.id}" aria-label="${esc(r.source.name)}的特殊要求" placeholder="填写这条视频的特殊要求">${esc(r.notes)}</textarea></td></tr>`;}).join('')}</tbody></table></div>
      ${footer(btn('上一步','back','class="bw-button"'),`<span>${missing?`还有 ${missing} 条待配置`:`${state.rows.length} 条视频已就绪`}</span>${btn(`开始制作 ${state.rows.length} 条 ${icons.arrow}`,'start',`class="bw-button primary" ${missing||!state.rows.length?'disabled':''}`)}`)}</section>`;
  }
  function counts() { return {running:state.rows.filter(r=>['queued','analyzing','approved','generating'].includes(r.status)).length,confirm:state.rows.filter(r=>['blocked','failed'].includes(r.status)).length,done:state.rows.filter(r=>r.status==='done').length,cancelled:state.rows.filter(r=>r.status==='cancelled').length}; }
  function resultView() {
    const c=counts(),finished=state.rows.filter(r=>r.status==='done').length;
    const list=state.rows.filter(r=>state.filter==='running'?['queued','analyzing','approved','generating'].includes(r.status):state.filter==='confirm'?['blocked','failed'].includes(r.status):r.status===state.filter);
    return `<section class="bw-progress-summary"><div><strong>已完成 ${finished} / ${state.rows.length} 条</strong>${state.rows.some(r=>r.status==='cancelled')?`<small>已取消 ${state.rows.filter(r=>r.status==='cancelled').length} 条</small>`:''}</div><div class="bw-progress-track" role="progressbar" aria-label="本批处理进度" aria-valuemin="0" aria-valuemax="${state.rows.length}" aria-valuenow="${c.done+c.cancelled}"> <i style="width:${state.rows.length?(c.done+c.cancelled)/state.rows.length*100:0}%"></i></div><p>${c.confirm?'高风险或异常任务等待处理，其余任务继续制作':c.running?'正在分析与制作，你可以留在这里查看进度':'本批任务已处理完毕'}</p></section>
      <div class="bw-result-tabs" role="tablist" aria-label="制作状态">${[['running','制作中'],['confirm','需确认'],['cancelled','已取消'],['done','已完成']].map(([k,name])=>`<button type="button" role="tab" aria-selected="${state.filter===k}" data-w-action="filter" data-filter="${k}" class="${state.filter===k?'on':''}">${name}<b class="${k==='confirm'&&c[k]?'amber':''}">${c[k]}</b></button>`).join('')}<span></span>${state.filter==='done'&&finished?btn('导出任务清单','export','class="bw-button text"'):''}</div>
      <div class="bw-results">${(list.length && ['confirm','cancelled','done'].includes(state.filter) ? resultTable(list, state.filter) : list.map(r=>runningCard(r)).join(''))||`<section class="bw-panel bw-empty"><span>${state.filter==='running'?'✓':state.filter==='confirm'?'✓':'○'}</span><h3>${state.filter==='running'?'当前没有执行中的任务':state.filter==='confirm'?'没有需要确认的任务':state.filter==='cancelled'?'没有已取消的任务':'视频制作完成后会显示在这里'}</h3><p>${state.filter==='running'&&c.confirm?'请到「需确认」处理高风险任务':state.filter==='running'&&finished?'切换「已完成」查看结果':'状态会自动更新'}</p>${state.filter==='running'&&(c.confirm||c.done)?btn(c.confirm?'查看需确认':'查看已完成','filter',`data-filter="${c.confirm?'confirm':'done'}" class="bw-button primary"`):''}</section>`}</div>
      <div class="bw-result-foot">${btn('再做一批','new',`class="bw-button" ${c.running||c.confirm?'disabled title="处理完当前任务后可新建"':''}`)}</div>`;
  }
  function runningCard(r) {
    const label={queued:'等待分析',analyzing:'分析中',approved:'等待制作',generating:'制作中'}[r.status];
    return `<article class="bw-running-row">${thumb(r)}<div><strong>${esc(r.source.name)}</strong><small>${assetName()}：${esc(r.assets[state.mode]?.name||'')}</small></div><div class="bw-row-progress"><span>${label}${r.status==='generating'?` ${r.progress}%`:''}</span><div class="bw-progress-track"><i class="${r.status==='analyzing'?'pulsing':''}" style="width:${r.status==='generating'?r.progress:r.status==='analyzing'?35:0}%"></i></div></div><span class="bw-sim">模拟</span></article>`;
  }
  function resultTable(rows, filter) {
    const completed = filter === 'done';
    const caption = completed ? '已完成的任务' : filter==='cancelled'?'已取消的任务':'需要确认的任务';
    const resultHeading = filter==='confirm' ? '分析结果' : '制作结果';
    return `<div class="bw-review-scroll"><table class="bw-review-table"><caption class="bw-sr-only">${caption}</caption><thead><tr><th>${completed?'成片视频':'参考视频'}</th><th>${assetName()}</th><th>其他要求</th><th>${resultHeading}</th><th>操作</th></tr></thead><tbody>${rows.map(row => resultTableRow(row, completed)).join('')}</tbody></table></div>`;
  }
  function resultTableRow(row, completed) {
    const asset = row.assets[state.mode];
    const rowId = `data-id="${row.id}"`;
    const result = completed ? completedCells(row, rowId) : row.status==='cancelled'?cancelledCells(row):reviewCells(row, rowId);
    const version = completed ? row.versions.at(-1) : null;
    const preview = completed ? `<span class="bw-thumb">${picture(asset.url, asset.name)}<i>${icons.play}</i></span>` : thumb(row);
    return `<tr><td>${btn(`${preview}<span><strong>${esc(version?.name || row.source.name)}</strong><small>${completed?'点击预览成片':sourceLabel(row)}</small></span>`, completed?'play-result':'preview', `${rowId} class="bw-review-reference"`)}</td>
      <td><div class="bw-review-asset">${picture(asset.url,asset.name)}<span>${esc(asset.name)}</span></div></td>
      <td class="bw-review-notes">${row.notes ? esc(row.notes) : '<span class="bw-muted">—</span>'}</td>${result}</tr>`;
  }
  function completedCells(row, rowId) {
    const version = row.versions.at(-1);
    const favorite = results.favoriteState(version.id);
    const favoriteAction = btn(favorite ? '取消收藏' : '收藏', 'favorite-result',
      `${rowId} data-version="${esc(version.id)}" class="bw-action-edit" ${favorite === null ? 'disabled' : ''}`);
    return `<td><span class="bw-review-state completed">已完成 · V${version.version}</span><div class="bw-review-reasons"><small>已保存到 ${esc(version.folder)}</small></div></td>
      <td><div class="bw-review-actions">${favoriteAction}${btn('调整后重做','redo',`${rowId} class="bw-action-edit"`)}${downloadLink(version, true)}</div></td>`;
  }
  function reviewCells(row, rowId) {
    const failed = row.status === 'failed';
    const reasons = row.analysis?.reasons || ['请检查素材并重新分析'];
    return `<td><span class="bw-review-state ${failed?'failed':''}">${failed?'处理失败':'高风险'}</span><div class="bw-review-reasons">${reasons.map(reason=>`<small>${esc(reason)}</small>`).join('')}</div></td>
      <td><div class="bw-review-actions">${btn(failed?'重新分析':'确认并制作',failed?'retry':'approve',`${rowId} class="bw-action-main"`)}${btn('修改素材或要求','edit-risk',`${rowId} class="bw-action-edit"`)}${btn('取消任务','cancel-task',`${rowId} class="bw-action-skip"`)}</div></td>`;
  }
  function cancelledCells(row) {
    const version=row.versions.at(-1);
    return `<td><span class="bw-review-state neutral">已取消</span>${version?`<div class="bw-review-reasons"><small>已保留 V${version.version} 成片</small></div>`:''}</td><td><div class="bw-review-actions">${version?downloadLink(version,true):'—'}</div></td>`;
  }
  function downloadLink(version, compact = false) {
    return `<a class="${compact ? 'bw-action-download' : 'bw-button'}" href="${esc(version.url)}" download="${esc(version.name)}.webm">${compact ? '下载' : '下载演示视频'}</a>`;
  }
  function playerBody(version) {
    return `<video class="bw-result-player" src="${esc(version.url)}" controls autoplay playsinline aria-label="播放演示成片"></video><p class="bw-help">本地演示短片 · ${esc(version.assetName)} · V${version.version} · 我的素材 / ${esc(version.folder)}</p>`;
  }
  function finishVersion(r,run) {
    const version=r.versions.length + 1;
    const asset=r.assets[state.mode];
    const record={id:uid(),rowId:r.id,batch:state.batchId,owner:state.batchOwner,folder:state.folderName,folderId:state.folderId,created:Date.now(),version,
      name:`${r.source.name.replace(/\.[^.]+$/,'')} · ${r.category} · 复刻 V${version}`,category:r.category,sourceName:r.source.name,assetName:asset.name,notes:r.notes,mode:modeName()};
    results.finish(record,asset,photos[asset.url],saved=>{
      if(r.run!==run||r.status!=='generating')return;
      r.versions.push(saved);r.versionSources ||= new Map();r.versionSources.set(saved.id,r.source);r.completedSettings={asset:{...asset},notes:record.notes,source:r.source};state.notice=null;r.progress=100;r.status='done';pump();
      if(state.followResults&&!counts().running&&!counts().confirm)state.filter='done';
      render();
    },reason=>{
      if(r.run!==run)return;
      r.status='failed';r.analysis={reasons:[reason]};state.filter='confirm';pump();render();
    });
  }
  function render() {
    if(!active())return;
    if(composing){pending=true;return;}
    const oldFocus=document.activeElement; let focusId=null,range=null;
    if(root.contains(oldFocus)&&oldFocus.dataset.wInput){focusId=[oldFocus.dataset.wInput,oldFocus.dataset.id];try{range=[oldFocus.selectionStart,oldFocus.selectionEnd];}catch{}}
    const previousTable = $('.bw-table-scroll',root);
    const tableScroll = previousTable && [previousTable.scrollLeft, previousTable.scrollTop];
    const videos=new Map([...root.querySelectorAll('video[data-media]')].map(v=>[v.dataset.media,v]));
    root.innerHTML=`<header class="bw-page-head"><div><h1>批量视频</h1><p>参考视频换产品、换背景，整批制作更简单</p></div></header>${stepper()}${state.step>1&&state.step<4?`<div class="bw-mode-pill">模式：${modeName()}</div>`:''}${state.notice?`<div class="bw-notice ${state.notice.tone}" role="status"><span>${esc(state.notice.text)}</span>${btn('×','dismiss','class="bw-x" aria-label="关闭提示"')}</div>`:''}${[null,modeView,sourcesView,configView,resultView][state.step]()}`;
    root.querySelectorAll('video[data-media]').forEach(v=>{const old=videos.get(v.dataset.media);if(old&&old.getAttribute('src')===v.getAttribute('src'))v.replaceWith(old);});
    const table = $('.bw-table-scroll',root);
    if(table && tableScroll){table.scrollLeft=tableScroll[0];table.scrollTop=tableScroll[1];}
    if(focusId){const el=[...root.querySelectorAll('[data-w-input]')].find(e=>e.dataset.wInput===focusId[0]&&e.dataset.id===focusId[1]);if(el){el.focus({preventScroll:true});if(range&&range[0]!=null)el.setSelectionRange(...range);}}
  }
  function go(n) {state.step=n;state.maxStep=Math.max(n,state.maxStep);state.notice=null;render();root.scrollIntoView({block:'start',behavior:'instant'});}
  function validateLinks(text) {
    const links=[],bad=[];
    text.split(/\n+/).map(s=>s.trim()).filter(Boolean).forEach(line=>{
      const match=line.match(/https?:\/\/[^\s<>"，。！？]+/);
      try {const u=new URL((match?.[0]||'').replace(/[),;；）]+$/,''));if(u.protocol!=='https:'||!(u.hostname==='douyin.com'||u.hostname.endsWith('.douyin.com'))||u.pathname==='/')throw Error();u.hash='';links.push(u.href);}catch{bad.push(line);}
    });return {links,bad};
  }
  function addLinks() {
    const {links,bad}=validateLinks(state.linkText);let count=0,dup=0;
    links.forEach(link=>{if(addSource({kind:'link',key:`link:${link}`,link,name:`抖音视频 ${String(state.rows.length+1).padStart(2,'0')}`}))count++;else dup++;});
    if(count){state.linkText=bad.join('\n');state.linksOpen=bad.length>0;}
    notify(count?`已添加 ${count} 条${dup?`，忽略 ${dup} 条重复链接`:''}${bad.length?`；${bad.length} 行无效，请检查`:''}。链接内容将在此原型中模拟解析。`:dup&&!bad.length?'这些链接已经添加过了。':'未识别到有效的抖音链接，请检查网址。',count?'success':'error');render();
  }
  function later(fn,ms) {const epoch=state.epoch;setTimeout(()=>{if(state.epoch===epoch)fn();},ms);}
  function start() {
    if(state.started||state.busy||!state.rows.length||state.rows.some(r=>!ready(r)))return;
    const destinations = results.folders();
    const destination = destinations.find(folder => folder.id === state.folderId) || destinations[0];
    state.folderId = destination.id;
    state.folderName = destination.name;
    state.started=true;state.batchId=uid();state.batchOwner=results.owner();state.selected.clear();state.rows.forEach(r=>{r.status='queued';r.progress=0;});state.filter='running';go(4);pump();render();
  }
  function pump() {
    const max=3;
    let free=max-state.rows.filter(r=>r.status==='analyzing').length;
    state.rows.filter(r=>r.status==='queued').slice(0,Math.max(0,free)).forEach(r=>{
      r.status='analyzing';const run=++r.run;
      later(()=>{
        if(r.run!==run||r.status!=='analyzing')return;
        const high=r.source.risk==='high'||(!r.source.risk&&state.rows.indexOf(r)%4===0);
        r.analysis={risk:high?'high':'low',reasons:state.mode==='product'?['手部遮挡产品，边缘可能出现穿帮','快速转场时，产品 logo 可能变形']:['主体边缘与背景接近，发丝或细节可能丢失','镜头移动时，光影衔接可能不自然']};
        r.status=high?'blocked':'approved';if(high&&state.followResults)state.filter='confirm';pump();render();
      },1100+state.rows.indexOf(r)%3*350);
    });
    free=max-state.rows.filter(r=>r.status==='generating').length;
    state.rows.filter(r=>r.status==='approved').slice(0,Math.max(0,free)).forEach(r=>{
      r.status='generating';r.progress=0;const run=++r.run;
      const tick=()=>{if(r.run!==run||r.status!=='generating')return;r.progress=Math.min(100,r.progress+20);if(r.progress===100){r.progress=99;finishVersion(r,run);}else later(tick,850);render();};later(tick,850);
    });
  }
  function openModal(data) {modal=data;drawModal();if(!dialog.open)dialog.showModal();}
  function closeModal(){dialog.close();modal=null;}
  function libraryScopes(m) {
    return `<div class="bw-picker-tabs">${[['personal','我的素材'],['favorites','我的收藏'],['public','公共素材']].map(([scope,name])=>btn(name,'modal-scope',`data-scope="${scope}" class="${m.scope===scope?'on':''}"`)).join('')}</div>`;
  }
  function videoLibraryTiles() {
    const lib=videoLibraryData(), kw=(modal.search||'').trim().toLowerCase();
    const items=lib.items.filter(item => item.name.toLowerCase().includes(kw) &&
      (modal.scope==='favorites' ? item.scope==='personal' && item.favorite : item.scope===modal.scope));
    const tiles=items.map(item=>{
      const picked=modal.picked.has(item.id);
      return `<button type="button" aria-pressed="${picked}" data-modal-action="toggle-video" data-id="${esc(item.id)}" class="bw-library-tile ${picked?'picked':''}"><span class="bw-library-video">${icons.play}</span><strong>${esc(item.name)}</strong><small>${esc(item.path||'资产库')}${picked?' · 已选择':''}</small></button>`;
    });
    const empty=kw?'没有匹配的素材':modal.scope==='public'&&!lib.loaded?'素材库正在加载，请稍后刷新':'当前分类没有可选视频';
    return `<input class="bw-search" data-modal-input="search" value="${esc(modal.search||'')}" placeholder="搜索素材名称" aria-label="搜索素材名称"><div class="bw-library-grid">${tiles.join('')||`<div class="bw-empty small">${empty}</div>`}</div>`;
  }
  function redoChanged(draft,row) {
    return draft.source.key !== row.source.key || draft.asset?.id !== row.assets[state.mode]?.id || draft.notes.trim() !== row.notes.trim();
  }
  function openTaskEditor(row,type) {
    openModal({type,rowId:row.id,ids:[row.id],asset:row.assets[state.mode],source:row.source,
      notes:row.notes,linkOpen:false,linkText:'',busy:false});
  }
  function videoSourceFromAsset(item) {
    return {kind:'asset',key:`asset:${item.id}`,name:item.name,url:item.url,duration:item.duration};
  }
  function editorReference(draft) {
    return `<section class="bw-edit-field"><h3>参考视频</h3><div class="bw-edit-source">${thumb(draft)}<span class="bw-edit-name"><strong>${esc(draft.source.name)}</strong><small>${sourceLabel(draft)}</small></span>${addVideoMenu(true)}</div>${draft.linkOpen?linkEditor(draft.linkText,true):''}${draft.busy?'<small role="status">正在读取本地视频…</small>':''}</section>`;
  }
  function canApply(draft,row) {
    if(!draft.asset || draft.busy || (draft.linkOpen && draft.linkText.trim()))return false;
    return redoChanged(draft,row);
  }
  function drawModal() {
    if(!modal)return;
    if (dialog.querySelector("#imageSourceMenu")) closeImageSourceMenu();
    const m=modal,r=m.rowId?getRow(m.rowId):null;
    let title='',body='',foot='';
    if(m.type==='player') {
      const versions=m.versions, v=versions.find(item=>item.id===m.versionId)||versions.at(-1);
      title=v.name;
      const versionRow=r ? {...r,source:r.versionSources?.get(v.id) || r.source} : null;
      const sourceSwitch=r?`<div class="bw-picker-tabs">${btn('成片预览','view-output',`class="${m.showSource?'':'on'}"`)}${btn('参考视频','view-source',`class="${m.showSource?'on':''}"`)}</div>`:'';
      body=sourceSwitch+(m.showSource&&r?`<div class="bw-preview-single">${media(versionRow)}</div><p class="bw-help">${sourceLabel(versionRow)}</p>`:playerBody(v))+(versions.length>1?`<label>查看版本 <select data-modal-version>${versions.map(item=>`<option value="${esc(item.id)}" ${item.id===v.id?'selected':''}>V${item.version}</option>`).join('')}</select></label>`:'');
      foot=`${downloadLink(v)}${btn('关闭','modal-close','class="bw-button"')}`;
    } else if(m.type==='video-library') {
      title='从素材库选择视频';
      body=libraryScopes(m)+videoLibraryTiles();foot=`<span>已选 ${m.picked.size} 条</span>${btn('刷新列表','modal-refresh','class="bw-button"')}${btn(m.parent?'使用选中视频':`添加 ${m.picked.size} 条`,'modal-add-videos',`class="bw-button primary" ${!m.picked.size?'disabled':''}`)}`;
    } else if(['edit','redo'].includes(m.type)) {
      title=m.type==='redo'?`调整后重做 · ${r.source.name}`:'修改素材或要求';
      const selection=m.asset ? `<div class="bw-edit-asset">${picture(m.asset.url,m.asset.name)}<strong>${esc(m.asset.name)}</strong>${btn('更换素材','redo-material','class="bw-button outline"')}</div>` : '';
      body=editorReference(m);
      body+=`<section class="bw-edit-field"><h3>${assetName()}</h3>${selection}</section>`;
      body+=`<label class="bw-edit-field bw-edit-notes"><h3>其他要求 <small>选填</small></h3><textarea maxlength="1000" data-modal-input="notes" rows="2" placeholder="例如：保持标签清晰，保留原视频的手部动作">${esc(m.notes)}</textarea></label>`;
      const submit=m.type==='redo'?`重做这一条 · V${r.versions.length+1}`:'保存并重新分析';
      foot=`<span>仅应用到当前任务</span>${btn('取消','modal-close','class="bw-button"')}${btn(submit,'modal-apply',`class="bw-button primary" ${canApply(m,r)?'':'disabled'}`)}`;
    } else if(m.type==='category') {
      title='批量设置视频命名分类';
      body=`<label>视频命名分类 <select class="bw-category" data-modal-category><option value="">选择分类</option>${categoryOptions(m.category)}</select></label>`;
      foot=`<span>仅应用到已选 ${m.ids.length} 条视频</span>${btn('取消','modal-close','class="bw-button"')}${btn('应用到所选视频','apply-category','class="bw-button primary" disabled')}`;
    } else if(m.type==='notes') {
      title='批量填写特殊要求';body=`<p class="bw-help">将替换已选 ${m.ids.length} 条视频的特殊要求，其他视频不受影响。</p><textarea maxlength="1000" data-modal-input="notes" rows="5" placeholder="填写统一要求，留空可清除所选行要求">${esc(m.notes)}</textarea>`;foot=`${btn('取消','modal-close','class="bw-button"')}${btn('应用到所选视频','modal-apply-notes','class="bw-button primary"')}`;
    } else if(m.type==='preview') {
      title=r.source.name;body=`<div class="bw-preview-single">${media(r)}</div><p class="bw-help">${sourceLabel(r)}</p>`;foot=btn('关闭','modal-close','class="bw-button"');
    }
    const focus=document.activeElement?.dataset.modalInput,sel=focus?[document.activeElement.selectionStart,document.activeElement.selectionEnd]:null;
    dialog.innerHTML=`<header><h2>${esc(title)}</h2>${btn('×','modal-close','class="bw-x" aria-label="关闭窗口"')}</header><div class="bw-dialog-body">${body}${m.error?`<p class="bw-error" role="alert">${esc(m.error)}</p>`:''}</div><footer>${foot}</footer>`;
    dialog.querySelectorAll('[data-w-action]').forEach(b=>{b.dataset.modalAction=b.dataset.wAction;delete b.dataset.wAction;});
    if(focus){const el=dialog.querySelector(`[data-modal-input="${focus}"]`);if(el){el.focus({preventScroll:true});if(sel)el.setSelectionRange(...sel);}}
  }
  async function localVideo(file) {
    if(!/\.(mp4|mov|webm)$/i.test(file.name)||file.size>500*1024*1024)throw Error('支持 MP4、MOV、WebM，单个文件不超过 500 MB');
    const url=URL.createObjectURL(file);owned.add(url);
    try{return await new Promise((resolve,reject)=>{
      const v=document.createElement('video');v.preload='metadata';let done=false;
      const finish=(err)=>{if(done)return;done=true;clearTimeout(timeout);v.onloadedmetadata=null;v.onerror=null;if(err)reject(err);else resolve({kind:'file',key:`file:${file.name}:${file.size}:${file.lastModified}`,name:file.name,url,duration:v.duration});v.removeAttribute('src');v.load();};
      const timeout=setTimeout(()=>finish(Error('读取超时，请换一个视频文件')),10000);
      v.onloadedmetadata=()=>Number.isFinite(v.duration)&&v.duration>0?finish():finish(Error('无法读取视频时长'));v.onerror=()=>finish(Error('浏览器无法读取这个视频'));v.src=url;
    });}catch(e){URL.revokeObjectURL(url);owned.delete(url);throw e;}
  }
  async function uploadVideos(files) {
    if(state.started)return;const epoch=state.epoch;state.busy++;render();let count=0,dup=0;const errors=[];
    for(const f of [...files])try{const source=await localVideo(f);if(state.epoch!==epoch){URL.revokeObjectURL(source.url);owned.delete(source.url);continue;}if(addSource(source))count++;else{dup++;URL.revokeObjectURL(source.url);owned.delete(source.url);}}catch(e){errors.push(`${f.name}：${e.message}`);}
    if(state.epoch!==epoch)return;state.busy--;notify([`已添加 ${count} 条视频`,dup?`${dup} 条重复已忽略`:'',...errors].filter(Boolean).join('；'),errors.length?'error':'success');render();
  }
  async function readProductImage(file) {
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>10*1024*1024) {
      throw Error('请选择 10 MB 以内的 JPG、PNG 或 WebP 图片');
    }
    const url=URL.createObjectURL(file);
    try {
      await new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=resolve;
        img.onerror=()=>reject(Error('图片无法读取'));
        img.src=url;
      });
      owned.add(url);
      return {id:uid(),name:file.name,url};
    } catch(error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  let directUpload = null, materialMenuAnchor = null, suspendedEditor = null;
  function pickMaterial(anchor, ids) {
    const batch = state, mode = state.mode;
    const current = () => state===batch && state.step===3 && state.mode===mode && !state.started;
    const apply = image => {
      if(!current())return;
      for(const id of ids){const row=getRow(id);if(row)row.assets[mode]={...image};}
      render();
    };
    materialMenuAnchor = anchor;
    openMaterialMenu(anchor, {current, apply, error(message){notify(message,'error');render();}});
  }

  function pickEditorMaterial(anchor, draft) {
    const current = () => modal === draft && active();
    openMaterialMenu(anchor, {
      current,
      apply(image) {
        draft.asset = {...image};
        draft.error = '';
        drawModal();
        dialog.querySelector('[data-modal-action="redo-material"]')?.focus();
      },
      error(message) { draft.error = message; drawModal(); },
      beforeLibrary() {
        suspendedEditor = draft;
        dialog.close();
      },
      afterLibrary() {
        suspendedEditor = null;
        if (current()) {
          dialog.showModal();
          anchor.focus();
        }
      }
    });
  }

  function openMaterialMenu(anchor, request) {
    openSingleImageMenu(anchor, {
      ...request,
      apply(image) { if(request.current()) request.apply(image); },
      upload() {
        directUpload = request;
        imageInput.value = '';
        imageInput.click();
      }
    });
  }

  async function uploadImage(file) {
    const request = directUpload;
    directUpload = null;
    if (!file || !request?.current()) return;
    try {
      const asset = await readProductImage(file);
      if (request.current()) request.apply(asset);
      else { URL.revokeObjectURL(asset.url); owned.delete(asset.url); }
    } catch(error) {
      if (request.current()) request.error(error.message);
    }
  }
  function exportList() {
    const payload={mode:modeName(),simulated:true,tasks:state.rows.map(r=>({name:r.source.name,source:r.source.link||sourceLabel(r),category:r.category,replacement:r.assets[state.mode]?.name,notes:r.notes,status:r.status,risk:r.analysis?.risk}))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='批量视频-模拟任务清单.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已导出任务清单；演示环境没有真实成片可下载。');
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-w-action]');if(!b||b.disabled||!active())return;
    const action=b.dataset.wAction,id=b.dataset.id,r=getRow(id);
    state.notice=null;
    switch(action){
      case 'mode':if(state.started)return;state.mode=b.dataset.mode;break;
      case 'step':if(state.started||Number(b.dataset.step)>state.maxStep)return;go(Number(b.dataset.step));return;
      case 'next':if(state.step===1)go(2);else if(state.step===2&&state.rows.length&&!state.busy)go(3);return;
      case 'back':if(!state.started)go(state.step-1);return;
      case 'toggle-links':
        state.linksOpen=true;render();$('#bwLinks',root)?.focus();return;
      case 'close-links':state.linksOpen=false;break;
      case 'upload-video':b.closest('details').open=false;chooseLocalVideo();return;
      case 'samples':{let n=0;samples.forEach((s,i)=>{if(addSource({...s,kind:'sample',key:`sample:${i}`}))n++;});notify(n?`已添加 ${n} 条示例视频。第一条会演示高风险确认，其余会自动执行。`:'示例视频已经添加过了。');break;}
      case 'add-links':addLinks();return;
      case 'remove':if(!state.started){state.rows=state.rows.filter(x=>x.id!==id);state.selected.delete(id);if(!state.rows.length)state.maxStep=2;}break;
      case 'video-library':b.closest('details').open=false;openModal({type:'video-library',scope:'personal',picked:new Set(),search:''});return;
      case 'preview':if(r)openModal({type:'preview',rowId:id});return;
      case 'choose-asset':
      case 'bulk-asset': {
        const ids=action==='bulk-asset'?[...state.selected]:r?[r.id]:[];
        if(ids.length){e.stopPropagation();pickMaterial(b,ids);}
        return;
      }
      case 'bulk-category':if(state.selected.size)openModal({type:'category',ids:[...state.selected],category:''});return;
      case 'bulk-notes':if(state.selected.size)openModal({type:'notes',ids:[...state.selected],notes:''});return;
      case 'start':start();return;
      case 'filter':state.filter=b.dataset.filter;state.followResults=false;break;
      case 'approve':if(r?.status==='blocked'){r.status='approved';notify('已确认，这条视频已加入制作队列。','success');pump();if(!counts().confirm){state.filter='running';state.followResults=true;}}break;
      case 'cancel-task':
        if(r && ['blocked','failed'].includes(r.status)) {
          if(r.completedSettings) {
            r.assets[state.mode]=r.completedSettings.asset;
            r.notes=r.completedSettings.notes;
            r.source=r.completedSettings.source;
          }
          r.status='cancelled';
          r.run++;
          if(!counts().confirm){state.filter='cancelled';state.followResults=false;}
        }
        break;
      case 'retry':if(r?.status==='failed'){r.status='queued';pump();}break;
      case 'play-result':if(r?.versions.length)openModal({type:'player',rowId:r.id,versions:r.versions});return;
      case 'favorite-result':
        if (r?.status === 'done' && r.versions.at(-1)?.id === b.dataset.version) results.toggleFavorite(b.dataset.version);
        return;
      case 'redo':if(r?.status==='done')openTaskEditor(r,'redo');return;
      case 'edit-risk':if(r)openTaskEditor(r,'edit');return;
      case 'export':exportList();break;
      case 'new':if(state.rows.every(terminal)){const epoch=state.epoch+1;owned.forEach(u=>URL.revokeObjectURL(u));owned.clear();state=fresh();state.epoch=epoch;go(1);}return;
      case 'dismiss':state.notice=null;break;
      default:return;
    }render();
  });
  window.addEventListener('batch-material-changed', ({detail:id}) => {
    const button = root.querySelector(`[data-w-action="favorite-result"][data-version="${CSS.escape(id)}"]`);
    if (!button) return;
    const favorite = results.favoriteState(id);
    button.disabled = favorite === null;
    button.textContent = favorite ? '取消收藏' : '收藏';
  });
  root.addEventListener('scroll',event=>{
    const table=event.target;
    if(!table.matches?.('.bw-table-scroll') || !table.contains(materialMenuAnchor) || $('#imageSourceMenu').hidden)return;
    const bounds=table.getBoundingClientRect(), anchor=materialMenuAnchor.getBoundingClientRect();
    if(anchor.bottom<bounds.top || anchor.top>bounds.bottom)closeImageSourceMenu();
    else positionImageSourceMenu(materialMenuAnchor);
  },true);
  document.addEventListener('click', event => {
    const menu = document.querySelector('.bw-add-menu[open]');
    if (menu && !menu.contains(event.target)) menu.open = false;
  });
  root.addEventListener('keydown', event => {
    const menu = event.target.closest('.bw-add-menu[open]');
    if (event.key === 'Escape' && menu) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  root.addEventListener('input',e=>{const k=e.target.dataset.wInput;if(k==='links')state.linkText=e.target.value;if(k==='notes'){const r=getRow(e.target.dataset.id);if(r)r.notes=e.target.value.slice(0,1000);}});
  root.addEventListener('change',e=>{const k=e.target.dataset.wChange;if(k==='category'){const row=getRow(e.target.dataset.id);if(row && namingCategories().includes(e.target.value))row.category=e.target.value;return;}else if(k==='folder'){if(results.folders().some(folder=>folder.id===e.target.value))state.folderId=e.target.value;}else if(k==='select'){e.target.checked?state.selected.add(e.target.dataset.id):state.selected.delete(e.target.dataset.id);}else if(k==='select-all')state.selected=e.target.checked?new Set(state.rows.map(r=>r.id)):new Set();else return;render();});
  root.addEventListener('compositionstart',()=>{composing=true;});root.addEventListener('compositionend',()=>{composing=false;if(pending){pending=false;render();}});
  root.addEventListener('dragover',e=>{const z=e.target.closest('[data-video-drop]');if(z){e.preventDefault();z.classList.add('over');}});
  root.addEventListener('dragleave',e=>{const z=e.target.closest('[data-video-drop]');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over');});
  root.addEventListener('drop',e=>{const z=e.target.closest('[data-video-drop]');if(z){e.preventDefault();z.classList.remove('over');uploadVideos(e.dataTransfer.files);}});
  let videoEditor=null;
  function chooseLocalVideo(draft=null) {
    videoEditor=draft;
    fileInput.multiple=!draft;fileInput.value='';fileInput.click();
  }
  fileInput.addEventListener('change',async()=>{
    const draft=videoEditor;
    videoEditor=null;
    const files=[...fileInput.files];
    if(!files.length)return;
    if(!draft){uploadVideos(files);return;}
    if(modal!==draft)return;
    draft.busy=true;draft.error='';drawModal();
    try {
      const source=await localVideo(files[0]);
      if(modal===draft){draft.source=source;draft.linkOpen=false;draft.linkText='';}
      else {URL.revokeObjectURL(source.url);owned.delete(source.url);}
    } catch(error){draft.error=error.message;}
    finally {draft.busy=false;if(modal===draft)drawModal();}
  });
  imageInput.addEventListener('change',()=>uploadImage(imageInput.files[0]));
  dialog.addEventListener('keydown', event => {
    if(event.key==='Escape' && dialog.querySelector('#imageSourceMenu')) {
      event.preventDefault();
      event.stopPropagation();
      closeImageSourceMenu();
      dialog.querySelector('[data-modal-action="redo-material"]')?.focus();
    }
  });
  dialog.addEventListener('cancel',e=>{if(modal?.parent){e.preventDefault();openModal(modal.parent);}else modal=null;});
  dialog.addEventListener('close',()=>{if(!dialog.open && !suspendedEditor){if(dialog.querySelector('#imageSourceMenu'))closeImageSourceMenu();dialog.querySelectorAll('video').forEach(v=>v.pause());modal=null;}});
  dialog.addEventListener('input',e=>{
    if(!modal)return;
    const key=e.target.dataset.modalInput;
    if(key==='notes')modal.notes=e.target.value.slice(0,1000);
    if(key==='link')modal.linkText=e.target.value;
    if(['edit','redo'].includes(modal.type))dialog.querySelector('[data-modal-action="modal-apply"]').disabled=!canApply(modal,getRow(modal.rowId));
    if(key==='search'){modal.search=e.target.value;drawModal();}
  });
  dialog.addEventListener('click',e=>{
    const b=e.target.closest('[data-modal-action]');if(!b||b.disabled||!modal)return;const action=b.dataset.modalAction,id=b.dataset.id,m=modal;
    if(action==='modal-close'){if(m.parent)openModal(m.parent);else closeModal();return;}
    if(action==='upload-video'){b.closest('details').open=false;chooseLocalVideo(m);return;}
    if(action==='video-library'){openModal({type:'video-library',parent:m,scope:'personal',picked:new Set(),search:''});return;}
    if(action==='toggle-links'){m.linkOpen=true;m.error='';drawModal();dialog.querySelector('[data-modal-input="link"]').focus();return;}
    if(action==='close-links'){m.linkOpen=false;m.linkText='';m.error='';drawModal();return;}
    if(action==='add-links'){
      const {links,bad}=validateLinks(m.linkText);
      if(links.length!==1 || bad.length || (m.linkText.match(/https?:\/\//gi)||[]).length!==1){m.error='本条任务请选择一个有效的抖音视频链接。';drawModal();return;}
      m.source={kind:'link',key:`link:${links[0]}`,link:links[0],name:links[0]};m.linkOpen=false;m.linkText='';m.error='';drawModal();return;
    }
    if(action==='view-output'||action==='view-source'){m.showSource=action==='view-source';drawModal();return;}
    if(action==='redo-material'){
      e.stopPropagation();
      if(dialog.querySelector('#imageSourceMenu')) closeImageSourceMenu();
      else pickEditorMaterial(b,m);
      return;
    }
    if(action==='modal-refresh'){drawModal();return;}
    if(action==='modal-scope'){m.scope=b.dataset.scope;m.search='';drawModal();return;}
    if(action==='toggle-video'){if(m.picked.has(id))m.picked.delete(id);else {if(m.parent)m.picked.clear();m.picked.add(id);}drawModal();return;}
    if(action==='modal-add-videos'){
      const items=videoLibraryData().items.filter(item=>m.picked.has(item.id));
      if(m.parent){
        if(items.length!==1){m.error='请重新选择一个可用视频。';drawModal();return;}
        const draft=m.parent;draft.source=videoSourceFromAsset(items[0]);draft.linkOpen=false;draft.linkText='';draft.error='';openModal(draft);return;
      }
      let n=0;for(const item of items)if(addSource(videoSourceFromAsset(item)))n++;
      closeModal();notify(n?`已从素材库添加 ${n} 条视频。`:'所选视频已经添加过了。','success');render();return;
    }
    if(action==='modal-apply'&&m.asset){
      m.ids.forEach(id=>{const r=getRow(id);if(!r)return;r.assets[state.mode]={...m.asset};if(m.type==='edit'||m.type==='redo'){r.source=m.source;r.notes=m.notes;r.status='queued';r.analysis=null;r.progress=0;r.run++;}});
      closeModal();if(state.started){state.followResults=true;state.filter='running';pump();}render();return;
    }
    if(action==='apply-category' && namingCategories().includes(m.category)){m.ids.forEach(id=>{const row=getRow(id);if(row)row.category=m.category;});closeModal();render();return;}
    if(action==='modal-apply-notes'){m.ids.forEach(id=>{const r=getRow(id);if(r)r.notes=m.notes;});closeModal();render();}
  });
  dialog.addEventListener('change', event=>{if(event.target.hasAttribute('data-modal-category') && modal?.type==='category'){modal.category=event.target.value;dialog.querySelector('[data-modal-action="apply-category"]').disabled=!namingCategories().includes(modal.category);}
    if(event.target.hasAttribute('data-modal-version') && modal?.type==='player'){modal.versionId=event.target.value;drawModal();}});
  const original=renderAiAppEditor;
  renderAiAppEditor=function(){original();$('.ai-app-workspace').classList.toggle('bw-workspace',active());root.hidden=!active();if(active())render();else{root.querySelectorAll('video').forEach(v=>v.pause());if(dialog.open)closeModal();}};
  window.addEventListener('beforeunload',()=>{state.epoch++;owned.forEach(u=>URL.revokeObjectURL(u));});
  renderAiApplications();renderAiAppEditor();
  if(location.hash==='#batch-video'){showPage('ai-apps');openAiApplication(APP);}
})();
