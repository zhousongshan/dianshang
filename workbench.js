/* Local workbench preview. Conversation state is independent of creation sessions. */
(() => {
  'use strict';
  const root = document.getElementById('page-workbench');
  if (!root) return;
  const $ = selector => root.querySelector(selector);
  const STORAGE_KEY = 'chaoren-workbench-v1';
  const catalogTabs = {
    experts: { label: '专家', description: '为不同工作场景选择专业视角，查看示例后新建任务。' },
    skills: { label: '技能', description: '把常用工作方法整理成技能，从示例任务开始使用。' },
    connectors: { label: '连接器', description: '访问站内素材，或查看外部资料来源的接入状态。' }
  };
  const resourceIcons = {
    image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
    video: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="m10 10 5 3-5 3v-6ZM3 9h18M7 3l2 6M14 3l2 6"/>',
    text: '<path d="M5 4h14M12 4v16M8 20h8M3 8V4M21 8V4"/>',
    sparkle: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z"/>',
    document: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5ZM14 3v5h5M8 12h8M8 16h6"/>',
    folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
    link: '<path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(2 0) scale(.84 1)"/>',
    team: '<circle cx="12" cy="7" r="3"/><path d="M6 21v-2a6 6 0 0 1 12 0v2M5 5a3 3 0 0 0 0 6M19 5a3 3 0 0 1 0 6M2 20v-2a4 4 0 0 1 3-4M22 20v-2a4 4 0 0 0-3-4"/>',
    feishu: '<path fill="#00c9b7" stroke="none" d="M3.4 3.6h7.2c1.3 0 2.3.6 3.1 1.8l4.1 6.3-5 5.1L3.4 3.6Z"/><path fill="#3370ff" stroke="none" d="M3 9.1c4.9 4.7 8.2 7.1 12.2 5.3 2.2-1 3.8-3 6.8-3.9-1.5 7-6 10.3-11 10.3-3.7 0-6.1-1.7-8-4V9.1Z"/><path fill="#143e9f" stroke="none" d="M11.5 15.1c3.5-2.3 4.5-6.6 9.1-6.6.7 0 1.3.2 1.8.5-2.7.5-4.2 4-5.8 5.6-1.3 1.3-3.5 1.6-5.1.5Z"/>'
  };
  const resourceGroups = {
    experts: [
      { id: 'expert-visual', icon: 'image', name: '电商视觉专家', category: '视觉设计', description: '围绕商品主图、场景图和品牌调性，梳理画面方向与创作建议。', scene: '商品主图、场景图、活动视觉', input: '商品信息、参考图片、目标风格', output: '构图建议、视觉方向和图片创作提示词', prompt: '请以电商视觉专家的角度，帮我规划一组商品主图。\n商品信息：\n参考风格：\n希望突出的卖点：' },
      { id: 'expert-video', icon: 'video', name: '短视频策划专家', category: '内容策划', description: '从目标人群和商品卖点出发，组织短视频选题、开头与分镜。', scene: '商品种草、短视频脚本、活动推广', input: '商品卖点、目标人群、视频时长', output: '选题方向、开头设计和分镜脚本', prompt: '请以短视频策划专家的角度，帮我策划一条商品短视频。\n商品：\n目标人群：\n视频时长：' },
      { id: 'expert-copy', icon: 'text', name: '品牌文案专家', category: '文案创作', description: '结合品牌表达和使用场景，整理标题、卖点与推广文案。', scene: '商品文案、活动标题、品牌表达', input: '品牌定位、产品卖点、投放场景', output: '标题方案、卖点表达和推广文案', prompt: '请以品牌文案专家的角度，为以下商品整理一组推广文案。\n品牌调性：\n商品卖点：\n使用场景：' }
    ],
    skills: [
      { id: 'skill-selling-points', icon: 'sparkle', name: '商品卖点提炼', category: '商品运营', description: '把产品信息整理成核心卖点、人群需求和具体使用场景。', scene: '上新资料梳理、商品详情页准备', input: '商品参数、产品介绍、用户反馈', output: '核心卖点清单与对应的用户价值', prompt: '帮我提炼以下商品的核心卖点，按用户需求和使用场景整理。\n商品资料：' },
      { id: 'skill-image-prompt', icon: 'image', name: '图片提示词优化', category: '图片创作', description: '补充主体、环境、构图和光线描述，让创作需求更清晰。', scene: '商品生图、场景创作、风格调整', input: '原始创意、参考图片、画面要求', output: '结构清晰的图片提示词', prompt: '帮我优化以下图片创作提示词，补充主体、环境、构图和光线。\n原始提示词：' },
      { id: 'skill-storyboard', icon: 'video', name: '视频分镜编排', category: '视频创作', description: '把创意或脚本拆成镜头，整理画面、动作、时长和转场。', scene: '商品展示、短视频脚本拆解', input: '视频创意、脚本、总时长', output: '包含画面和节奏安排的分镜表', prompt: '把以下创意拆成视频分镜，包含画面、人物动作、时长和转场建议。\n创意：\n总时长：' },
      { id: 'skill-weekly-report', icon: 'document', name: '周报整理', category: '办公效率', description: '把零散工作记录归纳为本周进展、待处理问题和下周计划。', scene: '周报、项目进展同步、工作复盘', input: '工作记录、项目进度、后续安排', output: '简洁清晰的周报草稿', prompt: '根据以下工作记录整理本周周报，分为本周工作、问题与下周计划。\n工作记录：\n下周安排：' }
    ],
    connectors: [
      { id: 'connector-feishu', icon: 'feishu', name: '飞书', category: '办公资料', description: '连接飞书，查找文档、知识库与工作资料。', scene: '参考需求文档、项目资料和知识库', status: '未连接。当前为前端界面预览，飞书授权与资料读取尚未接入。' }
    ]
  };
  resourceGroups.experts.push(
    { id: 'expert-ui', icon: 'image', name: 'UI设计师', category: '产品设计', description: '围绕设计系统和组件规范，梳理页面结构、界面样式与交互细节。', scene: '产品界面、组件库、设计规范', input: '页面需求、现有截图、参考风格', output: '页面结构、组件建议和交互说明', prompt: '请以UI设计师的角度，帮我完善以下页面。\n页面需求：\n现有问题：\n参考风格：' },
    { id: 'expert-code', icon: 'document', name: '代码审查专家', category: '技术工程', description: '检查代码逻辑、边界处理和可维护性，整理需要关注的问题与修改建议。', scene: '功能开发、代码审查、问题排查', input: '代码片段、预期行为、问题描述', output: '问题清单与代码修改建议', prompt: '请以代码审查专家的角度，检查以下代码的逻辑、边界处理和可维护性。\n代码：\n预期行为：' },
    { id: 'expert-data', icon: 'sparkle', name: '数据分析报告师', category: '数据智能', description: '将业务数据整理为指标变化、关键发现和可执行的业务分析报告。', scene: '运营复盘、数据分析、指标报告', input: '业务数据、统计口径、关注问题', output: '指标解读、分析结论和后续建议', prompt: '请以数据分析报告师的角度，分析以下业务数据。\n业务背景：\n数据：\n希望回答的问题：' }
  );
  const resourceMetadata = {
    'expert-visual': { filters: ['电商运营', '产品设计'], tags: ['商品主图', '场景创作', '视觉规范'], avatar: 'chart' },
    'expert-video': { filters: ['电商运营', '内容创作', '营销增长'], tags: ['选题策划', '视频分镜', '内容节奏'], avatar: 'content' },
    'expert-copy': { filters: ['电商运营', '营销增长', '内容创作'], tags: ['品牌文案', '卖点表达', '活动标题'], avatar: 'career' },
    'expert-ui': { filters: ['产品设计'], tags: ['UI设计', '组件库', '界面规范'], avatar: 'ui' },
    'expert-code': { filters: ['技术工程', '办公效率'], tags: ['代码审查', '质量把关', '最佳实践'], avatar: 'code' },
    'expert-data': { filters: ['数据智能', '办公效率'], tags: ['数据分析', '数据可视化', 'KPI报告'], avatar: 'data' },
    'skill-selling-points': { tags: ['卖点提炼', '用户价值', '使用场景'] },
    'skill-image-prompt': { tags: ['提示词', '画面构图', '光线描述'] },
    'skill-storyboard': { tags: ['分镜脚本', '画面动作', '视频节奏'] },
    'skill-weekly-report': { tags: ['工作总结', '项目进展', '下周计划'] },
    'connector-feishu': { tags: ['需求文档', '项目资料', '未连接'] }
  };
  // Demo ordering only; these values are not usage statistics.
  Object.values(resourceGroups).forEach(items => items.forEach((item, index) => {
    Object.assign(item, { filters: [item.category], tags: [item.category], popularity: [84, 96, 78, 91, 89, 94][index] || 70, addedOrder: index }, resourceMetadata[item.id]);
  }));
  const expertTeams = [
    { id: 'team-commerce', icon: 'team', name: '电商内容专家团', category: '电商运营', filters: ['电商运营', '营销增长', '内容创作'], tags: ['商品视觉', '视频策划', '品牌文案'], description: '从商品视觉、短视频和文案三个角度，梳理商品内容方案。', scene: '商品上新、活动内容、推广策划', input: '商品资料、目标人群、推广目标', output: '多角度的内容方案与执行建议', popularity: 96, addedOrder: 0, prompt: '请分别从电商视觉、短视频策划和品牌文案三个角度，为以下商品提出内容方案。\n商品：\n目标人群：\n推广目标：' },
    { id: 'team-product', icon: 'team', name: '产品设计专家团', category: '产品设计', filters: ['产品设计', '技术工程'], tags: ['产品体验', 'UI设计', '开发审查'], description: '结合界面设计和开发审查，完善页面结构、交互和落地细节。', scene: '页面改版、功能设计、体验优化', input: '功能需求、页面截图、开发约束', output: '界面与交互建议、开发检查清单', popularity: 89, addedOrder: 1, prompt: '请从UI设计和代码审查两个角度，完善以下功能方案。\n功能需求：\n现有问题：' },
    { id: 'team-efficiency', icon: 'team', name: '运营分析专家团', category: '办公效率', filters: ['办公效率', '数据智能'], tags: ['数据分析', '运营复盘', '工作总结'], description: '结合业务数据和工作记录，整理运营复盘、改进方向与后续计划。', scene: '运营周报、业务复盘、数据汇报', input: '业务指标、工作记录、待处理问题', output: '复盘报告与后续工作安排', popularity: 93, addedOrder: 2, prompt: '请结合以下数据和工作记录，整理运营复盘和下阶段计划。\n业务数据：\n工作记录：' }
  ];
  const allResources = [...Object.values(resourceGroups).flat(), ...expertTeams];
  const catalogCategories = {
    experts: ['全部', '电商运营', '产品设计', '技术工程', '数据智能', '营销增长', '内容创作', '办公效率'],
    skills: ['全部', '商品运营', '图片创作', '视频创作', '办公效率'],
    connectors: ['全部', '办公资料']
  };
  const featuredGroups = [
    { title: '电商运营', category: '电商运营', art: 'commerce', items: ['expert-visual', 'expert-video', 'expert-copy'] },
    { title: '设计创意', category: '产品设计', art: 'design', items: ['expert-ui', 'expert-visual', 'skill-image-prompt'] },
    { title: '办公效率', category: '办公效率', art: 'office', items: ['expert-data', 'expert-code', 'skill-weekly-report'] }
  ];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const copyIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>';
  const seed = () => ({
    selectedId: 'sample-ppt',
    view: 'chat', catalogTab: 'experts', tasksCollapsed: false, savedResourceIds: [],
    chats: [
      { id: 'sample-ppt', title: '制作PPT协助', date: '10:24', draft: '', messages: [
        { role: 'assistant', thought: '1分钟25秒', paragraphs: [
          '对，刚才用的是 豆包 Seedance 2.0 Fast。',
          '我重新查了当前可用模型：这里只有 Seedance 2.0 Fast，没有接入你说的 Wan 3.0，所以暂时不能切换到它。',
          '这是当前平台的接入情况，不代表外部有没有这个版本。另外，刚才失败是参考图触发了真人形象审核，并不是视频功能不可用；换模型也不能保证通过。'
        ] },
        { role: 'user', text: '帮我生成5张图' },
        { role: 'assistant', thought: '39秒', time: '10:14', paragraphs: [
          '可以。这5张继续用之前的人物，还是换个主题？',
          '如果继续之前的，我可以做成一组：校园、海边、咖啡馆、运动、城市夜景，统一写实风格、9:16竖图。你确认一下，我就开始生成。'
        ] },
        { role: 'user', text: '可以' },
        { role: 'assistant', thought: '9分钟1秒', paragraphs: [
          '5张都生成好了，统一为 9:16写实竖图，沿用之前的人物形象，均已标注“AI生成”，非本人实拍。'
        ], sampleImage: true }
      ] },
      { id: 'sample-new-22', title: '新对话', date: '10/22', draft: '', messages: [] },
      { id: 'sample-openmontage', title: '了解 OpenMontage 开源项目', date: '10/22', draft: '', messages: [{ role: 'user', text: '了解 OpenMontage 开源项目' }] },
      { id: 'sample-hello-21', title: '你好', date: '10/21', draft: '', messages: [{ role: 'user', text: '你好' }] },
      { id: 'sample-hello-20', title: '你好', date: '10/21', draft: '', messages: [{ role: 'user', text: '你好' }] },
      { id: 'sample-new-10', title: '新对话', date: '10/10', draft: '', messages: [] }
    ]
  });
  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.chats) || !saved.chats.length) return seed();
      const chats = saved.chats.filter(chat => chat && typeof chat.id === 'string' && typeof chat.title === 'string' && Array.isArray(chat.messages));
      if (!chats.length) return seed();
      return {
        selectedId: chats.some(chat => chat.id === saved.selectedId) ? saved.selectedId : chats[0].id,
        chats, view: saved.view === 'catalog' ? 'catalog' : 'chat',
        catalogTab: Object.hasOwn(catalogTabs, saved.catalogTab) ? saved.catalogTab : 'experts',
        tasksCollapsed: saved.tasksCollapsed === true,
        savedResourceIds: Array.isArray(saved.savedResourceIds) ? saved.savedResourceIds.filter(id => allResources.some(item => item.id === id)) : []
      };
    } catch { return seed(); }
  }
  const state = readState();
  const filesByChat = new Map();
  const scrollByChat = new Map();
  let statusTimer;
  let storageWarning = false;
  let catalogQuery = '';
  let activeResource = null;
  let catalogCategory = '全部';
  let catalogSort = 'recommended';
  let expertMode = 'experts';
  let mineOnly = false;
  const currentChat = () => state.chats.find(chat => chat.id === state.selectedId);
  const pendingFiles = () => filesByChat.get(state.selectedId) || [];
  function notify(message) {
    $('#wbStatus').textContent = message;
    $('#wbStatus').classList.add('is-visible');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => $('#wbStatus').classList.remove('is-visible'), 2800);
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch {
      if (!storageWarning) notify('本地保存空间不足，本次对话刷新后可能丢失');
      storageWarning = true;
    }
  }
  function renderList() {
    $('#wbConversations').innerHTML = state.chats.map(chat => {
      const selected = state.view === 'chat' && chat.id === state.selectedId;
      return `<button class="wb-conversation${selected ? ' is-active' : ''}" type="button" data-wb-chat="${escapeHtml(chat.id)}"${selected ? ' aria-current="page"' : ''} title="${escapeHtml(chat.title)}"><span class="wb-conversation-title">${escapeHtml(chat.title)}</span><time>${escapeHtml(chat.date)}</time></button>`;
    }).join('');
    $('#wbTaskToggle').setAttribute('aria-expanded', String(!state.tasksCollapsed));
    $('#wbConversations').hidden = state.tasksCollapsed;
  }
  const resourceIcon = name => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${resourceIcons[name] || resourceIcons.sparkle}</svg>`;
  function renderCatalog() {
    const tab = catalogTabs[state.catalogTab];
    const connectors = state.catalogTab === 'connectors';
    $('#wbCatalogMine').hidden = connectors;
    $('.wb-resource-list-toolbar').hidden = connectors;
    $('#wbCatalogCategories').hidden = connectors;
    $('#wbResourceGrid').classList.toggle('is-connectors', connectors);
    root.querySelectorAll('[data-wb-tab]').forEach(button => {
      const selected = button.dataset.wbTab === state.catalogTab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $('#wbCatalogPanel').setAttribute('aria-labelledby', `wbTab-${state.catalogTab}`);
    const listLabel = state.catalogTab === 'experts' && expertMode === 'teams' ? '专家团' : tab.label;
    $('#wbCatalogSearch').placeholder = `搜索${listLabel}`;
    $('#wbCatalogSearch').setAttribute('aria-label', `搜索${listLabel}`);
    $('#wbCatalogSearch').value = catalogQuery;
    $('#wbCatalogMine span').textContent = `我的${tab.label}`;
    $('#wbCatalogMine').setAttribute('aria-pressed', String(mineOnly));
    $('#wbExpertModes').hidden = state.catalogTab !== 'experts';
    $('#wbCatalogListTitle').hidden = state.catalogTab === 'experts';
    $('#wbCatalogListTitle').textContent = tab.label;
    root.querySelectorAll('[data-wb-expert-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wbExpertMode === expertMode)));
    root.querySelectorAll('[data-wb-sort]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wbSort === catalogSort)));
    $('#wbCatalogCategories').innerHTML = catalogCategories[state.catalogTab].map(category => `<button type="button" data-wb-category="${escapeHtml(category)}" aria-pressed="${category === catalogCategory}">${escapeHtml(category)}</button>`).join('');
    $('#wbFeaturedGrid').hidden = state.catalogTab !== 'experts' || mineOnly;
    if (!$('#wbFeaturedGrid').childElementCount) {
      $('#wbFeaturedGrid').innerHTML = featuredGroups.map(group => `<article class="wb-featured-card"><button class="wb-featured-heading wb-featured-${group.art}" type="button" data-wb-category="${group.category}"><span class="wb-featured-art" aria-hidden="true"></span><span class="wb-featured-title">${group.title}</span></button><div class="wb-featured-links">${group.items.map(id => {
        const item = allResources.find(resource => resource.id === id);
        return `<button type="button" data-wb-featured="${id}"><span>${escapeHtml(item.name)}</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>`;
      }).join('')}</div></article>`).join('');
    }
    const keyword = catalogQuery.trim().toLocaleLowerCase();
    const source = state.catalogTab === 'experts' && expertMode === 'teams' ? expertTeams : resourceGroups[state.catalogTab];
    const items = source.filter(item => (catalogCategory === '全部' || item.filters.includes(catalogCategory)) && (!mineOnly || state.savedResourceIds.includes(item.id)) && `${item.name} ${item.description} ${item.category} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(keyword));
    if (catalogSort === 'popular') items.sort((a, b) => b.popularity - a.popularity);
    if (catalogSort === 'latest') items.sort((a, b) => b.addedOrder - a.addedOrder);
    $('#wbResourceCount').textContent = `${items.length} 个${listLabel}`;
    $('#wbResourceGrid').innerHTML = items.length ? items.map(item => {
      if (connectors) return `<article class="wb-connector-card" data-resource-id="${item.id}"><span class="wb-connector-logo">${resourceIcon(item.icon)}</span><div class="wb-connector-copy"><h3>${escapeHtml(item.name)}</h3><p title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</p></div><button class="wb-connector-add" type="button" data-wb-resource="${item.id}" aria-label="添加飞书连接" title="添加飞书连接"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></article>`;
      const saved = state.savedResourceIds.includes(item.id);
      const badge = item.internal ? '站内资源' : state.catalogTab === 'connectors' ? '未连接' : '示例';
      return `<article class="wb-resource-card" data-resource-id="${item.id}">
        <button class="wb-resource-save" type="button" data-wb-save="${item.id}" aria-pressed="${saved}" aria-label="${saved ? '取消收藏' : '收藏'}${escapeHtml(item.name)}" title="${saved ? '取消收藏' : '收藏'}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h12v19l-6-4-6 4V3Z"/></svg></button>
        <button class="wb-resource-preview" type="button" ${item.internal ? 'data-wb-open-library' : `data-wb-resource="${item.id}"`} aria-label="${item.internal ? '打开' : '查看'}${escapeHtml(item.name)}">
          <span class="wb-resource-icon${item.avatar ? ' wb-resource-avatar' : ''}">${item.avatar ? `<span class="wb-avatar-art wb-avatar-${item.avatar}" aria-hidden="true"></span>` : resourceIcon(item.icon)}</span>
          <span class="wb-resource-summary"><span class="wb-resource-title"><strong>${escapeHtml(item.name)}</strong><span class="wb-resource-badge${item.internal ? ' is-internal' : ''}">${badge}</span></span><span class="wb-resource-description" title="${escapeHtml(item.description)}">${escapeHtml(item.description)}</span></span>
        </button>
        <div class="wb-resource-tags">${item.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      </article>`;
    }).join('') : `<div class="wb-resource-empty"><strong>${mineOnly ? `还没有收藏的${listLabel}` : '没有找到相关资源'}</strong><p>${mineOnly ? '点击卡片右上角的收藏按钮，即可在这里查看。' : '换个名称、分类或关键词试试'}</p><button class="wb-resource-secondary" type="button" data-wb-clear-filters>${mineOnly ? '查看全部' : '清除筛选'}</button></div>`;
  }
  function renderView() {
    const catalog = state.view === 'catalog';
    $('#wbScroll').hidden = catalog;
    $('.wb-composer-dock').hidden = catalog;
    $('#wbCatalog').hidden = !catalog;
    $('#wbTitle').textContent = catalog ? '专家·技能·连接器' : currentChat().title;
    const newTask = !catalog && currentChat().messages.length === 0;
    [['#wbNewChat', newTask], ['#wbCapabilities', catalog]].forEach(([selector, selected]) => {
      const button = $(selector);
      button.classList.toggle('is-active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    renderList();
    if (catalog) renderCatalog();
    else requestAnimationFrame(resizeInput);
  }
  function openCatalog() {
    if (state.view !== 'catalog') scrollByChat.set(state.selectedId, $('#wbScroll').scrollTop);
    state.view = 'catalog';
    persist();
    renderView();
    closeSidebar();
  }
  function selectCatalogTab(tabName) {
    if (!Object.hasOwn(catalogTabs, tabName)) return;
    state.catalogTab = tabName;
    catalogQuery = '';
    catalogCategory = '全部';
    expertMode = 'experts';
    mineOnly = false;
    persist();
    renderCatalog();
  }
  function openResource(id) {
    const item = allResources.find(resource => resource.id === id);
    if (!item) return;
    activeResource = item;
    $('#wbResourceDetailType').textContent = `${item.category} · ${state.catalogTab === 'connectors' ? '未连接' : `示例${catalogTabs[state.catalogTab].label}`}`;
    $('#wbResourceDetailTitle').textContent = item.name;
    $('#wbResourceDetailDescription').textContent = item.description;
    const fields = [['适用场景', item.scene], ['输入资料', item.input], ['输出内容', item.output], ['接入状态', item.status]];
    if (item.prompt) fields.push(['使用方式', '将示例需求带入新任务，补充资料后开始对话。']);
    $('#wbResourceDetailFields').innerHTML = fields.filter(([, value]) => value).map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('');
    $('#wbResourceDetailUse').hidden = !item.prompt;
    $('#wbResourceDetail').showModal();
  }
  function openPublicLibrary() {
    closeSidebar();
    window.showPage('assets');
    document.querySelector('[data-asset-scope="public"]')?.click();
  }
  function attachmentMarkup(files) {
    return files.map(file => `<span class="wb-attachment"><span class="wb-attachment-name">${escapeHtml(file.name)}</span></span>`).join('');
  }
  function renderMessage(message, index) {
    if (message.role === 'user') return `<article class="wb-message wb-message-user" aria-label="我的消息"><div class="wb-user-bubble">${escapeHtml(message.text)}</div>${message.files?.length ? `<div class="wb-message-files">${attachmentMarkup(message.files)}</div>` : ''}</article>`;
    const paragraphs = (Array.isArray(message.paragraphs) ? message.paragraphs : []).map(text => `<p>${escapeHtml(text)}</p>`).join('');
    return `<article class="wb-message wb-message-assistant" aria-label="助手消息">${message.thought ? `<details class="wb-thinking"><summary>思考用时 ${escapeHtml(message.thought)}</summary><div class="wb-thinking-record">示例会话 · 已完成 · 耗时 ${escapeHtml(message.thought)}</div></details>` : ''}${paragraphs}${message.sampleImage ? '<p class="wb-picture-label">1. 校园 · 清新阳光</p><figure class="wb-sample-figure" aria-label="校园人物示例图片"><div class="wb-sample-portrait" role="img" aria-label="示例图：穿浅蓝衬衫的男子在校园树荫下手持书本"></div></figure>' : ''}${message.time ? `<div class="wb-message-meta"><time>${escapeHtml(message.time)}</time><button class="wb-copy" type="button" data-wb-copy="${index}" aria-label="复制回复" title="复制回复">${copyIcon}</button></div>` : ''}</article>`;
  }
  function resizeInput() {
    const input = $('#wbInput');
    input.style.height = 'auto';
    input.style.height = `${Math.min(180, Math.max(56, input.scrollHeight))}px`;
    const dockHeight = $('.wb-composer-dock').offsetHeight;
    $('#wbTranscript').style.paddingBottom = `${Math.max(185, dockHeight + 65)}px`;
  }
  function syncComposer() {
    $('#wbSend').disabled = !$('#wbInput').value.trim() && !pendingFiles().length;
    const files = pendingFiles();
    $('#wbAttachments').hidden = !files.length;
    $('#wbAttachments').innerHTML = files.map((file, index) => `<span class="wb-attachment"><span class="wb-attachment-name">${escapeHtml(file.name)}</span><button class="wb-remove-attachment" type="button" data-wb-remove-file="${index}" aria-label="移除附件 ${escapeHtml(file.name)}">×</button></span>`).join('');
    resizeInput();
  }
  function closeSidebar() {
    root.classList.remove('wb-sidebar-open');
    $('#wbSidebarToggle').setAttribute('aria-expanded', 'false');
  }
  function renderChat() {
    const chat = currentChat();
    $('#wbTranscript').innerHTML = chat.messages.length ? chat.messages.map(renderMessage).join('') : '<div class="wb-welcome"><div class="wb-welcome-icon">✦</div><h2>有什么可以帮你？</h2><p>从一个想法开始，随心输入</p></div>';
    $('#wbInput').value = typeof chat.draft === 'string' ? chat.draft : '';
    renderView();
    syncComposer();
    $('#wbScroll').scrollTop = scrollByChat.get(chat.id) || 0;
  }
  function selectChat(id) {
    if (!state.chats.some(chat => chat.id === id)) return;
    if (state.view === 'chat') scrollByChat.set(state.selectedId, $('#wbScroll').scrollTop);
    state.selectedId = id;
    state.view = 'chat';
    persist();
    renderChat();
    closeSidebar();
  }
  function newChat(draft = '') {
    const id = `chat-${typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    state.chats.unshift({ id, title: '新任务', date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }), draft, messages: [] });
    state.tasksCollapsed = false;
    selectChat(id);
    $('#wbInput').focus();
  }
  function sendMessage(event) {
    event.preventDefault();
    const text = $('#wbInput').value.trim();
    const files = pendingFiles();
    if (!text && !files.length) return;
    const chat = currentChat();
    const isFirstMessage = !chat.messages.length;
    chat.messages.push({ role: 'user', text: text || '查看附件', files: files.map(file => ({ name: file.name })) });
    // No request is sent to a provider in the frontend preview.
    chat.messages.push({ role: 'assistant', paragraphs: ['消息已记录。当前为工作台预览，暂未接入模型服务。'], time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) });
    if (isFirstMessage) chat.title = Array.from(text || files[0].name).slice(0, 24).join('');
    chat.draft = '';
    filesByChat.delete(chat.id);
    persist();
    renderChat();
    $('#wbScroll').scrollTop = $('#wbScroll').scrollHeight;
    $('#wbInput').focus();
  }
  async function copyReply(index) {
    const message = currentChat().messages[index];
    if (!message || message.role !== 'assistant') return;
    const text = message.paragraphs.join('\n\n');
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const temporary = document.createElement('textarea');
        temporary.value = text;
        temporary.style.cssText = 'position:fixed;opacity:0';
        root.append(temporary);
        temporary.select();
        const copied = document.execCommand('copy');
        temporary.remove();
        if (!copied) throw new Error('Copy failed');
      }
      notify('已复制回复');
    } catch { notify('复制失败，请选中文字复制'); }
  }
  $('#wbNewChat').addEventListener('click', () => newChat());
  $('#wbCapabilities').addEventListener('click', openCatalog);
  $('#wbTaskToggle').addEventListener('click', () => {
    state.tasksCollapsed = !state.tasksCollapsed;
    persist();
    renderList();
  });
  $('.wb-catalog-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-wb-tab]');
    if (button) selectCatalogTab(button.dataset.wbTab);
  });
  $('.wb-catalog-tabs').addEventListener('keydown', event => {
    const button = event.target.closest('[data-wb-tab]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = Object.keys(catalogTabs);
    let index = tabs.indexOf(button.dataset.wbTab);
    index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectCatalogTab(tabs[index]);
    $(`#wbTab-${tabs[index]}`).focus();
  });
  $('#wbCatalogSearch').addEventListener('input', event => { catalogQuery = event.target.value; renderCatalog(); });
  $('#wbCatalogMine').addEventListener('click', () => {
    mineOnly = !mineOnly;
    catalogCategory = '全部';
    catalogQuery = '';
    renderCatalog();
  });
  $('#wbCatalog').addEventListener('click', event => {
    const category = event.target.closest('[data-wb-category]');
    if (category) {
      catalogCategory = category.dataset.wbCategory;
      if (category.closest('#wbFeaturedGrid')) { expertMode = 'experts'; mineOnly = false; catalogQuery = ''; }
      renderCatalog();
    }
    const sort = event.target.closest('[data-wb-sort]');
    if (sort) { catalogSort = sort.dataset.wbSort; renderCatalog(); }
    const mode = event.target.closest('[data-wb-expert-mode]');
    if (mode) { expertMode = mode.dataset.wbExpertMode; catalogCategory = '全部'; catalogQuery = ''; renderCatalog(); }
  });
  $('#wbFeaturedGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-wb-featured]');
    if (!button) return;
    const id = button.dataset.wbFeatured;
    const tab = Object.keys(resourceGroups).find(key => resourceGroups[key].some(item => item.id === id));
    if (tab !== state.catalogTab) selectCatalogTab(tab);
    openResource(id);
  });
  $('#wbResourceGrid').addEventListener('click', event => {
    const save = event.target.closest('[data-wb-save]');
    if (save) {
      const id = save.dataset.wbSave;
      state.savedResourceIds = state.savedResourceIds.includes(id) ? state.savedResourceIds.filter(saved => saved !== id) : [...state.savedResourceIds, id];
      persist();
      renderCatalog();
      const focusTarget = Array.from(root.querySelectorAll('[data-wb-save]')).find(button => button.dataset.wbSave === id);
      (focusTarget || $('#wbCatalogMine')).focus({ preventScroll: true });
      return;
    }
    if (event.target.closest('[data-wb-clear-filters]')) { catalogQuery = ''; catalogCategory = '全部'; mineOnly = false; renderCatalog(); return; }
    if (event.target.closest('[data-wb-open-library]')) { openPublicLibrary(); return; }
    const button = event.target.closest('[data-wb-resource]');
    if (button) openResource(button.dataset.wbResource);
  });
  $('#wbResourceDetailClose').addEventListener('click', () => $('#wbResourceDetail').close());
  $('#wbResourceDetailCancel').addEventListener('click', () => $('#wbResourceDetail').close());
  $('#wbResourceDetail').addEventListener('close', () => { activeResource = null; });
  $('#wbResourceDetailUse').addEventListener('click', () => {
    const prompt = activeResource?.prompt;
    if (!prompt) return;
    $('#wbResourceDetail').close();
    newChat(prompt);
  });
  $('#wbConversations').addEventListener('click', event => {
    const button = event.target.closest('[data-wb-chat]');
    if (button) selectChat(button.dataset.wbChat);
  });
  $('#wbInput').addEventListener('input', () => { currentChat().draft = $('#wbInput').value; persist(); syncComposer(); });
  $('#wbInput').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.isComposing && event.keyCode !== 229) sendMessage(event);
  });
  $('#wbComposer').addEventListener('submit', sendMessage);
  $('#wbAttach').addEventListener('click', () => $('#wbFileInput').click());
  $('#wbFileInput').addEventListener('change', event => {
    filesByChat.set(state.selectedId, [...pendingFiles(), ...event.target.files]);
    event.target.value = '';
    syncComposer();
    notify('附件已选择，仅用于本次界面预览');
  });
  $('#wbAttachments').addEventListener('click', event => {
    const button = event.target.closest('[data-wb-remove-file]');
    if (!button) return;
    const files = [...pendingFiles()];
    files.splice(Number(button.dataset.wbRemoveFile), 1);
    filesByChat.set(state.selectedId, files);
    syncComposer();
  });
  $('#wbMicrophone').addEventListener('click', () => notify('语音输入暂未开放'));
  $('#wbTranscript').addEventListener('click', event => {
    const button = event.target.closest('[data-wb-copy]');
    if (button) copyReply(Number(button.dataset.wbCopy));
  });
  $('#wbSidebarToggle').addEventListener('click', () => {
    const expanded = root.classList.toggle('wb-sidebar-open');
    $('#wbSidebarToggle').setAttribute('aria-expanded', String(expanded));
  });
  $('#wbSidebarBackdrop').addEventListener('click', closeSidebar);
  root.addEventListener('keydown', event => { if (event.key === 'Escape') closeSidebar(); });
  window.addEventListener('resize', resizeInput);
  new MutationObserver(() => {
    if (root.classList.contains('active')) requestAnimationFrame(resizeInput);
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  renderChat();
})();
