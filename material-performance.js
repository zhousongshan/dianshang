/* Local-only material performance preview. Production must supply authorized catalog and report snapshots. */
(async () => {
  'use strict';
  const core = window.PerformanceCore, demo = window.PerformanceDemo;
  // Business snapshots stay local and are excluded from version control.
  let snapshot = null;
  if (['localhost','127.0.0.1','[::1]'].includes(location.hostname)) {
    try { const response=await fetch('./.local-data/performance-snapshots.json',{cache:'no-store'}); if(response.ok)snapshot=await response.json(); } catch (_) { /* Static preview may have no local snapshot. */ }
  }
  const through=snapshot?.through||demo.through;
  const snapshotCache=new Map();
  function snapshotMatches(range) {
    if(!snapshot)return [];
    if(snapshotCache.has(range))return snapshotCache.get(range);
    const period=snapshot.periods[range]; if(!period)return [];
    const matches=period.items.map(entry=>{
      const first=entry.rows[0],name=first['素材标题'];
      const tail=core.normalize(name).split('-').at(-1).trim();
      const category=demo.categories.find(c=>tail===c.toLowerCase()||new RegExp('^'+c.toLowerCase()+'[0-9]+$').test(tail))||'未分类';
      const rows=entry.rows.map(r=>({name:r['素材标题'],materialId:String(r['素材id']),account:'snapshot',channel:r['全域渠道'],date:period.end,spend:r['总消耗'],sales:r['总成交'],impressions:r['总展现']}));
      return {asset:{id:'snapshot:'+entry.kind+':'+first['素材id'],name,kind:entry.kind,item:{},category},rows,filename:core.filenameMetadata(name),n:core.aggregate(rows),snapshot:true};
    });
    snapshotCache.set(range,matches);return matches;
  }
  const q = s => document.querySelector(s), esc = escapeHtml;
  const money = n => Number(n).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const roi = n => n == null ? '—' : n.toFixed(2);
  const dateOffset = (date, offset) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+offset); return d.toISOString().slice(0,10); };
  const ids = new WeakMap(); let serial = 0;
  const stableId = item => { if (!ids.has(item)) ids.set(item,`perf-${++serial}`); return ids.get(item); };
  function catalog() {
    return [['image',mockAssets],['video',mockVideos]].flatMap(([kind,items]) => items.filter(a => !a.deleted && (kind === 'video' || a.category === '图片素材')).map(item => {
      const fixture=demo.items.find(d=>d.name===item.name&&d.kind===kind);
      return {id:stableId(item),name:item.name,kind,item,category:fixture?.category || '未分类'};
    }));
  }
  const categoryName = a => a.category.replace('国内-MINISO-','').replace('国内-','');
  // Fixed synthetic daily snapshots. Duplicate and unknown names are deliberately excluded by the matching contract.
  const reports = demo.items.flatMap((item,i) => Array.from({length:30},(_,day) => ({name:`${item.name}.${item.kind==='image'?'png':'mp4'}`,kind:item.kind,account:'demo-shop',materialId:`demo-material-${i}`,channel:day%3===0?'旗舰店':'官旗店',date:dateOffset(demo.through,-day),spend:Math.round(item.spend*(1+(day%5)*.12))/100,sales:Math.round(item.sales*(1+(day%5)*.08))/100,impressions:Math.round(item.spend*(3+day%4))})));
  reports.push({name:'柠檬饮料场景图.png',kind:'image',account:'demo-shop',materialId:'conflict-a',channel:'官旗店',date:demo.through,spend:500,sales:1800,impressions:10000}, {name:'柠檬饮料场景图.png',kind:'image',account:'demo-shop',materialId:'conflict-b',channel:'官旗店',date:demo.through,spend:600,sales:2200,impressions:12000});
  const state={range:'7',start:dateOffset(through,-6),end:through,channel:'all',category:'all',search:''};
  const inlineFilter = {start:dateOffset(demo.through,-6),end:demo.through};
  const matchList = () => core.match(catalog(),reports).map(m=>({...m,filename:core.filenameMetadata(m.rows[0].name)}));
  const demoBoardMatches = () => core.match(demo.items.map((item,i)=>({id:'demo-board:'+i,name:item.name,kind:item.kind,item:{},category:item.category})),reports).map(m=>({...m,filename:core.filenameMetadata(m.rows[0].name)}));
  const findMatch = (item,kind) => matchList().find(m=>m.asset.id===stableId(item)&&m.asset.kind===kind);
  const numbers = m => core.aggregate(m.rows,state);
  function inline(item,kind) {
    if (!item) return '';
    const m=findMatch(item,kind); if(!m) return '';
    const n=core.aggregate(m.rows,inlineFilter);
    if(!n.count) return '';
    return `<button class="perf-inline" type="button" data-perf-detail="${esc(m.asset.id)}" data-perf-context="inline" aria-label="查看${esc(item.name)}的投放表现"><span class="perf-inline-label"><span class="perf-inline-period">近7天投放 <small>演示</small></span><span class="perf-inline-more">详情 <span aria-hidden="true">↗</span></span></span><span class="perf-inline-values"><span class="perf-inline-spend"><small>总消耗</small><b>¥${money(n.spend)}</b></span><span><small>总成交</small><b>¥${money(n.sales)}</b></span><span class="perf-inline-roi"><small>ROI</small><b>${roi(n.roi)}</b></span></span></button>`;
  }
  function preview(asset,large=false) {
    const item=asset.item;
    // Seeded catalog images all share a watch placeholder; it is not the named material's original.
    const seededPlaceholder=asset.kind==='image'&&item.previewUrl==='./watch-product.png'&&demo.items.some(d=>d.kind===asset.kind&&d.name===asset.name);
    if(item.previewUrl&&!seededPlaceholder) return asset.kind==='video' ? `<video src="${esc(item.previewUrl)}" ${large?'controls':'muted'} playsinline preload="metadata" aria-label="${esc(item.name)}"></video>` : `<img src="${esc(item.previewUrl)}" alt="${esc(item.name)}">`;
    return `<div class="perf-media-empty ${asset.kind}"><span aria-hidden="true">${asset.kind==='video'?'▷':'▧'}</span><small>${large?'暂无关联原文件':asset.kind==='video'?'封面待接入':'原图待接入'}</small></div>`;
  }
  function workbench(results) {
    return results.map(r=>{
      const found=catalog().filter(a=>a.kind===r.kind&&a.name===r.name); if(found.length!==1)return '';
      const a=found[0];return `<section class="perf-wb-result"><div class="perf-wb-preview">${preview(a)}</div><div><strong>${esc(a.name)}</strong><p>${a.kind==='image'?'图片':'视频'} · 示例结果</p>${inline(a.item,a.kind)}</div></section>`;
    }).join('');
  }
  window.MaterialPerformance={inline,workbench,syncScope(scope){const el=q('#perfLibraryNote');if(el)el.hidden=!['generated','favorites'].includes(scope);}};
  const note=document.createElement('p');note.id='perfLibraryNote';note.className='perf-library-note';note.textContent='投放数据演示 · 近7天（10.26–11.01） · 仅展示名称唯一匹配的素材';q('#assetResultSummary').before(note);
  const panel=q('#performanceAnalysis');
  const boards=[
    {id:'image-spend',kind:'image',metric:'spend',title:'图片消耗榜'},
    {id:'video-spend',kind:'video',metric:'spend',title:'视频消耗榜'},
    {id:'image-roi',kind:'image',metric:'roi',title:'图片 ROI 榜'},
    {id:'video-roi',kind:'video',metric:'roi',title:'视频 ROI 榜'}
  ];
  panel.innerHTML=`<div class="perf-filters">
    <label><span class="perf-sr-only">商品类目</span><select id="perfCategory" aria-label="商品类目"><option value="all">全部类目</option>${demo.categories.map(c=>`<option value="${esc(c)}">${esc(c.replace('国内-MINISO-','').replace('国内-',''))}</option>`).join('')}</select></label>
    <label class="perf-date-filter"><span class="perf-sr-only">统计日期</span><select id="perfRange" aria-label="统计日期"><option value="7">近7天</option><option value="1">昨日</option><option value="30">近30天</option></select></label>
    <label class="perf-search"><span class="perf-sr-only">搜索素材标题</span><input id="perfSearch" type="search" placeholder="搜索素材标题" aria-label="搜索素材标题"></label>
    </div>
    <div id="perfBody" aria-live="polite"></div>
    `;
  const detail=document.createElement('dialog');detail.id='perfDetail';detail.className='perf-dialog';detail.setAttribute('aria-labelledby','perfDetailTitle');document.body.append(detail);
  let trigger=null;
  function visibleMatches(kind=null) {
    const source=snapshot?snapshotMatches(state.range):demoBoardMatches().map(m=>({...m,n:numbers(m)}));
    return source.filter(m=>(!kind||m.asset.kind===kind)&&(state.category==='all'||m.asset.category===state.category)&&m.asset.name.toLowerCase().includes(state.search.toLowerCase())&&m.n.count);
  }
  function metrics(n) {return `<div class="perf-kpis"><div><span>总消耗</span><strong>¥${money(n.spend)}</strong></div><div><span>总成交</span><strong>¥${money(n.sales)}</strong></div><div><span>ROI</span><strong>${roi(n.roi)}</strong></div><div><span>总展现</span><strong>${n.impressions.toLocaleString('zh-CN')}</strong></div></div>`;}
  function ranking(board) {
    return core.rankConverted(visibleMatches(board.kind),board.metric);
  }
  const rankLeaf = side => `<svg class="perf-rank-leaf ${side}" viewBox="0 0 30 48" aria-hidden="true" focusable="false"><path d="M23 41C12 33 7 20 7 8" fill="none" stroke="#ffc8bd" stroke-width="1.1"/><path d="M8 13C2 10 3 3 6 1C11 4 12 9 8 13Z" fill="#ffd6cc"/><path d="M11 23C3 21 0 15 1 11C8 12 12 17 11 23Z" fill="#ffb5a5"/><path d="M16 33C6 33 2 28 2 24C10 23 15 27 16 33Z" fill="#ff927c"/><path d="M28 43C15 46 8 42 7 38C15 35 23 38 28 43Z" fill="#ff7058"/></svg>`;
  const rankTitle = title => `<span class="perf-rank-title">${rankLeaf('left')}<h2>${title}</h2>${rankLeaf('right')}</span>`;
  function rankingRows(ms,board) {
    if(!ms.length)return `<div class="perf-board-empty"><span aria-hidden="true">⌕</span><strong>暂无有成交的素材</strong><p>可调整日期、类目或搜索词</p></div>`;
    return `<ol class="perf-ranking-list">${ms.map((m,i)=>`<li class="perf-ranking-item"><div class="perf-entry-main"><span class="perf-place place-${i+1}"><span>${i+1}</span></span><button class="perf-ranking-thumb" type="button" data-perf-detail="${esc(m.asset.id)}" aria-label="查看${esc(m.asset.name)}的投放表现">${preview(m.asset)}${board.kind==='video'&&m.asset.item.previewUrl?'<span class="perf-play" aria-hidden="true">▷</span>':''}</button><div class="perf-ranking-copy"><button class="perf-entry-title" type="button" data-perf-detail="${esc(m.asset.id)}">${esc(m.asset.name)}</button><span class="perf-owner">姓名：${esc(m.filename.person||'—')}</span><small class="perf-created">日期：${esc(m.filename.date||'—')}</small></div></div><div class="perf-entry-bottom"><dl class="perf-entry-metrics"><div><dt>${board.metric==='roi'?'ROI':'总消耗'}</dt><dd class="${board.metric==='roi'?'perf-roi-value':'perf-spend-value'}">${board.metric==='roi'?roi(m.n.roi):'¥'+money(m.n.spend)}</dd></div><div><dt>${board.metric==='roi'?'总消耗':'ROI'}</dt><dd>${board.metric==='roi'?'¥'+money(m.n.spend):roi(m.n.roi)}</dd></div><div><dt>总成交</dt><dd>¥${money(m.n.sales)}</dd></div></dl><button class="perf-detail-button" type="button" data-perf-detail="${esc(m.asset.id)}" aria-label="查看${esc(m.asset.name)}详情">详情 <span aria-hidden="true">↗</span></button></div></li>`).join('')}</ol>`;
  }
  function render() {
    q('#perfBody').innerHTML=`<div class="perf-board-heading"><h1>素材排行榜</h1></div><div class="perf-boards">${boards.map(board=>{
      const ms=ranking(board);
      return `<section class="perf-board" aria-label="${board.title}"><header><div class="perf-board-title-copy">${rankTitle(board.title)}<small>${board.metric==='roi'?'按 ROI 从高到低':'按总消耗从高到低'} · TOP 10</small></div></header>${rankingRows(ms,board)}<footer><span>已展示 ${ms.length} 条${ms.length<10?' · 符合条件不足10条':''}</span></footer></section>`;
    }).join('')}</div>`;
  }
  function showDetail(id,context='analysis') {
    const m=(id.startsWith('snapshot:')?snapshotMatches(state.range):id.startsWith('demo-board:')?demoBoardMatches():matchList()).find(x=>x.asset.id===id);if(!m)return;
    const filter=context==='inline'?inlineFilter:state,n=m.snapshot?m.n:core.aggregate(m.rows,filter);
    const groups=new Map();n.rows.forEach(r=>{const k=r.channel;groups.set(k,[...(groups.get(k)||[]),r]);});
    detail.innerHTML=`<header><div><h2 id="perfDetailTitle">${esc(m.asset.name)}</h2><p>${filter.start} 至 ${filter.end}</p></div><button type="button" data-perf-close aria-label="关闭素材投放详情">×</button></header><div class="perf-detail-layout"><div class="perf-detail-media">${preview(m.asset,true)}</div><div class="perf-detail-content"><span class="perf-demo-tag">${m.snapshot?'接口快照 · 非实时':'演示数据 · 非实时'}</span><div class="perf-detail-owner"><span>姓名：${esc(m.filename.person||'—')}</span><span>日期：${esc(m.filename.date||'—')}</span><span>类目：${esc(categoryName(m.asset))}</span></div>${metrics(n)}<h3>渠道明细</h3><div class="perf-table-wrap"><table class="perf-table"><thead><tr><th>全域渠道</th><th>总消耗</th><th>总成交</th><th>ROI</th><th>总展现</th></tr></thead><tbody>${[...groups.values()].map(rs=>{let t=core.aggregate(rs);return `<tr><td>${esc(rs[0].channel)}</td><td>¥${money(t.spend)}</td><td>¥${money(t.sales)}</td><td>${roi(t.roi)}</td><td>${t.impressions.toLocaleString('zh-CN')}</td></tr>`;}).join('')}</tbody></table></div></div></div>`;
    if(!detail.open)detail.showModal();
  }
  function closeDialog(d) {d.querySelectorAll('video').forEach(v=>v.pause());d.close();trigger?.focus();}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-perf-home],[data-perf-detail],[data-perf-close]');
    if(!b)return;e.stopPropagation();
    if(b.dataset.perfHome){const analysis=b.dataset.perfHome==='analysis';q('#inspirationDiscover').hidden=analysis;panel.hidden=!analysis;document.querySelectorAll('[data-perf-home]').forEach(t=>{const on=t===b;t.classList.toggle('active',on);t.setAttribute('aria-selected',on);});if(analysis)render();}
    else if(b.hasAttribute('data-perf-close'))closeDialog(b.closest('dialog'));
    else {trigger=b;showDetail(b.dataset.perfDetail,b.dataset.perfContext||'analysis');}
  });
  panel.addEventListener('change',e=>{
    const id=e.target.id;
    if(id==='perfRange'){state.range=e.target.value;state.end=through;state.start=dateOffset(through,1-Number(e.target.value));}
    if(id==='perfCategory')state.category=e.target.value;
    render();
  });
  q('#perfSearch').addEventListener('input',e=>{state.search=e.target.value.trim();render();});
  [detail].forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});d.addEventListener('close',()=>{d.querySelectorAll('video').forEach(v=>v.pause());});});
  render();renderAssets();
  if(typeof renderAllGeneratedReviewCards==='function')renderAllGeneratedReviewCards();
})();
