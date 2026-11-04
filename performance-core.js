/* Pure matching and aggregation; shared by the preview UI and contract tests. */
(function (root) {
  'use strict';
  const normalize = name => String(name || '').normalize('NFC').trim().replace(/\.(png|jpe?g|webp|gif|mp4|mov|m4v)$/i, '').trim().toLowerCase();
  const key = (kind, name) => `${kind}:${normalize(name)}`;
  const validMaterialId = id => id != null && !['','-','--','无','null','undefined','0'].includes(String(id).trim().toLowerCase());
  // Naming convention: MMDD-person-material-... . A filename date carries no year or creation-time claim.
  function filenameMetadata(name) {
    const parts = String(name || '').normalize('NFC').trim().split('-').map(s => s.trim());
    if (parts.length < 3 || !/^\d{4}$/.test(parts[0])) return {person:'',date:''};
    const month = Number(parts[0].slice(0,2)), day = Number(parts[0].slice(2));
    const maxDay = [31,29,31,30,31,30,31,31,30,31,30,31][month-1];
    if (!maxDay || day < 1 || day > maxDay) return {person:'',date:''};
    return {person:parts[1],date:`${month}月${day}日`};
  }
  // User-defined creation date: MMDD in filename, not an API first-delivery timestamp.
  const creationWindows = new Map();
  function createdInRange(name, range, through) {
    if (range === 'all') return true;
    const key = `${through}:${range}`;
    if (!creationWindows.has(key)) {
      const days = new Set(), end = new Date(`${through}T00:00:00Z`);
      for (let i = 0; i < Number(range); i++) {
        const d = new Date(end); d.setUTCDate(d.getUTCDate() - i);
        days.add(d.toISOString().slice(5,10).replace('-', ''));
      }
      creationWindows.set(key, days);
    }
    return filenameMetadata(name).date !== '' && creationWindows.get(key).has(String(name).trim().split('-')[0]);
  }
  function materialSource(name) {
    return normalize(name).split('-').some(part => /^超[韧韌]\s*ai$/i.test(part.trim())) ? 'chaoren' : 'other';
  }
  function match(catalog, reports) {
    const names = new Map(), sources = new Map(), idNames = new Map();
    catalog.filter(a => !a.deleted && a.name && a.id).forEach(a => { const k = key(a.kind, a.name); const group = names.get(k) || new Map(); group.set(a.id, a); names.set(k, group); });
    reports.forEach(r => { if (!validMaterialId(r.materialId) || !r.account || !r.name || !['image','video'].includes(r.kind)) return; const k = key(r.kind, r.name); const idKey=JSON.stringify([r.account,r.materialId]); const variants=idNames.get(idKey)||new Set();variants.add(k);idNames.set(idKey,variants); const group = sources.get(k) || []; group.push(r); sources.set(k, group); });
    const matches = [];
    for (const [k, assets] of names) {
      if (assets.size !== 1 || !sources.has(k)) continue;
      const rows = sources.get(k), accounts = new Map();
      if(rows.some(r=>idNames.get(JSON.stringify([r.account,r.materialId])).size!==1))continue;
      rows.forEach(r => { const ids = accounts.get(r.account) || new Set(); ids.add(r.materialId); accounts.set(r.account, ids); });
      if ([...accounts.values()].some(ids => ids.size !== 1)) continue;
      // A repeated response is a replacement snapshot, not additional spend.
      const unique = new Map(); rows.forEach(r => unique.set(JSON.stringify([r.account,r.materialId,r.channel,r.date]), r));
      matches.push({asset: [...assets.values()][0], rows: [...unique.values()]});
    }
    return matches;
  }
  function aggregate(rows, filter = {}) {
    const selected = rows.filter(r => (!filter.start || r.date >= filter.start) && (!filter.end || r.date <= filter.end) && (!filter.channel || filter.channel === 'all' || r.channel === filter.channel));
    const spendCents = selected.reduce((s,r) => s + Math.round(Number(r.spend || 0)*100),0);
    const salesCents = selected.reduce((s,r) => s + Math.round(Number(r.sales || 0)*100),0);
    return {spend:spendCents/100,sales:salesCents/100,roi:spendCents ? salesCents/spendCents : null,impressions:selected.reduce((s,r)=>s+Number(r.impressions||0),0),rows:selected,count:selected.length};
  }
  const roiSpendThreshold = range => ({7:50,15:50,30:200}[range] || 0);
  function rankConverted(matches, metric = 'spend', range) {
    return matches.filter(m => Number.isFinite(m.n.sales) && m.n.sales > 0 && Number.isFinite(m.n[metric]) && (metric !== 'roi' || (Number.isFinite(m.n.spend) && m.n.spend > 0 && m.n.spend >= roiSpendThreshold(range))))
      .sort((a,b) => b.n[metric] - a.n[metric] || String(a.asset.id).localeCompare(String(b.asset.id)))
      .slice(0,20);
  }
  function rankNewMaterials(matches, metric = 'spend', range) {
    return matches.filter(m => Number.isFinite(m.n[metric]) && m.n.spend >= 0 && (metric !== 'roi' || (Number.isFinite(m.n.spend) && m.n.spend > 0 && m.n.spend >= roiSpendThreshold(range))))
      .sort((a,b) => b.n[metric] - a.n[metric] || String(a.asset.id).localeCompare(String(b.asset.id)))
      .slice(0,20);
  }
  const categoryGroups = new Map([
    ['其他毛绒','毛绒'], ['ckw毛绒','毛绒'],
    ['家居日用','家居日用'], ['生活百货','家居日用'],
    ['数码香薰','香水香薰'], ['香水香薰','香水香薰'],
    ['其他常规','常规'], ['ckw常规','常规']
  ]);
  const categoryGroup = category => categoryGroups.get(category) || category;
  const api = {normalize, match, aggregate, rankConverted, filenameMetadata, createdInRange, materialSource, rankNewMaterials, categoryGroup, roiSpendThreshold};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PerformanceCore = api;
})(typeof window === 'undefined' ? globalThis : window);
