/* 导入失败记录：按批次保存元数据与原文件，不以文件名覆盖历史。 */
(() => {
  'use strict';
  const transient=new Map();
  let opening;
  const formatTime=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));
  function database(){
    if(!opening)opening=new Promise((resolve,reject)=>{
      const request=indexedDB.open('chaoren-crm-import-history-v1',1);
      request.onupgradeneeded=()=>{
        request.result.createObjectStore('records',{keyPath:'id'});
        request.result.createObjectStore('files',{keyPath:'id'});
      };
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();opening=null;};resolve(db);};
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error('请关闭其他版本的页面后重试。'));
    }).catch(error=>{opening=null;throw error;});
    return opening;
  }
  async function write(record,file){
    const db=await database();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(['records','files'],'readwrite');
      tx.objectStore('records').add(record);
      if(file)tx.objectStore('files').add({id:record.id,file});
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('记录未能保存'));tx.onerror=()=>{};
    });
  }
  async function add(result,file){
    const record={...result,id:crypto.randomUUID?.()||`failure-${Date.now()}-${Math.random().toString(16).slice(2)}`,occurredAt:new Date().toISOString(),sourceSaved:Boolean(file)};
    try{await write(record,file);return record;}
    catch{
      // 原文件占用空间较大时仍优先保存完整错误信息；不静默清理旧记录。
      const fallback={...record,sourceSaved:false,archiveWarning:'原文件未能保存，下载将仅包含问题备注。'};
      try{await write(fallback,null);return fallback;}
      catch{const temporary={...record,temporary:true,archiveWarning:'本次记录暂未保存，刷新后会丢失。请先下载问题表格。'};transient.set(record.id,{record:temporary,file});return temporary;}
    }
  }
  async function request(store,key){
    const db=await database();
    return new Promise((resolve,reject)=>{const req=db.transaction(store,'readonly').objectStore(store).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  }
  async function list(){
    const db=await database();
    const records=await new Promise((resolve,reject)=>{const req=db.transaction('records','readonly').objectStore('records').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    return [...records,...[...transient.values()].map(item=>item.record)].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||b.id.localeCompare(a.id));
  }
  function temporaryRecords(){return [...transient.values()].map(item=>item.record);}
  async function get(id){return transient.get(id)?.record||await request('records',id);}
  function buildReport(record,bytes){
    const x=window.XLSX;let book,sourceIncluded=false;
    if(bytes){
      try{
        let data=bytes,type='array';
        if(/\.(csv|tsv)$/i.test(record.filename)){
          const buffer=new Uint8Array(bytes);try{data=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{data=new TextDecoder('gb18030').decode(buffer);}type='string';
        }
        book=x.read(data,{type,raw:true,cellDates:false});sourceIncluded=book.SheetNames.length>0;
      }catch{}
    }
    if(!sourceIncluded)book=x.utils.book_new();
    let notesName='导入问题备注',suffix=2;
    while(book.SheetNames.includes(notesName))notesName=`导入问题备注_${suffix++}`;
    const rows=[['导入问题备注'],['错误时间（北京时间）',formatTime(record.occurredAt)],['原文件',record.filename],['导入结果','整张表未导入；已有数据未覆盖'],['错误说明',record.title,record.message],['原表保留情况',sourceIncluded?'原有工作表保留，请按下方行号对照修改。':'原文件无法读取或未能保存，本文件仅包含错误说明。'],[],['原工作表','原表行号','达人名称','详细问题与修改建议']];
    if(record.errors?.length)for(const error of record.errors)for(const issue of error.message.split('；'))rows.push([record.sheetName||'第一张表',error.row,error.record?.name||'',issue]);
    else rows.push([record.sheetName||'文件级错误','—','—',record.message]);
    const notes=x.utils.aoa_to_sheet(rows);notes['!cols']=[{wch:28},{wch:26},{wch:28},{wch:85}];
    x.utils.book_append_sheet(book,notes,notesName);
    return {book,sourceIncluded,notesName};
  }
  async function download(id){
    const record=await get(id);if(!record)throw new Error('未找到这条错误记录。');
    const source=transient.get(id)||await request('files',id);
    let bytes;if(source?.file)bytes=await source.file.arrayBuffer();
    const report=buildReport(record,bytes);
    const stamp=record.occurredAt.replace(/\D/g,'').slice(0,14);
    window.XLSX.writeFile(report.book,`${record.filename.replace(/\.[^.]+$/,'')}_问题备注_${stamp}.xlsx`);
    return report;
  }
  window.CreatorImportHistory={add,list,get,download,buildReport,formatTime,temporaryRecords};
})();
