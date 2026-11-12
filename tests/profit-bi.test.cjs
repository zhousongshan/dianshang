const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../profit-bi-core.js');
const products=[{id:'a',name:'商品甲',code:'SKU-A',category:'盲盒'},{id:'b',name:'商品乙',code:'SKU-B',category:'毛绒'}];
const shipment=(id,creator,extra={})=>({id,creator,productId:'a',quantity:1,shipped:true,date:'2026-11-01',store:'三店',owner:'甲',...extra});
const followup=(shipmentId,remarks,extra={})=>({id:'f-'+shipmentId,shipmentId,remarks,date:'2026-11-10',...extra});
const dataset=(shipments,followups=[])=>({products,shipments,followups,asOf:'2026-11-12'});

test('only explicit video or live markers establish fulfillment',()=>{
 assert.deepEqual(core.remarkTypes(['视频履约','直播']),{video:true,live:true});
 assert.deepEqual(core.remarkTypes('视频履约，已跟进'),{video:true,live:false});
 for(const text of ['未直播','待视频履约','直播未完成','逾期',''])assert.deepEqual(core.remarkTypes(text),{video:false,live:false});
});
test('repeated shipments add pieces while duplicate source rows and unmailed rows do not',()=>{
 const a=shipment('one','@Alice',{quantity:2}),b=shipment('two',' alice ',{quantity:3});
 const r=core.aggregate(dataset([a,b,{...a},shipment('no','bob',{shipped:false,quantity:10})],[followup('one',['视频履约']),followup('two',['直播'])]));
 assert.equal(r.totals.creators,1);assert.equal(r.totals.quantity,5);assert.equal(r.totals.records,2);
 assert.equal(r.rows[0].fulfilled,1);assert.equal(r.rows[0].video,1);assert.equal(r.rows[0].live,1);assert.equal(r.rows[0].rate,1);
});
test('overall fulfillment is weighted by product-creator relationships, with people deduplicated separately',()=>{
 const r=core.aggregate(dataset([shipment('1','alice'),shipment('2','alice',{productId:'b'}),shipment('3','bob',{productId:'b'}),shipment('4','carol',{productId:'b'})],[followup('1','视频履约'),followup('2','直播'),followup('3','待发布'),followup('4','逾期')]));
 assert.equal(r.totals.creators,3);assert.equal(r.totals.cooperations,4);assert.equal(r.totals.fulfilled,2);assert.equal(r.totals.rate,.5);
 assert.equal(r.rows.find(p=>p.id==='a').rate,1);assert.equal(r.rows.find(p=>p.id==='b').rate,1/3);
});
test('missing followups remain unmatched and do not fabricate a zero fulfillment rate',()=>{
 const r=core.aggregate(dataset([shipment('1','alice'),shipment('2','bob',{productId:'b'})],[followup('1','待发布')]));
 assert.equal(r.rows.find(p=>p.id==='a').rate,0);assert.equal(r.rows.find(p=>p.id==='b').rate,null);
 assert.equal(r.totals.unfulfilled,1);assert.equal(r.totals.unmatched,1);
 assert.equal(r.totals.fulfilled+r.totals.unfulfilled+r.totals.unmatched,r.totals.cooperations);
});
test('shipment cohort dates and fulfillment cutoff are applied separately',()=>{
 const r=core.aggregate(dataset([shipment('old','alice',{date:'2026-10-20'}),shipment('new','bob')],[followup('old','视频履约'),followup('new','直播',{date:'2026-11-13'})]),{from:'2026-10-01',to:'2026-10-31'});
 assert.equal(r.totals.fulfilled,1);assert.equal(r.totals.quantity,1);
 const future=core.aggregate(dataset([shipment('new','bob')],[followup('new','直播',{date:'2026-11-13'})]));
 assert.equal(future.totals.rate,null);assert.equal(future.totals.unmatched,1);
});
test('store, owner, category and product query filters agree with detail rows and empty states',()=>{
 const d=dataset([shipment('1','alice'),shipment('2','bob',{productId:'b',store:'四店',owner:'乙',quantity:2})]);
 const r=core.aggregate(d,{store:'四店',owner:'乙',category:'毛绒',query:'SKU-B'});
 assert.equal(r.rows.length,1);assert.equal(r.details[0].creator,'bob');assert.equal(r.totals.quantity,2);
 const empty=core.aggregate(d,{query:'不存在'});assert.equal(empty.totals.quantity,0);assert.equal(empty.totals.rate,null);assert.equal(empty.rows.length,0);
});
test('daily and weekly trends reconcile to shipped quantity and include zero days',()=>{
 const filter={from:'2026-11-01',to:'2026-11-12'},r=core.aggregate(dataset([shipment('1','alice',{quantity:3}),shipment('2','alice',{date:'2026-11-08',quantity:2})]),filter);
 const days=core.trend(r,filter),weeks=core.trend(r,filter,'week');
 assert.equal(days.length,12);assert.equal(days[1].quantity,0);
 assert.equal(days.reduce((n,d)=>n+d.quantity,0),r.totals.quantity);assert.equal(weeks.reduce((n,d)=>n+d.quantity,0),r.totals.quantity);
});
test('unmapped products retain shipped pieces rather than silently disappearing',()=>{
 const r=core.aggregate(dataset([shipment('1','alice',{productId:null,quantity:4})]));
 assert.equal(r.rows[0].name,'待映射商品');assert.equal(r.totals.quantity,4);assert.equal(r.totals.products,1);
});
test('prototype fixtures reconcile across products, statuses and trend without profit amounts',()=>{
 const d=core.demoData(),filter={from:'2026-11-01',to:d.asOf},r=core.aggregate(d,filter);
 assert.equal(d.demo,true);assert.equal(r.totals.cooperations,139);
 assert.equal(r.rows.reduce((n,p)=>n+p.quantity,0),r.totals.quantity);
 for(const p of r.rows)assert.equal(p.fulfilled+p.unfulfilled+p.unmatched,p.creators);
 assert.equal(core.trend(r,filter).reduce((n,p)=>n+p.quantity,0),r.totals.quantity);
 assert.ok(d.shipments.every(s=>s.costSnapshot===null&&s.shippingCost===null));
});
