/* 创作平台切换、达人管理与其余 CRM 占位页。 */
(() => {
  'use strict';
  const q=s=>document.querySelector(s),esc=escapeHtml;
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
    creation:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    crm:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="10" r="2"/><path d="M5 16c0-3 6-3 6 0M14 9h4M14 13h4"/>',
    customers:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 4v2"/>',
    tags:'<path d="M20 13 11 22 2 13V3h10l8 8a1.4 1.4 0 0 1 0 2Z"/><circle cx="7" cy="8" r="1.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>'
  }[name]||''}</svg>`;
  // CRM 仅保留达人管理与标签管理。
  const views={customers:'达人管理',tags:'标签管理'};
  const creatorFields=[
    {key:'date',label:'日期',type:'date',width:124},
    {key:'douyinUid',label:'抖音uid',type:'text',width:160,max:64},
    {key:'name',label:'达人名称',type:'text',width:160,max:100,required:true},
    {key:'mark',label:'达人标记',type:'mark',width:300},
    {key:'aiAnalysis',label:'AI分析',type:'analysis',width:240},
    {key:'profileUrl',label:'抖音主页链接',type:'url',width:200,max:2000},
    {key:'sender',label:'寄样人',type:'text',width:112,max:100},
    {key:'contentType',label:'内容形式',type:'select',width:136,options:['种草-图文','种草-视频','带货-直播','带货-视频']},
    {key:'productName',label:'寄样产品名称',type:'textarea',width:240,max:500},
    {key:'address',label:'收货地址',type:'address',width:280,max:500},
    {key:'phone',label:'手机号码',type:'tel',width:150,max:32},
    {key:'recipient',label:'收件人',type:'text',width:120,max:100}
  ];
  const CREATOR_PRESET_TAGS=['内容好','互动好','配合好','可长期合作'];
  const CREATOR_TAG_STORAGE_KEY='chaoren-crm-tags-v1';
  const CREATOR_STORAGE_KEY='chaoren-crm-creators-v1';
  const state={platform:'crm',view:'customers',creatorQuery:'',creatorTags:[],creatorTagDraft:[],creatorTagMode:'any',creatorTagModeDraft:'any',tagNames:[],tagQuery:'',tagLoadError:'',creatorDateStart:'',creatorDateEnd:'',creatorPage:1,creatorLoadError:'',creatorMarkEdit:null,creators:[]};
  state.creators=loadCreators();
  addCreatorExample();
  state.tagNames=loadCreatorTags();
  let importReview=null,importReadVersion=0;
  const CREATOR_AI_STORAGE_KEY='chaoren-crm-ai-conversations-v1';
  let aiHistoryLoadFailed=false,aiHistoryError='',aiScope='',aiReturnFocus=null;
  const aiDrafts=Object.create(null),aiSessions=loadCreatorAiSessions();
  try{const saved=JSON.parse(localStorage.getItem('chaoren-platform-preview-v1')||'null');if(saved&&['creation','crm'].includes(saved.platform))state.platform=saved.platform;if(saved&&Object.hasOwn(views,saved.view))state.view=saved.view;else if(saved?.view==='followups')state.view='tags';}catch{}
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
      detail.innerHTML='<span class="console-notice-dialog-label">平台公告</span><h2 id="consoleNoticeTitle">平台切换使用说明</h2><p>点击顶部的“创作平台”或“CRM平台”，即可切换到对应的工作空间，左侧菜单会同步显示该平台的功能。</p><p><strong>创作平台</strong>：查看智能创作、AI 应用、审核中心与资产库。</p><p><strong>CRM平台</strong>：在达人管理中维护资料与寄样信息，通过标签管理统一维护达人标签。</p><form method="dialog"><button type="submit">我知道了</button></form>';
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
  nav.innerHTML=Object.entries(views).map(([key,value])=>`<button type="button" class="crm-nav-button" data-crm-view="${key}">${icon(key)}<span>${value}</span></button>`).join('');q('.sidebar > .nav').after(nav);
  const note=document.createElement('div');note.className='crm-sidebar-note';note.innerHTML='<strong>达人合作管理</strong>达人资料 · 寄样信息';q('.sidebar').append(note);
  const page=document.createElement('section');page.id='crm-preview';page.className='crm-preview';page.setAttribute('aria-label','CRM平台');page.setAttribute('aria-live','polite');notice.after(page);
  const aiLauncher=document.createElement('button');aiLauncher.type='button';aiLauncher.id='crmAiLauncher';aiLauncher.className='crm-ai-fab';aiLauncher.dataset.crmAiOpen='';aiLauncher.setAttribute('aria-label','打开AI合作助手对话，可拖动移动');aiLauncher.title='点击打开对话，拖动移动位置';aiLauncher.setAttribute('aria-expanded','false');aiLauncher.setAttribute('aria-controls','crmCreatorAnalysis');
  aiLauncher.innerHTML='<span class="crm-ai-fab-tip">点击对话 · 拖动移动</span><img src="./creator-assistant.svg" alt="" width="88" height="99" draggable="false" /><span class="crm-ai-fab-label">AI 助手</span>';document.body.append(aiLauncher);
  const fitCreatorAiLauncher=enableCreatorAiDrag(aiLauncher);
  function persist(){try{localStorage.setItem('chaoren-platform-preview-v1',JSON.stringify({platform:state.platform,view:state.view}));}catch{}}
  function loadCreators(){
    try{
      const saved=localStorage.getItem(CREATOR_STORAGE_KEY);
      if(!saved)return [];
      const records=JSON.parse(saved),ids=new Set();
      if(!Array.isArray(records))throw new Error('Invalid creator records');
      return records.map(record=>{
        if(!record||typeof record.id!=='string'||!record.id||ids.has(record.id))throw new Error('Invalid creator record');
        ids.add(record.id);
        const next={id:record.id};
        creatorFields.forEach(field=>{
          if(field.type==='analysis'){
            if(record.aiAnalysis!==undefined&&typeof record.aiAnalysis!=='string')throw new Error('Invalid creator analysis');
            next.aiAnalysis=record.aiAnalysis||'';return;
          }
          if(field.type==='mark'){
            const mark=record.mark??{tags:[],note:'',group:''};
            if(!mark||!Array.isArray(mark.tags)||!mark.tags.every(tag=>typeof tag==='string')||typeof mark.note!=='string'||typeof mark.group!=='string')throw new Error('Invalid creator mark');
            next.mark={tags:[...mark.tags],note:mark.note,group:mark.group};return;
          }
          if(typeof record[field.key]!=='string')throw new Error('Invalid creator field');
          next[field.key]=record[field.key];
        });
        if(record.addressParts&&typeof record.addressParts==='object'&&!Array.isArray(record.addressParts)){
          const keys=['provinceCode','provinceName','cityCode','cityName','districtCode','districtName','townCode','townName','detail'];
          if(keys.every(key=>typeof record.addressParts[key]==='string'))next.addressParts=Object.fromEntries(keys.map(key=>[key,record.addressParts[key]]));
        }
        return next;
      });
    }catch{
      state.creatorLoadError='本地达人数据读取失败，请刷新后重试。';
      return [];
    }
  }
  function addCreatorExample(){
    // 只为空列表补充一次示例；编辑或删除后不在刷新时重新生成。
    if(state.creatorLoadError||state.creators.length)return;
    try{
      const exampleKey='chaoren-crm-creator-example-v1';
      if(localStorage.getItem(exampleKey))return;
      const example={
        id:'creator-example-1',date:localDate(),douyinUid:'DEMO10001',name:'小橙的好物日记（示例）',
        mark:{tags:['内容好','互动好'],note:'内容质量好，评论互动积极，寄样后 3 天跟进。',group:'小张负责'},
        profileUrl:'',sender:'小李（示例）',contentType:'种草-视频',productName:'J 形小猪抱枕（示例）',
        address:'广东省广州市天河区示例路 88 号（虚构地址）',phone:'138****0000',recipient:'小橙（示例）'
      };
      localStorage.setItem(CREATOR_STORAGE_KEY,JSON.stringify([example]));
      state.creators=[example];
      localStorage.setItem(exampleKey,'1');
    }catch{}
  }
  function saveCreators(records){
    if(state.creatorLoadError)return false;
    if(!state.tagLoadError)return saveCreatorTagCatalog(knownCreatorTags(records.flatMap(record=>record.mark.tags)),records);
    try{localStorage.setItem(CREATOR_STORAGE_KEY,JSON.stringify(records));state.creators=records;return true;}
    catch{showToast('保存失败，请检查浏览器是否允许本地存储。');return false;}
  }
  function profileUrl(value){
    try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}
  }
  function creatorMarkCell(record){
    const pencil='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6M11 21h10"/></svg>';
    return `<div class="crm-creator-mark">${[['tags','标签'],['note','备注'],['group','分组']].map(([field,label])=>{
      const editing=state.creatorMarkEdit?.id===record.id&&state.creatorMarkEdit.field===field;
      let content;
      if(editing)content=creatorInlineMarkEditor(record,field,label);
      else if(field==='tags')content=record.mark.tags.length?`<span class="crm-creator-mark-tags">${record.mark.tags.map(tag=>`<span class="crm-creator-mark-tag">${esc(tag)}</span>`).join('')}</span>`:'<span class="crm-creator-missing">未设置</span>';
      else if(field==='note')content=`<span class="crm-creator-mark-note" title="${esc(record.mark.note)}">${esc(record.mark.note)||'<span class="crm-creator-missing">未填写</span>'}</span>`;
      else content=record.mark.group?`<span><span class="crm-creator-mark-group">${esc(record.mark.group)}</span></span>`:'<span class="crm-creator-missing">未分组</span>';
      return `<div class="crm-creator-mark-row"><button type="button" class="crm-creator-mark-label" data-crm-creator-mark="${esc(record.id)}" data-crm-mark-field="${field}" aria-label="编辑${esc(record.name)}的${label}" aria-expanded="${editing}" title="编辑${label}">${label}${pencil}</button>${content}</div>`;
    }).join('')}</div>`;
  }
  function knownCreatorTags(extra=[]){
    return [...new Set([...state.tagNames,...state.creators.flatMap(record=>record.mark.tags),...extra])];
  }
  function creatorTagPickerSelected(tags){
    return tags.length?tags.map(tag=>`<button type="button" class="crm-creator-mark-tag" data-crm-tag-action="remove" data-tag="${esc(tag)}" aria-label="移除标签${esc(tag)}">${esc(tag)}<span aria-hidden="true">×</span></button>`).join(''):'<span class="crm-creator-missing">暂未选择标签</span>';
  }
  function creatorTagPickerOptions(tags){
    return knownCreatorTags(tags).map(tag=>`<button type="button" data-crm-tag-action="toggle" data-tag="${esc(tag)}" aria-pressed="${tags.includes(tag)}"><span aria-hidden="true">${tags.includes(tag)?'✓':'＋'}</span>${esc(tag)}</button>`).join('');
  }
  function creatorTagPicker(tags,id,name){
    return `<div class="crm-creator-tag-picker"><input type="hidden" id="${id}" name="${name}" value="${esc(tags.join('，'))}" /><span class="crm-creator-tag-caption">已选标签</span><div class="crm-creator-inline-tags" data-crm-tag-selected>${creatorTagPickerSelected(tags)}</div><span class="crm-creator-tag-caption">选择标签（可多选）</span><div class="crm-creator-mark-suggestions" data-crm-tag-options>${creatorTagPickerOptions(tags)}</div><div class="crm-creator-tag-custom"><input id="${id}Custom" type="text" maxlength="24" placeholder="输入自定义标签" aria-label="自定义标签" aria-describedby="${id}Hint ${id}Error" data-crm-tag-custom /><button type="button" data-crm-tag-action="add">添加</button></div><p id="${id}Hint" class="crm-creator-mark-hint">可选择已有标签，也可自定义；最多 10 个。</p><p id="${id}Error" class="crm-creator-inline-error" role="alert" data-crm-tag-error hidden></p></div>`;
  }
  function refreshCreatorTagPicker(picker,focusTag=null){
    const tags=creatorMarkTags(picker.querySelector('input[type="hidden"]').value);
    picker.querySelector('[data-crm-tag-selected]').innerHTML=creatorTagPickerSelected(tags);
    picker.querySelector('[data-crm-tag-options]').innerHTML=creatorTagPickerOptions(tags);
    if(focusTag!==null)Array.from(picker.querySelectorAll('[data-crm-tag-action="toggle"]')).find(button=>button.dataset.tag===focusTag)?.focus();
  }
  function setCreatorPickerTags(picker,tags){
    const error=picker.querySelector('[data-crm-tag-error]');
    if(tags.length>10||tags.some(tag=>tag.length>24)){
      error.textContent='最多 10 个标签，每个不超过 24 个字。';error.hidden=false;return false;
    }
    picker.querySelector('input[type="hidden"]').value=tags.join('，');error.hidden=true;refreshCreatorTagPicker(picker);return true;
  }
  function addCreatorCustomTag(picker,required=false){
    const input=picker.querySelector('[data-crm-tag-custom]'),newTags=creatorMarkTags(input.value);
    if(!newTags.length){
      if(required){const error=picker.querySelector('[data-crm-tag-error]');error.textContent='请输入自定义标签。';error.hidden=false;input.focus();return false;}
      return true;
    }
    const tags=creatorMarkTags(picker.querySelector('input[type="hidden"]').value);
    if(!setCreatorPickerTags(picker,[...new Set([...tags,...newTags])])){input.focus();return false;}
    input.value='';return true;
  }
  function creatorInlineMarkEditor(record,field,label){
    const value=record.mark[field];
    const input=field==='tags'?creatorTagPicker(value,'crmInlineMarkInput','value'):(field==='note'?`<textarea id="crmInlineMarkInput" name="value" rows="3" maxlength="300" aria-label="备注">${esc(value)}</textarea>`:`<input id="crmInlineMarkInput" name="value" type="text" maxlength="100" value="${esc(value)}" aria-label="${label}" placeholder="输入分组名称" />`);
    return `<form id="crmCreatorInlineMarkForm" class="crm-creator-inline-mark" data-record-id="${esc(record.id)}" data-mark-field="${field}" aria-label="编辑${label}">${input}<p id="crmInlineMarkError" class="crm-creator-inline-error" role="alert" hidden></p><div class="crm-creator-inline-actions"><button type="submit">保存</button><button type="button" data-crm-inline-cancel>取消</button></div></form>`;
  }
  function closeInlineMarkEditor(){
    const editing=state.creatorMarkEdit;state.creatorMarkEdit=null;renderCreatorRecords();
    if(editing)Array.from(document.querySelectorAll('[data-crm-creator-mark]')).find(button=>button.dataset.crmCreatorMark===editing.id&&button.dataset.crmMarkField===editing.field)?.focus();
  }
  function submitInlineMark(form){
    const record=state.creators.find(item=>item.id===form.dataset.recordId),field=form.dataset.markField;
    if(!record||!['tags','note','group'].includes(field)||!form.reportValidity())return;
    const picker=form.querySelector('.crm-creator-tag-picker');if(picker&&!addCreatorCustomTag(picker))return;
    const input=q('#crmInlineMarkInput'),value=field==='tags'?creatorMarkTags(input.value):input.value.trim(),error=q('#crmInlineMarkError');
    if(field==='tags'&&(value.length>10||value.some(tag=>tag.length>24))){error.textContent='最多 10 个标签，每个不超过 24 个字。';error.hidden=false;input.focus();return;}
    const updated={...record,mark:{...record.mark,[field]:value}};
    if(!saveCreators(state.creators.map(item=>item.id===record.id?updated:item))){error.textContent='保存失败，请重试。';error.hidden=false;return;}
    closeInlineMarkEditor();showToast('达人标记已更新。');
  }
  function creatorMarkTags(value){
    return [...new Set(value.split(/[,，、\n]/).map(tag=>tag.trim()).filter(Boolean))];
  }
  function creatorMarkEditor(mark){
    return `<fieldset class="crm-creator-field crm-creator-mark-editor is-wide"><legend>达人标记</legend><div class="crm-creator-mark-editor-row"><label for="crmCreatorMarkTagsCustom">标签</label>${creatorTagPicker(mark.tags,'crmCreatorMarkTags','markTags')}</div><div class="crm-creator-mark-editor-row"><label for="crmCreatorMarkNote">备注</label><textarea id="crmCreatorMarkNote" name="markNote" rows="2" maxlength="300" placeholder="填写合作表现、沟通情况或注意事项">${esc(mark.note)}</textarea></div><div class="crm-creator-mark-editor-row"><label for="crmCreatorMarkGroup">分组</label><input id="crmCreatorMarkGroup" name="markGroup" type="text" value="${esc(mark.group)}" maxlength="100" placeholder="例如：重点合作、负责人分组" /></div></fieldset>`;
  }
  function creatorTagFilterMarkup(){
    const selected=state.creatorTagDraft,tags=knownCreatorTags([...state.creatorTags,...selected]);
    return `<span class="crm-creator-date-label">标签</span><details class="crm-creator-tag-dropdown" id="crmCreatorTagDropdown"><summary aria-label="选择筛选标签，可多选" title="${esc(selected.join('、')||'全部标签')}"><span>${selected.length?`已选 ${selected.length} 个标签`:'全部标签'}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="crm-creator-tag-dropdown-panel"><div class="crm-creator-tag-dropdown-heading"><strong>选择标签</strong><button type="button" data-crm-filter-all>清空</button></div><div class="crm-creator-tag-filter-options" role="group" aria-label="多选达人标签">${tags.map(tag=>`<label title="${esc(tag)}"><input type="checkbox" data-crm-filter-tag="${esc(tag)}" value="${esc(tag)}" ${selected.includes(tag)?'checked':''} /><span>${esc(tag)}</span></label>`).join('')||'<span class="crm-creator-missing">暂无标签</span>'}</div><div class="crm-creator-tag-dropdown-footer"><select id="crmCreatorTagMatch" aria-label="多标签匹配方式"><option value="any" ${state.creatorTagModeDraft==='any'?'selected':''}>匹配任意标签</option><option value="all" ${state.creatorTagModeDraft==='all'?'selected':''}>同时包含全部</option></select><span>可多选，点击搜索后生效</span></div></div></details>`;
  }
  function refreshCreatorTagFilter(){
    const filter=q('#crmCreatorTagFilter');if(!filter)return;
    const open=Boolean(q('#crmCreatorTagDropdown')?.open),scrollTop=q('.crm-creator-tag-filter-options')?.scrollTop||0;
    filter.innerHTML=creatorTagFilterMarkup();q('#crmCreatorTagDropdown').open=open;q('.crm-creator-tag-filter-options').scrollTop=scrollTop;
  }
  function creatorCell(record,field){
    if(field.type==='analysis')return `<div class="crm-ai-cell">${record.aiAnalysis?`<span class="crm-ai-cell-source">演示分析</span><span class="crm-ai-cell-summary" title="${esc(record.aiAnalysis)}">${esc(record.aiAnalysis)}</span>`:'<span class="crm-creator-missing">暂无分析结果</span>'}<button type="button" data-crm-ai-open="${esc(record.id)}">${record.aiAnalysis?'查看分析':'开始分析'} ↗</button></div>`;
    if(field.type==='mark')return creatorMarkCell(record);
    const value=record[field.key];
    if(!value)return '<span class="crm-creator-missing">—</span>';
    if(field.key==='profileUrl'){
      const url=profileUrl(value);
      if(url)return `<a class="crm-creator-profile" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(value)}">${esc(value)}</a>`;
    }
    if(field.key==='contentType')return `<span class="crm-creator-tag">${esc(value)}</span>`;
    return `<span class="crm-creator-cell ${field.key==='name'?'is-name':''}" title="${esc(value)}">${esc(value)}</span>`;
  }
  function filteredCreators(){
    const query=state.creatorQuery.trim().toLocaleLowerCase();
    return state.creators.filter(record=>{
      const matchesQuery=!query||['name','douyinUid','phone'].some(key=>record[key].toLocaleLowerCase().includes(query));
      const matchesStart=!state.creatorDateStart||(record.date&&record.date>=state.creatorDateStart);
      const matchesEnd=!state.creatorDateEnd||(record.date&&record.date<=state.creatorDateEnd);
      const matchesTag=!state.creatorTags.length||(state.creatorTagMode==='all'?state.creatorTags.every(tag=>record.mark.tags.includes(tag)):state.creatorTags.some(tag=>record.mark.tags.includes(tag)));
      return matchesQuery&&matchesTag&&matchesStart&&matchesEnd;
    });
  }
  function renderCreatorRecords(){
    const body=q('#crmCreatorRows');if(!body)return;
    refreshCreatorTagFilter();
    const hasFilters=Boolean(state.creatorQuery.trim()||state.creatorTags.length||state.creatorDateStart||state.creatorDateEnd);
    const records=filteredCreators();
    const pageSize=20,totalPages=Math.max(1,Math.ceil(records.length/pageSize));
    state.creatorPage=Math.min(Math.max(1,state.creatorPage),totalPages);
    const start=(state.creatorPage-1)*pageSize;
    body.innerHTML=records.slice(start,start+pageSize).map(record=>`<tr>${creatorFields.map(field=>`<td>${creatorCell(record,field)}</td>`).join('')}<td class="crm-creator-actions"><button type="button" data-crm-creator-view="${esc(record.id)}" aria-label="查看${esc(record.name)}">查看</button><button type="button" data-crm-creator-edit="${esc(record.id)}" aria-label="编辑${esc(record.name)}">编辑</button><button type="button" class="is-danger" data-crm-creator-delete="${esc(record.id)}" aria-label="删除${esc(record.name)}">删除</button></td></tr>`).join('');
    if(q('#crmCreatorAnalysis')?.open)renderCreatorAnalysis();
    const empty=q('#crmCreatorEmpty');empty.hidden=records.length>0;
    q('#crmCreatorEmptyTitle').textContent=state.creatorLoadError?'暂时无法读取达人记录':(hasFilters?'没有找到匹配记录':'暂无达人记录');
    q('#crmCreatorEmptyHint').textContent=state.creatorLoadError?'请刷新页面后重试。':(hasFilters?'请调整关键词、标签或日期范围。':'点击右上角“新增达人”，添加第一条记录。');
    q('#crmCreatorPagination').innerHTML=`<span>第 ${state.creatorPage} / ${totalPages} 页</span><button type="button" data-crm-creator-page="${state.creatorPage-1}" aria-label="上一页" ${state.creatorPage===1?'disabled':''}>‹</button><button type="button" data-crm-creator-page="${state.creatorPage+1}" aria-label="下一页" ${state.creatorPage===totalPages?'disabled':''}>›</button>`;
  }
  function creatorDateFiltersMarkup(){
    return `<div class="crm-creator-date-range" role="group" aria-labelledby="crmCreatorDateLabel"><span id="crmCreatorDateLabel" class="crm-creator-date-label">日期</span><input id="crmCreatorDateStart" type="date" value="${esc(state.creatorDateStart)}" aria-label="开始日期" /><span class="crm-creator-date-separator">至</span><input id="crmCreatorDateEnd" type="date" value="${esc(state.creatorDateEnd)}" aria-label="结束日期" /></div>`;
  }
  function creatorPageMarkup(){
    return `<div class="crm-container crm-creators"><header class="crm-creators-heading"><div><h1>达人管理</h1><p>集中管理达人资料与寄样信息。</p></div><div class="crm-creator-heading-actions"><button class="crm-creator-primary" type="button" data-crm-creator-add ${state.creatorLoadError?'disabled':''}>${icon('plus')}新增达人</button><button class="crm-creator-secondary" type="button" data-crm-creator-import ${state.creatorLoadError?'disabled':''}>导入达人</button></div></header>${state.creatorLoadError?`<p class="crm-creator-alert" role="alert">${esc(state.creatorLoadError)}</p>`:''}<section class="crm-creator-panel" aria-label="达人列表"><form id="crmCreatorFilters" class="crm-creator-toolbar" role="search" aria-label="达人搜索与日期筛选"><label class="crm-creator-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input id="crmCreatorSearch" type="search" value="${esc(state.creatorQuery)}" placeholder="搜索达人名称、抖音 UID、手机号" aria-label="搜索达人名称、抖音 UID 或手机号" /></label><div class="crm-creator-tag-filter" id="crmCreatorTagFilter">${creatorTagFilterMarkup()}</div>${creatorDateFiltersMarkup()}<div class="crm-creator-filter-actions"><button type="submit" class="crm-creator-primary">搜索</button><button type="button" class="crm-creator-secondary" data-crm-creator-reset>重置</button></div><p class="crm-creator-filter-error" id="crmCreatorDateError" role="alert" hidden>开始日期不能晚于结束日期。</p></form><div class="crm-creator-table-scroll" tabindex="0" role="region" aria-label="达人资料表，可横向滚动"><table class="crm-creator-table" aria-label="达人寄样信息列表"><colgroup>${creatorFields.map(field=>`<col style="width:${field.width}px" />`).join('')}<col style="width:166px" /></colgroup><thead><tr>${creatorFields.map(field=>`<th scope="col">${field.label}</th>`).join('')}<th scope="col" class="crm-creator-actions">操作</th></tr></thead><tbody id="crmCreatorRows"></tbody></table></div><div class="crm-creator-empty" id="crmCreatorEmpty"><span aria-hidden="true">${icon('customers')}</span><h2 id="crmCreatorEmptyTitle">暂无达人记录</h2><p id="crmCreatorEmptyHint"></p></div><footer class="crm-creator-footer"><span>达人资料与寄样信息</span><div id="crmCreatorPagination" class="crm-creator-pagination"></div></footer></section></div>`;
  }
  function localDate(){
    const date=new Date(),pad=value=>String(value).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  }
  function openCreatorEditor(id=''){
    if(state.creatorLoadError)return;
    const record=id?state.creators.find(item=>item.id===id):null;
    if(id&&!record)return;
    let dialog=q('#crmCreatorEditor');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='crmCreatorEditor';dialog.className='crm-creator-dialog';dialog.setAttribute('aria-labelledby','crmCreatorEditorTitle');document.body.append(dialog);}
    const fields=creatorFields.filter(field=>field.type!=='analysis').map(field=>{
      if(field.type==='mark')return creatorMarkEditor(record?.mark||{tags:[],note:'',group:''});
      const value=record?.[field.key]??(field.type==='date'?localDate():''),fieldId=`crmCreatorField-${field.key}`;
      const attrs=`id="${fieldId}" name="${field.key}" ${field.required?'required':''} ${field.max?`maxlength="${field.max}"`:''}`;
      let input;
      if(field.type==='address')input='<div id="crmCreatorAddress"></div>';
      else if(field.type==='select'){
        const options=field.options.includes(value)||!value?field.options:[value,...field.options];
        input=`<select ${attrs}><option value="">请选择</option>${options.map(option=>`<option value="${esc(option)}" ${option===value?'selected':''}>${esc(option)}</option>`).join('')}</select>`;
      }else if(field.type==='textarea')input=`<textarea ${attrs} rows="2" placeholder="请输入${field.label}">${esc(value)}</textarea>`;
      else input=`<input ${attrs} type="${field.type}" value="${esc(value)}" ${field.type==='tel'?'inputmode="tel"':''} placeholder="${field.type==='url'?'https://www.douyin.com/user/…':`请输入${field.label}`}" />`;
      return `<div class="crm-creator-field ${['textarea','address'].includes(field.type)?'is-wide':''}"><label for="${fieldId}">${field.label}${field.required?'<span aria-hidden="true"> *</span>':''}</label>${input}</div>`;
    }).join('');
    dialog.innerHTML=`<form id="crmCreatorForm" data-creator-id="${esc(id)}"><header class="crm-creator-dialog-head"><div><h2 id="crmCreatorEditorTitle">${record?'编辑达人':'新增达人'}</h2><p>填写达人资料与寄样收货信息。</p></div><button type="button" data-crm-creator-close aria-label="关闭">×</button></header><div class="crm-creator-form-grid">${fields}</div><p class="crm-creator-form-error" id="crmCreatorFormError" role="alert" hidden></p><footer class="crm-creator-dialog-footer"><button type="button" class="crm-creator-secondary" data-crm-creator-close>取消</button><button type="submit" class="crm-creator-primary">保存</button></footer></form>`;
    q('#crmCreatorForm').creatorAddress=window.CreatorAddress.mount(q('#crmCreatorAddress'),{value:record?.address||'',parts:record?.addressParts||null});
    dialog.showModal();
  }
  function submitCreator(form){
    if(!form.reportValidity())return;
    const picker=form.querySelector('.crm-creator-tag-picker');if(picker&&!addCreatorCustomTag(picker))return;
    const values=new FormData(form),record={id:form.dataset.creatorId||(crypto.randomUUID?.()||`creator-${Date.now()}-${Math.random().toString(16).slice(2)}`)};
    creatorFields.filter(field=>!['mark','analysis'].includes(field.type)).forEach(field=>{record[field.key]=String(values.get(field.key)||'').trim();});
    record.aiAnalysis=state.creators.find(item=>item.id===record.id)?.aiAnalysis||'';
    record.mark={tags:creatorMarkTags(String(values.get('markTags')||'')),note:String(values.get('markNote')||'').trim(),group:String(values.get('markGroup')||'').trim()};
    const error=q('#crmCreatorFormError');
    if(!record.name){error.textContent='请填写达人名称。';error.hidden=false;q('#crmCreatorField-name').focus();return;}
    if(record.mark.tags.length>10||record.mark.tags.some(tag=>tag.length>24)){error.textContent='最多添加 10 个标签，每个标签不超过 24 个字。';error.hidden=false;q('#crmCreatorMarkTagsCustom').focus();return;}
    const address=form.creatorAddress.read();
    if(!address.ok){error.textContent=address.message;error.hidden=false;address.focus.focus();return;}
    record.address=address.address;
    if(address.addressParts)record.addressParts=address.addressParts;
    if(record.profileUrl&&!profileUrl(record.profileUrl)){error.textContent='抖音主页链接需要以 https:// 或 http:// 开头。';error.hidden=false;q('#crmCreatorField-profileUrl').focus();return;}
    const editing=Boolean(form.dataset.creatorId);
    const next=editing?state.creators.map(item=>item.id===record.id?record:item):[record,...state.creators];
    if(!saveCreators(next)){error.textContent='未能保存记录，请检查本地存储后重试。';error.hidden=false;return;}
    q('#crmCreatorEditor').close();state.creatorQuery='';state.creatorTags=[];state.creatorTagDraft=[];state.creatorTagMode='any';state.creatorTagModeDraft='any';state.creatorDateStart='';state.creatorDateEnd='';state.creatorPage=1;render();showToast(editing?'达人记录已更新。':'达人记录已添加。');
  }
  function render(){
    if(state.platform!=='crm')closeCreatorAnalysis();
    state.creatorMarkEdit=null;
    document.body.classList.toggle('platform-crm',state.platform==='crm');
    if(state.platform==='crm')fitCreatorAiLauncher();
    page.classList.toggle('is-creator-page',['customers','tags'].includes(state.view));
    switcher.querySelectorAll('button').forEach(b=>{const on=b.dataset.platform===state.platform;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    nav.querySelectorAll('button').forEach(b=>{const on=b.dataset.crmView===state.view;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(state.view==='customers'){page.innerHTML=creatorPageMarkup();renderCreatorRecords();return;}
    if(state.view==='tags'){page.innerHTML=creatorTagsPageMarkup();renderCreatorTagRows();}
  }
  document.addEventListener('click',e=>{
    const aiOpen=e.target.closest('[data-crm-ai-open]');if(aiOpen){q('#crmCreatorDetails')?.close();openCreatorAnalysis(aiOpen.dataset.crmAiOpen);return;}
    if(e.target.closest('[data-crm-ai-close]')){closeCreatorAnalysis();return;}
    const aiPrompt=e.target.closest('[data-crm-ai-prompt]');if(aiPrompt){sendCreatorAnalysis(aiPrompt.dataset.crmAiPrompt);return;}
    const aiCopy=e.target.closest('[data-crm-ai-copy]');if(aiCopy){copyCreatorAnalysisReply(Number(aiCopy.dataset.crmAiCopy));return;}
    const aiSave=e.target.closest('[data-crm-ai-save]');if(aiSave){saveCreatorAnalysisResult(Number(aiSave.dataset.crmAiSave));return;}
    const dropdown=q('#crmCreatorTagDropdown');if(dropdown?.open&&!e.target.closest('#crmCreatorTagFilter'))dropdown.open=false;
    const platform=e.target.closest('[data-platform]');if(platform&&['creation','crm'].includes(platform.dataset.platform)){state.platform=platform.dataset.platform;render();persist();return;}
    const view=e.target.closest('[data-crm-view]');if(view&&Object.hasOwn(views,view.dataset.crmView)){state.view=view.dataset.crmView;render();persist();}
    const filterTag=e.target.closest('[data-crm-filter-tag]');
    if(filterTag){
      const value=filterTag.dataset.crmFilterTag;
      state.creatorTagDraft=state.creatorTagDraft.includes(value)?state.creatorTagDraft.filter(tag=>tag!==value):[...state.creatorTagDraft,value];
      refreshCreatorTagFilter();Array.from(document.querySelectorAll('[data-crm-filter-tag]')).find(button=>button.dataset.crmFilterTag===value)?.focus();return;
    }
    if(e.target.closest('[data-crm-filter-all]')){state.creatorTagDraft=[];refreshCreatorTagFilter();q('[data-crm-filter-all]').focus();return;}
    if(e.target.closest('[data-crm-tag-new]')){openCreatorTagEditor();return;}
    const editTag=e.target.closest('[data-crm-tag-edit]');if(editTag){openCreatorTagEditor(editTag.dataset.crmTagEdit);return;}
    const deleteTag=e.target.closest('[data-crm-tag-delete]');if(deleteTag){deleteCreatorTag(deleteTag.dataset.crmTagDelete);return;}
    if(e.target.closest('[data-crm-tag-close]')){q('#crmTagEditor')?.close();return;}
    const detail=e.target.closest('[data-crm-creator-view]');if(detail){openCreatorDetails(detail.dataset.crmCreatorView);return;}
    if(e.target.closest('[data-crm-detail-close]')){q('#crmCreatorDetails')?.close();return;}
    const detailEdit=e.target.closest('[data-crm-detail-edit]');if(detailEdit){q('#crmCreatorDetails').close();openCreatorEditor(detailEdit.dataset.crmDetailEdit);return;}
    if(e.target.closest('[data-crm-creator-import]')){openCreatorImport();return;}
    if(e.target.closest('[data-crm-import-close]')){importReadVersion++;q('#crmCreatorImport')?.close();return;}
    if(e.target.closest('[data-crm-import-template]')){window.CreatorImport.downloadTemplate();return;}
    if(e.target.closest('[data-crm-import-confirm]')){confirmCreatorImport();return;}
    if(e.target.closest('[data-crm-creator-add]')){openCreatorEditor();return;}
    const mark=e.target.closest('[data-crm-creator-mark]');
    if(mark){
      state.creatorMarkEdit={id:mark.dataset.crmCreatorMark,field:mark.dataset.crmMarkField};
      renderCreatorRecords();(q('#crmInlineMarkInputCustom')||q('#crmInlineMarkInput'))?.focus();return;
    }
    if(e.target.closest('[data-crm-inline-cancel]')){closeInlineMarkEditor();return;}
    const tagAction=e.target.closest('[data-crm-tag-action]');
    if(tagAction){
      const picker=tagAction.closest('.crm-creator-tag-picker'),action=tagAction.dataset.crmTagAction;
      if(action==='add'){addCreatorCustomTag(picker,true);picker.querySelector('[data-crm-tag-custom]').focus();return;}
      const tags=creatorMarkTags(picker.querySelector('input[type="hidden"]').value),value=tagAction.dataset.tag;
      const next=action==='remove'||tags.includes(value)?tags.filter(tag=>tag!==value):[...tags,value];
      if(setCreatorPickerTags(picker,next)){
        if(action==='toggle')refreshCreatorTagPicker(picker,value);
        else picker.querySelector('[data-crm-tag-custom]').focus();
      }
      return;
    }
    const edit=e.target.closest('[data-crm-creator-edit]');if(edit){openCreatorEditor(edit.dataset.crmCreatorEdit);return;}
    if(e.target.closest('[data-crm-creator-close]')){q('#crmCreatorEditor')?.close();return;}
    const remove=e.target.closest('[data-crm-creator-delete]');
    if(remove){
      const record=state.creators.find(item=>item.id===remove.dataset.crmCreatorDelete);if(!record)return;
      openConfirmModal({title:'删除达人记录',desc:`确认删除「${record.name}」的这条记录吗？`,confirmText:'确认删除',onConfirm:()=>{if(saveCreators(state.creators.filter(item=>item.id!==record.id))){renderCreatorRecords();showToast('达人记录已删除。');}}});return;
    }
    if(e.target.closest('[data-crm-creator-reset]')){state.creatorQuery='';state.creatorTags=[];state.creatorTagDraft=[];state.creatorTagMode='any';state.creatorTagModeDraft='any';state.creatorDateStart='';state.creatorDateEnd='';state.creatorPage=1;render();return;}
    const paging=e.target.closest('[data-crm-creator-page]');if(paging&&!paging.disabled){const next=Number(paging.dataset.crmCreatorPage);if(Number.isInteger(next)){state.creatorPage=next;renderCreatorRecords();}}
  });
  function validateCreatorDateRange(){
    const start=q('#crmCreatorDateStart'),end=q('#crmCreatorDateEnd');
    const invalid=Boolean(start.value&&end.value&&start.value>end.value);
    q('#crmCreatorDateError').hidden=!invalid;
    [start,end].forEach(input=>{
      if(invalid){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','crmCreatorDateError');}
      else{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}
    });
    return !invalid;
  }
  document.addEventListener('focusin',e=>{const dropdown=q('#crmCreatorTagDropdown');if(dropdown?.open&&!e.target.closest('#crmCreatorTagFilter'))dropdown.open=false;});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&e.target.closest('#crmCreatorAnalysis')){e.preventDefault();closeCreatorAnalysis();return;}
    if(e.key==='Escape'&&e.target.closest('#crmCreatorTagDropdown')){e.preventDefault();q('#crmCreatorTagDropdown').open=false;q('#crmCreatorTagDropdown summary').focus();return;}
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.target.id==='crmAiMessage'){e.preventDefault();sendCreatorAnalysis();return;}
    if(e.key==='Enter'&&!e.isComposing&&e.target.matches('[data-crm-tag-custom]')){e.preventDefault();addCreatorCustomTag(e.target.closest('.crm-creator-tag-picker'),true);}
    if(e.key==='Escape'&&e.target.closest('#crmCreatorInlineMarkForm')){e.preventDefault();closeInlineMarkEditor();}
  });
  document.addEventListener('input',e=>{if(e.target.id==='crmAiMessage'){aiDrafts[aiScope]=e.target.value;updateCreatorAnalysisSend();}if(e.target.id==='crmTagSearch'){state.tagQuery=e.target.value;renderCreatorTagRows();}if(e.target.matches('[data-crm-tag-custom]'))e.target.closest('.crm-creator-tag-picker').querySelector('[data-crm-tag-error]').hidden=true;});
  document.addEventListener('change',e=>{if(e.target.id==='crmCreatorImportFile')readCreatorImportFile(e.target.files[0]);if(e.target.id==='crmCreatorTagMatch')state.creatorTagModeDraft=e.target.value;if(e.target.id==='crmCreatorDateStart'||e.target.id==='crmCreatorDateEnd')validateCreatorDateRange();});
  document.addEventListener('submit',e=>{
    if(e.target.id==='crmAiComposer'){e.preventDefault();sendCreatorAnalysis();return;}
    if(e.target.id==='crmTagForm'){e.preventDefault();submitCreatorTag(e.target);return;}
    if(e.target.id==='crmCreatorInlineMarkForm'){e.preventDefault();submitInlineMark(e.target);return;}
    if(e.target.id==='crmCreatorForm'){e.preventDefault();submitCreator(e.target);}
    if(e.target.id==='crmCreatorFilters'){
      e.preventDefault();
      if(!validateCreatorDateRange()){q('#crmCreatorDateStart').focus();return;}
      state.creatorMarkEdit=null;
      state.creatorQuery=q('#crmCreatorSearch').value;
      state.creatorTags=[...state.creatorTagDraft];
      state.creatorTagMode=state.creatorTagModeDraft;
      state.creatorDateStart=q('#crmCreatorDateStart').value;
      state.creatorDateEnd=q('#crmCreatorDateEnd').value;
      state.creatorPage=1;renderCreatorRecords();
    }
  });
  function loadCreatorTags(){
    const defaults=[...new Set([...CREATOR_PRESET_TAGS,...state.creators.flatMap(record=>record.mark.tags)])];
    try{
      const raw=localStorage.getItem(CREATOR_TAG_STORAGE_KEY);if(!raw)return defaults;
      const tags=JSON.parse(raw);if(!Array.isArray(tags)||!tags.every(tag=>typeof tag==='string'&&tag.trim()&&tag.length<=24))throw new Error();
      return [...new Set([...tags,...state.creators.flatMap(record=>record.mark.tags)])];
    }catch{state.tagLoadError='标签数据读取失败，请刷新后重试。';return defaults;}
  }
  function saveCreatorTagCatalog(tags,records){
    if(state.tagLoadError||state.creatorLoadError)return false;
    let oldCreators,oldTags,wroteCreators=false;
    try{
      oldCreators=localStorage.getItem(CREATOR_STORAGE_KEY);oldTags=localStorage.getItem(CREATOR_TAG_STORAGE_KEY);
      localStorage.setItem(CREATOR_STORAGE_KEY,JSON.stringify(records));wroteCreators=true;
      localStorage.setItem(CREATOR_TAG_STORAGE_KEY,JSON.stringify(tags));
    }catch{
      if(wroteCreators)try{if(oldCreators===null)localStorage.removeItem(CREATOR_STORAGE_KEY);else localStorage.setItem(CREATOR_STORAGE_KEY,oldCreators);if(oldTags===null)localStorage.removeItem(CREATOR_TAG_STORAGE_KEY);else localStorage.setItem(CREATOR_TAG_STORAGE_KEY,oldTags);}catch{}
      showToast('保存失败，请检查本地存储后重试。');return false;
    }
    state.creators=records;state.tagNames=tags;return true;
  }
  function creatorTagsPageMarkup(){
    return `<div class="crm-container crm-creators"><header class="crm-creators-heading"><div><h1>标签管理</h1><p>统一维护达人标签，新增和改名后同步用于达人标记与筛选。</p></div><button type="button" class="crm-creator-primary" data-crm-tag-new ${state.tagLoadError||state.creatorLoadError?'disabled':''}>${icon('plus')}新增标签</button></header>${state.tagLoadError||state.creatorLoadError?`<p class="crm-creator-alert" role="alert">${esc(state.tagLoadError||state.creatorLoadError)}</p>`:''}<section class="crm-creator-panel"><div class="crm-creator-toolbar"><label class="crm-creator-search"><input id="crmTagSearch" type="search" value="${esc(state.tagQuery)}" aria-label="搜索标签" placeholder="搜索标签名称" /></label></div><div class="crm-tag-table-scroll"><table class="crm-tag-table"><thead><tr><th>标签名称</th><th>使用达人数</th><th>操作</th></tr></thead><tbody id="crmTagRows"></tbody></table></div><p id="crmTagEmpty" class="crm-tag-empty" hidden>暂无匹配标签</p></section></div>`;
  }
  function renderCreatorTagRows(){
    const rows=q('#crmTagRows');if(!rows)return;
    const query=state.tagQuery.trim().toLocaleLowerCase(),tags=knownCreatorTags().filter(tag=>!query||tag.toLocaleLowerCase().includes(query));
    rows.innerHTML=tags.map(tag=>`<tr><td><span class="crm-creator-mark-tag">${esc(tag)}</span></td><td>${state.creators.filter(record=>record.mark.tags.includes(tag)).length} 位达人</td><td><button type="button" data-crm-tag-edit="${esc(tag)}" ${state.tagLoadError||state.creatorLoadError?'disabled':''}>改名</button><button type="button" class="is-danger" data-crm-tag-delete="${esc(tag)}" ${state.tagLoadError||state.creatorLoadError?'disabled':''}>删除</button></td></tr>`).join('');
    q('#crmTagEmpty').hidden=tags.length>0;
  }
  function openCreatorTagEditor(original=''){
    if(state.tagLoadError||state.creatorLoadError)return;
    let dialog=q('#crmTagEditor');if(!dialog){dialog=document.createElement('dialog');dialog.id='crmTagEditor';dialog.className='crm-creator-dialog crm-tag-dialog';dialog.setAttribute('aria-labelledby','crmTagEditorTitle');document.body.append(dialog);}
    dialog.innerHTML=`<form id="crmTagForm" data-original="${esc(original)}"><header class="crm-creator-dialog-head"><div><h2 id="crmTagEditorTitle">${original?'标签改名':'新增标签'}</h2><p>${original?'改名后同步更新所有已使用此标签的达人。':'创建后可在达人标记与筛选中直接选择。'}</p></div><button type="button" data-crm-tag-close aria-label="关闭">×</button></header><div class="crm-creator-form-grid"><div class="crm-creator-field is-wide"><label for="crmTagName">标签名称</label><input id="crmTagName" name="name" required maxlength="24" value="${esc(original)}" placeholder="请输入标签名称" /></div></div><p id="crmTagFormError" class="crm-creator-form-error" role="alert" hidden></p><footer class="crm-creator-dialog-footer"><button type="button" class="crm-creator-secondary" data-crm-tag-close>取消</button><button type="submit" class="crm-creator-primary">保存</button></footer></form>`;
    dialog.showModal();q('#crmTagName').focus();
  }
  function submitCreatorTag(form){
    if(!form.reportValidity())return;
    const name=q('#crmTagName').value.trim(),original=form.dataset.original,error=q('#crmTagFormError'),tags=knownCreatorTags();
    if(!name||name.length>24||/[,，、;；\n]/.test(name)){error.textContent='标签需为 1–24 个字，不能包含逗号、分号或换行。';error.hidden=false;return;}
    if(name!==original&&tags.includes(name)){error.textContent='标签已存在，请使用其他名称。';error.hidden=false;return;}
    const nextTags=original?tags.map(tag=>tag===original?name:tag):[...tags,name];
    const records=original?state.creators.map(record=>({...record,mark:{...record.mark,tags:record.mark.tags.map(tag=>tag===original?name:tag)}})):state.creators;
    if(!saveCreatorTagCatalog(nextTags,records)){error.textContent='标签未能保存，请重试。';error.hidden=false;return;}
    if(original){state.creatorTags=state.creatorTags.map(tag=>tag===original?name:tag);state.creatorTagDraft=state.creatorTagDraft.map(tag=>tag===original?name:tag);}
    q('#crmTagEditor').close();render();showToast(original?'标签已改名并同步到达人记录。':'标签已创建。');
  }
  function deleteCreatorTag(tag){
    if(state.tagLoadError||state.creatorLoadError)return;
    const count=state.creators.filter(record=>record.mark.tags.includes(tag)).length;
    openConfirmModal({title:'删除标签',desc:`删除「${tag}」？${count?`同时移除 ${count} 位达人的该标签，达人记录会保留。`:'删除后将不再出现在标签选择中。'}`,confirmText:'删除标签',onConfirm:()=>{
      const records=state.creators.map(record=>({...record,mark:{...record.mark,tags:record.mark.tags.filter(value=>value!==tag)}}));
      if(!saveCreatorTagCatalog(knownCreatorTags().filter(value=>value!==tag),records))return;
      state.creatorTags=state.creatorTags.filter(value=>value!==tag);state.creatorTagDraft=state.creatorTagDraft.filter(value=>value!==tag);render();showToast('标签已删除。');
    }});
  }
  function openCreatorDetails(id){
    const record=state.creators.find(item=>item.id===id);if(!record)return;
    let dialog=q('#crmCreatorDetails');if(!dialog){dialog=document.createElement('dialog');dialog.id='crmCreatorDetails';dialog.className='crm-creator-dialog';dialog.setAttribute('aria-labelledby','crmCreatorDetailsTitle');document.body.append(dialog);}
    dialog.innerHTML=`<header class="crm-creator-dialog-head"><div><h2 id="crmCreatorDetailsTitle">达人详情</h2><p>${esc(record.name)}</p></div><button type="button" data-crm-detail-close aria-label="关闭">×</button></header><dl class="crm-creator-details">${creatorFields.map(field=>`<div class="${['mark','analysis'].includes(field.type)||['productName','address','profileUrl'].includes(field.key)?'is-wide':''}"><dt>${field.label}</dt><dd>${field.type==='analysis'?`<span>${esc(record.aiAnalysis)||'暂无已保存的分析结果'}</span>`:field.type==='mark'?`<div class="crm-creator-mark-tags">${record.mark.tags.map(tag=>`<span class="crm-creator-mark-tag">${esc(tag)}</span>`).join('')||'<span class="crm-creator-missing">未设置标签</span>'}</div><p>备注：${esc(record.mark.note)||'—'}</p><p>分组：${esc(record.mark.group)||'—'}</p>`:creatorCell(record,field)}</dd></div>`).join('')}</dl><footer class="crm-creator-dialog-footer"><button type="button" class="crm-creator-secondary" data-crm-detail-close>关闭</button><button type="button" class="crm-creator-primary" data-crm-detail-edit="${esc(id)}">编辑达人</button></footer>`;
    dialog.showModal();
  }
  function openCreatorImport(){
    if(state.creatorLoadError)return;importReview=null;importReadVersion++;
    let dialog=q('#crmCreatorImport');if(!dialog){dialog=document.createElement('dialog');dialog.id='crmCreatorImport';dialog.className='crm-creator-dialog crm-import-dialog';dialog.setAttribute('aria-labelledby','crmCreatorImportTitle');document.body.append(dialog);dialog.addEventListener('cancel',()=>{importReadVersion++;});}
    dialog.innerHTML=`<header class="crm-creator-dialog-head"><div><h2 id="crmCreatorImportTitle">导入达人</h2><p>上传表格 → 预览校验 → 确认导入</p></div><button type="button" data-crm-import-close aria-label="关闭">×</button></header><div class="crm-import-body"><div class="crm-import-upload"><div><strong>使用模板，批量添加达人</strong><p>支持 Excel（.xlsx / .xls）、CSV、TSV，最多 2000 行、10 MB。只读取第一个工作表，达人名称必填。</p></div><button type="button" class="crm-creator-secondary" data-crm-import-template>下载 Excel 模板</button><label class="crm-creator-primary crm-import-file-label">选择文件<input id="crmCreatorImportFile" type="file" accept=".xlsx,.xls,.csv,.tsv" /></label></div><p class="crm-import-rule">按抖音 UID、主页链接或达人名称＋手机号识别重复。重复行和错误行会跳过，已有记录保留。</p><p id="crmImportError" class="crm-creator-alert" role="alert" hidden></p><div id="crmImportPreview" aria-live="polite"><div class="crm-import-placeholder">选择文件后，在这里检查导入结果。</div></div></div><footer class="crm-creator-dialog-footer"><button type="button" class="crm-creator-secondary" data-crm-import-close>取消</button><button type="button" class="crm-creator-primary" data-crm-import-confirm disabled>确认导入</button></footer>`;
    dialog.showModal();
  }
  async function readCreatorImportFile(file){
    const version=++importReadVersion;importReview=null;const button=q('[data-crm-import-confirm]');button.disabled=true;
    q('#crmImportError').hidden=true;if(!file)return;
    q('#crmImportPreview').textContent='正在读取并校验…';
    try{
      const review=await window.CreatorImport.readFile(file,state.creators);if(version!==importReadVersion||!q('#crmCreatorImport').open)return;
      importReview=review;renderCreatorImportPreview(review,file.name);
    }catch(error){if(version!==importReadVersion)return;q('#crmImportPreview').textContent='请调整表格后重新选择文件。';q('#crmImportError').textContent=error.message||'读取失败，请重试。';q('#crmImportError').hidden=false;}
  }
  function renderCreatorImportPreview(review,filename=''){
    const rows=review.rows,ready=rows.filter(row=>row.status==='ready').length,errors=rows.filter(row=>row.status==='error').length,duplicates=rows.filter(row=>row.status==='duplicate').length;
    q('#crmImportPreview').innerHTML=`<div class="crm-import-summary"><strong>${esc(filename||review.sheetName)}</strong><span>可导入 <b>${ready}</b> 条</span><span>重复跳过 ${duplicates} 条</span><span class="${errors?'is-danger':''}">待修正 ${errors} 条</span></div><p class="crm-import-rule">确认后仅导入校验通过的 ${ready} 条。${errors?'错误行请在原文件中修改后再次导入。':''}</p><div class="crm-import-table-scroll"><table class="crm-tag-table"><thead><tr><th>行号</th><th>达人名称</th><th>抖音 UID</th><th>标签</th><th>校验结果</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.row}</td><td>${esc(row.record.name)||'—'}</td><td>${esc(row.record.douyinUid)||'—'}</td><td>${esc(row.record.mark.tags.join('、'))||'—'}</td><td class="${row.status==='error'?'is-danger':''}">${row.status==='ready'?'✓ ':''}${esc(row.message)}</td></tr>`).join('')}</tbody></table>${!rows.length?'<p class="crm-tag-empty">表格中没有达人数据。</p>':''}</div>`;
    q('[data-crm-import-confirm]').disabled=!ready;q('[data-crm-import-confirm]').textContent=ready?`确认导入 ${ready} 条`:'确认导入';
  }
  function confirmCreatorImport(){
    if(!importReview)return;
    // 确认前再次去重，避免预览期间列表发生变化而产生重复记录。
    const seen=new Set(state.creators.flatMap(window.CreatorImport.duplicateKeys)),valid=[];
    for(const row of importReview.rows){if(row.status!=='ready')continue;const keys=window.CreatorImport.duplicateKeys(row.record);if(keys.some(key=>seen.has(key)))continue;keys.forEach(key=>seen.add(key));valid.push({...row.record,id:crypto.randomUUID?.()||`import-${Date.now()}-${Math.random().toString(16).slice(2)}`});}
    if(!valid.length){q('#crmImportError').textContent='没有可新增的数据，记录可能已经导入。';q('#crmImportError').hidden=false;return;}
    if(!saveCreators([...valid,...state.creators])){q('#crmImportError').textContent='导入未保存，请检查本地存储后重试。';q('#crmImportError').hidden=false;return;}
    importReview=null;importReadVersion++;q('#crmCreatorImport').close();state.creatorQuery='';state.creatorTags=[];state.creatorTagDraft=[];state.creatorTagMode='any';state.creatorTagModeDraft='any';state.creatorDateStart='';state.creatorDateEnd='';state.creatorPage=1;render();showToast(`成功导入 ${valid.length} 位达人。`);
  }
  function enableCreatorAiDrag(launcher){
    const storageKey='chaoren-crm-ai-launcher-position-v1';
    let position=null,drag=null,suppressClickUntil=0;
    try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');if(value&&Number.isFinite(value.x)&&Number.isFinite(value.y))position={x:value.x,y:value.y};}catch{}
    function place(next){
      const rect=launcher.getBoundingClientRect(),width=rect.width||launcher.offsetWidth||(window.innerWidth<=640?82:94),height=rect.height||launcher.offsetHeight||120;
      const viewportWidth=document.documentElement.clientWidth||window.innerWidth,viewportHeight=document.documentElement.clientHeight||window.innerHeight;
      const insetX=Math.min(8,Math.max(0,(viewportWidth-width)/2)),insetY=Math.min(8,Math.max(0,(viewportHeight-height)/2));
      position={x:Math.min(Math.max(insetX,next.x),Math.max(insetX,viewportWidth-width-insetX)),y:Math.min(Math.max(insetY,next.y),Math.max(insetY,viewportHeight-height-insetY))};
      launcher.style.left=`${position.x}px`;launcher.style.top=`${position.y}px`;launcher.style.right='auto';launcher.style.bottom='auto';
    }
    function save(){if(position)try{localStorage.setItem(storageKey,JSON.stringify(position));}catch{}}
    launcher.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.isPrimary===false||drag)return;
      const rect=launcher.getBoundingClientRect();suppressClickUntil=0;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
      try{launcher.setPointerCapture(event.pointerId);}catch{}
    });
    document.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)<6)return;
      drag.moved=true;launcher.classList.add('is-dragging');event.preventDefault();
      place({x:drag.left+dx,y:drag.top+dy});
    },{passive:false});
    function finish(event){
      if(!drag||(event?.pointerId!==undefined&&event.pointerId!==drag.id))return;
      const ended=drag;drag=null;launcher.classList.remove('is-dragging');
      if(ended.moved){suppressClickUntil=performance.now()+450;save();}
      try{if(launcher.hasPointerCapture(ended.id))launcher.releasePointerCapture(ended.id);}catch{}
    }
    document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
    launcher.addEventListener('lostpointercapture',finish);window.addEventListener('blur',()=>finish());
    launcher.addEventListener('click',event=>{
      if(event.detail!==0&&performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    window.addEventListener('resize',()=>{finish();if(position){place(position);save();}});
    // 展开面板时玩偶隐藏，收起或切回 CRM 后按当前屏幕尺寸重新校正。
    return ()=>{if(position)place(position);};
  }
  function loadCreatorAiSessions(){
    try{
      const raw=localStorage.getItem(CREATOR_AI_STORAGE_KEY);if(!raw)return {};
      const sessions=JSON.parse(raw);if(!sessions||typeof sessions!=='object'||Array.isArray(sessions))throw new Error();
      const normalized={};
      for(const [key,messages] of Object.entries(sessions)){
        if(!Array.isArray(messages)||!messages.every(message=>message&&['user','assistant'].includes(message.role)&&typeof message.content==='string'))throw new Error();
        normalized[key]=messages.slice(-40).map(message=>({role:message.role,content:message.content,source:'demo'}));
      }
      return normalized;
    }catch{aiHistoryLoadFailed=true;aiHistoryError='历史对话读取失败，本次对话仅在当前页面保留。';return {};}
  }
  function persistCreatorAiSessions(){
    if(aiHistoryLoadFailed)return;
    try{localStorage.setItem(CREATOR_AI_STORAGE_KEY,JSON.stringify(aiSessions));aiHistoryError='';}
    catch{aiHistoryError='对话暂未保存，刷新页面后本次新对话可能丢失。';}
  }
  function creatorAiContext(){
    return aiScope?state.creators.filter(record=>record.id===aiScope):filteredCreators();
  }
  function creatorAiSessionKey(){return aiScope?'creator:'+aiScope:'overview';}
  function openCreatorAnalysis(id=''){
    if(id&&!state.creators.some(record=>record.id===id))return;
    aiReturnFocus=document.activeElement?.closest('[data-crm-ai-open]')||q('#crmAiLauncher');aiScope=id;
    let dialog=q('#crmCreatorAnalysis');
    if(!dialog){
      dialog=document.createElement('dialog');dialog.id='crmCreatorAnalysis';dialog.className='crm-ai-drawer';dialog.setAttribute('aria-labelledby','crmAiTitle');document.body.append(dialog);
      dialog.setAttribute('aria-modal','false');
      dialog.addEventListener('close',()=>{if(!dialog.open)syncCreatorAnalysisOpen(false);});
    }
    renderCreatorAnalysis();if(!dialog.open)dialog.show();syncCreatorAnalysisOpen(true);q('#crmAiMessage').focus();
    if(id&&!aiSessions[creatorAiSessionKey()]?.length)sendCreatorAnalysis('分析这位达人的合作情况');
  }
  function syncCreatorAnalysisOpen(open){
    document.body.classList.toggle('crm-ai-open',open);q('#crmAiLauncher').setAttribute('aria-expanded',String(open));
    if(!open)fitCreatorAiLauncher();
  }
  function closeCreatorAnalysis(){
    const dialog=q('#crmCreatorAnalysis'),wasOpen=Boolean(dialog?.open);dialog?.close();syncCreatorAnalysisOpen(false);
    if(wasOpen)(aiReturnFocus?.isConnected?aiReturnFocus:q('#crmAiLauncher')).focus();
  }
  function renderCreatorAnalysis(){
    const dialog=q('#crmCreatorAnalysis');if(!dialog)return;
    if(aiScope&&!state.creators.some(record=>record.id===aiScope))aiScope='';
    const records=creatorAiContext(),messages=aiSessions[creatorAiSessionKey()]||[],record=aiScope?records[0]:null;
    dialog.innerHTML=`<header class="crm-ai-drawer-head"><span class="crm-ai-drawer-icon" aria-hidden="true"><img src="./creator-assistant.svg" alt="" width="40" height="45" /></span><div><h2 id="crmAiTitle">AI 合作助手</h2><p>一起把达人合作做好 <span>演示模式</span></p></div><button type="button" class="crm-ai-close" data-crm-ai-close aria-label="收起对话"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></header><section class="crm-ai-context">${record?`<div class="crm-ai-context-tags">${record.mark.tags.map(tag=>`<span class="crm-creator-mark-tag">${esc(tag)}</span>`).join('')}${record.contentType?`<span>${esc(record.contentType)}</span>`:''}</div>`:''}<p>演示回复仅基于本地资料，尚未接入大模型。</p></section><div class="crm-ai-messages" id="crmAiMessages" role="log" aria-label="分析对话" aria-live="polite">${messages.length?messages.map((message,index)=>`<article class="crm-ai-message is-${message.role}"><span class="crm-ai-message-label">${message.role==='user'?'你':'分析助手 · 演示'}</span><div class="crm-ai-bubble">${esc(message.content)}</div>${message.role==='assistant'?`<div class="crm-ai-message-actions"><button type="button" class="crm-ai-copy" data-crm-ai-copy="${index}" aria-label="复制回复"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="7" width="12" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/></svg>复制</button>${record?`<button type="button" class="crm-ai-save-result" data-crm-ai-save="${index}" ${record.aiAnalysis===message.content?'disabled':''}>${record.aiAnalysis===message.content?'✓ 已保存到AI分析':'保存到AI分析'}</button>`:''}</div>`:''}</article>`).join(''):`<div class="crm-ai-welcome"><img src="./creator-assistant.svg" alt="" width="100" height="113" /><h3>${records.length?'你好，有什么可以帮你？':'你好，先认识一下你的达人吧'}</h3><p>${records.length?'梳理合作资料、整理跟进重点，或起草沟通话术。':'新增或导入达人后，即可在这里体验分析和对话。'}</p></div>`}</div><p id="crmAiFeedback" class="crm-ai-feedback" role="status" hidden></p><div class="crm-ai-prompts">${['分析合作资料','整理跟进重点','写一段跟进话术','检查缺失资料'].map(prompt=>`<button type="button" data-crm-ai-prompt="${prompt}" ${!records.length?'disabled':''}>${prompt}</button>`).join('')}</div><form id="crmAiComposer" class="crm-ai-composer"><label class="crm-ai-sr-only" for="crmAiMessage">向分析助手提问</label><textarea id="crmAiMessage" maxlength="2000" rows="2" placeholder="发消息，聊聊你的达人合作…" ${!records.length?'disabled':''}>${esc(aiDrafts[aiScope]||'')}</textarea><div><span>Enter 发送 · Shift+Enter 换行</span><button type="submit" ${!records.length||!(aiDrafts[aiScope]||'').trim()?'disabled':''}>发送 ↑</button></div></form><p class="crm-ai-history-error" id="crmAiHistoryError" role="alert" ${aiHistoryError?'':'hidden'}>${esc(aiHistoryError)}</p>`;
    const log=q('#crmAiMessages');log.scrollTop=log.scrollHeight;
  }
  function updateCreatorAnalysisSend(){
    const button=q('#crmAiComposer button');if(button)button.disabled=!creatorAiContext().length||!q('#crmAiMessage').value.trim();
  }
  function sendCreatorAnalysis(prompt=''){
    const input=q('#crmAiMessage'),question=String(prompt||input?.value||'').trim();
    if(!question||!creatorAiContext().length)return;
    const key=creatorAiSessionKey(),messages=[...(aiSessions[key]||[]),{role:'user',content:question,source:'demo'}];
    const answer=window.CreatorAnalysis.reply({records:creatorAiContext(),question,messages});
    messages.push({role:'assistant',content:answer,source:'demo'});aiSessions[key]=messages.slice(-40);aiDrafts[aiScope]='';persistCreatorAiSessions();renderCreatorAnalysis();q('#crmAiMessage').focus();
  }
  async function copyCreatorAnalysisReply(index){
    const message=aiSessions[creatorAiSessionKey()]?.[index];if(message?.role!=='assistant')return;
    let copied=false;
    try{await navigator.clipboard.writeText(message.content);copied=true;}catch{
      const text=document.createElement('textarea');text.value=message.content;text.style.cssText='position:fixed;opacity:0;pointer-events:none';q('#crmCreatorAnalysis').append(text);text.select();
      try{copied=document.execCommand('copy');}catch{}text.remove();
    }
    q('#crmAiFeedback').textContent=copied?'回复已复制。':'暂时无法复制，请选中文字后复制。';q('#crmAiFeedback').hidden=false;
  }
  function saveCreatorAnalysisResult(index){
    const record=state.creators.find(item=>item.id===aiScope),message=aiSessions[creatorAiSessionKey()]?.[index];
    if(!record||message?.role!=='assistant')return;
    if(!saveCreators(state.creators.map(item=>item.id===record.id?{...item,aiAnalysis:message.content}:item))){q('#crmAiFeedback').textContent='分析结果未能保存，请检查本地存储后重试。';q('#crmAiFeedback').hidden=false;return;}
    renderCreatorRecords();renderCreatorAnalysis();q('#crmAiFeedback').textContent='已保存到该达人的AI分析字段。';q('#crmAiFeedback').hidden=false;
  }
  render();
})();
