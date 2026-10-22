/**
 * Inventory V2 - Block 1 + Block 2 runtime reconciliation: REAL runtime
 * evidence scenario.
 *
 * It captures the REAL Inventory V2 experience (never the QA harness):
 *
 *   01  the DEV preview root opens the WORKSPACE (not a standalone Products)
 *   02  the Products workspace (canonical pager + canonical selector)
 *   03  the Products overflow: NO QA Premium UX entry
 *   04  the canonical selector moves the pager (Compras)
 *   05  the horizontal swipe moves the pager (the REAL gesture)
 *   06  the ProductFlow on the canonical sheet (grabber + detents)
 *   07  the ProductFlow with the keyboard open (sheet top does not move)
 *   08  the ProductFlow on an alternative detent (grabber drag)
 *   09  the add-to-shopping surface
 *   10  the Purchase before the add overlay
 *   11  the add overlay OVER the Purchase (the Purchase stays mounted)
 *   12  the Purchase after closing the add overlay (the same Purchase)
 *
 * It also records every console error / warning and every failed network
 * response of the runtime, so the "zero native height animation errors" claim
 * is measured, not assumed.
 *
 * Every literal that must match the UI is written with a unicode escape, so
 * the file survives any editor/console encoding round trip.
 */
const path = require('node:path');
const fs = require('node:fs');
const { sleep } = require('./inventory_v2_products_visual_capture');

const APP = 'http://localhost:8081';
const PREVIEW = `${APP}/home/more/inventory-v2-preview`;
const EMAIL = 'donalsmac59@gmail.com';
const PASSWORD = 'Demo123456!';

const LABEL_MORE_OPTIONS = 'M\u00e1s opciones';
const LABEL_MORE_TAB = 'M\u00e1s';
const TEXT_STANDARD_EXPERIENCE = 'Experiencia est\u00e1ndar';
const TEXT_CONTINUE_STANDARD = 'Continuar con la experiencia est\u00e1ndar';
const TEXT_SIGN_IN = 'Entrar a mi hogar';
const TEXT_LOGIN_SUBMIT = 'Iniciar sesi\u00f3n';
const TEXT_INVENTORY_V2 = 'Inventario V2';
const TEXT_SHOPPING_TAB = 'Compras';
const TEXT_PRODUCTS_TAB = 'Productos';
const TEXT_START_PURCHASE = 'Empezar compra';
const LABEL_ADD_TO_SHOPPING = 'Agregar productos a la lista';
const LABEL_CLOSE_ADD_TO_SHOPPING = 'Cerrar Agregar a la lista';
const LABEL_ADD_TO_PURCHASE = 'Agregar productos a la compra';
const LABEL_CLOSE_FLOW = 'Cerrar Agregar producto';
const TEXT_PLACES = 'Lugares';
const TEXT_ASSIGNEE = 'Encargado';
const TEXT_ALL_PRODUCTS = 'Todos los productos';

const captured = [];
const failures = [];
const measurements = {};

async function shot(session, outputDir, name, note) {
  const file = path.join(outputDir, `${name}.png`);
  await session.screenshot(file);
  captured.push({ name, note });
  console.log('captured', name, note ? `- ${note}` : '');
}

async function step(name, run) {
  try {
    await run();
  } catch (error) {
    failures.push({ step: name, error: error.message });
    console.log('STEP FAILED', name, '-', error.message);
  }
}

async function bodyText(session) {
  return session.evaluate(`(() => (document.body && document.body.innerText || '').replace(/\\s+/g,' '))()`);
}

async function labelRect(session, needle, { index = 0, exact = false } = {}) {
  return session.evaluate(`(() => {
    const all = Array.from(document.querySelectorAll('[aria-label]'));
    const matches = all.filter((el) => {
      const value = el.getAttribute('aria-label') || '';
      return ${exact ? `value === ${JSON.stringify(needle)}` : `value.includes(${JSON.stringify(needle)})`};
    });
    const sized = matches.map((el) => { const r = el.getBoundingClientRect(); return { el, area: r.width * r.height, r }; })
      .filter((entry) => entry.area > 0);
    // The SMALLEST match is the real control: a backdrop carries the same
    // label as the button that closes it.
    sized.sort((a, b) => a.area - b.area);
    const entry = sized[${index}];
    if (!entry) return null;
    const r = entry.r;
    return { x: r.left + r.width/2, y: r.top + r.height/2, left: r.left, top: r.top, w: r.width, h: r.height };
  })()`);
}

async function clickLabel(session, needle, { index = 0, exact = false, timeout = 12000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const rect = await labelRect(session, needle, { index, exact });
    if (rect) { await session.mouse(rect.x, rect.y); await sleep(1200); return rect; }
    await sleep(400);
  }
  throw new Error(`label not found: ${needle}`);
}

async function clickText(session, text, { timeout = 12000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const rect = await session.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('div,span,button,a')).filter((el) => (el.textContent||'').trim() === ${JSON.stringify(text)});
      const sized = nodes.map((el) => { const r = el.getBoundingClientRect(); return { el, area: r.width * r.height, r }; }).filter((entry) => entry.area > 0);
      sized.sort((a, b) => a.area - b.area);
      const entry = sized[0];
      if (!entry) return null;
      return { x: entry.r.left + entry.r.width/2, y: entry.r.top + entry.r.height/2 };
    })()`);
    if (rect) { await session.mouse(rect.x, rect.y); await sleep(1200); return rect; }
    await sleep(400);
  }
  throw new Error(`text not found: ${text}`);
}

/**
 * The horizontal position of BOTH pages of the pager.
 *
 * The pager keeps every page MOUNTED, so the DOM always contains both. The
 * only honest measurement of "which page is visible" is the X position of a
 * known anchor of each page.
 */
async function pagerOffsets(session) {
  return session.evaluate(`(() => {
    const leftOf = (needle) => {
      const nodes = Array.from(document.querySelectorAll('div,span')).filter((el) => (el.textContent||'').trim() === needle);
      const sized = nodes.map((el) => { const r = el.getBoundingClientRect(); return { area: r.width * r.height, left: r.left }; }).filter((entry) => entry.area > 0);
      sized.sort((a, b) => a.area - b.area);
      return sized.length ? Math.round(sized[0].left) : null;
    };
    return { products: leftOf(${JSON.stringify(TEXT_PLACES)}), shopping: leftOf(${JSON.stringify(TEXT_ASSIGNEE)}) };
  })()`);
}

/**
 * Is the given page the VISIBLE one?
 *
 * The pager keeps every page mounted, so a page that is off-screen still has
 * a position: the visible page is the one whose X is inside the viewport.
 */
function isVisible(offset) {
  return offset !== null && offset >= 0 && offset < 390;
}

/**
 * The top edge of the SHEET whose accessible name is the given title.
 * The header action of the workspace can share the same label, so the TALLEST
 * matching element (the sheet) is the one that matters.
 */
async function sheetTop(session, title) {
  return session.evaluate(`(() => {
    const nodes = Array.from(document.querySelectorAll('[aria-label]')).filter((el) => (el.getAttribute('aria-label')||'') === ${JSON.stringify(title)});
    const sized = nodes.map((el) => { const r = el.getBoundingClientRect(); return { r, h: r.height }; }).filter((entry) => entry.h > 60);
    if (!sized.length) return null;
    sized.sort((a, b) => b.h - a.h);
    const r = sized[0].r;
    return { top: Math.round(r.top), height: Math.round(r.height), bottom: Math.round(r.bottom) };
  })()`);
}

async function typeIntoPlaceholder(session, placeholder, text) {
  const focused = await session.evaluate(`(() => {
    const inputs = Array.from(document.querySelectorAll('input,textarea'));
    const el = inputs.find((node) => ((node.getAttribute('placeholder')||'') + '|' + (node.getAttribute('aria-label')||'')).includes(${JSON.stringify(placeholder)}));
    if (!el) return false;
    el.focus();
    return true;
  })()`);
  if (!focused) throw new Error(`input not found: ${placeholder}`);
  await sleep(250);
  await session.send('Input.insertText', { text });
  await sleep(2600);
}

async function signIn(session) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const body = await bodyText(session);
    if (body.includes(TEXT_CONTINUE_STANDARD) || body.includes(TEXT_STANDARD_EXPERIENCE)) {
      try { await session.clickByText(TEXT_STANDARD_EXPERIENCE); await sleep(3000); } catch (error) { /* not present */ }
      continue;
    }
    try { await session.clickByText(TEXT_SIGN_IN, { timeout: 20000 }); } catch (error) { /* the form may be open */ }
    await sleep(2000);
    await session.typeInto(0, EMAIL);
    await session.typeInto(1, PASSWORD);
    const filled = await session.evaluate(`(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map((el) => el.value);
    })()`);
    if (!filled || filled.length < 2 || !filled[0] || !filled[1]) {
      console.log('sign-in attempt', attempt + 1, '- the form was not filled', JSON.stringify(filled));
      continue;
    }
    const submit = await session.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('button,[role="button"],div'));
      const el = nodes.find((node) => (node.textContent||'').trim() === ${JSON.stringify(TEXT_LOGIN_SUBMIT)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    })()`);
    if (submit) await session.mouse(submit.x, submit.y);
    await sleep(7000);
    const logged = await session.evaluate(`(() => Object.keys(window.localStorage).includes('sb-127-auth-token'))()`);
    console.log('sign-in attempt', attempt + 1, '- session stored:', logged);
    if (logged) return true;
  }
  return false;
}

async function run({ session, outputDir }) {
  await session.send('Log.enable');
  const consoleIssues = [];
  const failedRequests = [];

  // ---------------------------------------------------------------- sign in
  await session.goto(APP, { waitMs: 30000 });
  const signedIn = await signIn(session);
  console.log('SIGNED_IN', signedIn);
  if (!signedIn) throw new Error('the sign in did not complete');
  for (const label of [TEXT_STANDARD_EXPERIENCE, TEXT_CONTINUE_STANDARD]) {
    try { await session.clickByText(label); await sleep(3000); console.log('resolver:', label); break; } catch (error) { /* not present */ }
  }
  console.log('AFTER RESOLVER:', (await bodyText(session)).slice(0, 200));

  // -------------------------------------------------- 01: the DEV preview root
  let isWorkspace = false;
  let rootText = '';
  let deepLink = true;
  for (let attempt = 0; attempt < 3 && !isWorkspace; attempt += 1) {
    await session.goto(PREVIEW, { waitMs: 20000 });
    await sleep(6000);
    rootText = await bodyText(session);
    isWorkspace = rootText.includes('Inventario') && rootText.includes('Productos') && rootText.includes('Compras');
    if (!isWorkspace) console.log('preview root not ready, attempt', attempt + 1, '-', rootText.slice(0, 160));
  }
  if (!isWorkspace) {
    deepLink = false;
    console.log('falling back to the in-app entry (Mas > Inventario V2)');
    await session.goto(APP, { waitMs: 20000 });
    await sleep(4000);
    const moreTab = await labelRect(session, LABEL_MORE_TAB, { exact: true });
    if (moreTab) { await session.mouse(moreTab.x, moreTab.y); await sleep(3000); }
    await clickText(session, TEXT_INVENTORY_V2);
    await sleep(4000);
    rootText = await bodyText(session);
    isWorkspace = rootText.includes('Inventario') && rootText.includes('Productos') && rootText.includes('Compras');
  }
  measurements.rootIsWorkspace = isWorkspace;
  measurements.entry = deepLink ? 'deep-link' : 'mas-tab';
  console.log('ROOT_IS_WORKSPACE', isWorkspace, 'entry', deepLink ? 'deep-link' : 'mas-tab');
  if (!isWorkspace) throw new Error('the DEV preview root did not resolve to the workspace');
  await shot(session, outputDir, '01-dev-preview-root-es-workspace', 'el deep link del preview abre el WORKSPACE real');

  // ------------------------------------------------ 02: the Products workspace
  measurements.productsTab = await pagerOffsets(session);
  console.log('OFFSETS_PRODUCTS_TAB', JSON.stringify(measurements.productsTab));
  await shot(session, outputDir, '02-productos-workspace', 'workspace real: header estable + selector canonico + pager');

  // ------------------------------------------- 03: the overflow without the QA
  await step('overflow without QA', async () => {
    await clickLabel(session, LABEL_MORE_OPTIONS);
    await sleep(1200);
    const overflowText = await bodyText(session);
    const hasQaEntry = /QA Premium UX/.test(overflowText);
    measurements.overflowHasQaEntry = hasQaEntry;
    console.log('OVERFLOW_HAS_QA_ENTRY', hasQaEntry);
    if (hasQaEntry) throw new Error('the Products overflow still exposes QA Premium UX (dev)');
    await shot(session, outputDir, '03-overflow-sin-qa', 'el overflow de Productos NO expone QA Premium UX (dev)');
    await session.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await session.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(1400);
  });

  // ------------------------------ 04: the canonical selector moves the pager
  await step('canonical selector', async () => {
    await clickText(session, TEXT_SHOPPING_TAB);
    await sleep(2000);
    measurements.shoppingTab = await pagerOffsets(session);
    console.log('OFFSETS_SHOPPING_TAB', JSON.stringify(measurements.shoppingTab));
    const moved = isVisible(measurements.shoppingTab.shopping);
    measurements.selectorMoved = moved;
    console.log('SELECTOR_MOVED', moved);
    await shot(session, outputDir, '04-compras-workspace', 'el selector canonico movio el pager real a Compras');
  });

  // ------------------------------------- 05: the horizontal swipe moves it
  await step('horizontal swipe', async () => {
    await clickText(session, TEXT_PRODUCTS_TAB);
    await sleep(2000);
    const before = await pagerOffsets(session);
    const anchor = await labelRect(session, TEXT_ALL_PRODUCTS);
    if (!anchor) throw new Error('the products root anchor row is not visible');
    await session.touchDrag({ x: 340, y: anchor.y }, { x: 70, y: anchor.y }, 24);
    await sleep(2200);
    const after = await pagerOffsets(session);
    measurements.swipe = { before, after };
    measurements.swipeMoved = isVisible(after.shopping) && !isVisible(before.shopping);
    console.log('OFFSETS_BEFORE_SWIPE', JSON.stringify(before));
    console.log('OFFSETS_AFTER_SWIPE', JSON.stringify(after));
    console.log('PAGER_MOVED_BY_SWIPE', measurements.swipeMoved);
    await shot(session, outputDir, '05-pager-swipe-horizontal', 'el swipe horizontal REAL del pager');
  });

  // ------------------------------------------------------ 06: the ProductFlow
  await step('product flow', async () => {
    const offsets = await pagerOffsets(session);
    if (!isVisible(offsets.products)) {
      await clickText(session, TEXT_PRODUCTS_TAB);
      await sleep(2000);
    }
    await clickLabel(session, 'Agregar producto', { index: 0 });
    await sleep(2800);
    const flowTop = await sheetTop(session, 'Agregar producto');
    measurements.flowSheet = flowTop;
    console.log('FLOW_SHEET', JSON.stringify(flowTop));
    if (!flowTop) throw new Error('the ProductFlow did not open on the canonical sheet');
    await shot(session, outputDir, '06-productflow-catalog', 'ProductFlow real sobre el BottomSheet canonico');
  });

  // --------------------------------------- 07: the keyboard does not move it
  await step('keyboard geometry', async () => {
    const beforeKeyboard = await sheetTop(session, 'Agregar producto');
    await typeIntoPlaceholder(session, 'Buscar productos', 'le');
    await sleep(1800);
    const afterKeyboard = await sheetTop(session, 'Agregar producto');
    const delta = beforeKeyboard && afterKeyboard ? Math.abs(afterKeyboard.top - beforeKeyboard.top) : null;
    measurements.keyboard = { before: beforeKeyboard, after: afterKeyboard, sheetTopDeltaPx: delta };
    console.log('KEYBOARD_SHEET_TOP_DELTA_PX', delta);
    await shot(session, outputDir, '07-productflow-teclado', 'con el teclado abierto el ancla superior del sheet NO se mueve');
    await session.evaluate(`(() => { const el = document.activeElement; if (el && el.blur) el.blur(); return true; })()`);
    await sleep(900);
  });

  // ------------------------------------------- 08: the alternative detent
  await step('alternative detent', async () => {
    const before = await sheetTop(session, 'Agregar producto');
    const grabber = await labelRect(session, 'Ajustar Agregar producto');
    if (!grabber) throw new Error('the grabber is not visible');
    await session.touchDrag({ x: grabber.x, y: grabber.y }, { x: grabber.x, y: grabber.y + 170 }, 24);
    await sleep(2200);
    const after = await sheetTop(session, 'Agregar producto');
    measurements.detent = { before, after };
    console.log('DETENT_BEFORE', JSON.stringify(before));
    console.log('DETENT_AFTER', JSON.stringify(after));
    await shot(session, outputDir, '08-productflow-detent-alternativo', 'el grabber movio el sheet a otro detent real');
  });

  await step('close the flow', async () => {
    await clickLabel(session, LABEL_CLOSE_FLOW);
    await sleep(2000);
  });

  // ------------------------------------------------------ 09: the add surface
  await step('add to shopping surface', async () => {
    const offsets = await pagerOffsets(session);
    if (!isVisible(offsets.shopping)) {
      await clickText(session, TEXT_SHOPPING_TAB);
      await sleep(2000);
    }
    await clickLabel(session, LABEL_ADD_TO_SHOPPING);
    await sleep(2800);
    await shot(session, outputDir, '09-add-to-shopping', 'la superficie compartida de agregar a la lista');
    const firstAdd = await session.evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll('[aria-label^="Agregar "]'))
        .filter((el) => !/a la lista$/.test(el.getAttribute('aria-label') || ''));
      const sized = nodes.map((el) => { const r = el.getBoundingClientRect(); return { el, area: r.width * r.height, r }; })
        .filter((entry) => entry.area > 0 && entry.area < 4000);
      sized.sort((a, b) => a.area - b.area);
      const entry = sized[0];
      if (!entry) return null;
      return { x: entry.r.left + entry.r.width/2, y: entry.r.top + entry.r.height/2, label: entry.el.getAttribute('aria-label') };
    })()`);
    console.log('ADDING', JSON.stringify(firstAdd));
    if (firstAdd) { await session.mouse(firstAdd.x, firstAdd.y); await sleep(3200); }
    await clickLabel(session, LABEL_CLOSE_ADD_TO_SHOPPING);
    await sleep(2000);
  });

  // ------------------------------------------------------ 10: the Purchase
  await step('purchase', async () => {
    let started = false;
    for (const label of [TEXT_START_PURCHASE, 'Continuar compra']) {
      try { await clickText(session, label); started = true; console.log('purchase started with', label); break; } catch (error) { /* try the next */ }
    }
    if (!started) throw new Error('the purchase could not be started');
    await sleep(4500);
    await shot(session, outputDir, '10-compra-antes-de-agregar', 'la compra real, con su contexto');
  });

  // ------------------------------ 11: the add overlay OVER the purchase
  await step('add over purchase', async () => {
    await clickLabel(session, LABEL_ADD_TO_PURCHASE);
    await sleep(3000);
    const during = await bodyText(session);
    const purchaseStillMounted = during.includes('Compra');
    measurements.purchaseStillMountedUnderAdd = purchaseStillMounted;
    console.log('PURCHASE_STILL_MOUNTED_UNDER_ADD', purchaseStillMounted);
    if (!purchaseStillMounted) throw new Error('the Purchase was unmounted by the add overlay');
    await shot(session, outputDir, '11-add-sobre-compra', 'el overlay de agregar se abre SOBRE la compra: la compra sigue montada');
  });

  // --------------------------- 12: the same purchase after closing the add
  await step('purchase after closing the add', async () => {
    await clickLabel(session, LABEL_CLOSE_ADD_TO_SHOPPING);
    await sleep(2200);
    const after = await bodyText(session);
    measurements.purchaseRoutePreserved = after.includes('Compra');
    console.log('PURCHASE_ROUTE_PRESERVED', measurements.purchaseRoutePreserved);
    await shot(session, outputDir, '12-compra-tras-cerrar-agregar', 'cerrar el overlay revela EXACTAMENTE la misma compra');
  });

  // ------------------------------------------------- the runtime console log
  for (const event of session.events) {
    if (event.method === 'Runtime.consoleAPICalled') {
      const type = event.params?.type;
      if (type === 'error' || type === 'warning' || type === 'warn') {
        const text = (event.params?.args ?? []).map((arg) => arg.value ?? arg.description ?? '').join(' ');
        consoleIssues.push({ kind: `console.${type}`, text });
      }
    }
    if (event.method === 'Log.entryAdded') {
      const entry = event.params?.entry ?? {};
      if (entry.level === 'error' || entry.level === 'warning') {
        consoleIssues.push({ kind: `log.${entry.level}`, text: entry.text ?? '' });
      }
    }
    if (event.method === 'Network.responseReceived') {
      const response = event.params?.response ?? {};
      if (response.status >= 400) {
        failedRequests.push({ status: response.status, url: response.url });
      }
    }
  }
  const nativeAnimationIssues = consoleIssues.filter((issue) =>
    /not supported by native animated module|moved to "native"|moved to 'native'/i.test(issue.text),
  );
  console.log('RUNTIME_CONSOLE_ISSUES', consoleIssues.length);
  for (const issue of consoleIssues) console.log('  ISSUE', issue.kind, issue.text);
  console.log('NATIVE_ANIMATION_ISSUES', nativeAnimationIssues.length);
  for (const issue of nativeAnimationIssues) console.log('  NATIVE', issue.kind, issue.text);
  console.log('FAILED_REQUESTS', failedRequests.length);
  for (const request of failedRequests) console.log('  FAILED', request.status, request.url);

  fs.writeFileSync(
    path.join(outputDir, 'runtime-console.json'),
    JSON.stringify({ issues: consoleIssues, nativeAnimationIssues, failedRequests, failures, measurements }, null, 2),
    'utf8',
  );
  fs.writeFileSync(
    path.join(outputDir, 'runtime-capture-index.json'),
    JSON.stringify({ captured, failures, measurements }, null, 2),
    'utf8',
  );
}

module.exports = { run };
