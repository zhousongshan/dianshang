/* 公司公共图片库的前端演示。存储适配器可替换为公司素材 API；身份沿用现有演示账号。 */
(() => {
  'use strict';
  const q = selector => document.querySelector(selector), esc = escapeHtml;
  const ROOT = 'public-root', DB_NAME = 'chaoren-public-assets-v1';
  let library = { folders: [], images: [] }, loaded = false, loadError = '', busy = false;
  let folderId = ROOT, menuId = '', mention = null, pendingMention = null, mentionIndex = 0;
  let librarySelection = new Set();
  let videoMentionGroup = 'image', videoGroupChosen = false, pendingVideoUpload = null, pendingAudioUpload = null;
  const urls = new Map();
  const today = () => new Date().toLocaleDateString('sv-SE');
  const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
  const identity = () => mockUsers.find(user => user.id === currentReviewIdentity().id) || {};
  const canCreate = () => identity().status === 'enabled';
  const folder = id => library.folders.find(item => item.id === id);
  const canEdit = item => Boolean(item && canCreate() && (identity().role === 'superadmin' || item.ownerId === identity().id));
  const imageUrl = image => image.url || urls.get(image.id) || '';
  const ownerName = item => mockUsers.find(user => user.id === item.ownerId)?.name || item.ownerName || '运营';
  function pathOf(id) {
    const result = [], seen = new Set();
    while (id !== ROOT && folder(id) && !seen.has(id)) {
      seen.add(id); result.unshift(folder(id)); id = folder(id).parentId;
    }
    return result;
  }
  const folderPath = id => ['公共素材', ...pathOf(id).map(item => item.name)].join(' / ');
  function seed() {
    return {
      folders: [
        { id: 'public-brand', parentId: ROOT, name: '品牌素材', ownerId: 'user-2', updatedAt: today() },
        { id: 'public-product', parentId: ROOT, name: '商品实拍', ownerId: 'user-2', updatedAt: today() },
        { id: 'public-scene', parentId: ROOT, name: '场景参考', ownerId: 'user-7', updatedAt: today() }
      ],
      images: [
        { id: 'public-logo', folderId: 'public-brand', name: '超韧 AI Logo', url: './chaoren-logo.png', updatedAt: today() },
        { id: 'public-teddy', folderId: 'public-product', name: '毛绒玩具 · 商品原图', url: './login-assets-v2/teddy-before-photo.png', updatedAt: today() },
        { id: 'public-white', folderId: 'public-product', name: '毛绒玩具 · 白底图', url: './login-assets-v2/teddy-before.png', updatedAt: today() },
        { id: 'public-bedroom', folderId: 'public-scene', name: '温暖卧室场景', url: './login-assets-v2/teddy-after-photo.png', updatedAt: today() },
        { id: 'public-home', folderId: 'public-scene', name: '家居生活场景', url: './login-assets-v2/home.png', updatedAt: today() }
      ]
    };
  }
  // Blob 保存在 IndexedDB，避免 localStorage 容量与刷新后 blob: 地址失效。
  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('library');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭其他旧版页面后刷新重试'));
  });
  async function store(next) {
    const db = await database;
    await new Promise((resolve, reject) => {
      const tx = db.transaction('library', 'readwrite');
      tx.objectStore('library').put(next, 'state');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  function hydrate() {
    library.images.filter(item => ['personal','team'].includes(item.space) && !item.archived && !item.legacyKey).forEach(item => {
      const kind = item.kind || 'image';
      if (!['image','video'].includes(kind)) return;
      const list = kind === 'video' ? mockVideos : mockAssets;
      if (!list.some(file => file.recoveredAssetId === item.id)) list.push({name:item.name,category:'图片素材',type:'product',source:item.source||'local',model:'本地文件',tags:'本地上传',favorite:true,folderId:DEFAULT_FOLDER_ID,createdAt:item.createdAt||item.updatedAt,previewUrl:item.blob ? (urls.get(item.id)||URL.createObjectURL(item.blob)) : item.url,recoveredAssetId:item.id});
    });
    library.images.forEach(image => {
      if (!image.createdAt) image.createdAt = image.updatedAt;
      if (image.blob && !urls.has(image.id)) urls.set(image.id, URL.createObjectURL(image.blob));
    });
    document.querySelectorAll('[data-public-asset-id]').forEach(element => {
      const item = library.images.find(image => image.id === element.dataset.publicAssetId), image = element.querySelector('img');
      if (item && image) image.src = imageUrl(item);
    });
  }
  function redraw() {
    if (activeAssetScope === 'public') renderAssets();
    if (q('#assetSelectorModal').classList.contains('show')) renderAssetSelector();
  }
  async function commit(change, message) {
    if (busy || !loaded || loadError) return;
    busy = true; redraw();
    try {
      const next = structuredClone(library);
      change(next); await store(next); library = next; hydrate();
      showToast(message); return true;
    } catch (error) { showToast(error.message || '保存失败，请重试。'); return false; }
    finally { busy = false; menuId = ''; redraw(); }
  }
  function descriptor(image) {
    return { id: image.id, publicAssetId: image.id, name: image.name, source: 'asset', assetSource: 'public', url: imageUrl(image), previewType: 'product' };
  }
  function downloadImage(image) {
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[image.blob?.type] || 'png';
    downloadResource(imageUrl(image), /\.(png|jpe?g|webp)$/i.test(image.name) ? image.name : `${image.name}.${extension}`);
  }
  function contents(id, keyword) {
    const term = keyword.trim().normalize('NFKC').toLowerCase();
    // 69码可写在文件名或商品文件夹名中；原始上传文件名在重命名后仍可检索。
    const imageSearchText = item => [item.name, item.blob?.name, item.barcode, item.productCode, ...pathOf(item.folderId).map(parent => parent.name)].filter(Boolean).join(' ').normalize('NFKC').toLowerCase();
    return [
      ...library.folders.filter(item => !item.archived && (!item.space || item.space === 'public')).filter(item => term ? item.name.normalize('NFKC').toLowerCase().includes(term) : item.parentId === id).map(item => ({ kind: 'folder', item })),
      ...library.images.filter(item => !item.archived && (!item.space || item.space === 'public') && (!item.kind || item.kind === 'image')).filter(item => term ? imageSearchText(item).includes(term) : item.folderId === id).map(item => ({ kind: 'image', item }))
    ];
  }
  function imageMatches(item, filters) {
    const source = item.source || 'local';
    const status = ({ approved: 'reviewed', draft: 'unreviewed', pending: 'unreviewed' })[item.reviewStatus] || item.reviewStatus || 'reviewed';
    const date = String(item.createdAt || item.uploadedAt || item.updatedAt || '').slice(0, 10);
    return (!filters.type || filters.type === 'all' || filters.type === 'image')
      && (!filters.source || filters.source === 'all' || filters.source === source)
      && (!filters.reviewStatus || filters.reviewStatus === 'all' || filters.reviewStatus === status)
      && (!filters.date || filters.date === date);
  }
  function matchingImages(id, keyword, filters) {
    const images = keyword.trim() ? contents(ROOT, keyword).filter(entry => entry.kind === 'image').map(entry => entry.item) : library.images.filter(item => !item.archived && (!item.space || item.space === 'public') && (!item.kind || item.kind === 'image'));
    return images.filter(item => imageMatches(item, filters)
        && (id === ROOT || pathOf(item.folderId).some(parent => parent.id === id)));
  }
  function filteredContents(id, keyword, filters) {
    const filtering = [filters.type, filters.source, filters.reviewStatus].some(value => value && value !== 'all') || filters.date;
    return contents(id, keyword).filter(entry => entry.kind === 'image' ? imageMatches(entry.item, filters)
      : !filtering || matchingImages(entry.item.id, keyword, filters).length);
  }
  const libraryFilters = () => ({ type: activeAssetType, source: activeAssetSource, reviewStatus: activeAssetReviewStatus, date: activeAssetDate });
  function toggleSelectorSelection() {
    const images = matchingImages(assetSelectorState.folderId, assetSelectorState.keyword, assetSelectorState);
    const selected = assetSelectorState.draftSelected;
    const ids = new Set(images.map(item => item.id));
    const limit = activeImagePickerTarget === 'videoStart' ? 1 : MAX_COMPOSER_IMAGES;
    const localCount = activeImagePickerTarget === 'videoStart' ? 0 : getTargetImages(activeImagePickerTarget).filter(item => item.source === 'local').length;
    const others = [...selected.keys()].filter(id => !ids.has(id)).length;
    const available = Math.max(0, limit - localCount - others);
    const candidates = images.slice(0, available);
    if (candidates.length && candidates.every(item => selected.has(item.id))) images.forEach(item => selected.delete(item.id));
    else {
      if (activeImagePickerTarget === 'videoStart' && images.length) selected.clear();
      images.slice(0, activeImagePickerTarget === 'videoStart' ? 1 : available).forEach(item => selected.set(item.id, descriptor(item)));
      if (images.length > available) showToast(`最多添加 ${limit} 张图片。`);
    }
    renderAssetSelector();
  }
  function crumbs(id, selector = false) {
    const attr = selector ? 'data-public-selector-folder' : 'data-public-folder';
    return `<div class="asset-path-left"><button class="asset-back-btn" type="button" ${attr}="${folder(id)?.parentId || ROOT}" ${id === ROOT ? 'hidden' : ''} aria-label="返回上一级">‹</button><div class="public-breadcrumb"><button type="button" ${attr}="${ROOT}">公共素材</button>${pathOf(id).map(item => `<span>/</span><button type="button" ${attr}="${item.id}">${esc(item.name)}</button>`).join('')}</div></div>`;
  }
  function folderCard(item, selector = false) {
    const count = library.images.filter(image => !image.archived && image.folderId === item.id).length;
    if (selector) return `<button class="asset-selector-folder" type="button" data-public-selector-folder="${item.id}"><span class="asset-folder-icon" aria-hidden="true"></span><span><b>${esc(item.name)}</b><small>${count} 张图片 · ${esc(ownerName(item))}</small></span><span>›</span></button>`;
    return `<article class="asset-folder-card public-folder-card" aria-label="${esc(item.name)}">
      <button class="public-folder-open" type="button" data-public-folder="${item.id}" aria-label="打开${esc(item.name)}"><span class="asset-folder-main-row"><span class="asset-folder-icon" aria-hidden="true"></span><span class="public-folder-title">${esc(item.name)}</span></span><span class="asset-folder-meta"><span>${count} 张图片</span><span>·</span><span>${esc(item.updatedAt)} 更新</span></span></button>
      ${canEdit(item) && q('#page-assets').classList.contains('asset-list-view') ? `<div class="asset-folder-actions"><button type="button" data-public-rename-folder="${item.id}">重命名</button><button class="danger" type="button" data-public-delete-folder="${item.id}">删除</button></div>` : `      ${canEdit(item) ? `<button class="folder-more-btn" type="button" data-public-menu="${item.id}" aria-label="${esc(item.name)}的更多操作" aria-expanded="${menuId === item.id}">···</button>${menuId === item.id ? `<div class="folder-menu" role="menu"><button type="button" data-public-rename-folder="${item.id}" role="menuitem">重命名</button><button class="danger" type="button" data-public-delete-folder="${item.id}" role="menuitem">删除文件夹</button></div>` : ''}` : ''}`}

    </article>`;
  }
  function imageCard(item, selector = false) {
    const url = esc(imageUrl(item)), name = esc(item.name);
    if (selector) {
      const selected = assetSelectorState.draftSelected.has(item.id);
      return `<button class="asset-selector-card ${selected ? 'selected' : ''}" type="button" data-public-select="${item.id}" aria-pressed="${selected}"><span class="asset-selector-check">✓</span><span class="asset-selector-preview"><img class="asset-real-preview" src="${url}" alt="${name}" /></span><span class="asset-selector-card-info"><b>${name}</b><small>${esc(folderPath(item.folderId))}</small></span></button>`;
    }
    const isMenuOpen = menuId === item.id;
    return `<article class="asset-card-lite public-image-card" aria-label="${name}">
      <div class="simple-poster-preview public-preview" data-public-preview="${item.id}" role="button" tabindex="0" aria-label="预览${name}"><img class="asset-real-preview" src="${url}" alt="${name}" /><button class="asset-kind-badge asset-review-badge public-library-check" type="button" data-public-library-select="${item.id}" aria-label="选择${name}" aria-pressed="${librarySelection.has(item.id)}">${librarySelection.has(item.id) ? '✓' : '□'}</button></div>
      <div class="asset-card-info"><h3 class="asset-card-title">${name}</h3>
        <div class="asset-state-row"><span class="asset-status-pill">公共素材</span><span class="asset-card-date">${esc(item.updatedAt)}</span></div>
        <div class="asset-card-actions">
          <button class="link-btn" type="button" data-public-rename-image="${item.id}" ${canCreate() ? '' : 'disabled'}>✎ 重命名</button>
          ${canEdit(folder(item.folderId)) ? `<button class="asset-move-btn" type="button" data-public-move="${item.id}" title="移动到其他文件夹">↗ 移动</button>` : ''}
          <button class="link-btn" type="button" data-public-download="${item.id}">⇩ 下载</button>
          ${q('#page-assets').classList.contains('asset-list-view') ? `<button class="link-btn asset-delete-direct" type="button" data-public-remove="${item.id}" ${canCreate() ? '' : 'disabled'}>删除</button>` : `
          <button class="link-btn asset-card-more ${isMenuOpen ? 'active' : ''}" type="button" data-public-menu="${item.id}" aria-label="更多操作" aria-expanded="${isMenuOpen}" ${canCreate() ? '' : 'disabled'}>···</button>
          ${isMenuOpen && canCreate() ? `<div class="asset-card-menu" role="menu"><button type="button" data-public-remove="${item.id}" role="menuitem">删除</button></div>` : ''}`}

        </div>
      </div>
    </article>`;
  }
  const actions = document.createElement('div');
  actions.className = 'public-library-actions'; actions.hidden = true;
  actions.innerHTML = '<button class="btn btn-primary" type="button" data-public-create>＋ 新建文件夹</button><div class="asset-upload-dropdown"><button class="btn btn-primary" type="button" data-asset-upload-menu aria-expanded="false">↥ 上传文件 <span aria-hidden="true">⌄</span></button><div class="asset-upload-options" hidden><button type="button" data-public-upload>上传文件</button><button type="button" data-public-upload-directory>上传文件夹</button></div></div><button class="btn" type="button" data-public-download-selected hidden>下载选中</button><input id="publicUpload" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden />';
  q('.asset-utility-actions').append(actions);
  q('#assetSelectorType').insertAdjacentHTML('beforeend', '<option value="video" data-public-selector-filter hidden>视频</option>');
  q('#assetSelectorFilters').insertAdjacentHTML('beforeend', '<label data-public-selector-filter hidden><span>审核状态</span><select id="publicSelectorReviewStatus" aria-label="审核状态"><option value="all">全部状态</option><option value="unreviewed">未审核</option><option value="reviewed">已审核</option><option value="rejected">驳回</option></select></label><label data-public-selector-filter hidden><span>日期</span><input id="publicSelectorDate" type="date" aria-label="按生成或上传日期筛选" /></label>');
  q('#assetSelectorType').closest('label').insertAdjacentHTML('afterend', '<button class="btn asset-select-all-btn" id="publicSelectorSelectAll" data-public-selector-filter hidden type="button">全选</button>');
  q('#publicSelectorSelectAll').addEventListener('click', toggleSelectorSelection);
  [['#publicSelectorReviewStatus', 'reviewStatus'], ['#publicSelectorDate', 'date']].forEach(([selector, key]) => q(selector).addEventListener('change', event => { assetSelectorState[key] = event.target.value; resetSelectorPage(); renderAssetSelector(); }));
  function renderLibrary() {
    const active = activeAssetScope === 'public';
    actions.hidden = !active;
    if (!active) return false;
    if (folderId !== ROOT && !folder(folderId)) folderId = ROOT;
    q('#assetNewFolderBtn').hidden = true; q('#assetUploadBtn').hidden = true; q('#submitAssetReviewSelection').hidden = true;
    q('.asset-filter-controls').hidden = false; q('#assetSectionTitle').hidden = true;
    q('.asset-review-status-control').hidden = false;
    q('#assetScopeSelect').value = 'public'; q('#assetSearch').placeholder = '搜索素材名称、关键词';
    q('#assetTypeSelect').value = activeAssetType; q('#assetSourceFilter').value = activeAssetSource;
    q('#assetReviewStatusFilter').value = activeAssetReviewStatus; q('#assetDateFilter').value = activeAssetDate;
    q('#assetFileShell').classList.add('is-favorite'); q('#assetFileShell').classList.toggle('is-folder-root', folderId === ROOT);
    document.querySelectorAll('[data-asset-scope]').forEach(button => { const selected = button.dataset.assetScope === 'public'; button.classList.toggle('active', selected); button.setAttribute('aria-selected', String(selected)); });
    const current = folder(folderId);
    actions.querySelector('[data-public-create]').hidden = false;
    actions.querySelector('[data-public-upload]').hidden = false;
    actions.querySelectorAll('button').forEach(button => { button.disabled = busy || !loaded || Boolean(loadError) || !canCreate(); });
    q('#assetPathbar').innerHTML = crumbs(folderId);
    const filters = libraryFilters(), entries = filteredContents(folderId, q('#assetSearch').value, filters);
    const available = matchingImages(folderId, q('#assetSearch').value, filters), availableIds = new Set(available.map(item => item.id));
    librarySelection = new Set([...librarySelection].filter(id => availableIds.has(id)));
    const toggle = q('#toggleAssetReviewSelection'); toggle.hidden = true; toggle.disabled = !available.length;
    toggle.textContent = available.length && librarySelection.size === available.length ? '取消全选' : '全选';
    const downloadSelected = actions.querySelector('[data-public-download-selected]');
    downloadSelected.hidden = !librarySelection.size; downloadSelected.textContent = `下载选中（${librarySelection.size}）`;
    const pageSize = Number(q('#assetPageSize').value) || 10;
    const pages = Math.max(1, Math.ceil(entries.length / pageSize)); currentAssetPage = Math.min(currentAssetPage, pages);
    const visible = entries.slice((currentAssetPage - 1) * pageSize, currentAssetPage * pageSize);
    q('#assetResultSummary').textContent = `共 ${entries.filter(entry => entry.kind === 'folder').length} 个文件夹，${entries.filter(entry => entry.kind === 'image').length} 张图片${busy ? ' · 正在保存…' : ''}`;
    q('#assetGrid').innerHTML = !loaded || loadError ? `<div class="empty-state public-empty" role="status">${esc(loadError || '正在加载公共素材…')}</div>` : visible.length ? visible.map(entry => entry.kind === 'folder' ? folderCard(entry.item) : imageCard(entry.item)).join('') : `<div class="empty-state public-empty">${q('#assetSearch').value ? '没有找到匹配的文件夹或图片' : '这个文件夹还没有图片'}${!q('#assetSearch').value && canEdit(current) ? '<button class="btn btn-primary" type="button" data-public-upload>↥ 上传图片</button>' : ''}</div>`;
    renderAssetPagination(entries.length, pages);
    return true;
  }
  function renderSelector() {
    const active = assetSelectorState.scope === 'public';
    q('#assetSelectorModal').classList.toggle('public-selector-mode', active);
    document.querySelectorAll('[data-public-selector-filter]').forEach(element => { element.hidden = !active; });
    if (!active) { if (assetSelectorState.type === 'video') assetSelectorState.type = 'all'; return false; }
    if (!folder(assetSelectorState.folderId)) assetSelectorState.folderId = ROOT;
    const id = assetSelectorState.folderId;
    q('#assetSelectorFilters').hidden = false;
    q('#assetSelectorType').value = assetSelectorState.type; q('#assetSelectorSource').value = assetSelectorState.source;
    q('#publicSelectorReviewStatus').value = assetSelectorState.reviewStatus || 'all'; q('#publicSelectorDate').value = assetSelectorState.date || '';
    q('#assetSelectorSearch').placeholder = '搜索素材名称、关键词';
    q('#assetSelectorSearch').value = assetSelectorState.keyword;
    document.querySelectorAll('[data-selector-scope]').forEach(button => { const selected = button.dataset.selectorScope === 'public'; button.classList.toggle('active', selected); button.setAttribute('aria-selected', String(selected)); });
    q('#assetSelectorPath').classList.toggle('is-empty', id === ROOT); q('#assetSelectorPath').innerHTML = id === ROOT ? '' : crumbs(id, true);
    const entries = filteredContents(id, assetSelectorState.keyword, assetSelectorState), pagination = getSelectorPaginationState();
    const available = matchingImages(id, assetSelectorState.keyword, assetSelectorState);
    q('#publicSelectorSelectAll').disabled = !available.length;
    q('#publicSelectorSelectAll').textContent = available.length && available.every(item => assetSelectorState.draftSelected.has(item.id)) ? '取消全选' : '全选';
    const pages = Math.max(1, Math.ceil(entries.length / pagination.pageSize)), page = Math.min(pagination.page, pages);
    setSelectorPage(page);
    const visible = entries.slice((page - 1) * pagination.pageSize, page * pagination.pageSize);
    q('#assetSelectorContent').innerHTML = `<div class="asset-selector-content-inner"><div class="asset-selector-result-summary">全公司可用 · 进入文件夹选择图片${activeImagePickerTarget === 'videoStart' ? ' · 最多选择 1 张视频参考图' : ` · 最多添加 ${MAX_COMPOSER_IMAGES} 张`}</div>${!loaded || loadError ? `<div class="asset-selector-empty">${esc(loadError || '正在加载…')}</div>` : visible.length ? `<div class="asset-selector-grid">${visible.map(entry => entry.kind === 'folder' ? folderCard(entry.item, true) : imageCard(entry.item, true)).join('')}</div>` : '<div class="asset-selector-empty">没有找到图片或文件夹</div>'}</div>`;
    q('#assetSelectorPaginationHost').innerHTML = renderSelectorPagination(entries.length, pages, page, pagination.pageSize);
    q('#assetSelectorSelectedCount').textContent = `已选择 ${assetSelectorState.draftSelected.size} 张`;
    q('#assetSelectorConfirm').disabled = !assetSelectorState.draftSelected.size;
    return true;
  }
  function openPublic(target, id = ROOT, context = null) {
    closeImageSourceMenu(); closeVideoMentionMenu(); hideMention();
    openAssetSelector(target);
    pendingMention = context; assetSelectorState.scope = 'public'; assetSelectorState.folderId = id;
    renderAssetSelector(); q('#assetSelectorSearch').focus();
  }
  function inputName(title, value, submit) {
    openInputModal({ title, desc: '名称最多 60 个字。', value, onSubmit: name => {
      if (name.length > 60) { showToast('名称最多 60 个字。'); return; }
      submit(name);
    }});
  }
  function createFolder() {
    if (!canCreate()) return;
    const parentId = folderId === ROOT || canEdit(folder(folderId)) ? folderId : ROOT, actor = identity();
    inputName('新建公共文件夹', '', async name => { const saved = await commit(next => {
      if (!canCreate()) throw new Error('当前账号没有维护权限');
      if (next.folders.some(item => item.parentId === parentId && item.name === name)) throw new Error('当前目录已有同名文件夹');
      next.folders.push({ id: uid('public-folder'), parentId, name, ownerId: actor.id, ownerName: actor.name, updatedAt: today() });
    }, '公共文件夹已创建'); if (saved) { folderId = parentId; currentAssetPage = 1; q('#assetSearch').value = ''; redraw(); } });
  }
  async function upload(files, destination = folderId, newFolderName = '') {
    if ((!newFolderName && !canEdit(folder(destination))) || !canCreate() || busy) return false;
    const all = Array.from(files);
    if (all.length > 50) { showToast('单次最多上传 50 张图片，请分批上传。'); return; }
    busy = true; redraw();
    const accepted = [], rejected = [];
    try {
      for (const file of all) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) { rejected.push(file.name); continue; }
        try {
          const bitmap = await createImageBitmap(file); bitmap.close();
          accepted.push({ id: uid('public-image'), folderId: destination, name: file.name, blob: file, updatedAt: today() });
        } catch { rejected.push(file.name); }
      }
    } finally { busy = false; }
    if (!accepted.length) { redraw(); showToast('未上传：请选择有效的 JPG、PNG、WebP 图片，每张不超过 10 MB。'); return; }
    const saved = await commit(next => {
      if (!canCreate()) throw new Error('当前账号没有维护权限');
      if (newFolderName) {
        if (newFolderName.length > 60) throw new Error('文件夹名称最多 60 个字');
        if (next.folders.some(item => item.parentId === ROOT && item.name === newFolderName)) throw new Error('公共素材根目录已有同名文件夹');
        next.folders.push({ id: destination, parentId: ROOT, name: newFolderName, ownerId: identity().id, ownerName: identity().name, updatedAt: today() });
      } else if (!canEdit(folder(destination))) throw new Error('当前账号没有维护权限');
      next.images.push(...accepted); next.folders.find(item => item.id === destination).updatedAt = today();
    }, `已上传 ${accepted.length} 张图片${rejected.length ? `，跳过 ${rejected.length} 个无效或超限文件` : ''}`);
    if (saved) { folderId = destination; currentAssetPage = 1; q('#assetSearch').value = ''; redraw(); }
    return saved;
  }
  async function uploadDirectory(fileList) {
    if (!canCreate() || busy || !loaded || loadError) { showToast('当前无法上传，请稍后重试'); return; }
    const all = Array.from(fileList);
    if (!all.length) return;
    if (all.length > 50) { showToast('单次最多上传 50 个文件，请分批上传'); return; }
    const destination = canEdit(folder(folderId)) ? folderId : ROOT;
    const accepted = [], rejected = [];
    busy = true; redraw();
    try {
      for (const file of all) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 10*1024*1024) { rejected.push(file.name); continue; }
        try { const bitmap = await createImageBitmap(file); bitmap.close(); accepted.push(file); } catch { rejected.push(file.name); }
      }
    } finally { busy = false; }
    if (!accepted.length) { redraw(); showToast('请选择有效的 JPG、PNG、WebP 图片，每张不超过 10 MB'); return; }
    let firstRoot = null;
    const saved = await commit(next => {
      if (!canCreate() || destination !== ROOT && !canEdit(folder(destination))) throw new Error('当前账号没有维护权限');
      const mapping = new Map();
      for (const file of accepted) {
        const segments = (file.webkitRelativePath || `上传文件夹/${file.name}`).split('/').slice(0,-1).filter(name => name && name !== '.' && name !== '..');
        let parentId = destination, key = '';
        for (const part of segments) {
          key += `/${part}`;
          if (!mapping.has(key)) {
            let name = part, count = 1;
            while (next.folders.some(item => !item.archived && item.parentId === parentId && item.name === name)) name = `${part} (${count++})`;
            const id = uid('public-folder');
            next.folders.push({id,parentId,name,ownerId:identity().id,ownerName:identity().name,updatedAt:today()}); mapping.set(key,id); firstRoot ||= id;
          }
          parentId = mapping.get(key);
        }
        next.images.push({id:uid('public-image'),folderId:parentId,name:file.name,blob:file,updatedAt:today()});
      }
    }, `已上传 ${accepted.length} 张图片，保留文件夹结构${rejected.length ? `，跳过 ${rejected.length} 个无效或超限文件` : ''}`);
    if (saved) { folderId = firstRoot || destination; currentAssetPage = 1; q('#assetSearch').value = ''; redraw(); }
  }
  function descendants(id) {
    const ids = new Set([id]);
    let previous = 0;
    while (ids.size !== previous) { previous = ids.size; library.folders.forEach(item => { if (ids.has(item.parentId)) ids.add(item.id); }); }
    return ids;
  }
  const uploadMask = document.createElement('div');
  uploadMask.className = 'modal-mask'; uploadMask.id = 'publicUploadModal'; uploadMask.setAttribute('role', 'dialog'); uploadMask.setAttribute('aria-modal', 'true'); uploadMask.setAttribute('aria-labelledby', 'publicUploadTitle');
  uploadMask.innerHTML = '<div class="modal favorite-dialog"><div class="modal-head"><div><h2 class="modal-title" id="publicUploadTitle">上传公共素材</h2><p class="page-desc" id="publicUploadSummary"></p></div><button class="close-btn" type="button" data-public-close-upload aria-label="关闭">×</button></div><div class="modal-body"><label class="label" for="publicUploadDestination">保存到文件夹</label><select class="field" id="publicUploadDestination"></select><div id="publicUploadNewFolder"><label class="label" for="publicUploadFolderName">新文件夹名称</label><input class="field" id="publicUploadFolderName" type="text" maxlength="60" placeholder="输入文件夹名称" /></div><p class="public-upload-error" id="publicUploadError" role="alert"></p></div><div class="modal-actions"><button class="btn" type="button" data-public-close-upload>取消</button><button class="btn btn-primary" id="publicUploadConfirm" type="button">确认上传</button></div></div>';
  document.body.append(uploadMask);
  let pendingUploads = [];
  function syncUploadDestination() {
    q('#publicUploadNewFolder').hidden = q('#publicUploadDestination').value !== 'new'; q('#publicUploadError').textContent = '';
  }
  function chooseUploadFolder(files) {
    if (!canCreate() || busy) return;
    pendingUploads = files;
    const candidates = library.folders.filter(item => !item.archived && (!item.space || item.space === 'public') && canEdit(item));
    q('#publicUploadDestination').innerHTML = candidates.map(item => `<option value="${item.id}">${esc(folderPath(item.id))}</option>`).join('') + '<option value="new">＋ 新建文件夹</option>';
    q('#publicUploadSummary').textContent = `已选择 ${files.length} 个文件，请选择保存位置。`;
    q('#publicUploadFolderName').value = ''; syncUploadDestination(); uploadMask.classList.add('show');
    (candidates.length ? q('#publicUploadDestination') : q('#publicUploadFolderName')).focus();
  }
  q('#publicUploadDestination').addEventListener('change', syncUploadDestination);
  q('#publicUploadConfirm').addEventListener('click', async () => {
    if (busy) return;
    const destination = q('#publicUploadDestination').value, name = q('#publicUploadFolderName').value.trim();
    if (destination === 'new' && !name) { q('#publicUploadError').textContent = '请输入新文件夹名称。'; q('#publicUploadFolderName').focus(); return; }
    q('#publicUploadConfirm').disabled = true;
    try { if (await upload(pendingUploads, destination === 'new' ? uid('public-folder') : destination, destination === 'new' ? name : '')) { uploadMask.classList.remove('show'); pendingUploads = []; } }
    finally { q('#publicUploadConfirm').disabled = false; }
  });
  const moveMask = document.createElement('div');
  moveMask.className = 'modal-mask'; moveMask.id = 'publicMoveModal'; moveMask.setAttribute('role', 'dialog'); moveMask.setAttribute('aria-modal', 'true'); moveMask.setAttribute('aria-labelledby', 'publicMoveTitle');
  moveMask.innerHTML = '<div class="modal favorite-dialog"><div class="modal-head"><h2 class="modal-title" id="publicMoveTitle">移动公共图片</h2><button class="close-btn" type="button" data-public-close-move aria-label="关闭">×</button></div><div class="modal-body"><label class="label" for="publicMoveDestination">选择可维护的目标文件夹</label><select class="field" id="publicMoveDestination"></select></div><div class="modal-actions"><button class="btn" type="button" data-public-close-move>取消</button><button class="btn btn-primary" id="publicMoveConfirm" type="button">确认移动</button></div></div>';
  document.body.append(moveMask);
  let movingId = '';
  function openMove(image) {
    const candidates = library.folders.filter(item => canEdit(item) && item.id !== image.folderId);
    if (!candidates.length) { showToast('请先创建其他可维护的文件夹。'); return; }
    movingId = image.id;
    q('#publicMoveDestination').innerHTML = candidates.map(item => `<option value="${item.id}">${esc(folderPath(item.id))}</option>`).join('');
    moveMask.classList.add('show'); q('#publicMoveDestination').focus();
  }
  q('#publicMoveConfirm').addEventListener('click', () => {
    const image = library.images.find(item => item.id === movingId), destination = q('#publicMoveDestination').value;
    if (!image || !canEdit(folder(image.folderId)) || !canEdit(folder(destination))) return;
    moveMask.classList.remove('show');
    commit(next => { if (!canEdit(folder(image.folderId)) || !canEdit(folder(destination))) throw new Error('当前账号没有维护权限'); next.images.find(item => item.id === image.id).folderId = destination; next.folders.filter(item => [image.folderId, destination].includes(item.id)).forEach(item => { item.updatedAt = today(); }); }, '图片已移动');
  });
  const mentionMenu = document.createElement('div'); mentionMenu.className = 'public-mention-menu'; mentionMenu.hidden = true; mentionMenu.id = 'publicMentionMenu'; mentionMenu.setAttribute('role', 'listbox'); mentionMenu.setAttribute('aria-label', '选择公共素材'); document.body.append(mentionMenu);
  function hideMention() { if (mention) { mention.input.setAttribute('aria-expanded', 'false'); mention.input.removeAttribute('aria-activedescendant'); } mention = null; mentionMenu.hidden = true; }
  const hasVideoFooter = () => ['image', 'public'].includes(videoMentionGroup);
  function currentImageOptions(query) {
    const entries = [], seen = new Set(), term = query.normalize('NFKC').toLowerCase();
    const publicMatches = new Set(contents(ROOT, query).filter(entry => entry.kind === 'image').map(entry => entry.item.id));
    const add = (item, kind, label) => {
      const key = item.url ? new URL(item.url, location.href).href : item.id;
      if (seen.has(key)) return;
      seen.add(key);
      if (term && !item.name?.normalize('NFKC').toLowerCase().includes(term) && !publicMatches.has(item.publicAssetId)) return;
      entries.push({ kind, item, info: `${label} · 当前进程`, section: '当前进程资源' });
    };
    videoStartImages.forEach(item => add(item, 'subject-image', '商品主体'));
    videoReferenceImages.forEach(item => add(item, 'reference-image', '参考图片'));
    document.querySelectorAll('#videoChatThread img').forEach((image, index) => {
      const assetId = image.closest('[data-public-asset-id]')?.dataset.publicAssetId;
      const item = library.images.find(item => item.id === assetId);
      add(item ? descriptor(item) : { id: `progress-image-${index}`, name: image.alt || `图片 ${index + 1}`, url: image.src, source: 'asset' }, 'reference-image', '图片');
    });
    const roles = [...document.querySelectorAll('[data-video-role-id]')].filter(button => !term || button.dataset.videoRoleName.toLowerCase().includes(term))
      .filter(button => !videoStartImages.some(item => item.id === `video-role-${button.dataset.videoRoleId}`))
      .map(button => ({ kind: 'subject-role', item: { id: button.dataset.videoRoleId, name: button.dataset.videoRoleName }, info: '商品主体 · 角色资产', icon: '主', section: '商品主体' }));
    return [...entries, ...roles];
  }
  function currentMediaOptions(kind, current) {
    const entries = [], seen = new Set(), term = mention.query.normalize('NFKC').toLowerCase();
    const add = item => {
      if (!item.url || seen.has(item.url)) return;
      seen.add(item.url);
      if (term && !item.name.toLowerCase().includes(term)) return;
      entries.push({ kind: `existing-${kind}`, item, info: `${kind === 'audio' ? '参考音频' : '参考视频'} · 当前进程`, icon: kind === 'audio' ? '♫' : '▶', section: '当前进程资源' });
    };
    current.forEach(add);
    document.querySelectorAll(`#videoChatThread ${kind}`).forEach((media, index) => {
      const url = media.currentSrc || media.getAttribute('src') || media.querySelector('source')?.src;
      if (url) add({ id: `progress-${kind}-${index}`, name: media.title || media.getAttribute('aria-label') || `${kind === 'audio' ? '音频' : '视频'} ${index + 1}`, url, source: 'asset' });
    });
    return entries;
  }
  function videoOptions() {
    if (videoMentionGroup === 'public') {
      const entries = contents(ROOT, mention.query);
      if (mention.query) entries.sort((a, b) => Number(a.kind === 'folder') - Number(b.kind === 'folder'));
      return entries.map(entry => entry.kind === 'folder'
        ? { kind: 'public-folder', item: entry.item, info: `${library.images.filter(image => !image.archived && image.folderId === entry.item.id).length} 张图片 · 公共素材`, icon: 'folder', section: '公共素材' }
        : { kind: 'reference-image', item: descriptor(entry.item), info: `参考图片 · ${folderPath(entry.item.folderId)}`, section: '公共素材' });
    }
    if (videoMentionGroup === 'video') {
      if (q('#videoModeSelect').value !== 'smart') return [];
      return [
        ...currentMediaOptions('video', videoReferenceVideos),
        { kind: 'video-local', item: { name: '上传本地视频' }, info: '从电脑选择参考视频', icon: '↥', action: true, section: '添加参考视频' },
        { kind: 'video-link', item: { name: '添加视频链接' }, info: '粘贴 http 或 https 视频地址', icon: '链', action: true, section: '添加参考视频' }
      ];
    }
    if (videoMentionGroup === 'audio') return [...currentMediaOptions('audio', videoReferenceAudios), { kind: 'audio-local', item: { name: '上传参考音频' }, info: 'MP3、WAV、M4A 等，最大 20 MB', icon: '↥', action: true, section: '添加参考音频' }];
    return currentImageOptions(mention.query);
  }
  function openVideoPicker(context) {
    if (videoMentionGroup === 'public') { openPublic('videoReference', ROOT, context); return; }
    hideMention(); closeImageSourceMenu(); closeVideoMentionMenu(); closeVideoAuxiliaryMenus();
    openAssetSelector('videoReference'); pendingMention = context;
    q('#assetSelectorSearch').focus();
  }
  function drawVideoMention(entries) {
    const labels = { image: '图片', video: '视频', audio: '音频', public: '公共素材' };
    const footer = hasVideoFooter();
    const maxIndex = entries.length - (footer ? 0 : 1);
    mentionIndex = Math.max(0, Math.min(mentionIndex, maxIndex));
    let section = '';
    return `<div class="video-mention-groups" role="tablist" aria-label="资源类型">${Object.entries(labels).map(([key, label]) => `<button type="button" role="tab" data-video-mention-group="${key}" aria-selected="${videoMentionGroup === key}">${label}</button>`).join('')}</div>
      <div class="video-mention-resource-list" role="listbox" aria-label="${labels[videoMentionGroup]}">${entries.length ? entries.map((entry, index) => {
        const heading = section !== entry.section ? `<div class="video-mention-section">${esc(entry.section || '当前进程资源')}</div>` : ''; section = entry.section;
        const thumbnail = entry.kind === 'existing-video' ? `<span class="video-mention-kind">▶</span>` : entry.kind === 'existing-audio' ? `<span class="video-mention-kind">♫</span>` : entry.icon === 'folder' ? '<span class="asset-folder-icon"></span>' : entry.item.url ? `<img src="${esc(entry.item.url)}" alt="" />` : `<span class="video-mention-kind">${entry.icon || '图'}</span>`;
        return `${heading}<button type="button" role="option" id="public-option-${index}" class="public-mention-option ${index === mentionIndex ? 'active' : ''}" aria-selected="${index === mentionIndex}" data-public-mention-index="${index}">${thumbnail}<span><b>${entry.action || entry.kind === 'public-folder' ? '' : '@'}${esc(entry.item.name.replace(/^@/, ''))}</b><small>${esc(entry.info)}</small></span></button>`;
      }).join('') : `<div class="public-mention-empty">${videoMentionGroup === 'video' ? '参考视频在智能模式下可用' : videoMentionGroup === 'public' ? '没有匹配的公共素材，可按名称或69码搜索' : '当前进程没有匹配的图片，可从素材库选择'}</div>`}</div>
      ${footer ? `<button type="button" class="public-mention-all ${entries.length === mentionIndex ? 'active' : ''}" data-public-mention-index="${entries.length}" role="option" id="public-option-${entries.length}" aria-selected="${entries.length === mentionIndex}">${videoMentionGroup === 'public' ? '浏览公共素材' : '从我的素材选择图片'} →</button>` : ''}`;
  }
  function chooseVideoMention(context, entry) {
    if (!entry) { if (hasVideoFooter()) openVideoPicker(context); return; }
    if (entry.kind === 'public-folder') { openPublic('videoReference', entry.item.id, context); return; }
    if (entry.kind === 'audio-local') { pendingAudioUpload = context; hideMention(); q('#videoAudioReferenceInput').value = ''; q('#videoAudioReferenceInput').click(); return; }
    if (entry.kind === 'existing-audio' || entry.kind === 'existing-video') {
      if (entry.kind === 'existing-audio') videoReferenceAudios = [entry.item]; else videoReferenceVideos = [entry.item];
      renderVideoStartFrame(); hideMention(); clearMention(context); return;
    }
    if (entry.kind === 'video-local') {
      pendingVideoUpload = context; hideMention(); q('#videoReferenceInput').value = ''; q('#videoReferenceInput').click(); return;
    }
    if (entry.kind === 'video-link') {
      hideMention();
      openInputModal({ title: '添加参考视频链接', desc: '粘贴可直接访问的在线视频地址。', label: '视频 URL', inputType: 'url', placeholder: 'https://example.com/video.mp4', value: /^https?:/.test(context.query) ? context.query : '', onSubmit: value => {
        const previous = videoReferenceVideos[0]?.id;
        try { addOnlineReferenceVideo(value); } catch { showToast('视频链接无效，请检查后重试。'); }
        if (videoReferenceVideos[0]?.id !== previous) clearMention(context);
      }}); return;
    }
    if (entry.kind === 'subject-role') selectVideoSubjectRole(entry.item.id, entry.item.name);
    else if (entry.kind === 'subject-image') { setTargetImages('videoStart', [{ ...entry.item, usage: 'subject' }]); showToast('已选择商品主体。'); }
    else {
      const current = getTargetImages('videoReference');
      if (!current.some(item => item.id === entry.item.id) && current.length >= MAX_COMPOSER_IMAGES) { showToast(`最多添加 ${MAX_COMPOSER_IMAGES} 张参考图。`); return; }
      if (!current.some(item => item.id === entry.item.id)) setTargetImages('videoReference', [...current, entry.item]);
      showToast('已添加参考图。');
    }
    hideMention(); clearMention(context);
  }
  q('#videoReferenceInput').addEventListener('change', event => {
    const context = pendingVideoUpload, file = event.target.files?.[0]; pendingVideoUpload = null;
    queueMicrotask(() => { if (context && file && videoReferenceVideos[0]?.file === file) clearMention(context); });
  });
  q('#videoReferenceInput').addEventListener('cancel', () => { pendingVideoUpload = null; });
  q('#videoAudioReferenceInput').addEventListener('change', event => {
    const file = event.target.files?.[0], context = pendingAudioUpload; pendingAudioUpload = null; event.target.value = '';
    if (!file) return;
    if (!(file.type.startsWith('audio/') || (!file.type && /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name))) || file.size > 20 * 1024 * 1024 || !file.size) { showToast('请选择有效的音频文件，大小不超过 20 MB。'); return; }
    videoReferenceAudios = [{ id: `audio-${file.name}-${file.size}-${file.lastModified}`, name: file.name, source: 'local', url: URL.createObjectURL(file), file }];
    renderVideoStartFrame(); clearMention(context); showToast('已添加参考音频。');
  });
  q('#videoAudioReferenceInput').addEventListener('cancel', () => { pendingAudioUpload = null; });
  function mentionOptions() {
    if (!mention) return [];
    if (mention.target === 'videoReference') return videoOptions();
    const entries = contents(ROOT, mention.query);
    if (/^\d+$/.test(mention.query.normalize('NFKC'))) entries.sort((a, b) => Number(a.kind === 'folder') - Number(b.kind === 'folder'));
    return entries.slice(0, 7);
  }
  function drawMention() {
    const entries = mentionOptions(), rect = mention.input.getBoundingClientRect();
    mentionIndex = Math.max(0, Math.min(mentionIndex, entries.length));
    const isVideo = mention.target === 'videoReference', width = isVideo ? 336 : 370;
    mentionMenu.classList.toggle('video-resource-mention', isVideo);
    mentionMenu.hidden = false; mentionMenu.style.width = `${Math.min(width, window.innerWidth - 24)}px`;
    mentionMenu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
    mentionMenu.setAttribute('role', isVideo ? 'dialog' : 'listbox'); mentionMenu.setAttribute('aria-label', isVideo ? '选择创作素材' : '选择公共素材');
    mentionMenu.innerHTML = isVideo ? drawVideoMention(entries) : `<div class="public-mention-heading">公共素材 <span>选择文件夹或图片</span></div>${!loaded || loadError ? `<div class="public-mention-empty">${esc(loadError || '正在加载…')}</div>` : entries.length ? entries.map((entry, index) => `<button type="button" role="option" id="public-option-${index}" class="public-mention-option ${index === mentionIndex ? 'active' : ''}" aria-selected="${index === mentionIndex}" data-public-mention-index="${index}">${entry.kind === 'folder' ? '<span class="asset-folder-icon"></span>' : `<img src="${esc(imageUrl(entry.item))}" alt="" />`}<span><b>${esc(entry.item.name)}</b><small>${entry.kind === 'folder' ? `${esc(ownerName(entry.item))} · 点击进入选择` : esc(folderPath(entry.item.folderId))}</small></span><span>${entry.kind === 'folder' ? '›' : '+'}</span></button>`).join('') : '<div class="public-mention-empty">没有匹配的素材，试试其他名称</div>'}<button type="button" class="public-mention-all ${entries.length === mentionIndex ? 'active' : ''}" data-public-mention-index="${entries.length}" role="option" id="public-option-${entries.length}" aria-selected="${entries.length === mentionIndex}">浏览全部公共素材 →</button>`;
    mention.input.setAttribute('aria-expanded', 'true'); mention.input.setAttribute('aria-controls', 'publicMentionMenu'); mention.input.setAttribute('aria-activedescendant', `public-option-${mentionIndex}`);
    if (!q(`#public-option-${mentionIndex}`)) mention.input.removeAttribute('aria-activedescendant');
    const height = mentionMenu.getBoundingClientRect().height, top = rect.top - height - 10;
    mentionMenu.style.top = `${top > 12 ? top : Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12))}px`;
  }
  function detectMention(input, target) {
    const cursor = input.selectionStart, before = input.value.slice(0, cursor), match = before.match(/(?:^|[^\w@])@([^@\s]*)$/);
    if (!match) { hideMention(); return; }
    if (target === 'videoReference') {
      if (!mention || mention.input !== input || mention.start !== cursor - match[1].length - 1) { videoMentionGroup = 'image'; videoGroupChosen = false; }
      if (!videoGroupChosen && /^\d+$/.test(match[1].normalize('NFKC'))) videoMentionGroup = 'public';
      closeVideoMentionMenu(); closeVideoAuxiliaryMenus(); closeImageSourceMenu();
    }
    mention = { input, target, start: cursor - match[1].length - 1, end: cursor, query: match[1], token: '@' + match[1] };
    mentionIndex = 0; drawMention();
  }
  function clearMention(context) {
    if (!context || context.input.value.slice(context.start, context.end) !== context.token) return;
    const input = context.input;
    input.value = input.value.slice(0, context.start) + input.value.slice(context.end);
    input.setSelectionRange(context.start, context.start); input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
  }
  function chooseMention(index) {
    if (!mention) return;
    const context = { ...mention }, entry = mentionOptions()[index];
    if (context.target === 'videoReference') { chooseVideoMention(context, entry); return; }
    if (!entry || entry.kind === 'folder') { openPublic(context.target, entry?.item.id || ROOT, context); return; }
    const current = getTargetImages(context.target), image = descriptor(entry.item);
    if (context.target !== 'videoStart' && !current.some(item => item.id === image.id) && current.length >= MAX_COMPOSER_IMAGES) { showToast(`最多添加 ${MAX_COMPOSER_IMAGES} 张图片。`); return; }
    setTargetImages(context.target, context.target === 'videoStart' ? [image] : current.some(item => item.id === image.id) ? current : [...current, image]);
    hideMention(); clearMention(context); showToast('已添加公共素材图片。');
  }
  [['#mainPrompt', 'main'], ['#sessionPrompt', 'session'], ['#videoMotionPrompt', 'videoReference']].forEach(([selector, target]) => {
    const input = q(selector); input.addEventListener('input', event => { if (!event.isComposing) detectMention(input, target); });
    input.addEventListener('compositionend', () => detectMention(input, target));
    input.addEventListener('click', () => detectMention(input, target));
    input.placeholder = target === 'videoReference' ? VIDEO_MENTION_HINT : target === 'session' ? '继续描述修改要求，输入 @69码 搜索并选择图片' : '描述你的需求，输入 @69码 搜索并选择图片';
  });
  document.addEventListener('keydown', event => {
    if (event.target.matches('[data-public-preview]') && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); const image = library.images.find(item => item.id === event.target.dataset.publicPreview);
      if (image) openImagePreview(imageUrl(image), image.name); return;
    }
    if (mention && !event.isComposing && event.target === mention.input) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.key === 'Escape') hideMention();
        else if (event.key === 'Enter') chooseMention(mentionIndex);
        else { const count = mentionOptions().length + (mention.target === 'videoReference' && !hasVideoFooter() ? 0 : 1); if (count) { mentionIndex = (mentionIndex + (event.key === 'ArrowDown' ? 1 : -1) + count) % count; drawMention(); q(`#public-option-${mentionIndex}`)?.scrollIntoView({block:'nearest'}); } }
      }
    }
    if (event.key === 'Escape') { if (!busy) { uploadMask.classList.remove('show'); pendingUploads = []; } moveMask.classList.remove('show'); menuId = ''; if (activeAssetScope === 'public') renderAssets(); }
  }, true);
  document.addEventListener('mousedown', event => { if (event.target.closest('#publicMentionMenu')) event.preventDefault(); });
  document.addEventListener('click', event => {
    const audioRemove = event.target.closest('[data-remove-video-audio]');
    if (audioRemove) { event.preventDefault(); event.stopPropagation(); videoReferenceAudios = videoReferenceAudios.filter(item => item.id !== audioRemove.dataset.removeVideoAudio); renderVideoStartFrame(); return; }
    const videoGroup = event.target.closest('[data-video-mention-group]');
    if (videoGroup && mention?.target === 'videoReference') { event.preventDefault(); event.stopPropagation(); videoMentionGroup = videoGroup.dataset.videoMentionGroup; videoGroupChosen = true; mentionIndex = 0; drawMention(); return; }
    if (activeAssetScope === 'public' && event.target.closest('#toggleAssetReviewSelection')) {
      event.preventDefault(); event.stopPropagation();
      const images = matchingImages(folderId, q('#assetSearch').value, libraryFilters());
      librarySelection = images.length && images.every(item => librarySelection.has(item.id)) ? new Set() : new Set(images.map(item => item.id));
      renderAssets(); return;
    }
    const button = event.target.closest('[data-public-folder],[data-public-selector-folder],[data-public-menu],[data-public-create],[data-public-upload],[data-public-preview],[data-public-download],[data-public-download-selected],[data-public-library-select],[data-public-rename-folder],[data-public-delete-folder],[data-public-rename-image],[data-public-remove],[data-public-move],[data-public-select],[data-public-mention-index],[data-public-close-move],[data-public-close-upload]');
    if (!button) {
      if (!event.target.closest('#publicMentionMenu') && event.target !== mention?.input) hideMention();
      if (event.target === moveMask) moveMask.classList.remove('show');
      if (event.target === uploadMask && !busy) { uploadMask.classList.remove('show'); pendingUploads = []; }
      if (menuId && !event.target.closest('.folder-menu')) { menuId = ''; redraw(); }
      return;
    }
    event.preventDefault(); event.stopPropagation();
    const data = button.dataset;
    if (data.publicMentionIndex !== undefined) { chooseMention(Number(data.publicMentionIndex)); return; }
    if (data.publicCloseUpload !== undefined) { if (!busy) { uploadMask.classList.remove('show'); pendingUploads = []; } return; }
    if (data.publicCloseMove !== undefined) { moveMask.classList.remove('show'); return; }
    if (data.publicLibrarySelect) { if (librarySelection.has(data.publicLibrarySelect)) librarySelection.delete(data.publicLibrarySelect); else librarySelection.add(data.publicLibrarySelect); renderAssets(); return; }
    if (data.publicDownloadSelected !== undefined) { library.images.filter(item => !item.archived && librarySelection.has(item.id)).forEach(downloadImage); return; }
    if (data.publicFolder) { folderId = data.publicFolder; currentAssetPage = 1; q('#assetSearch').value = ''; menuId = ''; renderAssets(); return; }
    if (data.publicSelectorFolder) { assetSelectorState.folderId = data.publicSelectorFolder; assetSelectorState.keyword = ''; resetSelectorPage(); renderAssetSelector(); return; }
    if (busy || !loaded || loadError) return;
    if (data.publicMenu) { menuId = menuId === data.publicMenu ? '' : data.publicMenu; renderAssets(); return; }
    if (data.publicCreate !== undefined) { createFolder(); return; }
    if (data.publicUpload !== undefined) { if (canCreate()) q('#publicUpload').click(); return; }
    const imageId = data.publicSelect || data.publicPreview || data.publicDownload || data.publicRenameImage || data.publicRemove || data.publicMove;
    const image = library.images.find(item => item.id === imageId);
    if (data.publicSelect && image) {
      const selected = assetSelectorState.draftSelected;
      if (selected.has(image.id)) selected.delete(image.id);
      else if (activeImagePickerTarget === 'videoStart') { selected.clear(); selected.set(image.id, descriptor(image)); }
      else {
        const localCount = getTargetImages(activeImagePickerTarget).filter(item => item.source === 'local').length;
        if (localCount + selected.size >= MAX_COMPOSER_IMAGES) { showToast(`最多添加 ${MAX_COMPOSER_IMAGES} 张图片。`); return; }
        selected.set(image.id, descriptor(image));
      }
      renderAssetSelector(); return;
    }
    if (data.publicPreview && image) { openImagePreview(imageUrl(image), image.name); return; }
    if (data.publicDownload && image) { downloadImage(image); return; }
    if (data.publicRenameImage && image && canCreate()) { inputName('重命名公共图片', image.name, name => commit(next => { if (!canCreate()) throw new Error('当前账号没有维护权限'); Object.assign(next.images.find(item => item.id === image.id), { name, updatedAt: today() }); }, '图片已重命名')); return; }
    if (data.publicMove && image && canEdit(folder(image.folderId))) { openMove(image); return; }
    if (data.publicRemove && image && canCreate()) {
      openConfirmModal({ title: '删除公共素材', desc: `删除「${image.name}」后，该图片将从公共素材库中移除，已有创作引用保留。`, confirmText: '确认删除', onConfirm: () => commit(next => { if (!canCreate()) throw new Error('当前账号没有维护权限'); next.images.find(item => item.id === image.id).archived = true; }, '公共素材已删除') }); return;
    }
    const item = folder(data.publicRenameFolder || data.publicDeleteFolder);
    if (!item || !canEdit(item)) return;
    if (data.publicRenameFolder) { inputName('重命名公共文件夹', item.name, name => commit(next => { if (!canEdit(folder(item.id))) throw new Error('当前账号没有维护权限'); if (next.folders.some(other => other.id !== item.id && other.parentId === item.parentId && other.name === name)) throw new Error('当前目录已有同名文件夹'); Object.assign(next.folders.find(other => other.id === item.id), { name, updatedAt: today() }); }, '文件夹已重命名')); return; }
    if (data.publicDeleteFolder) {
      const ids = descendants(item.id), count = library.images.filter(image => ids.has(image.folderId)).length;
      openConfirmModal({ title: '删除公共文件夹', desc: `将删除「${item.name}」及其子文件夹，共 ${count} 张图片。已有创作引用保留。`, confirmText: '确认删除', onConfirm: () => commit(next => { if ([...ids].some(id => !canEdit(folder(id)))) throw new Error('文件夹中包含其他人的内容，无法删除'); next.folders = next.folders.filter(other => !ids.has(other.id)); next.images.filter(image => ids.has(image.folderId)).forEach(image => { image.archived = true; }); }, '公共文件夹已删除') });
    }
  }, true);
  q('#publicUpload').addEventListener('change', event => { const files = [...event.target.files]; event.target.value = ''; if (!files.length) return; if (canEdit(folder(folderId))) upload(files); else chooseUploadFolder(files); });
  window.addEventListener('resize', () => { if (mention) drawMention(); });
  window.addEventListener('scroll', event => { if (mention && !mentionMenu.contains(event.target)) drawMention(); }, true);
  window.PublicAssets = {
    renderLibrary, renderSelector, uploadDirectory,
    confirmMention() { if (pendingMention && assetSelectorState.draftSelected.size) { const context = pendingMention; pendingMention = null; clearMention(context); } },
    closeSelector() { const input = pendingMention?.input; pendingMention = null; hideMention(); if (input) input.focus(); },
    identityChanged() { menuId = ''; uploadMask.classList.remove('show'); pendingUploads = []; moveMask.classList.remove('show'); redraw(); }
  };
  (async () => {
    try {
      const db = await database;
      const saved = await new Promise((resolve, reject) => { const request = db.transaction('library').objectStore('library').get('state'); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      if (saved && (!Array.isArray(saved.folders) || !Array.isArray(saved.images))) throw new Error('公共素材数据异常，请联系维护人');
      library = saved || seed(); if (!saved) await store(library); hydrate();
    } catch (error) { loadError = `公共素材加载失败：${error.message || '请刷新重试'}`; }
    loaded = true; redraw();
  })();
})();
