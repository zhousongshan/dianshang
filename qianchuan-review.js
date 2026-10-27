/* 千川预审交互原型。所有结果均为显式演示，不调用模型、不上传素材。 */
(() => {
  'use strict';
  const q = s => document.querySelector(s), esc = escapeHtml;
  const active = () => activeAiApplicationId === 'qianchuan-video-review';
  const state = { mediaType: 'video', images: [], imageLoading: false, video: null, cover: null, title: '', topics: '', description: '', phase: 'idle', step: 0, scenario: 'fail', report: null, reports: [], stale: false, error: '', loading: false, coverLoading: false, revision: 0, run: 0 };
  const MAX_IMAGES = 60;
  const hasMedia = () => state.mediaType === 'image' ? state.images.length > 0 : Boolean(state.video);
  let loadId = 0, coverId = 0;
  const scenarios = { pass: '审核通过', fail: '审核没有通过', uncertain: '不确定', mixed: '未通过＋不确定', error: '处理失败' };
  const time = seconds => { const s = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; };
  const busy = () => state.phase === 'running';
  const release = media => { if (media?.url) URL.revokeObjectURL(media.url); };
  function invalidate() {
    state.revision++;
    if (state.report) state.stale = true;
    if (state.phase === 'error') state.phase = 'idle';
    state.error = '';
    renderResults();
  }
  function renderEditor() {
    const v = state.video, cover = state.cover;
    const existingVideo = q('#qcVideo');
    q('#aiAppEditor').innerHTML = `<div class="ai-app-editor-header"><div class="ai-app-editor-name">${aiApplicationIcon('video')}<h2>千川投放审核</h2></div><span class="ai-app-editor-kind">${state.mediaType === "image" ? "图片审核" : "视频审核"}</span></div>
      <p class="ai-app-editor-description">上传投放素材，查看具体问题、规则依据和修改建议。</p>
      <div class="qc-media-tabs" role="tablist" aria-label="审核素材类型"><button type="button" role="tab" data-qc-mode="video" aria-selected="${state.mediaType === 'video'}" ${busy() || state.imageLoading || state.loading ? 'disabled' : ''}>视频</button><button type="button" role="tab" data-qc-mode="image" aria-selected="${state.mediaType === 'image'}" ${busy() || state.imageLoading || state.loading ? 'disabled' : ''}>图片</button></div>
      <form id="qcForm" class="qc-form"><fieldset ${busy() ? 'disabled' : ''}>
      ${state.mediaType === 'video' ? `      <div><label class="qc-field-label" for="qcVideoFile">待审核视频 <span class="qc-required">*</span></label><input id="qcVideoFile" type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" hidden>
      ${v ? `<video id="qcVideo" class="qc-player" src="${esc(v.url)}" controls playsinline preload="auto"></video><div class="qc-caption"><span title="${esc(v.name)}">${esc(v.name)} · ${time(v.duration)}</span><button class="qc-link" type="button" data-qc="video">更换</button><button class="qc-link" type="button" data-qc="remove-video">移除</button></div>` : `<button class="ai-app-upload qc-upload" type="button" data-qc="video" data-qc-drop="video">${aiApplicationIcon('video')}<strong>${state.loading ? '正在读取视频…' : '点击上传或拖入视频'}</strong><small>MP4、MOV、WebM · 50MB 以内</small></button>`}</div>
      <div><label class="qc-field-label" for="qcCoverFile">视频封面 <small>选填</small></label><input id="qcCoverFile" type="file" accept="image/png,image/jpeg,image/webp" hidden><div class="qc-cover-row"><button class="qc-cover-upload" type="button" data-qc="cover" data-qc-drop="cover" aria-label="${cover ? '更换封面' : '上传封面'}">${cover ? `<img src="${esc(cover.url)}" alt="所选视频封面">` : aiApplicationIcon('image')}</button><div class="qc-cover-options"><button class="qc-link" type="button" data-qc="cover">${cover ? '更换图片' : '上传图片'}</button><button class="qc-link" type="button" data-qc="capture" ${v ? '' : 'disabled'}>截取视频当前画面</button>${cover ? '<button class="qc-link" type="button" data-qc="remove-cover">移除封面</button>' : '<small>JPG、PNG、WebP</small>'}</div></div></div>
` : `<div><label class="qc-field-label" for="qcImageFiles">待审核图片 <span class="qc-required">*</span><small>${state.images.length} / ${MAX_IMAGES} 张</small></label><input id="qcImageFiles" type="file" multiple accept="image/jpeg,image/png,image/webp" hidden>
      <button class="ai-app-upload qc-upload" type="button" data-qc="images" data-qc-drop="images" ${state.imageLoading ? 'disabled' : ''}>${aiApplicationIcon('image')}<strong>${state.imageLoading ? '正在读取图片…' : '点击上传或拖入图片'}</strong><small>JPG、PNG、WebP · 单张 10MB 以内</small><small>最多 ${MAX_IMAGES} 张，可分批添加</small></button>
      ${state.images.length ? `<div class="qc-image-toolbar"><span>已选择 ${state.images.length} 张图片</span><button class="qc-link" type="button" data-qc="clear-images" ${state.imageLoading ? 'disabled' : ''}>清空</button></div><div class="qc-image-grid">${state.images.map((image,i) => `<div class="qc-image-tile"><button class="qc-image-preview" type="button" data-qc-image-preview="${image.id}" aria-label="预览第 ${i+1} 张：${esc(image.name)}"><img src="${esc(image.url)}" alt="${esc(image.name)}"><span>${i+1}</span></button><button class="qc-image-remove" type="button" data-qc-remove-image="${image.id}" aria-label="移除第 ${i+1} 张图片" ${state.imageLoading ? 'disabled' : ''}>×</button><small title="${esc(image.name)}">${esc(image.name)}</small></div>`).join('')}</div>` : ''}</div>`}
      <div><label class="qc-field-label" for="qcTitle">标题 <small>选填</small></label><textarea class="qc-input" id="qcTitle" data-qc-field="title" maxlength="2000" placeholder="填写准备发布的作品标题">${esc(state.title)}</textarea></div>
      <div><label class="qc-field-label" for="qcDescription">作品描述 <small>选填</small></label><textarea class="qc-input" id="qcDescription" data-qc-field="description" maxlength="2000" placeholder="填写作品内容或补充说明">${esc(state.description)}</textarea></div>
      <div><label class="qc-field-label" for="qcTopics">话题 <small>选填</small></label><input class="qc-input" id="qcTopics" data-qc-field="topics" maxlength="2000" value="${esc(state.topics)}" placeholder="#话题一 #话题二"></div>
      </fieldset><div id="qcInputError" class="qc-error" role="alert" ${state.error ? '' : 'hidden'}>${esc(state.error)}</div><div><button id="qcSubmit" class="ai-app-generate qc-submit" type="submit" ${!hasMedia() || state.loading || state.imageLoading || state.coverLoading || busy() ? 'disabled' : ''}>${busy() ? '审核中…' : state.stale ? '重新提交审核' : '提交审核'}</button><p class="qc-submit-note">前端交互演示，暂未接入审核服务。<br>选择视频或图片即可体验，素材不会上传。</p></div></form>`;
    if (existingVideo && v && existingVideo.getAttribute('src') === v.url) q('#qcVideo')?.replaceWith(existingVideo);
  }
  function makeReport(mode, previewOnly = false, image = null, imageIndex = 0) {
    const duration = state.video?.duration || 30;
    const start = Math.min(8, duration * .3), end = Math.min(start + 4, duration * .7);
    // Each report owns its media URL so replacing the input cannot break past results.
    return { id: crypto.randomUUID(), mode, previewOnly, name: image?.name || (state.mediaType === 'video' ? state.video?.name : null) || '报告样式示例', kind: state.mediaType, imageIndex, imageUrl: image ? URL.createObjectURL(image.file) : null, start, end,
      uncertainStart: Math.min(15, duration * .75), created: new Date().toLocaleString('zh-CN', {hour12:false}),
      videoUrl: state.mediaType === 'video' && state.video ? URL.createObjectURL(state.video.file) : null,
      coverUrl: state.mediaType === 'video' && state.cover ? URL.createObjectURL(state.cover.file) : null };
  }
  function saveReport(report) {
    if (report.previewOnly) {
      state.reports = state.reports.filter(old => {
        if (!old.previewOnly || old.mode !== report.mode || old.kind !== report.kind) return true;
        if (old.imageUrl) URL.revokeObjectURL(old.imageUrl);
        if (old.videoUrl) URL.revokeObjectURL(old.videoUrl);
        if (old.coverUrl) URL.revokeObjectURL(old.coverUrl);
        return false;
      });
    }
    state.report = report; state.reports.unshift(report);
  }
  function locationButton(start, end, r) {
    if (r.kind === 'image') return `<span class="qc-image-location">${r.imageUrl ? `第 ${r.imageIndex+1} 张图片` : '图片示例'}</span>`;
    return `<button type="button" class="qc-time" data-qc-report="${r.id}" data-qc-seek="${start}" ${r.videoUrl ? '' : 'disabled'} aria-label="回看 ${time(start)}">▶ ${time(start)}${end != null ? ` — ${time(end)}` : ''}</button>`;
  }
  function reportCard(r) {
    const status = r.mode === 'mixed' ? 'fail' : r.mode;
    return `<article class="qc-video-card" data-qc-card="${r.id}">
      <div class="qc-result-media">${r.imageUrl ? `<img data-image-preview src="${esc(r.imageUrl)}" alt="${esc(r.name)}" loading="lazy">` : r.videoUrl ? `<video id="qcResult-${r.id}" src="${esc(r.videoUrl)}" ${r.coverUrl ? `poster="${esc(r.coverUrl)}"` : ''} controls playsinline preload="metadata" aria-label="${esc(r.name)}审核视频"></video>` : `<div class="qc-result-placeholder">${aiApplicationIcon(r.kind === 'image' ? 'image' : 'video')}<span>${r.kind === 'image' ? '图片' : '视频'}预览位置</span><small>上传素材后可预览</small></div>`}<span class="qc-media-badge">演示</span></div>
      <div class="qc-video-info"><strong title="${esc(r.name)}">${esc(r.name)}</strong><span>${r.created}</span></div>
      <div class="qc-result-content"><div class="qc-summary ${status}"><strong>${status === 'pass' ? '审核通过：无' : status === 'fail' ? '审核没有通过' : '不确定'}</strong></div>
      ${status === 'fail' ? `<section class="qc-card"><div class="qc-card-head"><strong>问题 01</strong>${locationButton(r.start,r.end,r)}</div><dl><dt>具体问题：</dt><dd>${r.kind === 'image' ? '示例：图片文案声称普通食品能够治疗疾病。' : '示例：口播声称普通食品能够治疗疾病。'}</dd></dl><details class="qc-details"><summary>查看原因、依据及建议<span aria-hidden="true">⌄</span></summary><dl><dt>原因以及依据：</dt><dd>该表述涉及普通食品的疾病治疗功效，对应「食品：夸大功效」中不得超出普通食品功效范围的要求。</dd><dt>建议：</dt><dd>删除治疗疾病的表述，改为有事实依据的口味、配料或食用方式介绍。</dd></dl></details></section>` : ''}
      ${status === 'uncertain' || r.mode === 'mixed' ? `<section class="qc-card uncertain"><div class="qc-card-head"><strong>不确定</strong>${locationButton(r.uncertainStart,null,r)}</div><p>示例：包装小字模糊，无法识别完整内容，目前条件没法判决是否涉及违规表述。</p></section>` : ''}
      </div></article>`;
  }
  function renderResults() {
    let area = q('#qcResults');
    if (!area) { area = document.createElement('div'); area.id = 'qcResults'; q('.ai-app-results').append(area); }
    area.hidden = !active();
    if (!active()) return;
    q('.ai-app-results-empty').hidden = true;
    q('#aiAppResultsTitle').textContent = '审核结果';
    const expanded = new Set(Array.from(area.querySelectorAll('.qc-details[open]')).map(d => d.closest('[data-qc-card]').dataset.qcCard));
    const players = new Map(Array.from(area.querySelectorAll('.qc-result-media video')).map(v => [v.id,v]));
    area.innerHTML = `<div class="qc-demo"><span>交互演示 · 示例不代表所上传素材的真实审核结论</span><select id="qcScenario" aria-label="预览审核情况" ${busy() ? 'disabled' : ''}><option value="">预览审核情况</option>${Object.entries(scenarios).map(([key,label]) => `<option value="${key}" ${state.report?.mode === key && !busy() ? 'selected' : ''}>${label}</option>`).join('')}</select></div><div id="qcReportBody" aria-live="polite"></div>`;
    const body = q('#qcReportBody');
    let notice = '';
    if (busy()) {
      notice = `<div class="qc-progress" role="status"><h3>正在审核素材</h3><ol class="qc-steps">${['正在分析素材','正在核查疑点','正在生成报告'].map((label,i) => `<li class="${i < state.step ? 'done' : i === state.step ? 'current' : ''}" ${i === state.step ? 'aria-current="step"' : ''}><i></i>${label}</li>`).join('')}</ol><p>正在演示审核流程，请稍候…</p></div>`;
    } else if (state.phase === 'error') {
      notice = `<div class="qc-failure" role="alert"><strong>审核未完成</strong><p>演示：审核服务暂时未响应，请重试。</p><button class="qc-retry" type="button" data-qc="retry" ${hasMedia() ? '' : 'disabled'}>重试</button></div>`;
    } else if (state.stale) {
      notice = '<div class="qc-stale" role="status">素材或填写内容已修改，请重新提交审核。下方保留原素材对应的演示结果。</div>';
    }
    body.innerHTML = notice + (state.reports.length ? `<div class="qc-results-grid">${state.reports.map(reportCard).join('')}</div>` : !notice ? `<div class="qc-empty"><div class="qc-empty-icon">${aiApplicationIcon('video')}</div><strong>暂无审核结果</strong><p>提交后，每个素材的审核结果会显示在对应卡片下方。</p></div>` : '');
    for (const detail of area.querySelectorAll('.qc-details')) detail.open = expanded.has(detail.closest('[data-qc-card]').dataset.qcCard);
    for (const replacement of area.querySelectorAll('.qc-result-media video')) {
      const previous = players.get(replacement.id);
      if (previous && previous.getAttribute('src') === replacement.getAttribute('src')) replacement.replaceWith(previous);
    }
  }
  function render() { if (active()) renderEditor(); renderResults(); }
  function showInputError(message) { state.error = message; if (active()) { q('#qcInputError').textContent = message; q('#qcInputError').hidden = false; } }
  function syncSubmit() {
    if (!active()) return;
    const button = q('#qcSubmit');
    button.disabled = !hasMedia() || state.loading || state.imageLoading || state.coverLoading || busy();
    button.textContent = busy() ? '审核中…' : state.stale ? '重新提交审核' : '提交审核';
  }
  async function validateMedia(file, kind, url) {
    const media = kind === 'video' ? document.createElement('video') : new Image();
    let timer;
    try { return await new Promise((resolve,reject) => {
      timer = setTimeout(() => reject(new Error('素材读取超时，请重新选择。')), 12000);
      media.onerror = () => reject(new Error(kind === 'video' ? '视频无法播放，请更换为浏览器可播放的视频。' : '封面无法读取，请更换图片。'));
      const loaded = () => {
        if (kind === 'video') {
          if (!Number.isFinite(media.duration) || media.duration <= 0 || !media.videoWidth) return reject(new Error('无法读取有效的视频时长，请更换文件。'));
          resolve({ duration: media.duration, width: media.videoWidth, height: media.videoHeight });
        } else if (!media.naturalWidth) reject(new Error('图片尺寸无效。'));
        else resolve({});
      };
      if (kind === 'video') { media.preload = 'auto'; media.onloadeddata = loaded; } else media.onload = loaded;
      media.src = url;
    }); } finally { clearTimeout(timer); media.onerror = media.onload = media.onloadeddata = null; media.removeAttribute('src'); if (kind === 'video') media.load(); }
  }
  async function loadFile(file, kind) {
    if (!file || busy()) return;
    const valid = kind === 'video' ? /\.(mp4|mov|webm)$/i : /\.(png|jpe?g|webp)$/i;
    if (!valid.test(file.name)) return showInputError(kind === 'video' ? '请选择 MP4、MOV 或 WebM 视频。' : '请选择 JPG、PNG 或 WebP 封面。');
    if (!file.size || file.size > 50 * 1024 * 1024) return showInputError('请选择非空且不超过 50MB 的文件。');
    const id = kind === 'video' ? ++loadId : ++coverId, url = URL.createObjectURL(file);
    if (kind === 'video') state.loading = true; else state.coverLoading = true;
    state.error = ''; if (active()) renderEditor();
    try {
      const meta = await validateMedia(file,kind,url);
      if (id !== (kind === 'video' ? loadId : coverId)) { URL.revokeObjectURL(url); return; }
      release(state[kind]);
      state[kind] = { file, name: file.name, url, ...meta };
      if (kind === 'video' && state.cover?.captured) { release(state.cover); state.cover = null; }
      invalidate();
    } catch (error) { URL.revokeObjectURL(url); if (id === (kind === 'video' ? loadId : coverId)) state.error = error.message; }
    finally { if (kind === 'video' && id === loadId) state.loading = false; if (kind === 'cover' && id === coverId) state.coverLoading = false; if (active()) renderEditor(); }
  }
  async function loadImages(fileList) {
    if (busy() || state.imageLoading) return;
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.length + state.images.length > MAX_IMAGES) return showInputError(`最多上传 ${MAX_IMAGES} 张图片，已选择 ${state.images.length} 张，本次选择 ${files.length} 张。请减少后重试。`);
    state.imageLoading = true; state.error = ''; renderEditor();
    const accepted = []; let rejected = 0;
    try {
      for (const file of files) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 10*1024*1024) { rejected++; continue; }
        const url = URL.createObjectURL(file);
        try { await validateMedia(file,'image',url); accepted.push({id:crypto.randomUUID(),file,name:file.name,url}); }
        catch { URL.revokeObjectURL(url); rejected++; }
      }
      state.images.push(...accepted);
      if (accepted.length) invalidate();
      if (rejected) state.error = `已添加 ${accepted.length} 张，跳过 ${rejected} 个无效或超限文件。请使用单张不超过 10MB 的 JPG、PNG、WebP 图片。`;
    } finally { state.imageLoading = false; if (active()) renderEditor(); }
  }
  async function captureCover() {
    if (state.coverLoading) return showInputError('封面正在读取，请稍候再截取。');
    const video = q('#qcVideo');
    if (!video || video.readyState < 2) return showInputError('请等待视频画面加载后再截取。');
    video.pause();
    const id = ++coverId, source = state.video, revision = state.revision;
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video,0,0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.92));
    if (!blob || id !== coverId || source !== state.video || revision !== state.revision || busy()) return;
    release(state.cover); state.cover = { url: URL.createObjectURL(blob), file: blob, name: '视频截取封面.jpg', captured: true };
    const currentTime = video.currentTime; invalidate(); renderEditor();
    const next = q('#qcVideo'); if (next && next !== video) next.addEventListener('loadedmetadata', () => { next.currentTime = currentTime; }, {once:true});
  }
  async function submit(retry = false) {
    if (!hasMedia() || state.loading || state.imageLoading || state.coverLoading || busy()) return;
    if (retry) state.scenario = 'fail';
    const run = ++state.run, revision = state.revision, mode = retry ? 'fail' : state.scenario;
    state.phase = 'running'; state.step = 0; state.error = ''; render();
    for (let step = 0; step < 3; step++) {
      state.step = step; renderResults();
      await new Promise(resolve => setTimeout(resolve,650));
      if (run !== state.run || revision !== state.revision) return;
    }
    state.phase = mode === 'error' ? 'error' : 'done';
    if (mode !== 'error') {
      if (state.mediaType === 'image') { for (let i = state.images.length - 1; i >= 0; i--) saveReport(makeReport(mode,false,state.images[i],i)); }
      else saveReport(makeReport(mode));
    }
    state.stale = false; render();
  }
  const previousEditor = renderAiAppEditor;
  renderAiAppEditor = function() {
    document.querySelectorAll('#qcVideo, .qc-result-media video').forEach(v => v.pause());
    previousEditor();
    q('.ai-app-workspace').classList.toggle('qc-workspace',active());
    if (active()) renderEditor();
    renderResults();
  };
  document.addEventListener('submit', event => { if (event.target.id === 'qcForm') { event.preventDefault(); submit(); } });
  document.addEventListener('input', event => {
    if (!active() || busy() || !event.target.matches('[data-qc-field]')) return;
    state[event.target.dataset.qcField] = event.target.value;
    invalidate(); syncSubmit();
  });
  document.addEventListener('change', event => {
    if (!active() || busy()) return;
    if (event.target.id === 'qcImageFiles') loadImages(event.target.files);
    if (event.target.id === 'qcVideoFile') loadFile(event.target.files[0],'video');
    if (event.target.id === 'qcCoverFile') loadFile(event.target.files[0],'cover');
    if (event.target.id === 'qcScenario' && event.target.value) {
      state.scenario = event.target.value; state.phase = state.scenario === 'error' ? 'error' : 'done';
      if (state.scenario !== 'error') saveReport(makeReport(state.scenario,true,state.mediaType === 'image' ? state.images[0] : null));
      state.stale = false;
      renderResults(); syncSubmit();
    }
  });
  document.addEventListener('click', event => {
    if (!active() || busy()) return;
    const mode = event.target.closest('[data-qc-mode]');
    if (mode && !mode.disabled) { q('#qcVideo')?.pause(); state.mediaType = mode.dataset.qcMode; invalidate(); render(); return; }
    const preview = event.target.closest('[data-qc-image-preview]');
    if (preview) { const image = state.images.find(item => item.id === preview.dataset.qcImagePreview); if (image) openImagePreview(image.url,image.name); return; }
    const remove = event.target.closest('[data-qc-remove-image]');
    if (remove && !remove.disabled && !state.imageLoading) { state.images = state.images.filter(image => { if (image.id !== remove.dataset.qcRemoveImage) return true; release(image); return false; }); invalidate(); render(); return; }
    const seek = event.target.closest('[data-qc-seek]');
    if (seek && !seek.disabled) {
      const video = document.getElementById(`qcResult-${seek.dataset.qcReport}`); if (!video) return;
      const play = () => { video.currentTime = Math.min(Number(seek.dataset.qcSeek), Math.max(0,video.duration-.05)); video.play().catch(() => {}); };
      if (video.readyState >= 1) play(); else video.addEventListener('loadedmetadata',play,{once:true});
      video.scrollIntoView({behavior:'smooth',block:'center'}); return;
    }
    const button = event.target.closest('[data-qc]'); if (!button || button.disabled) return;
    const action = button.dataset.qc;
    if (action === 'images') q('#qcImageFiles').click();
    if (action === 'clear-images' && !state.imageLoading) { state.images.forEach(release); state.images = []; invalidate(); render(); }
    if (action === 'video') q('#qcVideoFile').click();
    if (action === 'cover') q('#qcCoverFile').click();
    if (action === 'capture') captureCover();
    if (action === 'retry') submit(true);
    if (action === 'remove-video' || action === 'remove-cover') {
      const kind = action === 'remove-video' ? 'video' : 'cover';
      if (kind === 'video') { loadId++; state.loading = false; if (state.cover?.captured) { release(state.cover); state.cover = null; coverId++; state.coverLoading = false; } } else { coverId++; state.coverLoading = false; }
      release(state[kind]); state[kind] = null; invalidate(); render();
    }
  });
  document.addEventListener('dragover',event => { const target = event.target.closest('[data-qc-drop]'); if (!target || busy()) return; event.preventDefault(); target.classList.add('drag-over'); });
  document.addEventListener('dragleave',event => { const target = event.target.closest('[data-qc-drop]'); if (target && !target.contains(event.relatedTarget)) target.classList.remove('drag-over'); });
  document.addEventListener('drop',event => { const target = event.target.closest('[data-qc-drop]'); if (!target) return; event.preventDefault(); target.classList.remove('drag-over'); if (!busy()) { if (target.dataset.qcDrop === 'images') { loadImages(event.dataTransfer.files); return; } if (event.dataTransfer.files.length > 1) return showInputError('每次请选择一个文件。'); loadFile(event.dataTransfer.files[0],target.dataset.qcDrop); } });
  document.addEventListener('play',event => { if (!event.target.matches?.('#qcVideo, .qc-result-media video')) return; document.querySelectorAll('#qcVideo, .qc-result-media video').forEach(v => { if (v !== event.target) v.pause(); }); },true);
  window.addEventListener('beforeunload',() => { release(state.video); release(state.cover); state.images.forEach(release); for (const r of state.reports) { if(r.imageUrl) URL.revokeObjectURL(r.imageUrl); if(r.videoUrl) URL.revokeObjectURL(r.videoUrl); if(r.coverUrl) URL.revokeObjectURL(r.coverUrl); } });
  renderAiAppEditor();
})();
