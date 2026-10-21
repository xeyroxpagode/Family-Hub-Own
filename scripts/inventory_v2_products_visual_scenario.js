/**
 * Inventory V2 — Block 2 Premium UX Products: visual capture scenario.
 *
 * Captures the Products surfaces of the PREMIUM target at 390x844 against the
 * local Supabase + backend stack.
 */
const path = require('node:path');
const { sleep } = require('./inventory_v2_products_visual_capture');

const APP = 'http://localhost:8081';
const PREVIEW = `${APP}/home/more/inventory-v2-preview`;
const EMAIL = 'donalsmac59@gmail.com';
const PASSWORD = 'Demo123456!';

const captured = [];

async function shot(session, outputDir, name, note) {
  const file = path.join(outputDir, `${name}.png`);
  await session.screenshot(file);
  captured.push({ name, note });
  console.log('captured', name, note ? `- ${note}` : '');
}

async function bodyText(session) {
  return session.evaluate(`(() => (document.body && document.body.innerText || '').replace(/\\s+/g,' '))()`);
}

async function labelRect(session, needle, { index = 0 } = {}) {
  return session.evaluate(`(() => {
    const nodes = Array.from(document.querySelectorAll('[aria-label]')).filter((el) => (el.getAttribute('aria-label')||'').includes(${JSON.stringify(needle)}));
    const el = nodes[${index}];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left + r.width/2, y: r.top + r.height/2, left: r.left, top: r.top, w: r.width, h: r.height };
  })()`);
}

async function clickLabel(session, needle, { index = 0, exact = false, timeout = 12000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const rect = await session.labelRectInView(session, needle, { index, exact });
    if (rect) { await session.mouse(rect.x, rect.y); await sleep(1100); return rect; }
    await sleep(500);
  }
  throw new Error(`label not found: ${needle}`);
}

async function clickText(session, text, { timeout = 10000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const rect = await session.textRect(session, text);
    if (rect) { await session.mouse(rect.x, rect.y); await sleep(1100); return rect; }
    await sleep(450);
  }
  throw new Error(`text not found: ${text}`);
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

async function step(name, fn) {
  try {
    await fn();
  } catch (error) {
    console.log(`STEP FAILED [${name}]:`, error.message);
  }
}

async function gotoRoot(session) {
  await session.goto(PREVIEW, { waitMs: 12000 });
  await sleep(1500);
}

async function run({ session, outputDir }) {
  // ---------------------------------------------------------------- sign in
  await session.goto(APP, { waitMs: 20000 });
  await session.clickByText('Entrar a mi hogar');
  await sleep(1500);
  await session.typeInto(0, EMAIL);
  await session.typeInto(1, PASSWORD);
  const submit = await session.evaluate(`(() => {
    const nodes = Array.from(document.querySelectorAll('button,[role="button"],div'));
    const el = nodes.find((node) => (node.textContent||'').trim() === 'Iniciar sesión');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  })()`);
  if (submit) await session.mouse(submit.x, submit.y);
  await sleep(7000);
  try { await session.clickByText('Continuar con la experiencia estándar'); await sleep(3000); } catch (error) { console.log('resolver skipped'); }

  // ------------------------------------------------------- products root
  await gotoRoot(session);
  await step('root', async () => {
    await shot(session, outputDir, '01-productos_root_poblado', 'KEEP+CHANGE: canvas plano, Lugares vertical, chrome por resolver');
  });
  await step('root search', async () => {
    await typeIntoPlaceholder(session, 'Buscar productos', 'leche');
    await shot(session, outputDir, '03_root_busqueda_activa', 'KEEP: SearchField canónico, sin autofocus');
  });

  // ------------------------------------------------------------ all products
  await gotoRoot(session);
  await step('all products', async () => {
    await clickLabel(session, 'Todos los productos');
    await sleep(1500);
    await shot(session, outputDir, '04_todos_los_productos', 'KEEP: canvas, densidad y status inline');
  });
  await step('filter agotados', async () => {
    await clickLabel(session, 'Agotados');
    await sleep(1600);
    await shot(session, outputDir, '05_filtro_agotados', 'CHANGE: chip seleccionado + scroll mínimo');
    await clickLabel(session, 'Agotados');
    await sleep(1200);
  });
  await step('long row', async () => {
    await typeIntoPlaceholder(session, 'Buscar en', 'Detergente');
    await sleep(1200);
    await shot(session, outputDir, '06_fila_larga', 'KEEP: nombre truncado, slot de cantidad estable');
  });
  await step('swipe', async () => {
    const rect = await session.labelRectInView(session, 'Detergente líquido');
    if (!rect) throw new Error('row not visible');
    await session.touchDrag({ x: rect.left + 240, y: rect.y }, { x: rect.left + 60, y: rect.y });
    await sleep(1500);
    await shot(session, outputDir, '07_swipe_acciones', 'CHANGE: dos acciones [Lista] [Más]');
  });
  await step('context menu', async () => {
    await clickLabel(session, 'Más', { exact: true });
    await sleep(1600);
    await shot(session, outputDir, '08_menu_contextual', 'CHANGE: popover canónico con acciones por capability');
    await session.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await sleep(900);
  });

  // ---------------------------------------------------------- product editor
  await gotoRoot(session);
  await clickLabel(session, 'Todos los productos');
  await sleep(1500);
  await step('editor', async () => {
    await clickLabel(session, 'Leche entera');
    await sleep(2400);
    await shot(session, outputDir, '12_product_editor', 'CHANGE: Flow sheet premium, una sola hoja');
  });
  await step('more options', async () => {
    await clickText(session, 'Más opciones');
    await sleep(1600);
    await shot(session, outputDir, '13_editor_mas_opciones', 'CHANGE: accordion alto+opacidad 170ms');
    await clickText(session, 'Más opciones');
    await sleep(1000);
  });
  await step('location picker', async () => {
    await clickLabel(session, 'Lugar');
    await sleep(1600);
    await shot(session, outputDir, '14_picker_lugar', 'CHANGE: página interna del flow');
    await clickText(session, 'Cocina');
    await sleep(1600);
  });
  await step('category picker', async () => {
    await clickText(session, 'Más opciones');
    await sleep(1300);
    await clickText(session, 'Categoría');
    await sleep(1600);
    await shot(session, outputDir, '15_picker_categoria', 'CHANGE: página interna del flow');
    await clickText(session, 'Limpieza');
    await sleep(1600);
  });
  await step('dirty guard', async () => {
    await typeIntoPlaceholder(session, 'Nombre', 'X');
    await clickLabel(session, 'Cerrar Editar producto', { index: 1 });
    await sleep(1700);
    await shot(session, outputDir, '18_dirty_guard', 'CHANGE: copy concreto, snap back del sheet');
  });

  // ----------------------------------------------------------- add product
  await gotoRoot(session);
  await step('add product', async () => {
    await clickLabel(session, 'Agregar producto');
    await sleep(3500);
    await shot(session, outputDir, '09_add_product_inicial', 'CHANGE: Flow sheet SIN autofocus');
    await typeIntoPlaceholder(session, 'Buscar productos', 'leche');
    await shot(session, outputDir, '10_catalogo_busqueda', 'KEEP: SearchField canónico');
    await typeIntoPlaceholder(session, 'Buscar productos', 'zzzqqq');
    await shot(session, outputDir, '11_catalogo_sin_resultados', 'CHANGE: copy No encontramos + crear prefilled');
  });
  await step('create location', async () => {
    await gotoRoot(session);
    await clickLabel(session, 'Agregar producto');
    await sleep(3500);
    await clickLabel(session, 'Agregar Aceite');
    await sleep(2200);
    await clickLabel(session, 'Lugar');
    await sleep(1800);
    await clickText(session, '+ Crear lugar');
    await sleep(1800);
    await shot(session, outputDir, '16_crear_lugar', 'CHANGE: form único como página interna');
    await clickLabel(session, 'Elegir icono, ');
    await sleep(1800);
    await shot(session, outputDir, '17_icon_picker', 'CHANGE: icon picker como página interna única');
  });

  // -------------------------------------------------------- locations manager
  await gotoRoot(session);
  await step('locations manager', async () => {
    await clickLabel(session, 'Ver lugares');
    await sleep(2000);
    await shot(session, outputDir, '22_lugares_manager', 'KEEP: rows compactas, sin cards');
  });
  await step('locations reorder', async () => {
    await clickLabel(session, 'Ordenar');
    await sleep(1800);
    await shot(session, outputDir, '23_lugares_reordenar', 'CHANGE: drag único, sin flechas');
    await clickLabel(session, 'Cancelar');
    await sleep(1400);
  });
  await step('location detail', async () => {
    await clickText(session, 'Cocina');
    await sleep(2200);
    await shot(session, outputDir, '24_lugar_detalle', 'KEEP: mismo sistema de contenido que All Products');
  });
  await step('location empty', async () => {
    await gotoRoot(session);
    await clickLabel(session, 'Ver lugares');
    await sleep(2000);
    await clickLabel(session, 'Garaje');
    await sleep(2200);
    await shot(session, outputDir, '25_lugar_detalle_vacio', 'CHANGE: copy + 2 CTAs válidos');
  });

  // ------------------------------------------------------------ archived/trash
  await gotoRoot(session);
  await step('archived', async () => {
    await clickLabel(session, 'Archivados');
    await sleep(2200);
    await shot(session, outputDir, '26_archivados', 'KEEP: mismo sistema de contenido');
  });
  await gotoRoot(session);
  await step('trash', async () => {
    await clickLabel(session, 'Papelera');
    await sleep(2200);
    await shot(session, outputDir, '27_papelera', 'KEEP: mismo sistema de contenido');
  });
  await step('permanent delete confirm', async () => {
    const rect = await session.labelRectInView(session, 'Vaporera');
    if (rect) {
      await session.touchDrag({ x: rect.left + 240, y: rect.y }, { x: rect.left + 60, y: rect.y });
      await sleep(1800);
      await clickLabel(session, 'Más', { exact: true });
      await sleep(1800);
      await shot(session, outputDir, '28a_papelera_menu', 'CHANGE: acciones por lifecycle + destroy');
      await session.evaluate(`(() => { const nodes = Array.from(document.querySelectorAll('div,span,button,a')); const el = nodes.find((n) => (n.textContent||'').trim() === 'Eliminar definitivamente'); if (el) { const r = el.getBoundingClientRect(); window.__hpTarget = { x: r.left + r.width/2, y: r.top + r.height/2 }; } return !!el; })()`).then(async (found) => {
        if (!found) return;
        const target = await session.evaluate(`(() => window.__hpTarget || null)()`);
        if (target) { await session.mouse(target.x, target.y); await sleep(1800); }
      });
      await shot(session, outputDir, '28_eliminar_confirm', 'CHANGE: Confirm obligatorio');
    }
  });

  // -------------------------------------------------------------- selection
  await gotoRoot(session);
  await clickLabel(session, 'Todos los productos');
  await sleep(1500);
  await step('selection', async () => {
    const rect = await session.labelRectInView(session, 'Arroz 1 kg');
    if (!rect) throw new Error('row not visible');
    await session.longPressTouch(rect.x, rect.y, 1000);
    await sleep(1800);
    await shot(session, outputDir, '29_seleccion', 'CHANGE: header morph, checkbox, sin barra extra');
  });
  await step('batch move', async () => {
    await clickLabel(session, 'Mover');
    await sleep(1800);
    await shot(session, outputDir, '31_batch_mover', 'CHANGE: Standard BottomSheet');
  });

  // ----------------------------------------------------------------- offline
  await gotoRoot(session);
  await step('offline', async () => {
    await session.offline(true);
    await sleep(6000);
    await shot(session, outputDir, '32_offline', 'CHANGE: Sin conexión / Mostrando datos guardados.');
    await session.offline(false);
    await sleep(2500);
  });
  await step('stale', async () => {
    await session.blockApi(true);
    await session.goto(PREVIEW, { waitMs: 12000 });
    await sleep(4000);
    await shot(session, outputDir, '33_stale', 'CHANGE: No pudimos actualizar / Mostrando datos anteriores.');
    await session.blockApi(false);
  });

  console.log('captured list:', JSON.stringify(captured.map((item) => item.name)));
}

module.exports = { run };
