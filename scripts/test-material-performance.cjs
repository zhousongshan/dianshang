const assert = require('node:assert/strict');
const { test } = require('node:test');
const { match, aggregate } = require('../performance-core.js');
const asset = { id:'a', name:'商品主图', kind:'image' };
const row = { account:'shop', materialId:'m', name:' 商品主图.PNG ', kind:'image', channel:'旗舰店', date:'2026-11-01', spend:10.10, sales:30, impressions:100 };

test('only a unique normalized name matches, with media types isolated', () => {
  assert.equal(match([asset], [row]).length, 1);
  assert.equal(match([asset], [{...row,name:'商品主图-副本.png'}]).length, 0);
  assert.equal(match([asset], [{...row,kind:'video'}]).length, 0);
  assert.equal(match([asset,{...asset,id:'b'}], [row]).length, 0);
  assert.equal(match([asset,{...asset,id:'b',deleted:true}], [row]).length, 1);
  assert.equal(match([asset], [{...row,materialId:''}]).length, 0);
});
test('ambiguous external IDs hide the asset; repeated snapshots do not inflate spend', () => {
  assert.equal(match([asset], [row,{...row,materialId:'other'}]).length, 0);
  const result=match([asset], [row,{...row,spend:12},{...row,date:'2026-10-31'},{...row,channel:'官旗店'}]);
  assert.equal(result[0].rows.length,3);
  assert.equal(aggregate(result[0].rows).spend,32.2);
  const accounts=match([asset], [row,{...row,account:'other',materialId:'other'}]);
  assert.equal(accounts.length,1);
  assert.equal(aggregate(accounts[0].rows).spend,20.2);
});
test('totals use cents, weighted ROI, inclusive dates and channel filters', () => {
  const rows=[row,{...row,date:'2026-10-31',spend:30.2,sales:50},{...row,date:'2026-10-30',channel:'官旗店',spend:0.1,sales:0.2}];
  const total=aggregate(rows);
  assert.equal(total.spend,40.4);
  assert.equal(total.sales,80.2);
  assert.equal(total.roi,8020/4040);
  assert.equal(aggregate(rows,{start:'2026-10-31',end:'2026-11-01'}).count,2);
  assert.equal(aggregate(rows,{channel:'官旗店'}).spend,0.1);
  assert.equal(aggregate([{...row,spend:0,sales:10}]).roi,null);
  assert.equal(aggregate(rows,{start:'2026-11-02'}).count,0);
});

test('leaderboards admit any converted material, cap at twenty, and exclude undefined ROI', () => {
  const {rankConverted}=require('../performance-core.js');
  const entry=(id,spend,sales)=>({asset:{id},n:{spend,sales,roi:spend?sales/spend:null}});
  const entries=Array.from({length:25},(_,i)=>entry(String(i),i+1,(i+1)*2));
  const list=rankConverted([...entries,entry('no-sale',9999,0),entry('negative-sale',9998,-10)],'spend');
  assert.equal(list.length,20);
  assert.equal(list[0].n.spend,25);
  assert.equal(list.at(-1).n.spend,6);
  const small=entry('small',0.1,0.01),free=entry('zero-spend',0,10);
  assert.deepEqual(rankConverted([small,free],'spend').map(m=>m.asset.id),['small','zero-spend']);
  assert.deepEqual(rankConverted([small,free],'roi').map(m=>m.asset.id),['small']);
  assert.equal(rankConverted([entry('no-sale',100,0)],'roi').length,0);
});

test('placeholder IDs and cross-name ID conflicts never match', () => {
  for(const id of ['-','--','无','0','null','']) assert.equal(match([asset],[{...row,materialId:id}]).length,0);
  assert.equal(match([asset,{...asset,id:'b',name:'另一商品'}],[row,{...row,name:'另一商品.png'}]).length,0);
});
test('sales board ranks converted revenue and has no spend threshold', () => {
  const {rankConverted}=require('../performance-core.js');
  const items=[{asset:{id:'a'},n:{spend:0,sales:20}},{asset:{id:'b'},n:{spend:100,sales:10}},{asset:{id:'c'},n:{spend:500,sales:0}}];
  assert.deepEqual(rankConverted(items,'sales').map(m=>m.asset.id),['a','b']);
});

test('creation filter uses filename MMDD, handles year boundaries and rejects invalid dates', () => {
  const {createdInRange}=require('../performance-core.js');
  assert.equal(createdInRange('1101-张三-商品.png','1','2026-11-01'),true);
  assert.equal(createdInRange('1026-张三-商品.png','7','2026-11-01'),true);
  assert.equal(createdInRange('1025-张三-商品.png','7','2026-11-01'),false);
  assert.equal(createdInRange('1231-张三-商品.png','7','2027-01-02'),true);
  assert.equal(createdInRange('0230-张三-商品.png','30','2026-03-01'),false);
  assert.equal(createdInRange('没有日期.png','7','2026-11-01'),false);
  assert.equal(createdInRange('没有日期.png','all','2026-11-01'),true);
});
test('source filter distinguishes explicit Chaoren naming from generic AI', () => {
  const {materialSource}=require('../performance-core.js');
  assert.equal(materialSource('1022-LYJ-YOYO（AI复刻）-超韧AI-盲盒.mp4'),'chaoren');
  assert.equal(materialSource('1022-LYJ-商品-超韧 ai-盲盒.png'),'chaoren');
  assert.equal(materialSource('1022-LYJ-商品-AI-盲盒.png'),'other');
  assert.equal(materialSource('1022-LYJ-超韧AI风格参考-原创-盲盒.png'),'other');
});

test('new-material boards include zero-sale and zero-spend candidates, never invent ROI, and cap at twenty', () => {
  const {rankNewMaterials}=require('../performance-core.js');
  const a={asset:{id:'zero'},n:{spend:0,sales:0,roi:null}};
  const b={asset:{id:'unconverted'},n:{spend:5,sales:0,roi:0}};
  assert.deepEqual(rankNewMaterials([a,b],'spend').map(m=>m.asset.id),['unconverted','zero']);
  assert.deepEqual(rankNewMaterials([a,b],'roi').map(m=>m.asset.id),['unconverted']);
  assert.equal(rankNewMaterials(Array.from({length:25},(_,i)=>({...b,asset:{id:String(i)}}))).length,20);
});

test('direct-file data script loads without fetch and exactly preserves the report snapshot', () => {
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const root=path.resolve(__dirname,'..');
  const sandbox={window:{},fetch(){throw new Error('file:// must not fetch JSON');}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'data/performance-snapshots.js'),'utf8'),sandbox);
  const expected=JSON.parse(fs.readFileSync(path.join(root,'data/performance-snapshots.json'),'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.PerformanceSnapshot)),expected);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(html.indexOf('src="./data/performance-snapshots.js') < html.indexOf('src="./material-performance.js'));
});

test('category filters merge the requested pairs and preserve unrelated categories; fifteen days is inclusive', () => {
  const {categoryGroup,createdInRange}=require('../performance-core.js');
  assert.equal(categoryGroup('其他毛绒'),'毛绒');
  assert.equal(categoryGroup('ckw毛绒'),'毛绒');
  assert.equal(categoryGroup('家居日用'),'家居日用');
  assert.equal(categoryGroup('生活百货'),'家居日用');
  assert.equal(categoryGroup('数码香薰'),'香水香薰');
  assert.equal(categoryGroup('香水香薰'),'香水香薰');
  assert.equal(categoryGroup('其他常规'),'常规');
  assert.equal(categoryGroup('ckw常规'),'常规');
  for (const category of ['盲盒','毛绒','常规','数码服饰','出行个护','多爱','TME','未分类']) {
    assert.equal(categoryGroup(category),category);
  }
  assert.equal(createdInRange('1018-小王-商品.png','15','2026-11-01'),true);
  assert.equal(createdInRange('1017-小王-商品.png','15','2026-11-01'),false);
});


test('ROI spend thresholds use period totals inclusively in both board modes, before TOP 20', () => {
  const {rankConverted,rankNewMaterials}=require('../performance-core.js');
  const entry=(id,spend,sales)=>({asset:{id},n:aggregate([{spend,sales}])});
  for (const rank of [rankConverted,rankNewMaterials]) {
    for (const [range,min] of [['7',50],['15',50],['30',200]]) {
      const low=entry('below',min-0.01,100000);
      const exact={asset:{id:'exact'},n:aggregate([{spend:min-20,sales:100},{spend:20,sales:100}])};
      const higher=entry('higher',min+10,100);
      assert.deepEqual(rank([low,exact,higher],'roi',range).map(m=>m.asset.id),['exact','higher']);
      assert.deepEqual(rank([low,exact,higher],'spend',range).map(m=>m.asset.id),['higher','exact','below']);
      const eligible=Array.from({length:25},(_,i)=>entry(String(i),min,500+i));
      const result=rank([low,...eligible],'roi',range);
      assert.equal(result.length,20);
      assert.equal(result[0].asset.id,'24');
      assert.equal(result.at(-1).asset.id,'5');
      assert.ok(result.every(m=>m.n.spend>=min));
    }
  }
});
