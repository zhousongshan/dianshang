const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=process.argv[2]||path.resolve(__dirname,'..');
const XLSX=require(path.join(root,'vendor/sheetjs/xlsx.full.min.js'));
const context={window:{XLSX},Date,URL};vm.runInNewContext(fs.readFileSync(path.join(root,'creator-import.js'),'utf8'),context);
const api=context.window.CreatorImport,header=['日期','达人名称','寄样产品名称','抖音uid','手机号码'];
const existing={date:'2026-10-21',name:'甲',productName:'杯子',douyinUid:'100',phone:'13000000000',mark:{note:'保留',tags:['合作中'],group:'A'}};
const before=JSON.stringify(existing);
const review=api.reviewRows([header,['2026/10/21',' 甲 ','杯子','200','13100000000'],['2026-10-22','甲','杯子','100','13000000000'],['2026-10-21','甲','挂件','100','13000000000'],['2026-10-22','甲','杯子','999',''],['2026-02-30','乙','杯子'],['','丙','杯子'],['2026-10-21','丁','']], [existing]);
assert.equal(review.map(r=>r.status).join(','),'duplicate,ready,ready,duplicate,error,error,error');assert.equal(JSON.stringify(existing),before);
assert.throws(()=>api.reviewRows([['达人名称'],['甲']]),/缺少必要表头/);
assert.throws(()=>api.reviewRows([header,...Array.from({length:2001},()=>['2026-10-21','甲','杯子'])]),/2000/);
assert.equal(api.duplicateKeys({...existing,date:''}).length,0);
assert.equal(api.reviewRows([header,['2026-10-21','甲','杯子','1e20']])[0].status,'error');
const source=fs.readFileSync(path.join(root,'platform-preview.js'),'utf8');
const filter=source.slice(source.indexOf('  function filteredCreators(){'),source.indexOf('  function updateCreatorSelection'));
const creators=Array.from({length:45},(_,i)=>({date:`2026-10-${String(i%28+1).padStart(2,'0')}`,name:String(i),douyinUid:'',phone:'',mark:{tags:[]}}));
creators.push({date:'',name:'empty',douyinUid:'',phone:'',mark:{tags:[]}});
const state={creators,creatorQuery:'',creatorDateStart:'',creatorDateEnd:'',creatorTags:[],creatorSort:'desc'};
const sortCtx={state};vm.runInNewContext(filter+';result=filteredCreators()',sortCtx);
assert.equal(sortCtx.result[0].date,'2026-10-28');assert.equal(sortCtx.result.at(-1).name,'empty');assert.equal(sortCtx.result.slice(20,40).length,20);
state.creatorSort='asc';vm.runInNewContext('result=filteredCreators()',sortCtx);assert.equal(sortCtx.result[0].date,'2026-10-01');assert.equal(sortCtx.result.at(-1).name,'empty');
const importer=source.slice(source.indexOf('  async function readCreatorImportFile(file){'),source.indexOf('  function enableCreatorAiDrag'));
async function checkImport(rows,fail=false){
 const original=[JSON.parse(before)];let saved=0,modal=0;
 const ctx={state:{creators:original,creatorLoadError:'',creatorSelection:new Set()},creatorImportBusy:false,window:{CreatorImport:{...api,readFile:async()=>({sheetName:'寄样明细',rows})},CreatorImportHistory:{add:async record=>record}},crypto:{randomUUID:()=>String(Math.random())},q:()=>null,updateCreatorImportButton(){},loadCreators:()=>original,saveCreators(records){if(fail)return false;saved++;ctx.state.creators=records;return true;},render(){},showToast(){},refreshImportHistoryCount:async()=>{},openCreatorImportResult(){modal++;}};
 vm.runInNewContext(importer,ctx);await ctx.readCreatorImportFile({name:'测试.xlsx'});return {ctx,saved,modal};
}
(async()=>{
 let r=await checkImport(review);assert.equal(r.saved,0);assert.equal(r.modal,0);assert.equal(JSON.stringify(r.ctx.state.creators[0]),before);assert.equal(r.ctx.state.creatorImportResult.inserted,0);
 r=await checkImport(review.filter(row=>row.status!=='error'));assert.equal(r.saved,1);assert.equal(r.ctx.state.creatorImportResult.inserted,2);assert.equal(r.ctx.state.creatorImportResult.duplicates,2);assert.equal(JSON.stringify(r.ctx.state.creators.at(-1)),before);
 r=await checkImport([review[0]]);assert.equal(r.saved,0);assert.equal(r.ctx.state.creatorImportResult.inserted,0);assert.equal(r.ctx.state.creatorImportResult.duplicates,1);
 r=await checkImport([review[1]],true);assert.equal(r.saved,0);assert.equal(r.ctx.state.creatorImportResult.error,true);
 console.log('PASS: three-field dedupe, date/space normalization, multiple samples per creator, required headers/fields, 2000-row limit, long IDs, atomic rejection, preserve existing marks, duplicate retry, save failure, global date sort and empty-last.');
})().catch(e=>{console.error(e);process.exitCode=1;});
