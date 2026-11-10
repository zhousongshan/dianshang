/* 本地演示的结果文件。用选中的素材绘制短预览，播放器和素材库共用同一个视频 Blob。 */
(() => {
  'use strict';
  const DB_NAME = 'batch-video-results-v1';
  const files = new Map();
  const owner = () => currentReviewIdentity().id;
  function folders() {
    loadLibraryFolders();
    return [{id:ROOT_FOLDER_ID, name:'我的素材（根目录）'}, ...personalFolders.map(folder => ({
      id:folder.id, name:scopedPath(folder.id, personalFolders).map(part=>part.name).join(' / ')
    }))];
  }

  function persistItem(item) {
    if (!item.batchId) return;
    const {name,favorite,folderId,materialFolderId,deleted} = item;
    localStorage.setItem('batch-material:' + item.batchId, JSON.stringify({name,favorite,folderId,materialFolderId,deleted}));
    window.dispatchEvent(new CustomEvent('batch-material-changed', {detail:item.batchId}));
  }

  function syncLibrary() {
    const user = owner();
    for (let i=mockVideos.length-1; i>=0; i--) {
      if (mockVideos[i].batchId && mockVideos[i].batchOwner!==user) mockVideos.splice(i,1);
    }
    const visible = new Set(mockVideos.map(item => item.batchId));
    for (const record of files.values()) {
      if (record.owner!==user || visible.has(record.id)) continue;
      let meta;
      try {meta=JSON.parse(localStorage.getItem('batch-material:' + record.id)) || {};} catch {meta={};}
      const legacy = personalFolders.find(f => f.name===record.folder && f.id.startsWith('legacy-personal-'));
      const dest = meta.materialFolderId ?? record.folderId ?? legacy?.id;
      mockVideos.push({
        batchId:record.id, batchOwner:user, batchCreated:record.created, name:record.name, referenceName:record.sourceName,
        previewUrl:record.url, source:'ai', tags:'批量复刻、'+(record.category || ''), duration:'3.6秒',
        assetDate:new Date(record.created).toLocaleDateString('sv-SE'), ...meta,
        materialFolderId:personalFolders.some(f=>f.id===dest)?dest:ROOT_FOLDER_ID,
        folderId:meta.favorite ? (getFolderById(meta.folderId)?.id || DEFAULT_FOLDER_ID) : ''
      });
    }
  }
  function libraryIndex(id) {
    const user = owner();
    return mockVideos.findIndex(item => item.batchId === id && item.batchOwner === user && !item.deleted);
  }

  function favoriteState(id) {
    const index = libraryIndex(id);
    return index < 0 ? null : Boolean(mockVideos[index].favorite);
  }

  function toggleFavorite(id) {
    const index = libraryIndex(id);
    if (index >= 0) toggleAssetFavorite('video', index);
  }

  const database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('videos', {keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('浏览器无法打开本地成片库'));
  });
  function remember(record) {
    if (!files.has(record.id)) files.set(record.id, {...record, url: URL.createObjectURL(record.blob)});
    return files.get(record.id);
  }
  const loaded = database.then(db => new Promise((resolve, reject) => {
    const request = db.transaction('videos').objectStore('videos').getAll();
    request.onsuccess = () => { request.result.forEach(remember); resolve(); };
    request.onerror = () => reject(Error('无法读取已保存的成片'));
  }));
  loaded.then(() => renderAssets(), () => {});
  async function save(record) {
    await loaded;
    const db = await database;
    await new Promise((resolve,reject) => {
      const tx = db.transaction('videos','readwrite');
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(Error('视频保存失败，请检查浏览器存储空间后重试。'));
      tx.objectStore('videos').put(record);
    });
    const file = remember(record);
    renderAssets();
    return file;
  }
  // WebM with a known duration and one independently decodable VP8 frame per block.
  const bytes = (...values) => Uint8Array.from(values);
  const unsigned = number => {
    const parts = [];
    do { parts.unshift(number % 256); number = Math.floor(number / 256); } while(number);
    return Uint8Array.from(parts);
  };
  function element(id, payload) {
    const parts = Array.isArray(payload) ? payload.flat(Infinity) : [payload];
    const length = parts.reduce((sum,p) => sum + p.byteLength, 0);
    let n=1; while(length >= 128 ** n - 1) n++;
    const size = unsigned(length + 128 ** n);
    return [unsigned(id), size, ...parts];
  }
  const str = value => new TextEncoder().encode(value);
  function webm(frames, width, height, interval) {
    const uint = (id,n) => element(id,unsigned(n));
    const duration = new Uint8Array(8);
    new DataView(duration.buffer).setFloat64(0,frames.length * interval);
    const header = element(0x1a45dfa3,[uint(0x4286,1),uint(0x42f7,1),uint(0x42f2,4),uint(0x42f3,8),element(0x4282,str('webm')),uint(0x4287,2),uint(0x4285,2)]);
    const info = element(0x1549a966,[uint(0x2ad7b1,1000000),element(0x4d80,str('Local preview')),element(0x5741,str('Local preview')),element(0x4489,duration)]);
    const track = element(0x1654ae6b,element(0xae,[uint(0xd7,1),uint(0x73c5,1),uint(0x83,1),uint(0x9c,0),uint(0x23e383,interval*1000000),element(0x86,str('V_VP8')),element(0xe0,[uint(0xb0,width),uint(0xba,height)])]));
    const blocks = frames.map((frame,i) => { const time=i*interval; return element(0xa3,[bytes(0x81,time>>8,time&255,0x80),frame]); });
    return new Blob([...header,...element(0x18538067,[info,track,element(0x1f43b675,[uint(0xe7,0),...blocks])])],{type:'video/webm'});
  }
  function vp8Frame(canvas) {
    const encoded=canvas.toDataURL('image/webp',.8);
    if (!encoded.startsWith('data:image/webp;')) throw Error('当前浏览器无法生成 WebM 演示视频');
    const binary=atob(encoded.split(',')[1]);
    const data=Uint8Array.from(binary,c=>c.charCodeAt(0));
    const view=new DataView(data.buffer);
    for(let i=12;i+8<=data.length;) {
      const size=view.getUint32(i+4,true);
      if(binary.slice(i,i+4)==='VP8 ') return data.slice(i+8,i+8+size);
      i+=8+size+(size%2);
    }
    throw Error('浏览器未提供可播放的视频帧');
  }
  async function demoClip(record, asset, region) {
    const items=asset.previewItems?.length?asset.previewItems:[{asset,region,target:'替换素材'}];
    const pictures=await Promise.all(items.map(async item=>{
      const img=new Image(),thumbnail=window.BatchExportThumbnails?.[item.asset.url];
      const src=thumbnail || (item.region ? `./batch-video-media/${item.region[0]}.png` : item.asset.url);
      if(/^https?:/i.test(new URL(src,document.baseURI).protocol))img.crossOrigin='anonymous';
      img.src=src;
      try { await img.decode(); } catch { throw Error('无法读取替换图片。请从本地上传图片，或选择可用于导出的素材。'); }
      return {...item,img,crop:item.region&&!thumbnail?item.region.slice(1):[0,0,img.naturalWidth,img.naturalHeight]};
    }));
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=448;
    const ctx=canvas.getContext('2d',{alpha:false});
    const frames=[];
    for(let i=0;i<36;i++) {
      ctx.fillStyle='#f6f3ee';ctx.fillRect(0,0,384,448);
      const cols=pictures.length>1?2:1,rows=Math.ceil(pictures.length/cols),cellW=384/cols,cellH=350/rows;
      pictures.forEach((item,index)=>{
        const {img,crop}=item,scale=Math.min((cellW-16)/crop[2],(cellH-40)/crop[3])*(1+i/900);
        const w=crop[2]*scale,h=crop[3]*scale,x=(index%cols)*cellW,y=Math.floor(index/cols)*cellH;
        ctx.drawImage(img,...crop,x+(cellW-w)/2,y+(cellH-28-h)/2,w,h);
        ctx.fillStyle='#61566f';ctx.font='11px sans-serif';ctx.fillText(item.target,x+8,y+cellH-12,cellW-16);
      });
      ctx.fillStyle='#252438';ctx.fillRect(0,350,384,98);
      ctx.fillStyle='#ded7ff';ctx.font='14px sans-serif';ctx.fillText(`素材示意 · ${record.mode}`,15,377);
      ctx.fillStyle='white';ctx.font='bold 19px sans-serif';ctx.fillText(pictures.length>1?`${pictures.length} 张参考图`:asset.name,15,405,350);
      ctx.font='13px sans-serif';ctx.fillText(record.notes || record.sourceName,15,431,350);
      frames.push(vp8Frame(canvas));
      if(i%6===5) await new Promise(resolve=>setTimeout(resolve,0));
    }
    return webm(frames,384,448,100);
  }
  function finish(record, asset, region, success, failure) {
    demoClip(record,asset,region).then(blob=>save({...record,blob})).then(success,error=>failure(error.name==='SecurityError'?'这张图片不允许导出视频。请在「修改素材或要求」中上传本地图片后重试。':error.message || '保存演示视频失败'));
  }
  window.BatchVideoResults={owner,folders,persistItem,syncLibrary,finish,favoriteState,toggleFavorite};
})();
