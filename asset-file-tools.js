/* Grid and list views for the existing asset library. */
(() => {
  'use strict';
  const page = document.querySelector('#page-assets');
  if (!page) return;
  const icon = paths => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths}</svg>`;
  const gridIcon = icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>');
  const listIcon = icon('<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>');
  let view = 'grid';
  try { if (localStorage.getItem('chaoren-asset-view') === 'list') view = 'list'; } catch {}
  const summary = page.querySelector('#assetResultSummary'), toolbar = document.createElement('div');
  toolbar.className = 'asset-result-toolbar'; summary.before(toolbar); toolbar.append(summary);
  const controls = document.createElement('div'); controls.className = 'asset-view-tools'; controls.setAttribute('aria-label','素材显示方式');
  controls.innerHTML = `<button type="button" data-asset-view="grid" title="缩略图视图" aria-label="缩略图视图">${gridIcon}</button><button type="button" data-asset-view="list" title="列表视图" aria-label="列表视图">${listIcon}</button>`;
  toolbar.append(controls);
  const grid = page.querySelector('#assetGrid'), listHeader = document.createElement('div'); listHeader.className = 'asset-list-heading';
  listHeader.innerHTML = '<span>名称</span><span>类型</span><span>更新时间</span><span>操作</span>'; grid.before(listHeader);
  function syncView() {
    page.classList.toggle('asset-list-view',view==='list');
    controls.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.assetView===view)));
    listHeader.hidden = view!=='list' || !grid.querySelector('.asset-card-lite,.asset-folder-card');
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-asset-view]');
    if (!button) return;
    view=button.dataset.assetView;
    try { localStorage.setItem('chaoren-asset-view',view); } catch {}
    syncView();renderAssets();
  });
  new MutationObserver(syncView).observe(grid,{childList:true});
  syncView();renderAssets();
})();
