(function(){
 'use strict';
 const core=window.ProfitBICore,data=core.demoData();
 const sourceUrls={followup:'https://ncn07vg70zr8.feishu.cn/wiki/FX4xw7fjWirrf0kRMpncMnG2n1c?sheet=2zAGUt',shipping:'https://zcn9jcxsw49y.feishu.cn/base/Cvi3bwQCEaidVpsES6FcA8z7nVh?table=tblHWhOsyNN1pYlH&view=vewGKp7FqY'};
 const paths={chart:'<path d="M3 3v18h18M6 15l5-5 4 3 6-8"/>',box:'<path d="m3 7 9-5 9 5v10l-9 5-9-5zm0 0 9 5 9-5m-9 5v10"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5"/>',check:'<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="10"/>',filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',sort:'<path d="m8 9 4-4 4 4m-8 6 4 4 4-4"/>'};
 const icon=name=>'<svg class="bi-icon" viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>Number(value).toLocaleString('zh-CN');
 const rateText=item=>item.rate===null?'—':(item.unmatched?'≥':'')+(item.rate*100).toFixed(1)+'%';
 const statuses={fulfilled:'已履约',unfulfilled:'未履约',unmatched:'待匹配'};
 const initial=()=>({from:'2026-11-01',to:data.asOf,store:'',owner:'',category:'',query:''});
 let view={filter:initial(),sort:'creators',direction:-1,granularity:'day',tablePage:1,tableSize:5},root,result,detail=null;
 const $=selector=>root.querySelector(selector);
 const button=(text,action,cl='')=>'<button type="button" class="bi-button '+cl+'" data-bi-action="'+action+'">'+text+'</button>';
 function select(name,label,values){return '<label class="bi-filter"><span>'+label+'</span><select class="bi-select" data-bi-filter="'+name+'" aria-label="'+label+'"><option value="">全部'+label+'</option>'+values.map(v=>'<option value="'+esc(v)+'"'+(view.filter[name]===v?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>';}
 function shell(){
  return '<div class="profit-bi">'+
   '<section class="bi-panel bi-filters" aria-label="看板筛选"><div class="bi-filter-grid"><div class="bi-filter bi-date-range"><span>寄样日期</span><div><input class="bi-control" type="date" data-bi-filter="from" aria-label="寄样开始日期" value="'+view.filter.from+'" max="'+data.asOf+'"><span>至</span><input class="bi-control" type="date" data-bi-filter="to" aria-label="寄样结束日期" value="'+view.filter.to+'" max="'+data.asOf+'"></div></div>'+select('store','店铺',['miniso三店','miniso四店'])+select('category','品类',['盲盒','常规','毛绒'])+select('owner','负责人',['何霜','李雨轩','陈晓'])+'<label class="bi-filter bi-search"><span>商品</span><div class="bi-control">'+icon('search')+'<input type="search" data-bi-filter="query" aria-label="搜索看板商品" placeholder="搜索商品名称或编码" value="'+esc(view.filter.query)+'"></div></label><div class="bi-filter bi-filter-reset"><span aria-hidden="true">&nbsp;</span>'+button('重置','reset')+'</div></div><p class="bi-filter-error" id="bi-filter-error" role="alert" hidden></p></section>'+
   '<section class="bi-summary" id="bi-summary" aria-label="寄样履约汇总" aria-live="polite"></section>'+
   '<div class="bi-quality" id="bi-quality"></div>'+
   '<section class="bi-panel bi-products" aria-labelledby="bi-products-title"><div class="bi-panel-heading"><div><h2 id="bi-products-title">商品寄样与履约</h2></div>'+button(icon('download')+'导出当前统计','export')+'</div><div class="bi-table-scroll"><table class="bi-table"><colgroup><col class="bi-col-product"><col><col><col><col><col><col class="bi-col-rate"><col><col><col class="bi-col-action"></colgroup><thead><tr><th scope="col">商品 / 编码</th>'+[['creators','寄样达人'],['quantity','寄出件数'],['fulfilled','已履约'],['unfulfilled','未履约'],['unmatched','待匹配'],['rate','履约率'],['video','视频履约'],['live','直播履约']].map(([key,label])=>'<th scope="col" data-sort-heading="'+key+'"><button type="button" data-bi-sort="'+key+'">'+label+icon('sort')+'</button></th>').join('')+'<th scope="col">操作</th></tr></thead><tbody id="bi-product-rows"></tbody></table></div><footer class="bi-table-footer"><span id="bi-table-count"></span><div id="bi-table-pagination"></div></footer></section>'+
   '<div class="bi-chart-grid"><section class="bi-panel" aria-labelledby="bi-trend-title"><div class="bi-panel-heading"><div><h2 id="bi-trend-title">寄样趋势</h2><p>本期实际寄出的样品件数</p></div><div class="bi-segment" aria-label="趋势粒度"><button type="button" data-bi-granularity="day">按天</button><button type="button" data-bi-granularity="week">按周</button></div></div><div id="bi-trend" class="bi-trend"></div></section><section class="bi-panel" aria-labelledby="bi-compare-title"><div class="bi-panel-heading"><div><h2 id="bi-compare-title">商品履约对比</h2></div><div class="bi-legend"><span><i></i>已履约</span><span><i></i>未履约</span><span><i></i>待匹配</span></div></div><div id="bi-comparison" class="bi-comparison"></div></section></div>'+
   '<dialog class="bi-drawer" id="bi-detail-dialog" aria-labelledby="bi-detail-title"></dialog><dialog class="bi-source-dialog" id="bi-source-dialog" aria-labelledby="bi-source-title"></dialog><div class="bi-toast" id="bi-toast" role="status"></div></div>';
 }
 function summary(){
  const t=result.totals;
  const cards=[
   ['users','寄样达人',number(t.creators),'人','跨商品去重后的达人总数'],
   ['box','寄出样品',number(t.quantity),'件',number(t.records)+' 条已寄样记录'],
   ['chart','覆盖商品',number(t.products),'款','当前筛选范围内的商品'],
   ['check','整体履约率',rateText(t),'',number(t.fulfilled)+' / '+number(t.cooperations)+' 个商品与达人关系已履约']
  ];
  $('#bi-summary').innerHTML=cards.map(([i,title,value,unit,note],index)=>'<article class="bi-kpi'+(index===3?' bi-kpi-accent':'')+'"><div class="bi-kpi-label">'+title+'<span>'+icon(i)+'</span></div><div class="bi-kpi-value">'+value+'<small>'+unit+'</small></div><p>'+note+'</p></article>').join('');
  $('#bi-quality').innerHTML=t.cooperations?'<span class="bi-quality-main">'+icon('check')+'已确认履约 <b>'+t.fulfilled+'</b><span>未履约 <b>'+t.unfulfilled+'</b></span><span class="bi-amber">待匹配 <b>'+t.unmatched+'</b></span></span><span>'+(t.unmatched?'含待匹配记录的履约率以「≥」标记；无跟进数据的商品显示「—」。':'所有寄样达人均已匹配跟进记录。')+'</span>':'<span>当前筛选范围内没有已寄样记录。</span>';
 }
 function sortedRows(){return [...result.rows].sort((a,b)=>{const av=a[view.sort],bv=b[view.sort];if(av===null||bv===null)return av===bv?0:av===null?1:-1;return (av-bv)*view.direction||a.name.localeCompare(b.name,'zh-CN');});}
 function resetPages(){view.tablePage=1;}
 function pager(scope,p){
  const label=scope==='table'?'商品统计':'商品履约对比';
  const b=(page,text,disabled=false)=>'<button type="button" data-bi-page="'+scope+':'+page+'" '+(disabled?'disabled ':'')+(text===String(p.page)?'aria-current="page" ':'')+'aria-label="'+label+(text==='‹'?'上一页':text==='›'?'下一页':'第 '+page+' 页')+'">'+text+'</button>';
  const indices=[...new Set([1,p.pages,p.page-1,p.page,p.page+1])].filter(n=>n>=1&&n<=p.pages).sort((a,b)=>a-b);
  return '<nav class="bi-pagination" aria-label="'+label+'分页"><select class="bi-select" data-bi-page-size="'+scope+'" aria-label="'+label+'每页条数">'+[5,10,20].map(n=>'<option value="'+n+'"'+(p.size===n?' selected':'')+'>'+n+' 条 / 页</option>').join('')+'</select>'+b(p.page-1,'‹',p.page===1)+indices.map((n,i)=>(i&&n-indices[i-1]>1?'<span>…</span>':'')+b(n,String(n))).join('')+b(p.page+1,'›',p.page===p.pages)+'</nav>';
 }
 function productRows(){
  const page=core.paginate(sortedRows(),view.tablePage,view.tableSize);view.tablePage=page.page;
  $('#bi-product-rows').innerHTML=page.items.map(p=>'<tr><th scope="row"><button type="button" class="bi-product-button" data-bi-product="'+p.id+'"><span class="bi-product-art bi-tone-'+p.tone+'" aria-hidden="true">'+esc(p.short)+'</span><span><strong>'+esc(p.name)+'</strong><small>'+p.code+'<span class="bi-category">'+p.category+'</span></small></span></button></th><td>'+p.creators+'</td><td>'+p.quantity+'</td><td class="bi-done-number">'+p.fulfilled+'</td><td>'+p.unfulfilled+'</td><td class="'+(p.unmatched?'bi-amber':'bi-muted')+'">'+p.unmatched+'</td><td class="bi-rate-cell"><div><b>'+rateText(p)+'</b><small>'+(p.rate===null?'履约数据待补齐':p.unmatched?'已确认 / 寄样达人':'')+'</small></div><div class="bi-progress" aria-hidden="true"><i style="width:'+(p.rate===null?0:p.rate*100)+'%"></i></div></td><td>'+p.video+'</td><td>'+p.live+'</td><td><button type="button" class="bi-text-button" data-bi-product="'+p.id+'" aria-label="查看'+esc(p.name)+'的达人">查看达人 '+icon('arrow')+'</button></td></tr>').join('')||'<tr><td colspan="10"><div class="bi-empty">'+icon('search')+'<h3>没有符合条件的寄样记录</h3><p>试试其他日期、店铺或商品关键词。</p>'+button('重置筛选','reset')+'</div></td></tr>';
  root.querySelectorAll('[data-sort-heading]').forEach(th=>{const active=th.dataset.sortHeading===view.sort;th.setAttribute('aria-sort',active?(view.direction===-1?'descending':'ascending'):'none');th.querySelector('button').classList.toggle('is-active',active);});
  $('#bi-table-count').textContent='显示 '+page.start+'–'+page.end+' 条，共 '+page.total+' 个商品 · '+result.totals.cooperations+' 个商品与达人关系';
  $('#bi-table-pagination').innerHTML=pager('table',page);
 }
 function trendChart(){
  const points=core.trend(result,view.filter,view.granularity),chartTotal=points.reduce((n,p)=>n+p.quantity,0);
  root.querySelectorAll('[data-bi-granularity]').forEach(b=>{b.classList.toggle('is-active',b.dataset.biGranularity===view.granularity);b.setAttribute('aria-pressed',String(b.dataset.biGranularity===view.granularity));});
  if(!points.length){$('#bi-trend').innerHTML='<div class="bi-chart-empty">当前范围暂无寄样数据</div>';return;}
  const w=700,h=218,left=38,right=16,top=19,bottom=183,max=Math.max(4,Math.ceil(Math.max(...points.map(p=>p.quantity))/4)*4),stride=Math.max(1,Math.ceil((points.length-1)/6));
  const x=i=>points.length===1?(left+w-right)/2:left+(w-left-right)*i/(points.length-1),y=v=>bottom-(bottom-top)*v/max;
  const path=points.map((p,i)=>x(i)+','+y(p.quantity)).join(' '),grid=Array.from({length:5},(_,i)=>{const value=max*i/4,py=y(value);return '<path class="bi-chart-gridline" d="M'+left+' '+py+'H'+(w-right)+'"/><text class="bi-axis" x="'+(left-10)+'" y="'+(py+4)+'" text-anchor="end">'+value+'</text>';}).join('');
  $('#bi-trend').innerHTML='<div class="bi-trend-unit">单位：件'+(view.granularity==='week'?' · 最近4周':'')+'</div><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="按'+(view.granularity==='day'?'天':'周')+'展示寄出样品件数，总计'+chartTotal+'件"><defs><linearGradient id="bi-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#9c7bdd" stop-opacity=".23"/><stop offset="1" stop-color="#9c7bdd" stop-opacity="0"/></linearGradient></defs>'+grid+'<polygon fill="url(#bi-trend-fill)" points="'+x(0)+','+bottom+' '+path+' '+x(points.length-1)+','+bottom+'"/><polyline class="bi-trend-line" points="'+path+'"/>'+points.map((p,i)=>'<g><title>'+p.date+(view.granularity==='week'?(p.covered?' 当周（按所选日期统计）':' 当周（不在所选日期内）'):'')+'：寄出 '+p.quantity+' 件，'+p.creators+' 位达人</title><circle class="bi-trend-dot" cx="'+x(i)+'" cy="'+y(p.quantity)+'" r="3.5"/>'+(i%stride===0||i===points.length-1?'<text class="bi-axis" text-anchor="middle" x="'+x(i)+'" y="208">'+p.date.slice(5).replace('-','/')+'</text>':'')+'</g>').join('')+'</svg>';
 }
 function comparisonChart(){
  const rows=sortedRows().slice(0,6);
  $('#bi-comparison').innerHTML=rows.map(p=>'<div class="bi-compare-row" role="img" aria-label="'+esc(p.name)+'，履约率'+(p.rate===null?'数据待补齐':rateText(p))+'"><span class="bi-compare-name" title="'+esc(p.name)+'">'+esc(p.name)+'</span><span class="bi-stack" aria-hidden="true"><i style="width:'+p.fulfilled/p.creators*100+'%"></i><i style="width:'+p.unfulfilled/p.creators*100+'%"></i><i style="width:'+p.unmatched/p.creators*100+'%"></i></span><b>'+rateText(p)+'</b></div>').join('')||'<div class="bi-chart-empty">当前范围暂无履约数据</div>';
 }
 function paint(){
  const invalid=view.filter.from&&view.filter.to&&view.filter.from>view.filter.to;
  $('#bi-filter-error').hidden=!invalid;$('#bi-filter-error').textContent=invalid?'开始日期不能晚于结束日期，请调整日期范围。':'';
  result=core.aggregate(data,view.filter);summary();productRows();trendChart();comparisonChart();
 }
 function syncFilters(){root.querySelectorAll('[data-bi-filter]').forEach(el=>{el.value=view.filter[el.dataset.biFilter];});}
 function openDetails(productId=null,status='all'){
  const p=result.rows.find(p=>p.id===productId),relations=productId?p?.details||[]:result.details;
  detail={productId,status,query:'',age:0,relations};
  const title=p?p.name+' · 达人明细':'待跟进清单';
  $('#bi-detail-dialog').innerHTML='<div class="bi-drawer-head"><div><h2 id="bi-detail-title">'+esc(title)+'</h2></div><button type="button" class="bi-icon-button" data-bi-action="close-detail" aria-label="关闭达人明细">'+icon('close')+'</button></div><div class="bi-drawer-body"><div class="bi-detail-summary"><span>寄样达人<b>'+relations.length+'</b></span><span>寄出件数<b>'+number(relations.reduce((n,r)=>n+r.quantity,0))+'</b></span><span>已履约<b>'+relations.filter(r=>r.status==='fulfilled').length+'</b></span></div><div class="bi-detail-tabs" id="bi-detail-tabs" aria-label="履约状态筛选"></div><div class="bi-detail-tools"><label class="bi-control bi-detail-search">'+icon('search')+'<input type="search" id="bi-detail-search" aria-label="搜索达人账号" placeholder="搜索达人账号"></label><select class="bi-select" id="bi-detail-age" aria-label="寄出时长"><option value="0">全部寄出时长</option><option value="7">寄出满7天</option><option value="14">寄出满14天</option></select></div><div id="bi-detail-list"></div></div><footer class="bi-drawer-foot">'+icon('info')+'示例达人未从飞书同步。「待匹配」表示尚无对应的跟进记录。</footer>';
  paintDetails();$('#bi-detail-dialog').showModal();
 }
 function paintDetails(){
  if(!detail)return;
  $('#bi-detail-tabs').innerHTML=['all','fulfilled','unfulfilled','unmatched'].map(status=>'<button type="button" class="'+(detail.status===status?'is-active':'')+'" data-bi-status="'+status+'" aria-pressed="'+(detail.status===status)+'">'+(status==='all'?'全部':statuses[status])+'<span>'+detail.relations.filter(r=>status==='all'||r.status===status).length+'</span></button>').join('');
  const relations=detail.relations.filter(r=>(detail.status==='all'||r.status===detail.status)&&r.age>=detail.age&&r.creator.includes(core.normalizeHandle(detail.query))).sort((a,b)=>a.firstDate.localeCompare(b.firstDate)||a.creator.localeCompare(b.creator));
  $('#bi-detail-list').innerHTML=relations.length?'<div class="bi-detail-count">共 '+relations.length+' 条商品达人关系</div><div class="bi-table-scroll"><table class="bi-table bi-detail-table"><thead><tr><th scope="col">达人 / 商品</th><th scope="col">寄出件数</th><th scope="col">首次寄出</th><th scope="col">履约情况</th></tr></thead><tbody>'+relations.map(r=>{
   const p=data.products.find(p=>p.id===r.productId),tags=[r.video?'视频履约':'',r.live?'直播':''].filter(Boolean);
   const remarks=[...new Set(r.followups.flatMap(f=>Array.isArray(f.remarks)?f.remarks:[f.remarks]))].filter(Boolean).join('、');
   return '<tr><th scope="row"><strong>@'+esc(r.creator)+'</strong>'+(!detail.productId?'<small>'+esc(p?.name||'待映射商品')+'</small>':'')+'<small>'+esc(r.stores.join(' / '))+' · '+esc(r.owners.join(' / '))+'</small></th><td><b>'+r.quantity+'</b><small>'+r.shipments.length+' 条寄样</small></td><td>'+r.firstDate+'<small>已寄出 '+r.age+' 天</small></td><td><span class="bi-status bi-status-'+r.status+'">'+statuses[r.status]+'</span><small>'+esc(tags.length?tags.join(' · '):r.status==='unmatched'?'跟进记录待匹配':remarks||'未标记履约')+'</small></td></tr>';
  }).join('')+'</tbody></table></div>':'<div class="bi-empty bi-detail-empty">'+icon('search')+'<h3>没有符合条件的达人</h3><p>调整履约状态、寄出时长或达人关键词。</p></div>';
 }
 function openSources(){
  $('#bi-source-dialog').innerHTML='<header><div><span class="bi-eyebrow">数据与统计说明</span><h2 id="bi-source-title">数据来源与统计口径</h2></div><button type="button" class="bi-icon-button" data-bi-action="close-sources" aria-label="关闭数据口径">'+icon('close')+'</button></header><div class="bi-source-note">当前展示完整交互原型，所有统计均由示例明细计算；尚未读取、同步飞书业务数据。</div><div class="bi-source-card"><span>01 · 寄样来源</span><h3>寄样统计表（天）</h3><p>计划读取达人、商品、数量、店铺、寄样人及是否邮寄。原链接视图为 miniso三店、已邮寄、本月。</p><a href="'+sourceUrls.shipping+'" target="_blank" rel="noopener noreferrer">打开飞书寄样表 ↗</a></div><div class="bi-source-card"><span>02 · 履约来源</span><h3>达人跟进表</h3><p>备注标记「视频履约」或「直播」计为履约。提供的链接标题为10月达人跟进表，接入时需补齐对应月份。</p><a href="'+sourceUrls.followup+'" target="_blank" rel="noopener noreferrer">打开飞书跟进表 ↗</a></div><div class="bi-rules"><h3>本看板如何统计</h3><ul><li>仅统计实际寄出的样品；同一商品同一达人重复寄样，人数只计一次，件数累加。</li><li>视频和直播都算履约，同时完成两种形式，履约人数仍只计一次。</li><li>没有对应跟进记录的达人标记为「待匹配」，与已有记录但未标记履约的达人分开。</li><li>履约率＝已确认履约达人÷寄样达人。有待匹配记录时标记「≥」；全部待匹配时显示「—」。整体按商品与达人关系汇总。</li><li>日期筛选对应寄样日期，履约判断截止至 '+data.asOf+'；不直接使用源表中的达人历史履约率或30天带货GMV。</li></ul></div>';
  $('#bi-source-dialog').showModal();
 }
 function exportSummary(){
  const rows=[['商品寄样与履约看板','示例数据，未连接飞书'],['寄样日期',view.filter.from||'不限',view.filter.to||'不限'],['店铺',view.filter.store||'全部'],['品类',view.filter.category||'全部'],['负责人',view.filter.owner||'全部'],['商品搜索',view.filter.query],['商品','商品编码','寄样达人','寄出件数','已履约','未履约','待匹配','履约率','视频履约人数','直播履约人数'],...sortedRows().map(p=>[p.name,p.code,p.creators,p.quantity,p.fulfilled,p.unfulfilled,p.unmatched,rateText(p),p.video,p.live])];
  const csv=rows.map(row=>row.map(value=>{let text=String(value??'');if(typeof value==='string'&&/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='商品寄样履约_示例数据_'+data.asOf+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  const toast=$('#bi-toast');toast.textContent='已导出当前筛选下的示例统计';toast.classList.add('is-visible');setTimeout(()=>toast.classList.remove('is-visible'),2500);
 }
 function mount(target){
  root=target;root.innerHTML=shell();detail=null;
  root.onclick=event=>{
   const b=event.target.closest('button');if(!b)return;
   if(b.dataset.biPage){const [scope,page]=b.dataset.biPage.split(':');if(b.disabled)return;view[scope+'Page']=Number(page);if(scope==='table')productRows();else comparisonChart();return;}
   if(b.dataset.biProduct){openDetails(b.dataset.biProduct);return;}
   if(b.dataset.biSort){const key=b.dataset.biSort;view.direction=view.sort===key?-view.direction:-1;view.sort=key;resetPages();productRows();comparisonChart();return;}
   if(b.dataset.biStatus){detail.status=b.dataset.biStatus;paintDetails();return;}
   if(b.dataset.biGranularity){view.granularity=b.dataset.biGranularity;trendChart();return;}
   switch(b.dataset.biAction){
    case 'reset':view.filter=initial();resetPages();syncFilters();paint();break;
    case 'sources':openSources();break;
    case 'backlog':openDetails(null,'unfulfilled');break;
    case 'close-detail':$('#bi-detail-dialog').close();detail=null;break;
    case 'close-sources':$('#bi-source-dialog').close();break;
    case 'export':exportSummary();break;
   }
  };
  const change=event=>{
   const el=event.target,key=el.dataset.biFilter;
   if(key){if((el.type==='date'&&!el.validity.valid))return;view.filter[key]=el.value;resetPages();paint();}
   if(el.dataset.biPageSize){const scope=el.dataset.biPageSize;view[scope+'Size']=Number(el.value);view[scope+'Page']=1;if(scope==='table')productRows();else comparisonChart();}
   if(el.id==='bi-detail-search'){detail.query=el.value;paintDetails();}
   if(el.id==='bi-detail-age'){detail.age=Number(el.value);paintDetails();}
  };
  root.oninput=event=>{if(event.target.tagName!=='SELECT')change(event);};
  root.onchange=event=>{if(event.target.tagName==='SELECT')change(event);};
  $('#bi-detail-dialog').addEventListener('close',()=>{detail=null;});
  paint();
 }
 window.ProfitBI={mount};
})();
