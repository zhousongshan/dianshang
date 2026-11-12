(function(root){
 'use strict';
 const AS_OF='2026-11-12';
 const productList=[
  {id:'bi-hp',name:'哈利·波特系列盲盒腕表',code:'DEMO-HP01',category:'盲盒',short:'哈利',tone:'lilac'},
  {id:'bi-disney',name:'迪士尼米奇系列法式小包',code:'DEMO-DS01',category:'常规',short:'米奇',tone:'blue'},
  {id:'bi-snoopy',name:'SNOOPY 手提袋挂件',code:'DEMO-SN01',category:'常规',short:'史努',tone:'sand'},
  {id:'bi-pony',name:'小马宝莉毛绒挂件',code:'DEMO-ML01',category:'毛绒',short:'小马',tone:'pink'},
  {id:'bi-pokemon',name:'宝可梦抱抱随行毛绒',code:'DEMO-PK01',category:'毛绒',short:'宝可',tone:'mint'},
  {id:'bi-marvel',name:'漫威蜘蛛侠感应盲盒',code:'DEMO-MV01',category:'盲盒',short:'漫威',tone:'peach'}
 ];
 const normalizeHandle=value=>String(value??'').trim().replace(/^@/,'').toLowerCase();
 const dayNumber=value=>Date.parse(value+'T00:00:00Z')/86400000;
 const percent=(part,total)=>total?part/total:null;
 function remarkTypes(value){
  const tokens=(Array.isArray(value)?value:String(value??'').split(/[\s,，、;；|/]+/)).map(v=>String(v).trim());
  return {video:tokens.includes('视频履约'),live:tokens.includes('直播')};
 }
 function uniqueRows(rows){const seen=new Set();return rows.filter(row=>{if(seen.has(row.id))return false;seen.add(row.id);return true;});}
 function demoData(){
  const shipments=[],followups=[],counts=[32,28,25,20,18,16],done=[23,17,13,12,7,0],owners=['何霜','李雨轩','陈晓'];
  const add=(p,creator,date,quantity,index,month,status,missing=false)=>{
   const id='demo-'+month+'-'+p+'-'+index,number=(creator%83)+1;
   const row={id,orderId:'DEMO-'+month+'-'+p+'-'+index,productId:productList[p].id,creator:'demo_creator_'+String(number).padStart(3,'0'),date,quantity,shipped:true,store:index%4===0?'miniso四店':'miniso三店',owner:owners[(index+p)%3],costSnapshot:null,shippingCost:null};
   shipments.push(row);
   if(!missing)followups.push({id:'follow-'+id,shipmentId:id,date:AS_OF,remarks:status,source:'demo-followup'});
   return row;
  };
  productList.forEach((product,p)=>{
   for(let i=0;i<counts[p];i++){
    const day=1+(i*3+p*2)%12,missing=p===5||(p===4&&i>=15);
    const remarks=i<done[p]?(i%8===0?['视频履约','直播']:i%4===0?['直播']:['视频履约']):[i%3===0?'逾期':i%3===1?'待发布':'已跟进'];
    add(p,i+p*11,'2026-11-'+String(day).padStart(2,'0'),i%5===0?2:1,i,'11',remarks,missing);
   }
   for(let i=0;i<8;i++)add(p,i+p*9,'2026-10-'+String(5+i*3).padStart(2,'0'),i%4===0?2:1,i,'10',i<6?['视频履约']:['待发布']);
  });
  // A second sample shipment to an existing creator adds pieces, not another creator.
  const first=shipments[0],repeat={...first,id:'demo-repeat',orderId:'DEMO-REPEAT',date:'2026-11-10',quantity:2};
  shipments.push(repeat);followups.push({id:'follow-repeat',shipmentId:repeat.id,date:AS_OF,remarks:['视频履约']});
  // An unmailed record and a repeated source row must not inflate dashboard totals.
  shipments.push({...first,id:'demo-not-sent',creator:'demo_not_sent',shipped:false,quantity:5});
  shipments.push({...first});
  return {products:productList.map(p=>({...p})),shipments,followups,asOf:AS_OF,demo:true};
 }
 function aggregate(data,filter={}){
  const products=new Map(data.products.map(p=>[p.id,p])),asOf=data.asOf||AS_OF;
  const query=String(filter.query||'').trim().toLowerCase();
  const shipments=uniqueRows(data.shipments).filter(s=>{
   const p=products.get(s.productId),q=Number(s.quantity);
   return s.shipped===true&&Number.isFinite(q)&&q>0&&s.date<=asOf&&
    (!filter.from||s.date>=filter.from)&&(!filter.to||s.date<=filter.to)&&
    (!filter.store||s.store===filter.store)&&(!filter.owner||s.owner===filter.owner)&&
    (!filter.category||p?.category===filter.category)&&(!filter.productId||s.productId===filter.productId)&&
    (!query||[p?.name,p?.code].some(v=>String(v||'').toLowerCase().includes(query)));
  });
  const followups=new Map();
  uniqueRows(data.followups).filter(f=>!f.date||f.date<=asOf).forEach(f=>{if(!followups.has(f.shipmentId))followups.set(f.shipmentId,[]);followups.get(f.shipmentId).push(f);});
  const relations=new Map();
  for(const s of shipments){
   const handle=normalizeHandle(s.creator),key=(s.productId||'unmapped')+'\u001f'+handle;
   if(!relations.has(key))relations.set(key,{key,productId:s.productId||'unmapped',creator:handle,quantity:0,shipments:[],followups:[],firstDate:s.date,lastDate:s.date,stores:new Set(),owners:new Set(),video:false,live:false,missing:0});
   const r=relations.get(key),linked=followups.get(s.id)||[];
   r.quantity+=Number(s.quantity);r.shipments.push(s);r.followups.push(...linked);r.stores.add(s.store);r.owners.add(s.owner);
   r.firstDate=r.firstDate<s.date?r.firstDate:s.date;r.lastDate=r.lastDate>s.date?r.lastDate:s.date;
   if(!linked.length)r.missing++;
   linked.forEach(f=>{const types=remarkTypes(f.remarks);r.video||=types.video;r.live||=types.live;});
  }
  const details=[...relations.values()].map(r=>({...r,stores:[...r.stores],owners:[...r.owners],status:r.video||r.live?'fulfilled':r.missing?'unmatched':'unfulfilled',age:Math.max(0,Math.floor(dayNumber(asOf)-dayNumber(r.firstDate)))}));
  const productRows=new Map();
  for(const r of details){
   const p=products.get(r.productId)||{id:r.productId,name:'待映射商品',code:'—',category:'待映射',short:'待配',tone:'sand'};
   if(!productRows.has(p.id))productRows.set(p.id,{...p,creators:0,quantity:0,fulfilled:0,unfulfilled:0,unmatched:0,video:0,live:0,details:[]});
   const row=productRows.get(p.id);row.creators++;row.quantity+=r.quantity;row[r.status]++;row.video+=Number(r.video);row.live+=Number(r.live);row.details.push(r);
  }
  const rows=[...productRows.values()].map(p=>({...p,rate:p.unmatched===p.creators?null:percent(p.fulfilled,p.creators)}));
  const totals={creators:new Set(details.map(r=>r.creator)).size,quantity:shipments.reduce((n,s)=>n+Number(s.quantity),0),products:rows.length,cooperations:details.length,fulfilled:details.filter(r=>r.status==='fulfilled').length,unfulfilled:details.filter(r=>r.status==='unfulfilled').length,unmatched:details.filter(r=>r.status==='unmatched').length,records:shipments.length};
  totals.rate=totals.unmatched===totals.cooperations?null:percent(totals.fulfilled,totals.cooperations);
  return {rows,totals,details,shipments,asOf};
 }
 function trend(result,filter={},granularity='day'){
  if(!result.shipments.length)return [];
  const dates=result.shipments.map(s=>s.date).sort(),from=filter.from||dates[0],to=filter.to&&filter.to<result.asOf?filter.to:result.asOf;
  const buckets=new Map(),keyFor=date=>{
   if(granularity!=='week')return date;
   const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);
  };
  for(let day=dayNumber(from),end=dayNumber(to);day<=end&&buckets.size<400;day++){
   const date=new Date(day*86400000).toISOString().slice(0,10),key=keyFor(date);
   if(!buckets.has(key))buckets.set(key,{date:key,quantity:0,creators:new Set()});
  }
  result.shipments.forEach(s=>{const bucket=buckets.get(keyFor(s.date));if(bucket){bucket.quantity+=Number(s.quantity);bucket.creators.add(normalizeHandle(s.creator));}});
  return [...buckets.values()].map(b=>({...b,creators:b.creators.size}));
 }
 const api={AS_OF,normalizeHandle,remarkTypes,demoData,aggregate,trend};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProfitBICore=api;
})(typeof window!=='undefined'?window:globalThis);
