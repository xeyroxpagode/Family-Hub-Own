/**
 * HomeCloud Files - Stage 2 Slice C Expo-Go correction - LOCAL PDF VIEWER HTML.
 *
 * Builds the COMPLETE, self-contained viewer page that runs inside the
 * `react-native-webview`: the pinned local pdf.js engine inlined, plus a small
 * HomePlus-owned runtime. Pure builder: no React, no filesystem, no network -
 * the suite asserts its static properties without a device.
 *
 * WHAT THIS IS NOT. It is not the stock PDF.js viewer. There is no toolbar, no
 * sidebar, no open-file control, no branding, no `viewer.html` from pdf.js. The
 * engine is used as a RENDERING LIBRARY (`pdfjsLib.getDocument` + per-page
 * canvas paint); every pixel of chrome is HomePlus.
 *
 * OFFLINE BY CONSTRUCTION. The page references no URL at all: no <script src>,
 * no <link>, no fetch, no XHR, no font/CMap URL configured on the engine. The
 * `engineSource` interpolated here is the vendored UMD build (see
 * `pdfJsEngine.generated.ts` + `scripts/vendor-pdfjs.cjs`), which is trusted
 * pinned code - never document content.
 *
 * SECURITY NOTES (mirrored in the runtime below):
 * - `isEvalSupported: false` - pdf.js never evals font programs;
 * - worker disabled - no blob-worker / file-origin handshake to get wrong;
 * - `window.open` is neutralized; every link tap becomes an explicit
 *   LINK_PRESSED message so React Native decides the handoff;
 * - document-level clicks are captured and default-prevented;
 * - document bytes arrive ONLY as base64 LOAD_CHUNK payloads under an explicit
 *   INIT session and are decoded with `atob` into a Uint8Array - never
 *   interpreted as code.
 */

export interface PdfViewerPalette {
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly subtle: string;
}

function assertHexColor(name: string, value: string): void {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`buildPdfViewerHtml: palette.${name} must be a #rrggbb color`);
  }
}

/**
 * Builds the viewer page. Throws when the engine does not expose the expected
 * UMD global marker: shipping a viewer without its engine would be a white
 * screen with no honest error, so the failure happens here, loudly, in tests.
 */
export function buildPdfViewerHtml(engineSource: string, palette: PdfViewerPalette): string {
  if (typeof engineSource !== 'string' || engineSource.length < 100 * 1024) {
    throw new Error('buildPdfViewerHtml: engine source is missing or implausibly small');
  }
  if (!engineSource.includes('pdfjsLib')) {
    throw new Error('buildPdfViewerHtml: engine source does not expose the pdfjsLib global');
  }
  assertHexColor('background', palette.background);
  assertHexColor('surface', palette.surface);
  assertHexColor('text', palette.text);
  assertHexColor('subtle', palette.subtle);

  const runtime = PDF_VIEWER_RUNTIME_JS;
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover">' +
    '<title>HomePlus</title><style>' +
    'html,body{margin:0;padding:0;height:100%;background:' + palette.background + ';}' +
    'body{font-family:-apple-system,system-ui,sans-serif;color:' + palette.text + ';overflow:hidden;}' +
    '#hpScroll{position:fixed;inset:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:' + palette.background + ';}' +
    '#hpStage{min-height:100%;display:flex;flex-direction:column;align-items:center;padding:12px 12px 28px;box-sizing:border-box;}' +
    '.hp-page{position:relative;margin:0 auto 12px;background:' + palette.surface + ';border-radius:6px;box-shadow:0 1px 6px rgba(0,0,0,.18);overflow:hidden;}' +
    '.hp-page canvas{display:block;width:100%;height:auto;}' +
    '.hp-links{position:absolute;left:0;top:0;width:100%;height:100%;}' +
    '.hp-links a{position:absolute;display:block;}' +
    '#hpSkeleton{align-self:stretch;display:flex;flex-direction:column;gap:10px;padding:6px 2px;}' +
    '.hp-sk{border-radius:6px;background:linear-gradient(100deg,' + palette.surface + ' 40%,' + palette.subtle + ' 50%,' + palette.surface + ' 60%);background-size:200% 100%;animation:hpShimmer 1.4s linear infinite;min-height:220px;}' +
    '@keyframes hpShimmer{to{background-position:-200% 0;}}' +
    '#hpStatus{padding:10px 4px 2px;font-size:13px;color:' + palette.subtle + ';text-align:center;}' +
    '#hpError{display:none;align-self:stretch;text-align:center;padding:32px 20px;}' +
    '#hpError h1{font-size:17px;margin:0 0 8px;}' +
    '#hpError p{font-size:14px;margin:0;color:' + palette.subtle + ';}' +
    '</style></head><body>' +
    '<div id="hpScroll"><div id="hpStage">' +
    '<div id="hpSkeleton"><div class="hp-sk"></div><div class="hp-sk"></div></div>' +
    '<div id="hpStatus" role="status"></div>' +
    '<div id="hpError"><h1 id="hpErrorTitle"></h1><p id="hpErrorText"></p></div>' +
    '</div></div>' +
    '<script>' + engineSource + '</scr' + 'ipt>' +
    '<script>' + runtime + '</scr' + 'ipt>' +
    '</body></html>'
  );
}

/**
 * The viewer runtime. Static, auditable, and asserted by the suite:
 * - posts READY on boot (before any document);
 * - speaks ONLY the versioned protocol from `homecloudPdfBridge.ts`;
 * - makes NO network request (no fetch/XHR/WebSocket/import/getReader-of-URL);
 * - renders lazily (visible pages + neighbours), fit-to-width, DPR-aware with a
 *   hard cap, releases far canvases, re-renders crisply on double-tap zoom and
 *   on container-width changes;
 * - maps engine failures to password/corrupt/unsupported codes, never leaks an
 *   exception string to the UI.
 *
 * Written WITHOUT template literals and WITHOUT the byte sequence `</script`
 * (the closing tags above are split for exactly that reason), so this constant
 * can be interpolated safely into the page.
 */
const PDF_VIEWER_RUNTIME_JS = String.raw`
(function () {
  'use strict';
  var PROTOCOL_V = 1;
  var MAX_CHUNK_CHARS = 512 * 1024;
  var RENDER_DPR_CAP = 2;
  var LOOKAHEAD_PAGES = 1;
  var RELEASE_DISTANCE = 2;

  var scrollEl = document.getElementById('hpScroll');
  var stageEl = document.getElementById('hpStage');
  var skeletonEl = document.getElementById('hpSkeleton');
  var statusEl = document.getElementById('hpStatus');
  var errorEl = document.getElementById('hpError');
  var errorTitleEl = document.getElementById('hpErrorTitle');
  var errorTextEl = document.getElementById('hpErrorText');

  var session = null;
  var pdfDoc = null;
  var pageViews = [];
  var observer = null;
  var zoomed = false;
  var lastTapAt = 0;
  var currentPage = 1;

  function post(message) {
    message.v = PROTOCOL_V;
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(text);
    }
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function showError() {
    if (skeletonEl) skeletonEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
    setStatus('');
  }

  function engineFailureCode(error) {
    var name = error && error.name ? String(error.name) : '';
    if (name === 'PasswordException') return 'password';
    if (name === 'InvalidPDFException' || name === 'MissingPDFException') return 'corrupt';
    return 'unsupported';
  }

  function validDocId(value) {
    return typeof value === 'string' && value.length >= 1 && value.length <= 128;
  }

  function onCommand(raw) {
    var msg = null;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!msg || msg.v !== PROTOCOL_V || !validDocId(msg.docId)) return;
    if (msg.type === 'DISPOSE') {
      if (session && session.docId === msg.docId) disposeSession();
      return;
    }
    if (msg.type === 'INIT_DOCUMENT') {
      if (!Number.isInteger(msg.totalChunks) || msg.totalChunks < 1 || msg.totalChunks > 4096) return;
      if (!Number.isInteger(msg.byteLength) || msg.byteLength < 1) return;
      disposeSession();
      session = { docId: msg.docId, byteLength: msg.byteLength, totalChunks: msg.totalChunks, parts: new Array(msg.totalChunks), received: 0 };
      setStatus('');
      return;
    }
    if (msg.type === 'LOAD_CHUNK') {
      if (!session || msg.docId !== session.docId) return;
      if (!Number.isInteger(msg.index) || msg.index < 0 || msg.index >= session.totalChunks) return;
      if (typeof msg.data !== 'string' || msg.data.length > MAX_CHUNK_CHARS) return;
      if (session.parts[msg.index] !== undefined) return;
      session.parts[msg.index] = msg.data;
      session.received += 1;
      if (session.received === session.totalChunks) openSessionDocument(session);
      return;
    }
  }

  function listen(target, name) {
    if (target && target.addEventListener) target.addEventListener(name, function (event) {
      onCommand(event.data);
    });
  }
  listen(document, 'message');
  listen(window, 'message');

  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor) {
      event.preventDefault();
      return;
    }
    var href = anchor.getAttribute('href') || '';
    if (href.charAt(0) === '#') return;
    event.preventDefault();
    var lower = href.toLowerCase();
    if (lower.indexOf('http://') !== 0 && lower.indexOf('https://') !== 0) return;
    if (session) post({ type: 'LINK_PRESSED', docId: session.docId, url: href.slice(0, 8192) });
  }, true);

  window.open = function () { return null; };

  function decodeSessionBytes(parts) {
    var joined = parts.join('');
    var binaryLength = Math.floor((joined.length * 3) / 4);
    var bytes = new Uint8Array(binaryLength);
    var offset = 0;
    var SLICE = 0x8000;
    for (var at = 0; at < joined.length; at += SLICE) {
      var piece = joined.slice(at, at + SLICE);
      var decoded = atob(piece);
      for (var i = 0; i < decoded.length; i += 1) {
        if (offset < bytes.length) {
          bytes[offset] = decoded.charCodeAt(i);
          offset += 1;
        }
      }
    }
    return bytes.subarray(0, offset);
  }

  function openSessionDocument(active) {
    var bytes = null;
    try {
      bytes = decodeSessionBytes(active.parts);
    } catch (e) {
      post({ type: 'LOAD_ERROR', docId: active.docId, code: 'corrupt' });
      return;
    }
    active.parts = [];
    if (bytes.length !== active.byteLength) {
      post({ type: 'LOAD_ERROR', docId: active.docId, code: 'corrupt' });
      return;
    }
    var lib = window.pdfjsLib;
    if (!lib) {
      post({ type: 'LOAD_ERROR', docId: active.docId, code: 'unsupported' });
      return;
    }
    try {
      lib.GlobalWorkerOptions.workerSrc = null;
    } catch (e) {}
    var task = null;
    try {
      task = lib.getDocument({ data: bytes, disableWorker: true, isEvalSupported: false });
    } catch (e) {
      post({ type: 'LOAD_ERROR', docId: active.docId, code: engineFailureCode(e) });
      return;
    }
    bytes = null;
    task.promise.then(function (doc) {
      if (!session || session.docId !== active.docId) {
        try { doc.destroy(); } catch (e) {}
        return;
      }
      pdfDoc = doc;
      buildPageViews(doc, active);
    }, function (error) {
      if (!session || session.docId !== active.docId) return;
      post({ type: 'LOAD_ERROR', docId: active.docId, code: engineFailureCode(error) });
    });
  }

  function fitScale(page) {
    var containerWidth = scrollEl.clientWidth - 24;
    if (!(containerWidth > 0)) containerWidth = 320;
    var base = page.getViewport({ scale: 1 });
    var fit = containerWidth / base.width;
    if (zoomed) fit = fit * 2;
    return fit;
  }

  function renderScale(page) {
    var dpr = 1;
    try {
      dpr = Math.min(window.devicePixelRatio || 1, RENDER_DPR_CAP);
    } catch (e) {}
    return fitScale(page) * dpr;
  }

  function buildPageViews(doc, active) {
    clearStage();
    var count = doc.numPages;
    pageViews = [];
    for (var n = 1; n <= count; n += 1) {
      (function (pageNumber) {
        var holder = document.createElement('div');
        holder.className = 'hp-page';
        holder.setAttribute('data-page', String(pageNumber));
        stageEl.appendChild(holder);
        pageViews.push({ pageNumber: pageNumber, holder: holder, canvas: null, task: null, rendered: false, linksDone: false });
      })(n);
    }
    if (skeletonEl) skeletonEl.style.display = 'none';
    setStatus(count > 1 ? ('1 / ' + count) : '');
    post({ type: 'DOCUMENT_LOADED', docId: active.docId, pages: count });
    startObserving();
    renderNearby(1);
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (pdfDoc) rerenderVisible();
      }, 350);
    });
  }

  function clearStage() {
    stopObserving();
    for (var i = 0; i < pageViews.length; i += 1) {
      cancelView(pageViews[i]);
      if (pageViews[i].holder && pageViews[i].holder.parentNode) {
        pageViews[i].holder.parentNode.removeChild(pageViews[i].holder);
      }
    }
    pageViews = [];
  }

  function cancelView(view) {
    if (view.task) {
      try { view.task.cancel(); } catch (e) {}
      view.task = null;
    }
  }

  function releaseView(view) {
    cancelView(view);
    view.rendered = false;
    view.linksDone = false;
    if (view.canvas && view.canvas.parentNode) {
      view.canvas.parentNode.removeChild(view.canvas);
    }
    view.canvas = null;
  }

  function startObserving() {
    stopObserving();
    if (!('IntersectionObserver' in window)) {
      renderAll();
      return;
    }
    observer = new IntersectionObserver(function (entries) {
      var best = 0;
      var bestRatio = 0;
      for (var i = 0; i < entries.length; i += 1) {
        var target = entries[i].target;
        var num = parseInt(target.getAttribute('data-page') || '0', 10);
        if (entries[i].isIntersecting && entries[i].intersectionRatio > bestRatio) {
          bestRatio = entries[i].intersectionRatio;
          best = num;
        }
      }
      if (best > 0) {
        renderNearby(best);
        if (best !== currentPage) {
          currentPage = best;
          if (session && pdfDoc) {
            setStatus(pdfDoc.numPages > 1 ? (best + ' / ' + pdfDoc.numPages) : '');
            post({ type: 'PAGE_CHANGED', docId: session.docId, page: best, pages: pdfDoc.numPages });
          }
        }
      }
      for (var j = 0; j < entries.length; j += 1) {
        var el = entries[j].target;
        var pageNum = parseInt(el.getAttribute('data-page') || '0', 10);
        if (!entries[j].isIntersecting && Math.abs(pageNum - currentPage) > RELEASE_DISTANCE) {
          var view = pageViews[pageNum - 1];
          if (view && view.rendered) releaseView(view);
        }
      }
    }, { root: scrollEl, threshold: [0, 0.25, 0.5, 0.75, 1] });
    for (var k = 0; k < pageViews.length; k += 1) observer.observe(pageViews[k].holder);
  }

  function stopObserving() {
    if (observer) {
      try { observer.disconnect(); } catch (e) {}
      observer = null;
    }
  }

  function renderNearby(center) {
    if (!pdfDoc) return;
    var from = Math.max(1, center - LOOKAHEAD_PAGES);
    var to = Math.min(pdfDoc.numPages, center + LOOKAHEAD_PAGES);
    for (var n = from; n <= to; n += 1) {
      var view = pageViews[n - 1];
      if (view && !view.rendered && !view.task) renderView(view);
    }
  }

  function renderAll() {
    for (var i = 0; i < pageViews.length; i += 1) {
      if (!pageViews[i].rendered && !pageViews[i].task) renderView(pageViews[i]);
    }
  }

  function rerenderVisible() {
    for (var i = 0; i < pageViews.length; i += 1) {
      var view = pageViews[i];
      if (view.rendered && Math.abs(view.pageNumber - currentPage) <= LOOKAHEAD_PAGES) {
        releaseView(view);
        renderView(view);
      }
    }
  }

  function renderView(view) {
    if (!pdfDoc || !session) return;
    var docId = session.docId;
    pdfDoc.getPage(view.pageNumber).then(function (page) {
      if (!session || session.docId !== docId) return;
      var scale = renderScale(page);
      var viewport = page.getViewport({ scale: scale });
      var cssScale = fitScale(page);
      view.holder.style.width = Math.floor(viewport.width / (window.devicePixelRatio > RENDER_DPR_CAP ? RENDER_DPR_CAP : (window.devicePixelRatio || 1))) + 'px';
      view.holder.style.maxWidth = '100%';
      var canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      view.holder.appendChild(canvas);
      view.canvas = canvas;
      var context = canvas.getContext('2d', { alpha: false });
      var renderTask = page.render({ canvasContext: context, viewport: viewport });
      view.task = renderTask;
      renderTask.promise.then(function () {
        view.task = null;
        view.rendered = true;
        paintLinkOverlay(view, page, cssScale);
      }, function (error) {
        view.task = null;
        if (error && error.name === 'RenderingCancelledException') return;
        if (session && session.docId === docId) {
          post({ type: 'RENDER_ERROR', docId: docId, page: view.pageNumber });
        }
      });
    }, function () {
      if (session && session.docId === docId) {
        post({ type: 'RENDER_ERROR', docId: docId, page: view.pageNumber });
      }
    });
  }

  function paintLinkOverlay(view, page, cssScale) {
    if (view.linksDone) return;
    view.linksDone = true;
    var layer = document.createElement('div');
    layer.className = 'hp-links';
    view.holder.appendChild(layer);
    page.getAnnotations().then(function (annotations) {
      if (!session) return;
      var viewport = page.getViewport({ scale: cssScale });
      for (var i = 0; i < annotations.length; i += 1) {
        (function (annotation) {
          if (!annotation || annotation.subtype !== 'Link' || !annotation.rect) return;
          var rect = viewport.convertToViewportRectangle(annotation.rect);
          var left = Math.min(rect[0], rect[2]);
          var top = Math.min(rect[1], rect[3]);
          var width = Math.abs(rect[0] - rect[2]);
          var height = Math.abs(rect[1] - rect[3]);
          if (width < 2 || height < 2) return;
          var anchor = document.createElement('a');
          anchor.style.left = left + 'px';
          anchor.style.top = top + 'px';
          anchor.style.width = width + 'px';
          anchor.style.height = height + 'px';
          if (annotation.url) {
            anchor.setAttribute('href', String(annotation.url).slice(0, 8192));
          } else if (annotation.dest) {
            anchor.setAttribute('href', '#page-' + view.pageNumber);
            anchor.addEventListener('click', function (event) {
              event.preventDefault();
              resolveInternalDest(annotation.dest);
            });
          } else {
            return;
          }
          layer.appendChild(anchor);
        })(annotations[i]);
      }
    }, function () {});
  }

  function resolveInternalDest(dest) {
    if (!pdfDoc) return;
    var go = function (explicit) {
      if (!explicit || !explicit[0]) return;
      pdfDoc.getPageIndex(explicit[0]).then(function (index) {
        var target = pageViews[index];
        if (target && target.holder.scrollIntoView) {
          target.holder.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, function () {});
    };
    if (typeof dest === 'string') {
      pdfDoc.getDestination(dest).then(go, function () {});
    } else if (dest && dest[0]) {
      go(dest);
    }
  }

  scrollEl.addEventListener('click', function () {
    var now = Date.now();
    if (now - lastTapAt < 350) {
      lastTapAt = 0;
      zoomed = !zoomed;
      rerenderVisible();
    } else {
      lastTapAt = now;
    }
  });

  function disposeSession() {
    stopObserving();
    for (var i = 0; i < pageViews.length; i += 1) cancelView(pageViews[i]);
    if (pdfDoc) {
      try { pdfDoc.destroy(); } catch (e) {}
      pdfDoc = null;
    }
    pageViews = [];
    session = null;
    zoomed = false;
    currentPage = 1;
    while (stageEl.firstChild) stageEl.removeChild(stageEl.firstChild);
    stageEl.appendChild(skeletonEl);
    skeletonEl.style.display = 'flex';
    errorEl.style.display = 'none';
    stageEl.appendChild(statusEl);
    stageEl.appendChild(errorEl);
    setStatus('');
  }

  try {
    if (!window.pdfjsLib) {
      showError();
    } else {
      post({ type: 'READY', docId: 'boot' });
    }
  } catch (e) {}
})();
`;
