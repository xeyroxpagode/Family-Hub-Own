/**
 * Inventory V2 — Block 2 Premium UX Products: visual capture harness.
 *
 * A dependency-free Chrome DevTools Protocol driver (Node >= 22 ships a
 * global WebSocket) that captures the Products surfaces of the PREMIUM target
 * at 390x844 against the LOCAL Supabase + backend stack.
 *
 * Prerequisites:
 *   1. `npx supabase start` (local stack on 127.0.0.1:56221).
 *   2. `node index.js` in `backend/` (API on 127.0.0.1:3000).
 *   3. `npx expo start --web --port 8081` in `front/mi-front-limpio`, with
 *      `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_API_URL` pointing at the
 *      local stack.
 *   4. A seeded demo household (`npm run seed:demo` in `backend/`).
 *
 * Usage:
 *   node scripts/inventory_v2_products_visual_capture.js \
 *     scripts/inventory_v2_products_visual_scenario.js \
 *     docs/implementation/inventory/v2/premium-products-audit
 *
 * The captures are EVIDENCE, not a test: they document what the target looks
 * like at the moment of the capture. The DEVICE QA of the real iPhone is still
 * pending.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function httpJson(url) {
  const res = await fetch(url);
  return res.json();
}

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message} (${JSON.stringify(message.error.data ?? '')})`));
        else resolve(message.result);
        return;
      }
      this.events.push(message);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 120000);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${result.exceptionDetails.text} ${JSON.stringify(result.exceptionDetails.exception?.description ?? '')}`);
    }
    return result.result?.value;
  }

  async clickByLabel(label, { exact = true, index = 0, timeout = 8000 } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const rect = await this.evaluate(`(() => {
        const all = Array.from(document.querySelectorAll('[aria-label]'));
        const matches = all.filter((el) => {
          const value = el.getAttribute('aria-label') || '';
          return ${exact ? `value === ${JSON.stringify(label)}` : `value.includes(${JSON.stringify(label)})`};
        });
        const el = matches[${index}];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      })()`);
      if (rect) {
        await this.mouse(rect.x, rect.y);
        await sleep(700);
        return true;
      }
      await sleep(350);
    }
    throw new Error(`click target not found: ${label}`);
  }

  async clickByText(text, { timeout = 8000 } = {}) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const rect = await this.textRect(this, text);
      if (rect) {
        await this.mouse(rect.x, rect.y);
        await sleep(700);
        return true;
      }
      await sleep(350);
    }
    throw new Error(`text target not found: ${text}`);
  }

  async mouse(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await sleep(60);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  }

  async drag(from, to, steps = 14) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y, buttons: 0 });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let index = 1; index <= steps; index += 1) {
      const x = from.x + ((to.x - from.x) * index) / steps;
      const y = from.y + ((to.y - from.y) * index) / steps;
      await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
      await sleep(22);
    }
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
  }

  async touchDrag(from, to, steps = 16) {
    const point = (x, y) => [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
    await this.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) });
    await sleep(60);
    for (let index = 1; index <= steps; index += 1) {
      const x = from.x + ((to.x - from.x) * index) / steps;
      const y = from.y + ((to.y - from.y) * index) / steps;
      await this.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(x, y) });
      await sleep(26);
    }
    await this.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  async longPressTouch(x, y, ms = 900) {
    const point = [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
    await this.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point });
    await sleep(ms);
    await this.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  async longPress(x, y, ms = 700) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await sleep(ms);
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  }

  async typeInto(inputIndex, text) {
    await this.evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll('input,textarea'));
      const el = inputs[${inputIndex}];
      if (!el) return false;
      el.focus();
      return true;
    })()`);
    await sleep(200);
    await this.send('Input.insertText', { text });
    await sleep(300);
  }

  async screenshot(file) {
    const result = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    return file;
  }

  async labelRectInView(session, needle, { index = 0, exact = false } = {}) {
    const matcher = exact
      ? `(el.getAttribute('aria-label')||'') === ${JSON.stringify(needle)}`
      : `(el.getAttribute('aria-label')||'').includes(${JSON.stringify(needle)})`;
    await session.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('[aria-label]')).filter((el) => ${matcher});
      const el = nodes[${index}];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
      return !!el;
    })()`);
    await sleep(400);
    return session.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('[aria-label]')).filter((el) => ${matcher});
      const el = nodes[${index}];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: r.left + r.width/2, y: r.top + r.height/2, left: r.left, top: r.top, w: r.width, h: r.height };
    })()`);
  }

  async textRect(session, text, { index = 0 } = {}) {
    return session.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,a')).filter((el) => (el.textContent||'').trim() === ${JSON.stringify(text)});
      const sized = nodes.map((el) => { const r = el.getBoundingClientRect(); return { el, area: r.width * r.height, r }; }).filter((entry) => entry.area > 0);
      sized.sort((a, b) => a.area - b.area);
      const entry = sized[${index}];
      if (!entry) return null;
      return { x: entry.r.left + entry.r.width/2, y: entry.r.top + entry.r.height/2 };
    })()`);
  }

  async offline(on) {
    await this.send('Network.emulateNetworkConditions', {
      offline: on,
      latency: 0,
      downloadThroughput: on ? 0 : -1,
      uploadThroughput: on ? 0 : -1,
    });
  }

  async blockApi(on) {
    await this.send('Network.setBlockedURLs', { urls: on ? ['*api/inventory/*'] : [] });
  }

  async goto(url, { waitMs = 3500 } = {}) {
    await this.send('Page.navigate', { url });
    await sleep(waitMs);
  }
}

async function main() {
  const scenarioPath = path.resolve(process.argv[2]);
  const outputDir = process.argv[3];
  const scenario = require(scenarioPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-capture-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=390,844',
    'about:blank',
  ], { stdio: 'ignore' });

  let targets = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      targets = await httpJson(`http://127.0.0.1:${PORT}/json/list`);
      if (targets.length) break;
    } catch { /* not ready yet */ }
    await sleep(400);
  }
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('no chrome page target');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  const session = new Session(ws);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Network.enable');
  session.ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      if (url.includes('/api/inventory/products')) console.log('  REQ', url);
    }
    if (message.method === 'Network.responseReceived') {
      const url = message.params.response.url;
      if (url.includes('/api/inventory/products')) console.log('  RES', message.params.response.status, url);
    }
  });
  await session.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  const context = { session, outputDir, scenario };
  try {
    await scenario.run(context);
  } catch (error) {
    console.error('SCENARIO ERROR:', error.message);
    try {
      await session.screenshot(path.join(outputDir, 'zz-error.png'));
    } catch { /* ignore */ }
    process.exitCode = 1;
  } finally {
    ws.close();
    chrome.kill();
    await sleep(400);
    try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3 }); } catch { /* chrome still holds it */ }
  }
}

module.exports = { Session, sleep };

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
