/* Two optional controls for the existing asset library: directory upload and list view. */
(() => {
  'use strict';
  const page = document.querySelector('#page-assets');
  if (!page) return;
  const icon = paths => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths}</svg>`;
  const gridIcon = icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>');
  const listIcon = icon('<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>');
  let view = 'grid', uploading = false, targetScope = 'generated', targetFolder = ROOT_FOLDER_ID;
  try { if (localStorage.getItem('chaoren-asset-view') === 'list') view = 'list'; } catch {}
  const summary = page.querySelector('#assetResultSummary'), toolbar = document.createElement('div');
  toolbar.className = 'asset-result-toolbar'; summary.before(toolbar); toolbar.append(summary);
  const controls = document.createElement('div'); controls.className = 'asset-view-tools'; controls.setAttribute('aria-label','素材显示方式');
  controls.innerHTML = `<button type="button" data-asset-view="grid" title="缩略图视图" aria-label="缩略图视图">${gridIcon}</button><button type="button" data-asset-view="list" title="列表视图" aria-label="列表视图">${listIcon}</button>`;
  toolbar.append(controls);
  const grid = page.querySelector('#assetGrid'), listHeader = document.createElement('div'); listHeader.className = 'asset-list-heading';
  listHeader.innerHTML = '<span>名称</span><span>类型</span><span>更新时间</span><span>操作</span>'; grid.before(listHeader);
  const input = document.createElement('input'); input.type='file'; input.multiple=true; input.hidden=true; input.webkitdirectory=true; input.id='assetUploadDirectoryFile'; page.append(input);
  function closeMenus() {
    page.querySelectorAll('.asset-upload-dropdown').forEach(menu => { menu.querySelector('.asset-upload-options').hidden=true; menu.querySelector('[data-asset-upload-menu]')?.setAttribute('aria-expanded','false'); });
  }
  function syncView() {
    page.classList.toggle('asset-list-view',view==='list');
    controls.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.assetView===view)));
    listHeader.hidden = view!=='list' || !grid.querySelector('.asset-card-lite,.asset-folder-card');
  }
  async function uploadPersonalDirectory(fileList, parent) {
    const all=Array.from(fileList);
    if (!all.length) return;
    if (all.length>50) {showToast('单次最多上传 50 个文件，请分批上传');return;}
    const accepted=[];
    for(const file of all) {
      if (!file.size || file.size>200*1024*1024 || !/^(image|video)\//.test(file.type)) continue;
      if (file.type.startsWith('image/')) {try{const bitmap=await createImageBitmap(file);bitmap.close();}catch{continue;}}
      accepted.push(file);
    }
    if (!accepted.length) {showToast('请选择有效的图片或视频文件，每个文件不超过 200 MB');return;}
    const mapping=new Map();let firstRoot=null;
    for(const file of accepted) {
      const segments=(file.webkitRelativePath || `上传文件夹/${file.name}`).split('/').slice(0,-1).filter(name=>name&&name!=='.'&&name!=='..');
      let parentId=parent,key='';
      for(const part of segments) {
        key+=`/${part}`;
        if (!mapping.has(key)) {
          let name=part,index=1;
          while(assetFolders.some(folder=>folder.parentId===parentId&&folder.name===name)) name=`${part} (${index++})`;
          const id=`folder-${crypto.randomUUID()}`;
          assetFolders.push({id,name,parentId,updatedAt:new Date().toLocaleDateString('sv-SE')});mapping.set(key,id);firstRoot ||= id;
        }
        parentId=mapping.get(key);
      }
      const isVideo=file.type.startsWith('video/'),record={name:file.name.replace(/\.[^.]+$/,'')||file.name,category:isVideo?'视频素材':'图片素材',type:'product',model:'本地文件',source:'local',tags:'本地上传',size:isVideo?'视频文件':'原始尺寸',time:'刚刚',createdAt:new Date().toISOString(),assetDate:new Date().toLocaleDateString('sv-SE'),favorite:true,folderId:parentId,previewUrl:URL.createObjectURL(file)};
      (isVideo?mockVideos:mockAssets).push(record);
    }
    activeAssetScope='favorites';activeFavoriteFolderId=firstRoot||parent;currentAssetPage=1;page.querySelector('#assetSearch').value='';renderAssets();
    showToast(`已上传 ${accepted.length} 个文件，保留文件夹结构${accepted.length<all.length?`，跳过 ${all.length-accepted.length} 个无效或超限文件`:''}`);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-asset-upload-menu],[data-upload-local-directory],[data-public-upload-directory],[data-asset-view]');
    if (!button) {if(!event.target.closest('.asset-upload-dropdown'))closeMenus();return;}
    if(button.dataset.assetView) {view=button.dataset.assetView;try{localStorage.setItem('chaoren-asset-view',view);}catch{}syncView();renderAssets();return;}
    event.preventDefault();event.stopPropagation();
    if(button.hasAttribute('data-asset-upload-menu')) {
      const menu=button.closest('.asset-upload-dropdown'),options=menu.querySelector('.asset-upload-options'),open=options.hidden;closeMenus();options.hidden=!open;button.setAttribute('aria-expanded',String(open));return;
    }
    if(uploading){showToast('正在上传，请稍后再试');return;}
    targetScope=button.hasAttribute('data-public-upload-directory')?'public':activeAssetScope;
    targetFolder=activeAssetScope==='favorites'?activeFavoriteFolderId:ROOT_FOLDER_ID;
    closeMenus();input.click();
  });
  document.addEventListener('click',event=>{if(event.target.closest('[data-upload-local],[data-public-upload]'))closeMenus();},true);
  input.addEventListener('change',async()=>{
    const files=[...input.files];input.value='';if(!files.length||uploading)return;
    uploading=true;try{if(targetScope==='public')await window.PublicAssets.uploadDirectory(files);else await uploadPersonalDirectory(files,targetFolder);}catch{showToast('文件夹上传失败，请重试');}finally{uploading=false;}
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenus();});
  new MutationObserver(syncView).observe(grid,{childList:true});
  window.AssetFileTools={beforeRender(){closeMenus();page.querySelector('#assetUploadDropdown').hidden=activeAssetScope!=='generated';}};
  window.AssetFileTools.beforeRender();syncView();renderAssets();
})();
