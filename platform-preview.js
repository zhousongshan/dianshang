/* 创作平台 / CRM 平台样式预览，不接业务接口。 */
(() => {
  'use strict';
  const q=s=>document.querySelector(s),esc=escapeHtml;
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
    creation:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    crm:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5 16c0-3 6-3 6 0M14 9h4M14 13h4"/>',
    home:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    customers:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 4v2"/>',
    followups:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9V3ZM9 12h6M9 16h4"/>',
    opportunities:'<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>'
  }[name]||''}</svg>`;
  const customers=[
    {id:'c1',name:'星禾商贸',industry:'消费品 · 华东',contact:'林女士',owner:'李然',status:'合作中',tone:'green',date:'今天',phone:'138****1208',note:'确认下一批商品素材需求，准备合作方案。'},
    {id:'c2',name:'禾木家居',industry:'家居用品 · 华南',contact:'周先生',owner:'陈清',status:'意向客户',tone:'purple',date:'今天',phone:'139****2386',note:'客户关注交付周期，约定沟通制作流程。'},
    {id:'c3',name:'青屿服饰',industry:'服饰 · 华东',contact:'徐女士',owner:'王悦',status:'待跟进',tone:'',date:'昨天',phone:'137****3512',note:'已发送产品介绍，等待客户反馈。'},
    {id:'c4',name:'澄川数码',industry:'数码产品 · 华北',contact:'何先生',owner:'李然',status:'合作中',tone:'green',date:'昨天',phone:'136****4860',note:'复盘本月合作效果，整理后续合作需求。'},
    {id:'c5',name:'栖野户外',industry:'户外用品 · 西南',contact:'吴女士',owner:'陈清',status:'意向客户',tone:'purple',date:'10月10日',phone:'135****5098',note:'确认新品推广计划与预算范围。'},
    {id:'c6',name:'云杉供应链',industry:'供应链 · 华南',contact:'赵先生',owner:'王悦',status:'待跟进',tone:'',date:'10月9日',phone:'134****6120',note:'初次沟通已完成，补充客户业务信息。'}
  ];
  const followups=[{client:'c1',time:'今天 10:00',action:'确认商品素材需求',owner:'李然'},{client:'c2',time:'今天 14:30',action:'沟通合作方案与交付周期',owner:'陈清'},{client:'c3',time:'今天 16:00',action:'了解客户反馈与下一步计划',owner:'王悦'}];
  const stages=['需求沟通','方案确认','商务洽谈','即将成交'];
  const deals=[{client:'c3',name:'夏季服饰素材合作',amount:12000,owner:'王悦'},{client:'c2',name:'家居新品推广方案',amount:18000,owner:'陈清'},{client:'c5',name:'户外新品内容合作',amount:24000,owner:'陈清'},{client:'c1',name:'商品内容年度合作',amount:32000,owner:'李然'}];
  const views={home:['CRM工作台','客户、跟进与商机，一处查看。'],customers:['客户管理','查看客户信息，掌握每一次跟进。'],followups:['跟进记录','整理沟通内容，安排下一步行动。'],opportunities:['商机管理','按阶段查看合作进展。']};
  const state={platform:'crm',view:'home',query:'',status:'全部状态'};
  try{const saved=JSON.parse(localStorage.getItem('chaoren-platform-preview-v1')||'null');if(saved&&['creation','crm'].includes(saved.platform))state.platform=saved.platform;if(saved&&views[saved.view])state.view=saved.view;}catch{}
  // 同一顶栏承载品牌、平台导航与账号，切换时保留原有创作节点。
  document.body.classList.add('console-shell');
  const header=q('.topbar'),sidebar=q('.sidebar');
  sidebar.id='consoleSidebar';
  const headerLeft=document.createElement('div');headerLeft.className='console-header-left';
  const brandGroup=document.createElement('div');brandGroup.className='console-brand-group';
  brandGroup.innerHTML='<button type="button" class="console-menu-toggle" aria-label="收起功能菜单" aria-expanded="true" aria-controls="consoleSidebar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M9 4.5v15"/></svg></button>';
  brandGroup.prepend(q('.brand'));headerLeft.append(brandGroup);
  const switcher=document.createElement('nav');switcher.className='platform-switch';switcher.setAttribute('aria-label','平台导航');
  switcher.innerHTML='<button type="button" data-platform="creation">创作平台</button><button type="button" data-platform="crm">CRM平台</button>';
  headerLeft.append(switcher);header.firstElementChild.replaceWith(headerLeft);
  q('.app-shell').prepend(header);
  const notice=document.createElement('aside');notice.className='console-notice';notice.setAttribute('aria-label','平台通知');
  notice.innerHTML='<div class="console-notice-inner"><span class="console-notice-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 10 14-5v14L4 14v-4ZM8 15l1 5h3l-1-4M21 9v6"/></svg>公告</span><p>创作平台与 CRM 平台，顶部一键切换。</p><button type="button" class="console-notice-details" aria-haspopup="dialog">查看详情<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></div>';
  q('.main').prepend(notice);
  notice.querySelector('button').addEventListener('click',()=>{
    let detail=q('#consoleNoticeDetail');
    if(!detail){
      detail=document.createElement('dialog');detail.id='consoleNoticeDetail';detail.className='console-notice-dialog';detail.setAttribute('aria-labelledby','consoleNoticeTitle');
      detail.innerHTML='<span class="console-notice-dialog-label">平台公告</span><h2 id="consoleNoticeTitle">平台切换使用说明</h2><p>点击顶部的“创作平台”或“CRM平台”，即可切换到对应的工作空间，左侧菜单会同步显示该平台的功能。</p><p><strong>创作平台</strong>：查看智能创作、AI 应用、审核中心与资产库。</p><p><strong>CRM平台</strong>：预览客户管理、跟进记录与商机管理。</p><form method="dialog"><button type="submit">我知道了</button></form>';
      document.body.append(detail);
    }
    detail.showModal();
  });
  const menuToggle=q('.console-menu-toggle');
  function toggleSidebar(collapsed){document.body.classList.toggle('console-nav-collapsed',collapsed);menuToggle.setAttribute('aria-expanded',String(!collapsed));menuToggle.setAttribute('aria-label',collapsed?'展开功能菜单':'收起功能菜单');}
  menuToggle.addEventListener('click',()=>toggleSidebar(!document.body.classList.contains('console-nav-collapsed')));
  if(window.matchMedia('(max-width: 640px)').matches)toggleSidebar(true);
  sidebar.addEventListener('click',e=>{if(window.matchMedia('(max-width: 640px)').matches&&e.target.closest('[data-page], [data-crm-view]'))toggleSidebar(true);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.matchMedia('(max-width: 640px)').matches)toggleSidebar(true);});
  const nav=document.createElement('nav');nav.className='crm-nav';nav.setAttribute('aria-label','CRM功能导航');
  nav.innerHTML=Object.entries(views).map(([key,value])=>`<button type="button" class="crm-nav-button" data-crm-view="${key}">${icon(key)}<span>${key==='home'?'工作台':value[0]}</span></button>`).join('');q('.sidebar > .nav').after(nav);
  const note=document.createElement('div');note.className='crm-sidebar-note';note.innerHTML='<strong>客户关系管理</strong>样式预览 · 使用示例数据';q('.sidebar').append(note);
  const page=document.createElement('section');page.id='crm-preview';page.className='crm-preview';page.setAttribute('aria-label','CRM平台样式预览');notice.after(page);
  function persist(){try{localStorage.setItem('chaoren-platform-preview-v1',JSON.stringify({platform:state.platform,view:state.view}));}catch{}}
  const status=c=>`<span class="crm-status ${c.tone}">${c.status}</span>`;
  function customerRows(list){return list.map(c=>`<tr><td><div class="crm-company"><span class="crm-company-icon">${c.name[0]}</span><div><button type="button" class="crm-link" data-crm-customer="${c.id}">${c.name}</button><small>${c.industry}</small></div></div></td><td>${c.contact}</td><td>${status(c)}</td><td>${c.owner}</td><td>${c.date}</td><td><button type="button" class="crm-link" data-crm-customer="${c.id}">查看</button></td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:40px">没有找到匹配客户</td></tr>';}
  function table(list){return `<div class="crm-table-scroll"><table class="crm-table"><thead><tr><th>客户名称</th><th>联系人</th><th>客户状态</th><th>负责人</th><th>最近跟进</th><th>操作</th></tr></thead><tbody id="crmCustomerRows">${customerRows(list)}</tbody></table></div>`;}
  function recentFollowups(){return followups.map(f=>{const c=customers.find(c=>c.id===f.client);return `<div class="crm-followup-item"><div class="crm-followup-time">${f.time}</div><strong>${c.name}</strong><p>${f.action}<br>负责人：${f.owner}</p><button type="button" class="crm-link" data-crm-customer="${c.id}">查看客户 →</button></div>`;}).join('');}
  function render(){
    document.body.classList.toggle('platform-crm',state.platform==='crm');
    switcher.querySelectorAll('button').forEach(b=>{const on=b.dataset.platform===state.platform;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    nav.querySelectorAll('button').forEach(b=>{const on=b.dataset.crmView===state.view;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    const [title,subtitle]=views[state.view];
    let content='';
    if(state.view==='home')content=`<div class="crm-stats">${[['客户总数','6','查看所有客户','customers'],['今日待跟进','3','下一步行动已整理','followups'],['进行中商机','4','关注当前合作进展','opportunities'],['预计成交金额','¥86,000','示例商机金额合计','opportunities']].map(([label,value,hint,i])=>`<div class="crm-stat"><div class="crm-stat-top"><span>${label}</span><span class="crm-stat-icon">${icon(i)}</span></div><strong>${value}</strong><small>${hint}</small></div>`).join('')}</div><div class="crm-overview-grid"><div class="crm-panel"><div class="crm-panel-head"><h2>最近联系的客户</h2><button type="button" class="crm-link" data-crm-view="customers">查看全部 →</button></div>${table(customers.slice(0,4))}<div class="crm-panel-foot"><span>示例客户信息</span><span>共 ${customers.length} 位客户</span></div></div><div class="crm-panel"><div class="crm-panel-head"><h2>今日待跟进</h2><span>3 项</span></div>${recentFollowups()}</div></div>`;
    if(state.view==='customers')content=`<div class="crm-panel"><div class="crm-panel-head"><h2>客户列表</h2><span>共 6 位示例客户</span></div><div class="crm-filter"><input id="crmSearch" type="search" value="${esc(state.query)}" placeholder="搜索客户或联系人" aria-label="搜索客户"><select id="crmStatus" aria-label="筛选客户状态">${['全部状态','合作中','意向客户','待跟进'].map(s=>`<option ${s===state.status?'selected':''}>${s}</option>`).join('')}</select></div>${table(filtered())}<div class="crm-panel-foot"><span>仅展示样式预览数据</span><span>第 1 页</span></div></div>`;
    if(state.view==='followups')content=`<div class="crm-panel"><div class="crm-panel-head"><h2>今日跟进安排</h2><span>示例记录</span></div>${recentFollowups()}</div>`;
    if(state.view==='opportunities')content=`<div class="crm-board">${stages.map((stage,i)=>{const deal=deals[i],c=customers.find(c=>c.id===deal.client);return `<section class="crm-board-column"><h2>${stage}<span>1</span></h2><article class="crm-opportunity"><strong>${deal.name}</strong><p>${c.name}</p><b>¥${deal.amount.toLocaleString()}</b><small>负责人：${deal.owner}</small><p>预计成交 · 本月</p><button type="button" class="crm-link" data-crm-customer="${c.id}">查看客户</button></article></section>`;}).join('')}</div>`;
    page.innerHTML=`<div class="crm-container"><div class="crm-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="crm-heading-actions"><span class="crm-preview-tag">样式预览 · 示例数据</span><button type="button" class="crm-button primary" data-crm-add>${icon('plus')}新增客户</button></div></div>${content}</div>`;
  }
  function filtered(){const query=state.query.trim().toLowerCase();return customers.filter(c=>(state.status==='全部状态'||c.status===state.status)&&[c.name,c.contact,c.owner].join(' ').toLowerCase().includes(query));}
  function openCustomer(id){
    const c=customers.find(c=>c.id===id);if(!c)return;let drawer=q('#crmDetail');
    if(!drawer){drawer=document.createElement('dialog');drawer.id='crmDetail';drawer.className='crm-drawer';drawer.setAttribute('aria-labelledby','crmDetailTitle');document.body.append(drawer);}
    drawer.innerHTML=`<div class="crm-drawer-head"><h2 id="crmDetailTitle">${c.name}</h2><button type="button" class="crm-drawer-close" data-crm-close aria-label="关闭客户详情">×</button></div><p>${c.industry} · 示例客户</p>${status(c)}<dl class="crm-detail-grid">${[['联系人',c.contact],['联系电话',c.phone],['负责人',c.owner],['最近跟进',c.date]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><h3>跟进记录</h3><div class="crm-detail-record"><small>${c.date} · ${c.owner}</small><p>${c.note}</p></div><div class="crm-detail-record"><small>首次沟通</small><p>了解业务需求，建立客户信息。</p></div><button type="button" class="crm-button" data-crm-preview-action>记录跟进</button><p class="crm-preview-tag">此处为详情样式，业务功能后续接入。</p>`;drawer.showModal();
  }
  document.addEventListener('click',e=>{
    const platform=e.target.closest('[data-platform]');if(platform){state.platform=platform.dataset.platform;render();persist();return;}
    const view=e.target.closest('[data-crm-view]');if(view){state.view=view.dataset.crmView;render();persist();return;}
    const customer=e.target.closest('[data-crm-customer]');if(customer){openCustomer(customer.dataset.crmCustomer);return;}
    if(e.target.closest('[data-crm-close]')){q('#crmDetail').close();return;}
    if(e.target.closest('[data-crm-add]')||e.target.closest('[data-crm-preview-action]'))showToast('当前为 CRM 样式预览，业务功能后续接入。');
  });
  document.addEventListener('input',e=>{if(e.target.id==='crmSearch'){state.query=e.target.value;q('#crmCustomerRows').innerHTML=customerRows(filtered());}});
  document.addEventListener('change',e=>{if(e.target.id==='crmStatus'){state.status=e.target.value;q('#crmCustomerRows').innerHTML=customerRows(filtered());}});
  render();
})();
