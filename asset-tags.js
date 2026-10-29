/* Shared tag vocabulary and per-file assignments for the local front-end demo. */
(() => {
  'use strict';
  const q = selector => document.querySelector(selector), esc = escapeHtml;
  const STORE = 'chaoren-asset-tags-v1', records = new Map();
  let state = {tags: [], assignments: {}}, selected = [], editing = null, draft = new Set(), trigger = null;
  let managerPage = 1, managerPageSize = 20, managerSort = 'desc';
  const managerSelection = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && Array.isArray(saved.tags) && saved.assignments && typeof saved.assignments === 'object') {
      state.tags = saved.tags.filter(tag => typeof tag.id === 'string' && typeof tag.name === 'string');
      for (const [id, tags] of Object.entries(saved.assignments)) if (Array.isArray(tags)) state.assignments[id] = tags.filter(tag => state.tags.some(item => item.id === tag));
    }
  } catch {}
  for (const [kind, items] of [['image', mockAssets], ['video', mockVideos]]) items.forEach((item, index) => { item.tagKey ||= item.recoveredAssetId || `demo-${kind}-${index}`; });
  function key(item, kind, scope = 'personal') {
    if (scope === 'public') return `public:${item.id}`;
    item.tagKey ||= item.recoveredAssetId || `asset-${crypto.randomUUID()}`;
    return `${kind}:${item.tagKey}`;
  }
  function action(item, kind, scope = 'personal', url = '', editable = true) {
    const id = key(item, kind, scope); records.set(id, {item, editable, url});
    return `<button type="button" class="link-btn" data-asset-tags="${esc(id)}" ${editable ? '' : 'disabled'}>标签</button>`;
  }
  function forAsset(item, kind, scope = 'personal') {
    const ids = state.assignments[key(item, kind, scope)] ?? item.tagIds ?? [];
    return state.tags.filter(tag => ids.includes(tag.id)).map(tag => tag.name);
  }
  function summary(item, kind, scope = 'personal') {
    const tags = forAsset(item, kind, scope);
    return tags.length ? `<span class="asset-tag-chips">${tags.map(name => `<span class="asset-tag-chip" title="${esc(name)}">${esc(name)}</span>`).join('')}</span>` : '';
  }
  function matches(item, kind, scope, ids) { return ids.some(id => (state.assignments[key(item, kind, scope)] ?? item.tagIds ?? []).includes(id)); }
  function save(next) {
    try { localStorage.setItem(STORE, JSON.stringify(next)); state = next; return true; }
    catch { q('#assetTagError').textContent = '保存失败，请检查浏览器存储空间后重试。'; return false; }
  }
  const filter = document.createElement('div'); filter.className = 'asset-tag-filter'; filter.hidden = true;
  filter.innerHTML = `<span>标签</span><div class="asset-tag-select"><button type="button" id="assetTagFilterButton" aria-expanded="false" aria-controls="assetTagFilterPanel"><span>请选择</span><span aria-hidden="true">⌄</span></button><div id="assetTagFilterPanel" class="asset-tag-popover" hidden><input id="assetTagFilterSearch" type="search" placeholder="搜索标签" aria-label="搜索筛选标签"><div id="assetTagFilterOptions" class="asset-tag-options"></div><button type="button" id="assetTagFilterClear">清空选择</button></div></div>`;
  q('.asset-review-status-control').after(filter);
  const manager = document.createElement('section'); manager.id = 'assetTagManager'; manager.hidden = true;
  manager.innerHTML = `<div class="asset-tag-manager-toolbar"><button type="button" class="btn btn-primary" data-tag-create>新建标签</button><div class="asset-tag-manager-search"><input id="assetTagManagerSearch" type="search" placeholder="请输入标签名称搜索" aria-label="搜索管理标签"><button id="assetTagManagerSearchButton" type="button" aria-label="搜索标签"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg></button></div></div><div id="assetTagTable"></div><div class="asset-tag-manager-pagination"><span id="assetTagManagerTotal"></span><div id="assetTagManagerPages"></div><select id="assetTagManagerPageSize" aria-label="每页标签数量"><option value="20">20条/页</option><option value="50">50条/页</option><option value="100">100条/页</option></select></div>`;
  q('.asset-scope-tabs').after(manager);
  const dialog = document.createElement('dialog'); dialog.id = 'assetTagDialog'; dialog.setAttribute('aria-labelledby', 'assetTagDialogTitle');
  dialog.innerHTML = `<form><header><h2 id="assetTagDialogTitle"></h2><button type="button" data-tag-close aria-label="关闭标签弹窗">×</button></header><div class="asset-tag-dialog-body"><p id="assetTagDialogDescription"></p><div id="assetTagNameField"><label for="assetTagName">标签名称</label><input id="assetTagName" maxlength="40" autocomplete="off" placeholder="请输入标签名称"></div><div id="assetTagChoices"><div id="assetTagMaterial"></div><label class="tag-choice-label">选择标签</label><div class="tag-picker-tools"><input id="assetTagSearch" type="search" placeholder="请输入标签名称搜索" aria-label="搜索可选标签"><button type="button" id="assetTagManageLink">标签管理</button></div><div class="tag-picker-columns"><section class="tag-picker-list"><h3>标签列表</h3><div id="assetTagOptions" class="asset-tag-options"></div><div class="tag-inline-create"><button type="button" id="assetTagAddInline">＋ 添加标签</button><div id="assetTagInlineForm" hidden><input id="assetTagInlineName" maxlength="40" placeholder="输入新标签名称"><button type="button" id="assetTagInlineSave">添加</button></div></div></section><section class="tag-picker-selected"><h3 id="assetTagSelectedCount">已选（0）</h3><div id="assetTagSelected"></div></section></div></div><p id="assetTagError" role="alert"></p></div><footer><button type="button" class="btn" data-tag-close>取消</button><button type="submit" class="btn btn-primary" id="assetTagSave">保存</button></footer></form>`;
  document.body.append(dialog);
  function options(target, keyword, ids, attr) {
    const tags = state.tags.filter(tag => tag.name.toLocaleLowerCase().includes(keyword.trim().toLocaleLowerCase()));
    target.innerHTML = tags.length ? tags.map(tag => `<label><input type="checkbox" ${attr}="${esc(tag.id)}" ${ids.includes(tag.id) ? 'checked' : ''}><span>${esc(tag.name)}</span></label>`).join('') : `<p class="asset-tag-empty">${state.tags.length ? '没有匹配的标签' : '暂无标签，请先在标签管理中新建'}</p>`;
  }
  function renderFilter() {
    const names = state.tags.filter(tag => selected.includes(tag.id)).map(tag => tag.name);
    const button = q('#assetTagFilterButton');
    button.firstElementChild.textContent = names.length ? names.length > 1 ? `已选 ${names.length} 个标签` : names[0] : '请选择';
    button.title = names.join('、'); button.classList.toggle('has-selection', !!names.length);
    options(q('#assetTagFilterOptions'), q('#assetTagFilterSearch').value, selected, 'data-tag-filter');
    q('#assetTagFilterClear').disabled = !selected.length;
  }
  function managerTags() {
    const keyword = q('#assetTagManagerSearch').value.trim().normalize('NFKC').toLowerCase();
    return state.tags.filter(tag => tag.name.normalize('NFKC').toLowerCase().includes(keyword)).sort((a,b) => {
      const at = Date.parse(a.createdAt), bt = Date.parse(b.createdAt);
      if (!Number.isFinite(at)) return Number.isFinite(bt) ? 1 : 0;
      if (!Number.isFinite(bt)) return -1;
      return managerSort === 'asc' ? at - bt : bt - at;
    });
  }
  function tagDate(value) {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return '—';
    const pad = n => String(n).padStart(2,'0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  function renderManager() {
    const tags = managerTags(), pages = Math.max(1, Math.ceil(tags.length / managerPageSize));
    managerPage = Math.max(1, Math.min(managerPage, pages));
    for (const id of managerSelection) if (!state.tags.some(tag => tag.id === id)) managerSelection.delete(id);
    const visible = tags.slice((managerPage-1)*managerPageSize, managerPage*managerPageSize);
    q('#assetTagTable').innerHTML = `<table><colgroup><col class="tag-check-column"><col><col class="tag-date-column"><col class="tag-actions-column"></colgroup><thead><tr><th><input id="assetTagManagerSelectAll" type="checkbox" aria-label="选择本页全部标签" ${visible.length ? '' : 'disabled'}></th><th>标签</th><th aria-sort="${managerSort === 'asc' ? 'ascending' : 'descending'}"><button type="button" id="assetTagManagerSort">创建时间<span class="tag-sort-arrows"><i class="${managerSort === 'asc' ? 'active' : ''}">▴</i><i class="${managerSort === 'desc' ? 'active' : ''}">▾</i></span></button></th><th>操作</th></tr></thead><tbody><tr class="tag-count-row"><td colspan="4">共${tags.length}个标签${managerSelection.size ? `<span>已选择 ${managerSelection.size} 个</span>` : ''}</td></tr>${visible.map(tag => `<tr data-tag-row="${esc(tag.id)}" class="${managerSelection.has(tag.id) ? 'is-selected' : ''}"><td><input type="checkbox" data-tag-manager-select="${esc(tag.id)}" aria-label="选择标签${esc(tag.name)}" ${managerSelection.has(tag.id) ? 'checked' : ''}></td><td><div class="tag-manager-name"><span title="${esc(tag.name)}">${esc(tag.name)}</span><button type="button" data-tag-rename="${esc(tag.id)}" aria-label="重命名${esc(tag.name)}" title="重命名">✎</button></div></td><td class="tag-manager-date">${tagDate(tag.createdAt)}</td><td><button type="button" data-tag-delete="${esc(tag.id)}">删除</button></td></tr>`).join('')}${visible.length ? '' : `<tr><td colspan="4" class="tag-manager-empty">${state.tags.length ? '没有找到匹配的标签' : '暂无标签，点击“新建标签”开始添加'}</td></tr>`}</tbody></table>`;
    const checked = visible.filter(tag => managerSelection.has(tag.id)).length, all = q('#assetTagManagerSelectAll');
    all.checked = !!visible.length && checked === visible.length; all.indeterminate = checked > 0 && checked < visible.length;
    q('#assetTagManagerTotal').textContent = `共 ${tags.length} 条记录`;
    const pageNumbers = [...new Set([1, managerPage-1, managerPage, managerPage+1, pages])].filter(page => page >= 1 && page <= pages).sort((a,b)=>a-b);
    const buttons = pageNumbers.map((page,index) => `${index && page-pageNumbers[index-1]>1 ? '<span class="tag-page-ellipsis">…</span>' : ''}<button type="button" data-tag-manager-page="${page}" ${page === managerPage ? 'aria-current="page"' : ''}>${page}</button>`).join('');
    q('#assetTagManagerPages').innerHTML = `<button type="button" data-tag-manager-page="${managerPage-1}" aria-label="标签上一页" ${managerPage === 1 ? 'disabled' : ''}>‹</button>${buttons}<button type="button" data-tag-manager-page="${managerPage+1}" aria-label="标签下一页" ${managerPage === pages ? 'disabled' : ''}>›</button>`;
  }
  q('#assetTagManagerSearch').addEventListener('input', () => { managerPage = 1; renderManager(); });
  q('#assetTagManagerSearchButton').addEventListener('click', () => { managerPage = 1; renderManager(); });
  q('#assetTagManagerPageSize').addEventListener('change', event => { managerPageSize = Number(event.target.value); managerPage = 1; renderManager(); });
  manager.addEventListener('click', event => {
    if (event.target.closest('#assetTagManagerSort')) { managerSort = managerSort === 'asc' ? 'desc' : 'asc'; managerPage = 1; renderManager(); }
    const button = event.target.closest('[data-tag-manager-page]'); if (button) { managerPage = Number(button.dataset.tagManagerPage); renderManager(); }
  });
  manager.addEventListener('change', event => {
    if (event.target.id === 'assetTagManagerSelectAll') {
      managerTags().slice((managerPage-1)*managerPageSize, managerPage*managerPageSize).forEach(tag => event.target.checked ? managerSelection.add(tag.id) : managerSelection.delete(tag.id)); renderManager();
    } else if (event.target.dataset.tagManagerSelect) {
      const id = event.target.dataset.tagManagerSelect; event.target.checked ? managerSelection.add(id) : managerSelection.delete(id); renderManager();
    }
  });
  function renderScope() {
    const managing = activeAssetScope === 'tags';
    q('#page-assets').classList.toggle('is-tag-management', managing); manager.hidden = !managing;
    filter.hidden = activeAssetScope !== 'public';
    if (filter.hidden) closeFilter();
    renderFilter();
    if (!managing) return false;
    q('#assetScopeSelect').value = 'tags';
    document.querySelectorAll('[data-asset-scope]').forEach(button => { const active = button.dataset.assetScope === 'tags'; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
    renderManager(); return true;
  }
  function closeFilter() { q('#assetTagFilterPanel').hidden = true; q('#assetTagFilterButton').setAttribute('aria-expanded', 'false'); }
  function close() { if (records.get(editing?.id)?.onSave) records.delete(editing.id); dialog.close(); editing = null; trigger?.focus(); }
  function open(mode, id, button) {
    editing = {mode, id}; trigger = button;
    dialog.classList.toggle('tag-assignment-dialog', mode === 'assign'); q('#assetTagInlineForm').hidden = true;
    q('#assetTagError').textContent = ''; q('#assetTagSearch').value = ''; q('#assetTagName').value = '';
    q('#assetTagNameField').hidden = mode === 'assign' || mode === 'delete'; q('#assetTagChoices').hidden = mode !== 'assign';
    const tag = state.tags.find(tag => tag.id === id);
    q('#assetTagDialogTitle').textContent = {create:'新建标签',rename:'重命名标签',assign:'添加标签',delete:'删除标签'}[mode];
    q('#assetTagSave').textContent = mode === 'delete' ? '删除' : '保存';
    q('#assetTagSave').classList.toggle('danger', mode === 'delete');
    q('#assetTagDialogDescription').textContent = mode === 'assign' ? '' : mode === 'delete' ? `删除“${tag.name}”后，素材上的该标签也会移除，素材文件会保留。` : '';
    if (mode === 'rename') q('#assetTagName').value = tag.name;
    if (mode === 'assign') {
      const record = records.get(id); draft = new Set(record.onSave ? record.item.tagIds || [] : state.assignments[id] ?? record.item.tagIds ?? []);
      const url = record.url || record.item.previewUrl || '';
      q('#assetTagMaterial').innerHTML = `<label class="tag-choice-label">素材名称</label><div class="tag-material-row">${url ? record.item.kind === "video" ? `<video src="${esc(url)}#t=0.1" muted playsinline preload="metadata" aria-label="视频素材预览"></video>` : `<img src="${esc(url)}" alt="素材预览">` : '<span class="tag-material-placeholder">素材</span>'}<span>${esc(record.item.name)}</span></div>`;
      renderDraft();
    }
    dialog.showModal();
    (mode === 'assign' ? q('#assetTagSearch') : mode === 'delete' ? q('#assetTagSave') : q('#assetTagName')).focus();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-asset-tags],[data-tag-create],[data-tag-rename],[data-tag-delete]');
    if (button) {
      event.preventDefault(); event.stopPropagation();
      if (button.hasAttribute('data-asset-tags')) { if (records.get(button.dataset.assetTags)?.editable) open('assign', button.dataset.assetTags, button); }
      else if (button.hasAttribute('data-tag-create')) open('create', null, button);
      else if (button.hasAttribute('data-tag-rename')) open('rename', button.dataset.tagRename, button);
      else open('delete', button.dataset.tagDelete, button);
    }
    if (!event.target.closest('.asset-tag-filter')) closeFilter();
  }, true);
  q('#assetTagFilterButton').addEventListener('click', () => { const panel = q('#assetTagFilterPanel'); panel.hidden = !panel.hidden; q('#assetTagFilterButton').setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) q('#assetTagFilterSearch').focus(); });
  q('#assetTagFilterSearch').addEventListener('input', renderFilter);
  q('#assetTagFilterOptions').addEventListener('change', event => { const id = event.target.dataset.tagFilter; if (!id) return; selected = event.target.checked ? [...new Set([...selected, id])] : selected.filter(tag => tag !== id); currentAssetPage = 1; renderAssets(); });
  q('#assetTagFilterClear').addEventListener('click', () => { selected = []; currentAssetPage = 1; renderAssets(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !q('#assetTagFilterPanel').hidden && !dialog.open) { event.preventDefault(); event.stopPropagation(); closeFilter(); q('#assetTagFilterButton').focus(); } }, true);
  q('#assetTagSearch').addEventListener('input', renderDraft);
  q('#assetTagOptions').addEventListener('change', event => { const id = event.target.dataset.tagAssign; if (id) { event.target.checked ? draft.add(id) : draft.delete(id); renderSelected(); } });
  dialog.addEventListener('click', event => { if (event.target.closest('[data-tag-close]') || event.target === dialog) close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault(); if (!editing) return;
    const {mode, id} = editing, next = structuredClone(state);
    if (mode === 'assign') {
      const record = records.get(id); if (!record?.editable) return;
      if (record.onSave) { const callback = record.onSave, ids = [...draft]; close(); records.delete(id); callback(ids); return; }
      next.assignments[id] = [...draft];
    }
    else if (mode === 'delete') { next.tags = next.tags.filter(tag => tag.id !== id); for (const key of Object.keys(next.assignments)) next.assignments[key] = next.assignments[key].filter(tag => tag !== id); }
    else {
      const name = q('#assetTagName').value.trim();
      if (!name) { q('#assetTagError').textContent = '请输入标签名称。'; return; }
      if (next.tags.some(tag => tag.id !== id && tag.name.normalize('NFKC').toLocaleLowerCase() === name.normalize('NFKC').toLocaleLowerCase())) { q('#assetTagError').textContent = '标签名称已存在。'; return; }
      if (mode === 'create') next.tags.push({id: crypto.randomUUID(), name, createdAt: new Date().toISOString()});
      else next.tags.find(tag => tag.id === id).name = name;
    }
    if (!save(next)) return;
    selected = selected.filter(id => state.tags.some(tag => tag.id === id));
    close(); renderAssets(); showToast(mode === 'delete' ? '标签已删除' : '标签已保存');
  });

  function renderSelected() {
    const tags = state.tags.filter(tag => draft.has(tag.id));
    q('#assetTagSelectedCount').textContent = `已选（${tags.length}）`;
    q('#assetTagSelected').innerHTML = tags.length ? tags.map(tag => `<div><span>${esc(tag.name)}</span><button type="button" data-tag-unpick="${esc(tag.id)}" aria-label="移除${esc(tag.name)}">×</button></div>`).join('') : '<p class="tag-selected-empty">▤<span>暂无选项</span></p>';
  }
  function renderDraft() { options(q('#assetTagOptions'), q('#assetTagSearch').value, [...draft], 'data-tag-assign'); renderSelected(); }
  q('#assetTagSelected').addEventListener('click', event => { const button = event.target.closest('[data-tag-unpick]'); if (button) { draft.delete(button.dataset.tagUnpick); renderDraft(); } });
  q('#assetTagAddInline').addEventListener('click', () => { q('#assetTagInlineForm').hidden = false; q('#assetTagInlineName').focus(); });
  q('#assetTagInlineSave').addEventListener('click', () => {
    const name = q('#assetTagInlineName').value.trim();
    if (!name) { q('#assetTagError').textContent = '请输入标签名称。'; return; }
    if (state.tags.some(tag => tag.name.normalize('NFKC').toLowerCase() === name.normalize('NFKC').toLowerCase())) { q('#assetTagError').textContent = '标签名称已存在。'; return; }
    const next = structuredClone(state); next.tags.push({id: crypto.randomUUID(), name, createdAt: new Date().toISOString()});
    if (!save(next)) return;
    q('#assetTagError').textContent = ''; q('#assetTagInlineName').value = ''; q('#assetTagInlineForm').hidden = true; q('#assetTagSearch').value = ''; renderDraft(); renderFilter();
  });
  q('#assetTagInlineName').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); q('#assetTagInlineSave').click(); } });
  q('#assetTagManageLink').addEventListener('click', () => { close(); document.dispatchEvent(new CustomEvent('asset-tags-manage')); activeAssetScope = 'tags'; renderAssets(); });
  function pickDraft(item, onSave, button) { const id = `draft:${crypto.randomUUID()}`; records.set(id, {item, editable:true, url:item.previewUrl, onSave}); open('assign', id, button); }
  window.AssetTags = {key, action, summary, matches, forAsset, selected: () => [...selected], renderScope, pickDraft, names: ids => state.tags.filter(tag => ids.includes(tag.id)).map(tag => tag.name)};
  renderAssets();
})();
