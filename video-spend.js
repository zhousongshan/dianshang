(() => {
  const trigger = document.querySelector('#videoSpendTrigger');
  const popup = document.querySelector('#videoSpendPopup');
  const detail = document.querySelector('#page-video-spend');
  const form = document.querySelector('#videoSpendFilters');
  const filters = form.elements;
  const money = cents => formatQuotaMoney(cents / 100);
  const pad = value => String(value).padStart(2, '0');
  const dayKey = date => [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  const columns = ['time', 'name', 'model'];

  // Anchor the sample ledger once so reopening the page tomorrow does not move yesterday's charges.
  let anchor = new Date();
  try {
    const key = 'chaoren-video-spend-demo-start-v1';
    const saved = new Date(localStorage.getItem(key) || '');
    if (Number.isFinite(saved.getTime())) anchor = saved;
    else localStorage.setItem(key, anchor.toISOString());
  } catch {}

  // Minutes since midnight on the first day are capped at the time the preview was opened.
  const samples = [
    ['user-3', 0, 870, '保温杯户外展示', 'Seedance 2.0', 860],
    ['user-3', 0, 615, '盲盒开箱', 'Wan 3.0', 2000],
    ['user-3', 1, 900, '隐藏款近景', 'Wan 3.0', 720],
    ['user-3', 1, 590, '杯盖细节', 'Seedance 2.0', 960],
    ['user-3', 3, 815, '通勤场景', 'Seedance 2.0', 960],
    ['user-3', 5, 706, '新品陈列', 'Wan 3.0', 1200],
    ['user-3', 7, 665, '包装展示', 'Wan 3.0', 480],
    ['user-2', 0, 620, '暖手宝展示', 'Wan 3.0', 650],
    ['user-2', 2, 770, '抱枕细节', 'Seedance 2.0', 840]
  ];
  const records = samples.map(([owner, daysAgo, minutes, name, model, cents]) => {
    const date = new Date(anchor);
    date.setDate(date.getDate() - daysAgo);
    const minute = daysAgo ? minutes : Math.min(minutes, anchor.getHours() * 60 + anchor.getMinutes());
    date.setHours(0, minute, 0, 0);
    const day = dayKey(date);
    return { owner, day, time: day + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()), name, model, cents };
  }).sort((a, b) => b.time.localeCompare(a.time));

  const mine = () => records.filter(row => row.owner === currentReviewIdentity().id);
  const sum = rows => rows.reduce((total, row) => total + row.cents, 0);
  let displayed = [];
  let currentPage = 1;
  const pager = document.querySelector('#videoSpendPages');
  const sizeSelect = document.querySelector('#videoSpendPageSize');

  function refreshSummary() {
    const today = dayKey(new Date());
    const rows = mine();
    const amount = money(sum(rows.filter(row => row.day === today)));
    document.querySelector('#videoSpendAmount').textContent = amount;
    document.querySelector('#videoSpendToday').textContent = amount;
    document.querySelector('#videoSpendRecent').innerHTML = rows.slice(0, 5).map(row =>
      '<li class="vs-entry"><div><span>' + escapeHtml(row.name) + '</span><small>' + row.time.slice(5) +
      '</small></div><strong>' + money(row.cents) + '</strong></li>'
    ).join('') || '<li class="vs-entry">暂无视频消费记录</li>';
  }

  function closePopup() {
    popup.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  function renderTable() {
    displayed = mine().filter(row =>
      (!filters.start.value || row.day >= filters.start.value) &&
      (!filters.end.value || row.day <= filters.end.value) &&
      (!filters.model.value || row.model === filters.model.value)
    );
    currentPage = 1;
    document.querySelector('#videoSpendTotal').textContent = money(sum(displayed));
    document.querySelector('#videoSpendExport').disabled = !displayed.length;
    renderPage();
  }

  function renderPage() {
    const size = Number(sizeSelect.value);
    const pages = Math.max(1, Math.ceil(displayed.length / size));
    const start = (currentPage - 1) * size;
    const rows = displayed.slice(start, start + size);
    detail.querySelector('tbody').innerHTML = rows.map(row =>
      '<tr>' + columns.map(key => '<td>' + escapeHtml(row[key]) + '</td>').join('') +
      '<td><strong>' + money(row.cents) + '</strong></td></tr>'
    ).join('') || '<tr><td colspan="4">暂无符合条件的消费记录</td></tr>';
    document.querySelector('#videoSpendRange').textContent = rows.length
      ? `第 ${start + 1}–${start + rows.length} 条，共 ${displayed.length} 条` : '共 0 条';

    function pageButton(page, label, caption, disabled = false) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = caption;
      button.setAttribute('aria-label', label);
      button.disabled = disabled;
      button.dataset.pageNumber = page;
      return button;
    }
    const buttons = [pageButton(currentPage - 1, '上一页', '‹', currentPage === 1)];
    for (let page = 1; page <= pages; page++) {
      const button = pageButton(page, `第 ${page} 页`, page);
      if (page === currentPage) button.setAttribute('aria-current', 'page');
      buttons.push(button);
    }
    buttons.push(pageButton(currentPage + 1, '下一页', '›', currentPage === pages));
    pager.replaceChildren(...buttons);
  }

  pager.addEventListener('click', event => {
    const button = event.target.closest('button[data-page-number]');
    if (!button || button.disabled) return;
    currentPage = Number(button.dataset.pageNumber);
    renderPage();
    pager.querySelector('[aria-current="page"]').focus({ preventScroll: true });
  });
  sizeSelect.addEventListener('change', () => {
    currentPage = 1;
    renderPage();
  });

  function setDateDefaults() {
    const start = new Date();
    filters.end.value = dayKey(start);
    start.setDate(start.getDate() - 29);
    filters.start.value = dayKey(start);
    filters.end.setCustomValidity('');
  }

  trigger.addEventListener('click', () => {
    if (!popup.hidden) return closePopup();
    refreshSummary();
    popup.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('pointerdown', event => {
    if (!trigger.parentElement.contains(event.target)) closePopup();
  });
  trigger.parentElement.addEventListener('focusout', event => {
    if (event.relatedTarget && !trigger.parentElement.contains(event.relatedTarget)) closePopup();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popup.hidden) {
      closePopup();
      trigger.focus();
    }
  });
  function loadDetail() {
    document.querySelector('#videoSpendAccount').textContent = currentReviewIdentity().name + ' · 演示数据';
    const models = [...new Set(mine().map(row => row.model))];
    filters.model.replaceChildren(new Option('全部模型', ''), ...models.map(model => new Option(model, model)));
    setDateDefaults();
    renderTable();
  }

  document.querySelector('#videoSpendMore').addEventListener('click', () => {
    closePopup();
    const page = document.querySelector('.page.active');
    const fromCrm = document.body.classList.contains('platform-crm');
    if (page !== detail || fromCrm) {
      saveNavigationState({ videoSpendReturnPage: page === detail ? 'home' : page?.id.slice(5), videoSpendReturnCrm: fromCrm });
    }
    if (fromCrm) document.querySelector('[data-platform="creation"]').click();
    showPage('video-spend');
    loadDetail();
    detail.querySelector('.vs-back').focus({ preventScroll: true });
  });
  detail.querySelector('.vs-back').addEventListener('click', () => {
    const state = readNavigationState();
    showPage(state.videoSpendReturnPage || 'home');
    if (state.videoSpendReturnCrm) document.querySelector('[data-platform="crm"]').click();
    trigger.focus({ preventScroll: true });
  });
  form.addEventListener('input', () => filters.end.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (filters.start.value && filters.end.value && filters.start.value > filters.end.value) {
      filters.end.setCustomValidity('结束日期不能早于开始日期');
      filters.end.reportValidity();
      return;
    }
    renderTable();
  });
  form.addEventListener('reset', event => {
    event.preventDefault();
    setDateDefaults();
    filters.model.value = '';
    renderTable();
  });
  document.querySelector('#videoSpendExport').addEventListener('click', () => {
    const header = [...detail.querySelectorAll('th')].map(cell => cell.textContent);
    const rows = displayed.map(row => [...columns.map(key => row[key]), (row.cents / 100).toFixed(2)]);
    const csv = [header, ...rows].map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = '视频费用明细-' + dayKey(new Date()) + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.addEventListener('video-spend-identity-change', () => {
    closePopup();
    if (detail.classList.contains('active')) loadDetail();
    refreshSummary();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshSummary(); });
  function scheduleMidnight() {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    setTimeout(() => { refreshSummary(); scheduleMidnight(); }, Math.max(1, midnight - Date.now()));
  }
  refreshSummary();
  if (detail.classList.contains('active')) loadDetail();
  scheduleMidnight();
})();
