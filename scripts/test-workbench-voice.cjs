/* Test with synthetic browser audio only; never uses the computer's microphone.
   NODE_PATH=/path/to/node_modules node scripts/test-workbench-voice.cjs [HTTP URL] */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:8768/index.html';
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-fake-device-for-media-stream']
  });
  try {
    const context = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Keep references to the browser's real synthetic tracks so cleanup is observable.
    await page.addInitScript(() => {
      window.testTracks = [];
      const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async constraints => {
        const stream = await getUserMedia(constraints);
        window.testTracks.push(...stream.getTracks());
        if (window.holdMicrophone) await new Promise(resolve => { window.releaseMicrophone = resolve; });
        return stream;
      };
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { document.querySelector('[data-platform="creation"]').click(); showPage('workbench'); });
    await page.locator('#wbNewChat').click();
    await page.locator('#wbInput').fill('语音附件测试');
    await page.locator('#wbMic').click();
    await page.waitForFunction(() => document.querySelector('#wbRecordingStatus').textContent === '正在录音');
    assert.equal(await page.locator('#wbSend').isDisabled(), true);
    await page.waitForFunction(() => document.querySelector('#wbRecordingTime').textContent !== '00:00');
    await page.screenshot({ path: '/tmp/chaoren-public-assets-check/workbench-recording.png' });
    await page.locator('#wbMic').click();
    await page.locator('#wbAttachments audio').waitFor();
    assert.equal(await page.evaluate(() => window.testTracks.every(track => track.readyState === 'ended')), true);
    assert.equal(await page.locator('#wbRecording').isVisible(), false);
    assert.equal(await page.locator('#wbSend').isDisabled(), false);
    const audio = page.locator('#wbAttachments audio');
    await page.waitForFunction(() => document.querySelector('#wbAttachments audio').readyState >= 1);
    assert.ok(await audio.evaluate(async node => (await (await fetch(node.src)).blob()).size > 0));
    await audio.evaluate(node => node.play());
    assert.equal(await audio.evaluate(node => node.paused), false);
    await audio.evaluate(node => node.pause());
    await page.locator('#wbSend').click();
    await page.locator('.wb-message-user audio').waitFor();
    assert.match(await page.locator('.wb-message-user').last().innerText(), /语音-/);

    // Cancel, task change and global navigation release every track and discard capture.
    for (const action of ['cancel', 'task', 'catalog', 'module', 'platform']) {
      if (action === 'module') await page.evaluate(() => showPage('workbench'));
      await page.locator('#wbMic').click();
      await page.waitForFunction(() => document.querySelector('#wbRecordingStatus').textContent === '正在录音');
      if (action === 'cancel') await page.locator('#wbCancelRecording').click();
      if (action === 'task') await page.locator('#wbNewChat').click();
      if (action === 'catalog') { await page.locator('#wbCapabilities').click(); await page.locator('#wbNewChat').click(); }
      if (action === 'module') { await page.evaluate(() => showPage('assets')); await page.evaluate(() => showPage('workbench')); }
      if (action === 'platform') { await page.locator('[data-platform="crm"]').click(); await page.locator('[data-platform="creation"]').click(); }
      await page.waitForFunction(() => window.testTracks.every(track => track.readyState === 'ended'));
      assert.equal(await page.locator('#wbAttachments audio').count(), 0);
      assert.equal(await page.locator('#wbMic').getAttribute('aria-pressed'), 'false');
    }
    // A permission/device response arriving after cancellation cannot restart recording.
    await page.evaluate(() => { window.holdMicrophone = true; });
    await page.locator('#wbMic').click();
    await page.waitForFunction(() => typeof window.releaseMicrophone === 'function');
    await page.locator('#wbNewChat').click();
    await page.evaluate(() => { window.releaseMicrophone(); window.holdMicrophone = false; });
    await page.waitForFunction(() => window.testTracks.every(track => track.readyState === 'ended'));
    assert.equal(await page.locator('#wbRecording').isVisible(), false);
    assert.equal(await page.locator('#wbAttachments audio').count(), 0);
    // Record again, remove the attachment, and verify sending selected settings.
    await page.locator('#wbMic').click();
    await page.waitForFunction(() => document.querySelector('#wbRecordingTime').textContent !== '00:00');
    await page.locator('#wbMic').click();
    await page.locator('#wbAttachments audio').waitFor();
    await page.locator('[data-wb-remove-file]').click();
    assert.equal(await page.locator('#wbAttachments').isVisible(), false);
    await page.locator('.wb-model-summary').click();
    await page.locator('#wbModelPicker').click();
    await page.locator('[data-wb-model="gpt-6-luna"]').click();
    await page.locator('#wbThinkingRange').focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Escape');
    await page.locator('#wbInput').fill('保留模型配置');
    await page.locator('#wbSend').click();
    assert.deepEqual(await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('chaoren-workbench-v1'));
      return state.chats.find(chat => chat.id === state.selectedId).messages[0].settings;
    }), { model: 'gpt-6-luna', thinkingLevel: 'max' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-page="workbench"]').click();
    await page.locator('.wb-model-summary').click();
    await page.locator('#wbModelPicker').click();
    const box = await page.locator('.wb-model-popover').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 99 && box.y + box.height < 844);
    await page.screenshot({ path: '/tmp/chaoren-public-assets-check/workbench-models-mobile.png' });
    assert.deepEqual(errors, []);
    await context.close();

    const denied = await browser.newContext();
    await denied.grantPermissions([], { origin: new URL(base).origin });
    const deniedPage = await denied.newPage();
    await deniedPage.goto(base, { waitUntil: 'domcontentloaded' });
    await deniedPage.evaluate(() => { document.querySelector('[data-platform="creation"]').click(); showPage('workbench'); });
    await deniedPage.locator('#wbMic').click();
    await deniedPage.waitForFunction(() => document.querySelector('#wbStatus').textContent.includes('未获得麦克风权限'));
    assert.equal(await deniedPage.locator('#wbMic').isDisabled(), false);
    assert.equal(await deniedPage.locator('#wbRecording').isVisible(), false);
    console.log('Passed: synthetic microphone capture/playback/send/removal, cancellation and track cleanup, permission denial, selected model/strength metadata, mobile selector bounds.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
