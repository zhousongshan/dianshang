/* 本地四级地址选择器；地区数据来自 china-address-data.js。 */
(() => {
  'use strict';
  const levels=[
    {key:'province',label:'省 / 自治区 / 直辖市',placeholder:'请选择省份'},
    {key:'city',label:'市',placeholder:'请选择城市'},
    {key:'district',label:'区 / 县',placeholder:'请选择区 / 县'},
    {key:'town',label:'乡镇 / 街道',placeholder:'请选择乡镇 / 街道'}
  ];
  const provinces=Array.isArray(window.ChinaAddressData?.provinces)?window.ChinaAddressData.provinces:[];
  const manualCode='__manual__';
  const text=value=>typeof value==='string'?value:'';
  const cleanPrefix=value=>value.replace(/^[\s,，/／]+/u,'');

  // 只解析能够逐级精确匹配的旧地址；其余文字完整保留在详细地址中。
  function inferLegacy(value){
    let remaining=value.trim(),siblings=provinces,parent=null;
    const codes=[];
    for(let index=0;index<levels.length;index++){
      remaining=cleanPrefix(remaining);
      let node=siblings.filter(item=>item.name&&remaining.startsWith(item.name)).sort((a,b)=>b.name.length-a.name.length)[0];
      if(node)remaining=remaining.slice(node.name.length);
      else if(index>0&&index<3&&siblings.length===1&&(siblings[0].name===parent?.name||siblings[0].addressName===''))node=siblings[0];
      if(!node){if(index<3)return null;break;}
      codes.push(node.code);parent=node;siblings=node.children||[];
    }
    return {codes,detail:cleanPrefix(remaining)};
  }

  function mount(container,{value='',parts=null}={}){
    const original=text(value),savedCodes=levels.map(level=>text(parts?.[`${level.key}Code`]));
    let restored=null,siblings=provinces;
    if(savedCodes[0]){
      let valid=true;
      for(let index=0;index<3;index++){
        const node=siblings.find(item=>item.code===savedCodes[index]);
        if(!node){valid=false;break;}
        siblings=node.children||[];
      }
      if(valid){
        const town=siblings.find(item=>item.code===savedCodes[3]);
        restored={codes:[...savedCodes.slice(0,3),town?.code||(text(parts?.townName)?manualCode:'')],detail:text(parts?.detail),manualTown:town?'':text(parts?.townName)};
      }
    }
    if(!restored)restored=inferLegacy(original)||{codes:[],detail:original};
    container.classList.add('crm-creator-address');
    container.setAttribute('role','group');container.setAttribute('aria-label','收货地址');
    const grid=document.createElement('div');grid.className='crm-creator-address-grid';
    const selects=levels.map(level=>{
      const label=document.createElement('label');label.className='crm-creator-region-field';
      const caption=document.createElement('span');caption.textContent=level.label;
      const select=document.createElement('select');select.id=`crmCreatorAddress-${level.key}`;select.setAttribute('aria-label',level.label);
      label.append(caption,select);grid.append(label);return select;
    });
    const manualWrap=document.createElement('label');manualWrap.className='crm-creator-region-manual';manualWrap.hidden=true;
    const manualCaption=document.createElement('span');manualCaption.textContent='乡镇 / 街道';
    const manualInput=document.createElement('input');manualInput.type='text';manualInput.maxLength=100;manualInput.placeholder='请输入乡镇或街道名称';manualInput.setAttribute('aria-label','手动填写乡镇或街道');manualInput.value=restored.manualTown||'';
    manualWrap.append(manualCaption,manualInput);
    const detailLabel=document.createElement('label');detailLabel.className='crm-creator-address-detail';detailLabel.htmlFor='crmCreatorField-address';detailLabel.textContent='详细地址';
    const detail=document.createElement('textarea');detail.id='crmCreatorField-address';detail.name='address';detail.rows=2;detail.maxLength=500;detail.placeholder='请输入街道门牌、小区、楼栋、单元和房间号';detail.value=restored.detail;
    const hint=document.createElement('p');hint.className='crm-creator-address-hint';
    hint.textContent=provinces.length?'原地址已保留，可直接保存或重新选择地区。':'地区列表暂不可用，可在详细地址中填写完整地址。';
    hint.hidden=Boolean(provinces.length&&(!original||restored.codes.length));
    container.replaceChildren(grid,manualWrap,detailLabel,detail,hint);

    function sync(codes){
      let nodes=provinces,parentSelected=true;
      selects.forEach((select,index)=>{
        const options=[new Option(levels[index].placeholder,'')];
        nodes.forEach(node=>options.push(new Option(node.label||node.name,node.code)));
        if(index===3&&parentSelected)options.push(new Option('手动填写乡镇 / 街道',manualCode));
        select.replaceChildren(...options);
        select.disabled=!parentSelected||(index<3&&!nodes.length);
        let chosen=nodes.some(node=>node.code===codes[index])?codes[index]:'';
        if(index===3&&parentSelected&&codes[index]===manualCode)chosen=manualCode;
        if(!chosen&&index>0&&index<3&&parentSelected&&nodes.length===1)chosen=nodes[0].code;
        select.value=select.disabled?'':chosen;
        const selected=nodes.find(node=>node.code===select.value);
        parentSelected=Boolean(selected);nodes=selected?.children||[];
      });
      manualWrap.hidden=selects[3].value!==manualCode;
    }
    sync(restored.codes);
    selects.forEach((select,index)=>select.addEventListener('change',()=>{
      const codes=selects.map(item=>item.value);
      for(let next=index+1;next<codes.length;next++)codes[next]='';
      if(index<3)manualInput.value='';
      sync(codes);
    }));

    return {
      read(){
        const detailText=detail.value.trim();
        if(!selects[0].value)return {ok:true,address:detailText,addressParts:null};
        let nodes=provinces;const path=[];
        for(let index=0;index<3;index++){
          const node=nodes.find(item=>item.code===selects[index].value);
          if(!node)return {ok:false,message:levels[index].placeholder,focus:selects[index]};
          path.push(node);nodes=node.children||[];
        }
        let town=nodes.find(item=>item.code===selects[3].value)||null;
        if(selects[3].value===manualCode){
          const name=manualInput.value.trim();
          if(!name)return {ok:false,message:'请填写乡镇或街道名称。',focus:manualInput};
          town={code:'',name};
        }
        const addressParts={detail:detailText};
        [...path,town].forEach((node,index)=>{
          addressParts[`${levels[index].key}Code`]=node?.code||'';
          addressParts[`${levels[index].key}Name`]=node?.name||'';
        });
        const names=[...path,town].map(node=>node?(node.addressName??node.name):'').filter(Boolean);
        const unique=names.filter((name,index)=>index===0||name!==names[index-1]);
        return {ok:true,address:unique.join('')+detailText,addressParts};
      }
    };
  }
  window.CreatorAddress=Object.freeze({mount});
})();
