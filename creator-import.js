/* 达人表格导入：本地解析、校验和预览，确认后由 CRM 保存。 */
(() => {
  'use strict';
  const columns=[['date','邮寄信息登记日期'],['name','达人名称'],['tags','标签'],['note','备注'],['group','分组'],['profileUrl','主页链接'],['publishedAt','发布时间'],['workUrl','作品链接'],['sender','寄样人'],['contentType','内容形式'],['category','品类'],['productName','寄样产品名称']];
  const aliases={日期:'date',寄样日期:'date',邮寄信息登记:'date',邮寄信息登记日期:'date',邮寄信息登记时间:'date',发布时间:'publishedAt',发布日期:'publishedAt',作品链接:'workUrl',品类:'category',抖音uid:'douyinUid',uid:'douyinUid',抖音id:'douyinUid',达人名称:'name',达人昵称:'name',昵称:'name',姓名:'name',标签:'tags',达人标签:'tags',达人标记:'tags',备注:'note',分组:'group',抖音主页链接:'profileUrl',主页链接:'profileUrl',寄样人:'sender',内容形式:'contentType',寄样产品名称:'productName',寄样产品:'productName',收货地址:'address',地址:'address',手机号:'phone',手机号码:'phone',电话:'phone',收件人:'recipient',省:'province',省份:'province',市:'city',城市:'city',区县:'district',区:'district',县:'district',乡镇:'town',街道:'town',详细地址:'detail'};
  const limits={workUrl:2000,category:100,douyinUid:64,name:100,profileUrl:2000,sender:100,contentType:100,productName:500,address:500,phone:32,recipient:100,note:300,group:100};
  const text=value=>String(value??'').trim();
  const tags=value=>[...new Set(text(value).split(/[,，、;；\n]/).map(text).filter(Boolean))];
  function normalizeDate(value,date1904=false){
    if(value==='')return '';
    if(typeof value==='number'){
      const date=window.XLSX.SSF.parse_date_code(value,{date1904});
      if(!date||date.y<1900||date.y>9999)return null;
      value=`${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
    }
    const match=text(value).match(/^(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})(?:日)?$/);
    if(!match)return null;
    const [,y,m,d]=match,result=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    const parsed=new Date(`${result}T00:00:00Z`);
    return Number(y)>=1900&&Number(y)<=9999&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===result?result:null;
  }
  function duplicateKeys(record){
    // 当前业务约定：同一天、同名达人、同名产品属于同一次寄样。
    const date=normalizeDate(text(record.date)),name=text(record.name),product=text(record.productName);
    return date&&name&&product?['sample:'+JSON.stringify([date,name,product])]:[];
  }
  function reviewRows(matrix,existing=[],options={}){
    if(!matrix.length)throw new Error('表格为空，请下载模板后填写。');
    const header=matrix[0].map(value=>aliases[text(value).replace(/\s/g,'').toLowerCase()]||'');
    const missing=[['date','邮寄信息登记日期'],['name','达人名称'],['productName','寄样产品名称']].filter(([key])=>!header.includes(key));
    if(missing.length)throw new Error(`缺少必要表头：${missing.map(([,label])=>`「${label}」`).join('、')}。请补齐后重新上传。`);
    const mapped=header.filter(Boolean);if(new Set(mapped).size!==mapped.length)throw new Error('有重复含义的列名，请保留一列后重试。');
    const nonempty=matrix.slice(1).map((values,index)=>({values,row:index+2})).filter(item=>item.values.some(value=>text(value)));
    if(nonempty.length>2000)throw new Error('每次最多导入 2000 条记录，请拆分文件。');
    const seen=new Set(existing.flatMap(duplicateKeys));
    return nonempty.map(({values,row})=>{
      const data={};header.forEach((key,index)=>{if(key)data[key]=values[index]??'';});
      const issues=[];
      for(const key of ['douyinUid','phone']){
        if(typeof data[key]==='number'&&(!Number.isSafeInteger(data[key])||Math.abs(data[key])>=1e15))issues.push(`${key==='douyinUid'?'抖音 UID':'手机号'}为超长数值，请在原表中设为文本并核对完整号码`);
        data[key]=text(data[key]).replace(/^'/,'');
        if(/^[+-]?(?:\d+\.?\d*|\.\d+)e[+-]?\d+$/i.test(data[key]))issues.push('号码不能使用科学计数法，请改为完整文本');
      }
      const record=Object.fromEntries(columns.filter(([key])=>!['tags','note','group'].includes(key)).map(([key])=>[key,text(data[key])]));
      for(const key of ['douyinUid','phone','address','recipient'])record[key]=text(data[key]);
      if(!record.name)issues.push('达人名称不能为空，请补全本行达人名称');
      if(!record.date)issues.push('邮寄信息登记日期不能为空，请补全本行登记日期');
      if(!record.productName)issues.push('寄样产品名称不能为空，请补充本次寄样产品');
      const date=normalizeDate(data.date??'',options.date1904);if(date===null)issues.push(`邮寄信息登记日期「${text(data.date)}」无效，请改为真实日期（如 2026-10-21）`);else record.date=date;
      const published=normalizeDate(data.publishedAt??'',options.date1904);if(published===null)issues.push(`发布时间「${text(data.publishedAt)}」无效，请填写包含年份的真实日期（如 2026-10-21）`);else record.publishedAt=published;
      if(/^\w+:/.test(record.workUrl)){try{if(!['http:','https:'].includes(new URL(record.workUrl).protocol))throw new Error();}catch{issues.push('作品链接请填写 http:// 或 https:// 地址，也可填写“已催”等跟进状态');}}
      if(!record.address)record.address=['province','city','district','town','detail'].map(key=>text(data[key])).filter((v,i,a)=>v&&v!==a[i-1]).join('');
      if(record.profileUrl){try{if(!['http:','https:'].includes(new URL(record.profileUrl).protocol))throw new Error();}catch{issues.push('主页链接需以 http:// 或 https:// 开头');}}
      if(record.contentType&&!['种草-图文','种草-视频','带货-直播','带货-视频','带货-图文','带货-无需寄样'].includes(record.contentType))issues.push('内容形式请填：种草-图文、种草-视频、带货-直播、带货-视频、带货-图文或带货-无需寄样');
      for(const [key,max] of Object.entries(limits)){if(text(data[key]??record[key]).length>max)issues.push(`${columns.find(([name])=>name===key)?.[1]||key}超过 ${max} 字`);}
      if(record.address.length>500)issues.push('收货地址超过 500 字');
      record.mark={tags:tags(data.tags),note:text(data.note),group:text(data.group)};
      if(record.mark.tags.length>10||record.mark.tags.some(tag=>tag.length>24))issues.push('标签最多 10 个，每个最多 24 字');
      const keys=duplicateKeys(record),duplicate=keys.some(key=>seen.has(key));
      if(issues.length)return {row,status:'error',message:issues.join('；'),record};
      if(duplicate)return {row,status:'duplicate',message:'邮寄信息登记日期、达人名称、寄样产品名称相同，跳过且不覆盖已有资料',record};
      keys.forEach(key=>seen.add(key));return {row,status:'ready',message:'校验通过',record};
    });
  }
  async function readFile(file,existing=[]){
    if(!/\.(xlsx|xls|csv|tsv)$/i.test(file.name))throw new Error('请选择 .xlsx、.xls、.csv 或 .tsv 文件。');
    if(file.size>10*1024*1024)throw new Error('文件不能超过 10 MB。');
    if(!window.XLSX)throw new Error('表格组件未加载，请刷新后重试。');
    const buffer=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('无法读取文件，请重新选择。'));reader.readAsArrayBuffer(file);});
    let input=buffer,type='array';
    if(/\.(csv|tsv)$/i.test(file.name)){
      const bytes=new Uint8Array(buffer);let content=new TextDecoder('utf-8').decode(bytes);
      if(content.includes('\ufffd'))content=new TextDecoder('gb18030').decode(bytes);
      input=content;type='string';
    }
    let workbook;try{workbook=window.XLSX.read(input,{type,raw:true,cellDates:false,sheetRows:2002});}catch{throw new Error('无法解析该表格，请检查文件是否损坏、加密，或另存为标准 Excel 文件。');}
    const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet||!sheet['!ref'])throw new Error('第一个工作表为空，请把达人数据放在第一个工作表。');
    const range=window.XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']);
    if(range.e.r-range.s.r>2000)throw new Error('表格最多支持 2000 行数据，请删除多余行或拆分文件。');
    if(range.e.c-range.s.c>100)throw new Error('表格列数过多，请使用模板。');
    const matrix=window.XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:'',blankrows:true});
    return {sheetName:workbook.SheetNames[0],rows:reviewRows(matrix,existing,{date1904:Boolean(workbook.Workbook?.WBProps?.date1904)})};
  }
  function downloadTemplate(){
    const x=window.XLSX,workbook=x.utils.book_new(),sheet=x.utils.aoa_to_sheet([columns.map(([,label])=>label)]);
    sheet['!cols']=columns.map(([key])=>({wch:['address','profileUrl','productName','note'].includes(key)?34:22}));
    x.utils.book_append_sheet(workbook,sheet,'达人模板');
    x.utils.book_append_sheet(workbook,x.utils.aoa_to_sheet([['填写说明'],['第一张表：邮寄信息登记日期、达人名称、寄样产品名称必填，其他字段可选。空白行自动跳过。'],['主页链接填写网址；作品链接可填写网址或“已催”等跟进状态。'],['邮寄信息登记日期、发布时间格式：2026-10-15，请保留年份；标签用逗号分隔，最多10个，每个24字。'],['内容形式：种草-图文、种草-视频、带货-直播、带货-视频、带货-图文、带货-无需寄样。'],['按邮寄信息登记日期+达人名称+寄样产品名称识别重复，重复记录不覆盖。'],['有错误时整表不导入；全部校验通过后仅新增，重复跳过。单文件最多2000行、10MB。']]),'填写说明');
    x.writeFile(workbook,'达人导入模板.xlsx');
  }
  window.CreatorImport={readFile,reviewRows,duplicateKeys,downloadTemplate};
})();
