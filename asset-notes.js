/* Optional, editable notes for image/video assets. Stored only in this browser. */
(() => {
  'use strict';
  const STORE = 'chaoren-asset-notes-v1', records = new Map();
  let notes = {}, current = null, trigger = null;
  try { const saved = JSON.parse(localStorage.getItem(STORE) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) notes = saved; } catch {}
  // Assign demo identities before sorting/deleting can change array positions.
  for (const [kind, items] of [['image', mockAssets], ['video', mockVideos]]) items.forEach((item, index) => { item.noteKey ||= `demo-${kind}-${index}`; });
  function key(item, kind, scope = 'personal') {
    if (scope === 'public') return `public:${item.id}`;
    item.noteKey ||= item.recoveredAssetId || `asset-${crypto.randomUUID()}`;
    return `${kind}:${item.noteKey}`;
  }
  const text = id => typeof notes[id] === 'string' ? notes[id] : '';
  function action(item, kind, scope = 'personal', url = '', editable = true) {
    const id = key(item, kind, scope); records.set(id, {item, kind, url: url || item.previewUrl || '', editable});
    return `<button type="button" class="link-btn asset-note-action" data-asset-note="${escapeHtml(id)}" title="查看或编辑素材备注">备注</button>`;
  }
  function summary(item, kind, scope = 'personal') {
    const value = text(key(item, kind, scope));
    return value ? `<small class="asset-note-summary" title="${escapeHtml(value)}">${escapeHtml(value)}</small>` : '';
  }
  const drawer = document.createElement('dialog'); drawer.id = 'assetNoteDrawer'; drawer.className = 'asset-note-drawer'; drawer.setAttribute('aria-labelledby','assetNoteHeading');
  drawer.innerHTML = `<form id="assetNoteForm"><header><h2 id="assetNoteHeading">素材备注</h2><button type="button" data-note-close aria-label="关闭素材备注">×</button></header><div class="asset-note-body"><div id="assetNotePreview"></div><h3 id="assetNoteName"></h3><label for="assetNoteText">素材备注 <span>选填</span></label><textarea id="assetNoteText" maxlength="2000" placeholder="可记录投放消耗、点赞转发、使用场景或其他补充信息，内容不限。"></textarea><div class="asset-note-meta"><span>仅保存在当前浏览器</span><span id="assetNoteCount">0 / 2000</span></div><p id="assetNoteError" role="alert" hidden></p></div><footer><button class="btn" type="button" data-note-close>取消</button><button class="btn btn-primary" id="assetNoteSave" type="submit">保存备注</button></footer></form>`;
  document.body.append(drawer);
  const field = drawer.querySelector('#assetNoteText'), error = drawer.querySelector('#assetNoteError');
  function close() { drawer.querySelector('video')?.pause(); drawer.close(); current = null; trigger?.focus(); }
  function open(id, button) {
    const record = records.get(id); if (!record) return;
    current = id; trigger = button;
    drawer.querySelector('#assetNoteName').textContent = record.item.name;
    const url = record.url || (record.kind === 'image' ? PRODUCT_IMAGE_URL : '');
    drawer.querySelector('#assetNotePreview').innerHTML = url ? record.kind === 'video' ? `<video controls playsinline preload="metadata" src="${escapeHtml(url)}" aria-label="素材视频预览"></video>` : `<img src="${escapeHtml(url)}" alt="${escapeHtml(record.item.name)}">` : '<div class="asset-note-placeholder">视频素材</div>';
    field.value = text(id); field.readOnly = !record.editable; drawer.querySelector('#assetNoteSave').disabled = !record.editable;
    drawer.querySelector('#assetNoteCount').textContent = `${field.value.length} / 2000`; error.hidden = true;
    drawer.showModal(); field.focus();
  }
  document.addEventListener('click', event => { const button = event.target.closest('[data-asset-note]'); if (!button) return; event.preventDefault(); event.stopPropagation(); open(button.dataset.assetNote, button); }, true);
  drawer.addEventListener('click', event => { if (event.target.closest('[data-note-close]') || event.target === drawer) close(); });
  drawer.addEventListener('cancel', event => { event.preventDefault(); close(); });
  field.addEventListener('input', () => { drawer.querySelector('#assetNoteCount').textContent = `${field.value.length} / 2000`; });
  drawer.querySelector('form').addEventListener('submit', event => {
    event.preventDefault(); if (!current || !records.get(current)?.editable) return;
    const next = {...notes}, value = field.value.trim(); if (value) next[current] = value; else delete next[current];
    try { localStorage.setItem(STORE, JSON.stringify(next)); notes = next; } catch { error.textContent = '备注未保存，请检查浏览器存储空间后重试。'; error.hidden = false; return; }
    close(); renderAssets(); showToast(value ? '素材备注已保存' : '素材备注已清空');
  });
  window.AssetNotes = {key, action, summary};
  renderAssets();
})();
