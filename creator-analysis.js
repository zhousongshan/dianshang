/* 未连接模型时的本地交互演示，仅依据已录入的达人资料整理回复。 */
(() => {
  'use strict';
  const missing=record=>[['主页链接',record.profileUrl],['内容形式',record.contentType],['寄样产品',record.productName],['寄样人',record.sender],['手机号',record.phone],['收货地址',record.address],['收件人',record.recipient]].filter(([,value])=>!value).map(([label])=>label);
  const describe=record=>`${record.name}：${record.contentType||'内容形式待补充'}；标签：${record.mark.tags.join('、')||'未设置'}；分组：${record.mark.group||'未分组'}。`;
  function reply({records,question,messages=[]}){
    if(/^(你好|您好|嗨|哈喽|hello|hi)[！!。,.，\s]*$/i.test(question))return '你好！我可以帮你梳理达人资料、整理跟进重点，也可以一起起草合作话术。你想先聊哪一方面？';
    if(!records.length)return '当前没有可分析的达人资料。请先新增或导入达人，再开始对话。';
    const previous=messages.filter(message=>message.role==='user').slice(-2,-1)[0]?.content||'';
    const followup=/^(那|再|继续|帮我|写一|简短|更|具体)/.test(question)&&!/分析|缺失|比较|对比/.test(question)?previous+' '+question:question;
    const one=records.length===1,first=records[0],intro=one?describe(first):`本次依据当前筛选的 ${records.length} 位达人资料整理。`;
    if(/话术|怎么说|怎么问|发给|发一|写一|简短/.test(followup)){
      const message=/简短|短一点|一句/.test(question)?`你好${one?'，'+first.name:''}！想确认一下合作进度和预计发布时间，方便回复吗？`:`你好${one?'，'+first.name:''}！想跟你确认一下${one&&first.productName?'「'+first.productName+'」的':''}合作进度，方便告知预计的内容形式和发布时间吗？如果需要商品资料或拍摄支持，随时联系我。谢谢！`;
      return `跟进话术草稿（发送前请核对称呼与合作进度）：\n\n${message}\n\n${one&&first.mark.note?'参考现有备注：'+first.mark.note:'目前没有实际物流或发布状态，话术未假定已经签约、发货或发布。'}`;
    }
    if(/缺|完善|补充|检查资料|资料检查|核对信息/.test(followup)&&!/合作价值/.test(followup)){
      const lines=records.map(record=>{const fields=missing(record);return `• ${record.name}：${fields.length?'待补充 '+fields.join('、'):'基础联系与寄样字段已填写'}。`;});
      return `资料检查\n\n${lines.slice(0,20).join('\n')}${lines.length>20?`\n另有 ${lines.length-20} 位达人，可切换单个达人继续查看。`:''}\n\n填写完整不代表数据真实有效，联系前还需人工核对。`;
    }
    if(/跟进|下一步|计划|提醒/.test(followup)){
      return `${intro}\n\n跟进重点\n${records.slice(0,12).map(record=>`• ${record.name}：${record.mark.note?'按备注核对“'+record.mark.note+'”':'先确认合作意向、内容形式与排期'}${record.sender?'；与寄样人 '+record.sender+' 对齐进度':''}。`).join('\n')}\n\n建议顺序：补全缺失资料 → 确认合作与排期 → 核对寄样进度 → 记录下次跟进时间。现有表格没有物流或履约结果，不能判断达人是否已签收、发布。`;
    }
    if(/比较|对比|排序|优先|谁/.test(followup)&&!one){
      return `达人资料对比\n\n${records.slice(0,15).map(record=>`• ${describe(record)}${missing(record).length?' 待补充 '+missing(record).length+' 项基础资料。':' 基础资料已填写。'}`).join('\n')}\n\n当前只有人工标签和录入资料，没有粉丝、播放、互动率、报价及成交数据，因此无法给出有依据的商业价值排序。可先核实标签和资料，再安排沟通。`;
    }
    const lines=records.slice(0,12).map(record=>`• ${describe(record)}${record.productName?' 寄样产品：'+record.productName+'。':''}${record.mark.note?' 备注：'+record.mark.note:' 暂无合作备注。'}`);
    return `${one?'达人合作资料梳理':'当前达人资料概览'}\n\n${lines.join('\n')}${records.length>12?`\n另有 ${records.length-12} 位达人，可切换单个达人继续分析。`:''}\n\n建议\n1. 把现有标签作为沟通线索，核实内容质量、互动表现和合作意向。\n2. 补全主页、内容形式和寄样资料，再确认合作排期与负责人。\n3. 补充近期作品、互动率、报价和成交数据后，再评估是否扩大合作。\n\n当前没有抖音实时数据；以上是依据本地录入资料的演示整理，不能据此推断真实带货能力。`;
  }
  window.CreatorAnalysis={mode:'demo',reply};
})();
