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

test('leaderboards admit any converted material, cap at ten, and exclude undefined ROI', () => {
  const {rankConverted}=require('../performance-core.js');
  const entry=(id,spend,sales)=>({asset:{id},n:{spend,sales,roi:spend?sales/spend:null}});
  const entries=Array.from({length:15},(_,i)=>entry(String(i),i+1,(i+1)*2));
  const list=rankConverted([...entries,entry('no-sale',9999,0),entry('negative-sale',9998,-10)],'spend');
  assert.equal(list.length,10);
  assert.equal(list[0].n.spend,15);
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
