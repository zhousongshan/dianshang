/* 达人视图从原始记录计算，保留每次建联、寄样和发布的明细。 */
(() => {
  'use strict';
  const levels = {
    S: ['S 级・长期合作', '优先建联复投'],
    A: ['A 级・合作过 1 次', '复联，询问新合作机会'],
    B: ['B 级・初步触达', '定期跟进新品机会'],
    C: ['C 级・建联未合作', '用新品消息尝试激活'],
    D: ['D 级・黑名单', '停止联系']
  };
  const definitions = {
    S:'最近连续 3 次合作均按时发布，且每次内容质量都标为好',
    A:'至少 1 次已寄样并正常发布，尚未达到 S 级',
    B:'已加微信，有过 1–2 次有效沟通，尚未合作',
    C:'加微信满 7 天，未聊或未回复，尚未合作',
    D:'任一次已核实爽约、发布后拒交反链或内容质量差'
  };
  const key = name => String(name || '').trim().normalize('NFC');
  function hasLink(value) {
    try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
  }
  function summarize(records, today) {
    const history = [...records].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const shipped = history.filter(r => r.stage === '已寄样');
    const linked = shipped.filter(r => hasLink(r.workUrl)).length;
    const isDeal = r => ['已寄样', '无需寄样合作'].includes(r.stage) || r.publishedAt || hasLink(r.workUrl);
    const deals = history.filter(isDeal);
    const pending = history.filter(r => !r.stage && r.productName).length;
    const products = [...new Set(deals.map(r => r.productName).filter(Boolean))];
    const percent = shipped.length ? Math.round(linked / shipped.length * 1000) / 10 : null;
    const hasPublished = r => Boolean(r.publishedAt || hasLink(r.workUrl));
    const successful = r => r.stage === '已寄样' && hasPublished(r) && r.delivery !== '延期发布';
    const latestContact = history.filter(r => r.contact).sort((a,b) => (b.date || '').localeCompare(a.date || ''))[0];
    const added = history.map(r => r.wechatDate).filter(Boolean).sort()[0];
    const days = (Date.parse(today) - Date.parse(added)) / 86400000;
    let tier = 'U';
    if (history.some(r => ['爽约','发布后拒交反链','内容质量差'].includes(r.incident) || r.quality === '差')) tier = 'D';
    else if (deals.length >= 3 && history.filter(r => isDeal(r) || (!r.stage && r.productName)).slice(0, 3).every(r => hasPublished(r) && r.delivery === '按时发布' && r.quality === '好')) tier = 'S';
    else if (deals.some(successful)) tier = 'A';
    else if (!deals.length && !pending && latestContact?.contact === '已沟通1–2次' && added) tier = 'B';
    else if (!deals.length && !pending && days >= 7 && ['未聊','未回复'].includes(latestContact?.contact)) tier = 'C';
    const facts = `达人${history[0].name}，已确认合作 ${deals.length} 次。合作产品：${products.join('、') || '暂无'}。反链率：${percent === null ? '暂无已寄样记录' : percent + '%（' + linked + '/' + shipped.length + '）'}。${pending ? '另有 ' + pending + ' 条待确认寄样状态。' : ''}`;
    return { ...history[0], history, tier, deals: deals.length, percent, summary: facts, products };
  }
  function group(records, today) {
    const buckets = new Map();
    for (const record of records) {
      const name = key(record.name);
      if (!buckets.has(name)) buckets.set(name, []);
      buckets.get(name).push(record);
    }
    return [...buckets.values()].map(rows => summarize(rows, today));
  }
  const fields = {
    tier:['管理标签','tier'], name:['达人名称','text'], deals:['合作次数','number'], percent:['反链率（%）','number'],
    productName:['寄样产品名称','text'], sender:['寄样人','text'], category:['品类','text'], contentType:['内容形式','text'],
    workUrl:['作品链接','text'], profileUrl:['主页链接','text'], group:['分组','text'], note:['人工备注','text'], date:['登记日期','date'], publishedAt:['发布时间','date'], stage:['合作状态','text']
  };
  const operators = {
    tier:[['eq','等于'],['ne','不等于']],
    text:[['contains','包含'],['eq','等于'],['ne','不等于'],['empty','为空'],['filled','不为空']],
    number:[['eq','等于'],['gte','大于等于'],['lte','小于等于'],['empty','为空']],
    date:[['eq','当天'],['gte','当天及以后'],['lte','当天及以前'],['empty','为空'],['filled','不为空']]
  };
  function matches(profile, record, rule) {
    const {field, op, value} = rule;
    const actual = ['tier','deals','percent','name'].includes(field) ? profile[field] :
      ['note','group'].includes(field) ? record.mark[field] : record[field];
    if (op === 'empty') return actual == null || actual === '';
    if (op === 'filled') return actual != null && actual !== '';
    if (actual == null || actual === '') return false;
    const numeric = fields[field][1] === 'number';
    const a = numeric ? Number(actual) : String(actual).toLowerCase();
    const b = numeric ? Number(value) : value.trim().toLowerCase();
    if (op === 'gte') return a >= b;
    if (op === 'lte') return a <= b;
    if (op === 'contains') return a.includes(b);
    return op === 'ne' ? a !== b : a === b;
  }
  window.CreatorManagement = {levels, definitions, group, summarize, key, fields, operators, matches};
})();
