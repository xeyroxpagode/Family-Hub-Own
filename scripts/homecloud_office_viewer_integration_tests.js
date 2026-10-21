'use strict';

/**
 * HomeCloud Office Viewer V1 — OFFICE-3, integración REAL contra el stack
 * local (LOCAL_RUNTIME_REQUIRED, self-skips cuando el stack está ausente).
 *
 * Qué demuestra este script, con el backend y el Document Server REALES:
 *
 *   I-A  preflight: DocServer healthcheck + backend /health.
 *   I-B  identidad QA: dos households aislados + usuarios coordinator.
 *   I-C  fixtures OOXML GENUINOS construidos in-line (docx/xlsx/pptx con
 *        contenido real: párrafos, tabla, 3 hojas con fórmulas, 3 slides
 *        con formas) y binarios legacy GENUINOS (DOC/XLS/PPT) desde
 *        tests/fixtures/office/ — nunca renombrados:
 *          .doc: Word97 mínimo fabricado byte a byte según MS-DOC
 *                (OLE2 + FIB nFib=193 + STSH + FFN + FKPs + Clx),
 *                validado por el motor real (doc->pdf con salida %PDF);
 *          .xls: creado con Apache POI 5.3.0 HSSF (BIFF8 real, 3 hojas,
 *                formatos, fórmulas), validado por el motor real;
 *          .ppt: creado con Apache POI 5.3.0 HSLF (3 slides, texto,
 *                formas), validado por el motor real.
 *        Cada fixture legacy se verifica por magic OLE2 al cargarlo.
 *   I-D  sesión autorizada real por formato (201 + contrato firmado).
 *   I-E  procesamiento REAL: el Document Server descarga el documento por
 *        la URL de sesión del backend (server-to-server desde el
 *        contenedor) y lo procesa con el motor real (conversión verificada
 *        por magic bytes). La conversión usa la MISMA URL de descarga que
 *        usa el visor embebido: si el contenedor no puede alcanzar el
 *        backend o el token no sirve, falla aquí.
 *   I-F  matriz de seguridad: token inválido, sesión revocada, household
 *        ajeno (404 idéntico), sin bearer (401), corrupto (fallo honesto
 *        del motor), tamaño (413), formato no-V1 (400), integridad del
 *        original (sha256 byte-exacto antes/después) e higiene de logs
 *        (ningún download token en el access log del backend).
 *
 * Variables de entorno (ver tests/run.js RUNTIME_ENVIRONMENT):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 *   ONLYOFFICE_JWT_SECRET,
 *   OFFICE_INTEGRATION_BACKEND_URL (default http://127.0.0.1:3001),
 *   ONLYOFFICE_DOCSERVER_URL (default http://127.0.0.1:8180),
 *   OFFICE_INTEGRATION_INTERNAL_API_URL (base interna del backend que el
 *     backend usa para construir document.url; se verifica que la URL de
 *     descarga apunte al BACKEND y no al propio DocServer),
 *   OFFICE_INTEGRATION_BACKEND_LOG (opcional: log stdout del backend para
 *     la prueba de higiene).
 *
 * Sin logs de tokens, URLs firmadas ni secretos: solo etiquetas y códigos.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

/* El servicio del backend ya se configuró con las variables requeridas por
 * el runner; se reutilizan su firmador y verificador HS256 (prueba extra:
 * la config que viaja al DocServer está firmada con el MISMO código de
 * producción). */
const {
  SESSION_TTL_MS,
  signOfficeJwt,
  verifyOfficeJwt,
} = require('../backend/src/services/homecloudOfficeViewerService');

const BACKEND_URL = (process.env.OFFICE_INTEGRATION_BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const DOCSERVER_URL = (process.env.ONLYOFFICE_DOCSERVER_URL || 'http://127.0.0.1:8180').replace(/\/+$/, '');
const INTERNAL_API_URL = (process.env.OFFICE_INTEGRATION_INTERNAL_API_URL || '').replace(/\/+$/, '');
const BACKEND_LOG = process.env.OFFICE_INTEGRATION_BACKEND_LOG || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET || '';

const QA_EMAIL_A = 'office3-qa-a@homeplus.test';
const QA_EMAIL_B = 'office3-qa-b@homeplus.test';
const QA_PASSWORD = 'Office3-QA-local-2026!x';
const QA_SLUG_A = 'office3-qa-hogar-a';
const QA_SLUG_B = 'office3-qa-hogar-b';
const BUCKET = 'homecloud-originals';

const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const PDF_MAGIC = Buffer.from('%PDF');

let passCount = 0;
let failCount = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${name}`);
  } else {
    failCount += 1;
    failures.push(name);
    console.error(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function skip(reason) {
  console.log(`OFFICE VIEWER INTEGRATION: SKIPPED (LOCAL_RUNTIME_REQUIRED) — ${reason}`);
  process.exit(0);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonOf(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Supabase REST (service role): PostgREST + GoTrue admin + Storage.    */
/* ------------------------------------------------------------------ */

function serviceHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

async function restRequest(method, table, { query = '', body, prefer } = {}) {
  const headers = serviceHeaders({ 'Content-Type': 'application/json' });
  if (prefer) headers.Prefer = prefer;
  const response = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await jsonOf(response) };
}

async function restList(table, query) {
  const result = await restRequest('GET', table, { query });
  return Array.isArray(result.data) ? result.data : [];
}

async function restInsertOne(table, payload) {
  const result = await restRequest('POST', table, {
    body: payload,
    prefer: 'return=representation',
    query: '?select=*',
  });
  return Array.isArray(result.data) && result.data[0] ? result.data[0] : null;
}

async function storageUpload(path, bytes, contentType) {
  const response = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: serviceHeaders({
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true',
    }),
    body: bytes,
  });
  return response.ok;
}

async function storageSignedRead(path) {
  const signResponse = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn: 120 }),
  });
  const signed = await jsonOf(signResponse);
  if (!signResponse.ok || !signed?.signedURL) return null;
  const response = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1${signed.signedURL}`);
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

async function storageDeletePrefixes(prefixes) {
  if (prefixes.length === 0) return true;
  const response = await fetchWithTimeout(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes }),
  });
  return response.ok;
}

async function authAdminListUsers() {
  const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: serviceHeaders(),
  });
  const data = await jsonOf(response);
  return Array.isArray(data?.users) ? data.users : [];
}

async function authAdminCreateUser(email) {
  const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serviceHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password: QA_PASSWORD, email_confirm: true }),
  });
  const data = await jsonOf(response);
  return response.ok && data?.id ? data : null;
}

async function authAdminDeleteUser(userId) {
  const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: serviceHeaders(),
  });
  return response.ok;
}

async function authSignIn(email) {
  // GoTrue v2: el grant_type viaja en la query string, no en el body.
  const response = await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: QA_PASSWORD }),
  });
  const data = await jsonOf(response);
  return response.ok && data?.access_token ? data.access_token : null;
}

/* ------------------------------------------------------------------ */
/* Backend API (la única vía que usa el producto).                      */
/* ------------------------------------------------------------------ */

async function createSession(accessToken, contentId) {
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/homecloud/content/${contentId}/office-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  return { status: response.status, body: await jsonOf(response) };
}

async function revokeSession(accessToken, sessionId) {
  const response = await fetchWithTimeout(`${BACKEND_URL}/api/homecloud/office-session/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.status;
}

async function fetchDocumentUrl(url) {
  const response = await fetchWithTimeout(url, {}, 60000);
  const buffer = response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  return { status: response.status, buffer };
}

/**
 * El proceso de QA corre en el HOST, donde `host.docker.internal` no
 * resuelve: para las descargas DIRECTAS del propio script se reescribe el
 * host a 127.0.0.1 (mismo backend, mismo puerto, mismo path, mismo token).
 * La URL ORIGINAL (con host.docker.internal) es la que viaja firmada al
 * DocServer y la que usa ConvertService desde el contenedor.
 */
function localDownloadUrl(url) {
  return String(url).replace('://host.docker.internal:', '://127.0.0.1:');
}

/* ------------------------------------------------------------------ */
/* ConvertService del DocServer: procesamiento REAL con JWT HS256.      */
/* ------------------------------------------------------------------ */

async function convertWithDocumentServer({ url, filetype, outputtype, title }) {
  const key = crypto.randomUUID();
  const body = { async: false, filetype, outputtype, title, key, url };
  const token = signOfficeJwt(body, JWT_SECRET);
  const response = await fetchWithTimeout(`${DOCSERVER_URL}/ConvertService.ashx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      AuthorizationJwt: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...body, token }),
  }, 240000);
  const data = await jsonOf(response);
  if (!response.ok) return { ok: false, error: `http_${response.status}`, data };
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalid_response', data: null };
  if (typeof data.error === 'number' || typeof data.error === 'string') {
    return { ok: false, error: `convert_error_${data.error}`, data };
  }
  if (data.endConvert !== true || typeof data.fileUrl !== 'string') {
    return { ok: false, error: 'not_finished', data };
  }
  // El fileUrl puede venir con el host interno del contenedor; si no es
  // alcanzable desde el host, se reescribe con la base pública del
  // DocServer conservando path + query (el contenido es el mismo).
  let fileUrl = data.fileUrl;
  let fileResponse = await fetchWithTimeout(fileUrl, {}, 120000);
  if (!fileResponse.ok) {
    try {
      const parsed = new URL(fileUrl);
      fileUrl = `${DOCSERVER_URL}${parsed.pathname}${parsed.search}`;
      fileResponse = await fetchWithTimeout(fileUrl, {}, 120000);
    } catch {
      /* la URL no es reescribible */
    }
  }
  if (!fileResponse.ok) return { ok: false, error: `output_fetch_${fileResponse.status}`, data };
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  return { ok: true, bytes };
}

/* ------------------------------------------------------------------ */
/* Zip determinista + fixtures OOXML genuinos (contenido real).         */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function zipSync(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // determinista: 2026-01-01
  for (const [name, content] of files) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const raw = Buffer.from(content, 'utf8');
    const data = zlib.deflateRawSync(raw);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(Buffer.concat([central, nameBuffer]));
    offset += local.length + nameBuffer.length + data.length;
  }
  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralBuffer, end]);
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function docxParagraph(text, { bold = false, size = 22, pageBreakBefore = false } = {}) {
  const breakTag = pageBreakBefore ? '<w:r><w:br w:type="page"/></w:r>' : '';
  return `<w:p>${breakTag}<w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function buildDocxFixture() {
  const document = `${XML_HEAD}
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${docxParagraph('Informe de Gastos del Hogar', { bold: true, size: 44 })}
${docxParagraph('Documento de prueba OFFICE-3 — HomeCloud Files V1', { size: 24 })}
${docxParagraph('Este documento evalúa el visor Office integrado con contenido real: párrafos legibles, una tabla con datos y un salto de página.')}
${docxParagraph('Sección 1. El visor embebido debe mostrar el texto con su paginación natural y permitir el desplazamiento vertical sin salir de la aplicación.')}
${docxParagraph('Párrafo de relleno uno. El miembro del hogar abre el archivo directamente desde la lista de archivos y el contenido aparece dentro del visor, en modo solo lectura.')}
${docxParagraph('Párrafo de relleno dos. No hay edición, no hay comentarios ni colaboración: el contrato V1 es de lectura únicamente.')}
${docxParagraph('Párrafo de relleno tres. El original permanece intacto en Storage durante toda la sesión de visualización.')}
${docxParagraph('Párrafo de relleno cuatro. El mismo visor sirve para las tres familias Office V1: word, cell y slide.')}
<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
<w:top w:val="single" w:sz="4" w:color="444444"/><w:left w:val="single" w:sz="4" w:color="444444"/>
<w:bottom w:val="single" w:sz="4" w:color="444444"/><w:right w:val="single" w:sz="4" w:color="444444"/>
<w:insideH w:val="single" w:sz="4" w:color="444444"/><w:insideV w:val="single" w:sz="4" w:color="444444"/>
</w:tblBorders></w:tblPr>
<w:tblGrid><w:gridCol w:w="3200"/><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/></w:tblGrid>
<w:tr><w:tc><w:p>${docxParagraph('Mes', { bold: true })}</w:p></w:tc><w:tc><w:p>${docxParagraph('Gastos', { bold: true })}</w:p></w:tc><w:tc><w:p>${docxParagraph('Presupuesto', { bold: true })}</w:p></w:tc></w:tr>
<w:tr><w:tc><w:p>${docxParagraph('Enero')}</w:p></w:tc><w:tc><w:p>${docxParagraph('185.400')}</w:p></w:tc><w:tc><w:p>${docxParagraph('200.000')}</w:p></w:tc></w:tr>
<w:tr><w:tc><w:p>${docxParagraph('Febrero')}</w:p></w:tc><w:tc><w:p>${docxParagraph('172.900')}</w:p></w:tc><w:tc><w:p>${docxParagraph('200.000')}</w:p></w:tc></w:tr>
<w:tr><w:tc><w:p>${docxParagraph('Marzo')}</w:p></w:tc><w:tc><w:p>${docxParagraph('198.750')}</w:p></w:tc><w:tc><w:p>${docxParagraph('200.000')}</w:p></w:tc></w:tr>
</w:tbl>
${docxParagraph('Sección 2 (segunda página). El salto de página permite verificar la paginación del documento dentro del visor.', { pageBreakBefore: true, bold: true, size: 28 })}
${docxParagraph('La navegación entre páginas usa el scroll del propio visor embebido. Ninguna parte del documento exige salir de la aplicación.')}
${docxParagraph('Cierre del documento de prueba. La integridad del binario original se verifica por hash antes y después de la sesión.')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
</w:body></w:document>`;

  return zipSync([
    ['[Content_Types].xml', `${XML_HEAD}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`],
    ['_rels/.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`],
    ['word/document.xml', document],
  ]);
}

function buildXlsxFixture() {
  const shared = [
    'Informe de gastos del hogar — OFFICE-3',
    'Hoja Resumen', 'Concepto', 'Monto', 'Alquiler', 'Supermercado', 'Transporte', 'Total',
    'Hoja Detalle', 'Fecha', 'Descripción', 'Importe', 'Promedio',
    'Hoja Fórmulas', 'Cálculo', 'Resultado',
  ];
  const si = (i) => `<si><t>${shared[i]}</t></si>`;
  const cellStr = (ref, i) => `<c r="${ref}" t="s"><v>${i}</v></c>`;
  const cellNum = (ref, v, s) => `<c r="${ref}"${s !== undefined ? ` s="${s}"` : ''}><v>${v}</v></c>`;
  const cellFormula = (ref, f, v) => `<c r="${ref}"><f>${f}</f><v>${v}</v></c>`;

  const sheet1 = `${XML_HEAD}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1">${cellStr('A1', 0)}</row>
<row r="3">${cellStr('A3', 2)}${cellStr('B3', 3)}</row>
<row r="4">${cellStr('A4', 4)}${cellNum('B4', 350000, 2)}</row>
<row r="5">${cellStr('A5', 5)}${cellNum('B5', 120500, 2)}</row>
<row r="6">${cellStr('A6', 6)}${cellNum('B6', 45200, 2)}</row>
<row r="8">${cellStr('A8', 7)}${cellFormula('B8', 'SUM(B4:B6)', 515700)}</row>
</sheetData></worksheet>`;

  const sheet2 = `${XML_HEAD}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1">${cellStr('A1', 8)}</row>
<row r="2">${cellStr('A2', 9)}${cellStr('B2', 10)}${cellStr('C2', 11)}</row>
<row r="3">${cellNum('A3', 1)}${cellStr('B3', 4)}${cellNum('C3', 350000, 2)}</row>
<row r="4">${cellNum('A4', 2)}${cellStr('B4', 5)}${cellNum('C4', 120500, 2)}</row>
<row r="5">${cellNum('A5', 3)}${cellStr('B5', 6)}${cellNum('C5', 45200, 2)}</row>
<row r="7">${cellStr('A7', 12)}${cellFormula('B7', 'AVERAGE(C3:C5)', 171900)}</row>
</sheetData></worksheet>`;

  const sheet3 = `${XML_HEAD}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
<row r="1">${cellStr('A1', 13)}${cellStr('B1', 14)}</row>
<row r="2">${cellNum('A2', 12)}${cellFormula('B2', 'SUM(1,2,3,4,5)', 15)}</row>
<row r="3">${cellNum('A3', 5)}${cellFormula('B3', 'A2*2', 24)}</row>
<row r="4">${cellNum('A4', 3.5)}${cellFormula('B4', 'A4*100', 350)}</row>
<row r="5">${cellNum('A5', 8)}${cellFormula('B5', 'B3+B4', 374)}</row>
</sheetData></worksheet>`;

  return zipSync([
    ['[Content_Types].xml', `${XML_HEAD}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`],
    ['_rels/.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`],
    ['xl/workbook.xml', `${XML_HEAD}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Resumen" sheetId="1" r:id="rId1"/>
<sheet name="Detalle" sheetId="2" r:id="rId2"/>
<sheet name="Formulas" sheetId="3" r:id="rId3"/>
</sheets>
</workbook>`],
    ['xl/_rels/workbook.xml.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`],
    ['xl/worksheets/sheet1.xml', sheet1],
    ['xl/worksheets/sheet2.xml', sheet2],
    ['xl/worksheets/sheet3.xml', sheet3],
    ['xl/sharedStrings.xml', `${XML_HEAD}
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">${shared.map((_, i) => si(i)).join('')}</sst>`],
    ['xl/styles.xml', `${XML_HEAD}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>`],
  ]);
}

function pptxShape(id, name, x, y, cx, cy, text, { fontSize = 1800, fill = null, bold = false } = {}) {
  const fillXml = fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fillXml}</p:spPr>
<p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>
<a:p><a:r><a:rPr lang="es-AR" sz="${fontSize}"${bold ? ' b="1"' : ''}/><a:t>${text}</a:t></a:r></a:p>
</p:txBody></p:sp>`;
}

function pptxSlide(title, body, extraShape) {
  const shapes = [
    pptxShape(2, 'Título', 838200, 365125, 10515600, 1325563, title, { fontSize: 4000, bold: true }),
    body ? pptxShape(3, 'Contenido', 838200, 1828800, 10515600, 4572000, body, { fontSize: 2000 }) : '',
    extraShape || '',
  ].join('');
  return `${XML_HEAD}
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${shapes}</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function buildPptxFixture() {
  const slide1 = pptxSlide('Presentación de Prueba OFFICE-3', 'Este mazo evalúa el visor de presentaciones integrado con slides reales.');
  const slide2 = pptxSlide('Segundo slide', 'El visor debe permitir navegar la secuencia completa de slides.', pptxShape(4, 'Rectángulo', 1828800, 2743200, 2743200, 1828800, 'Forma con relleno', { fill: '4A90D9', fontSize: 1400 }));
  const slide3 = pptxSlide('Tercer slide', 'Cada slide conserva su título, su texto y sus formas.');
  const theme = `${XML_HEAD}
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office3 QA">
<a:themeElements>
<a:clrScheme name="Office3">
<a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>
<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Office3">
<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office3">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="1000"><a:schemeClr val="phClr"/></a:gs></a:gsLst><a:lin ang="0" scaled="1"/></a:gradFill><a:blipFill><a:blip/><a:stretch><a:fillRect/></a:stretch></a:blipFill></a:fillStyleLst>
<a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;

  return zipSync([
    ['[Content_Types].xml', `${XML_HEAD}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`],
    ['_rels/.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`],
    ['ppt/presentation.xml', `${XML_HEAD}
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/><p:sldId id="258" r:id="rId4"/></p:sldIdLst>
<p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`],
    ['ppt/_rels/presentation.xml.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`],
    ['ppt/slideMasters/slideMaster1.xml', `${XML_HEAD}
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:name val="Office3 QA Master"/><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`],
    ['ppt/slideMasters/_rels/slideMaster1.xml.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`],
    ['ppt/slideLayouts/slideLayout1.xml', `${XML_HEAD}
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
<p:cSld name="En blanco"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`],
    ['ppt/slideLayouts/_rels/slideLayout1.xml.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`],
    ['ppt/theme/theme1.xml', theme],
    ['ppt/slides/slide1.xml', slide1],
    ['ppt/slides/slide2.xml', slide2],
    ['ppt/slides/slide3.xml', slide3],
    ['ppt/slides/_rels/slide1.xml.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`],
    ['ppt/slides/_rels/slide2.xml.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`],
    ['ppt/slides/_rels/slide3.xml.rels', `${XML_HEAD}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`],
  ]);
}

/* ------------------------------------------------------------------ */
/* QA identity: dos hogares aislados con usuarios coordinator.         */
/* ------------------------------------------------------------------ */

async function teardownPreviousRuns() {
  const users = await authAdminListUsers();
  const qaUsers = users.filter((u) => u.email === QA_EMAIL_A || u.email === QA_EMAIL_B);
  for (const user of qaUsers) {
    const people = await restList('people', `?select=id,active_household_id&auth_user_id=eq.${user.id}`);
    for (const person of people) {
      await restRequest('PATCH', 'people', { query: `?id=eq.${person.id}`, body: { active_household_id: null } });
      const memberships = await restList('household_members', `?select=household_id&person_id=eq.${person.id}`);
      const householdIds = memberships.map((m) => m.household_id);
      for (const householdId of householdIds) {
        const contents = await restList('homecloud_contents', `?select=original_storage_path&household_id=eq.${householdId}`);
        await storageDeletePrefixes(contents.map((row) => row.original_storage_path));
        await restRequest('DELETE', 'homecloud_contents', { query: `?household_id=eq.${householdId}` });
        await restRequest('DELETE', 'households', { query: `?id=eq.${householdId}` });
      }
      await restRequest('DELETE', 'household_members', { query: `?person_id=eq.${person.id}` });
      await restRequest('DELETE', 'people', { query: `?id=eq.${person.id}` });
    }
    await authAdminDeleteUser(user.id);
  }
  return qaUsers.length;
}

async function setupQaHousehold(email, slug, name) {
  const user = await authAdminCreateUser(email);
  if (!user) return null;
  const person = await restInsertOne('people', {
    auth_user_id: user.id,
    display_name: name,
    default_language: 'es-419',
  });
  if (!person) return null;
  const household = await restInsertOne('households', {
    name,
    slug,
    created_by_person_id: person.id,
  });
  if (!household) return null;
  const membership = await restInsertOne('household_members', {
    household_id: household.id,
    person_id: person.id,
    role: 'coordinator',
    status: 'active',
    joined_at: new Date().toISOString(),
  });
  if (!membership) return null;
  const patch = await restRequest('PATCH', 'people', {
    query: `?id=eq.${person.id}`,
    body: { active_household_id: household.id },
    prefer: 'return=representation',
  });
  if (patch.status >= 300) return null;
  const accessToken = await authSignIn(email);
  if (!accessToken) return null;
  return { user, person, household, membership, accessToken };
}

async function uploadContent(householdId, bytes, displayName, mimeType, extension) {
  const contentId = crypto.randomUUID();
  const storagePath = `${householdId}/${contentId}/original`;
  const uploaded = await storageUpload(storagePath, bytes, mimeType);
  if (!uploaded) return null;
  const row = await restInsertOne('homecloud_contents', {
    id: contentId,
    household_id: householdId,
    role: 'file',
    display_name: displayName,
    mime_type: mimeType,
    extension,
    size_bytes: bytes.length,
    original_storage_path: storagePath,
    lifecycle: 'active',
    uploaded_at: new Date().toISOString(),
  });
  if (!row) return null;
  return { contentId, storagePath, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

/* ------------------------------------------------------------------ */
/* Validación de contrato de sesión (firmada, read-only, por familia).   */
/* ------------------------------------------------------------------ */

const downloadTokensSeen = [];

function validateSessionContract(label, sessionResult, { contentId, fileType, documentType, title }) {
  const body = sessionResult.body;
  check(`${label}. la sesión se crea con 201`, sessionResult.status === 201, `status=${sessionResult.status}`);
  if (sessionResult.status !== 201 || !body) return null;
  const config = body.config;
  check(`${label}. trae sessionId/contentId/expiresAt/documentServerUrl`, Boolean(body.sessionId && body.contentId === contentId && body.expiresAt && body.documentServerUrl));
  check(`${label}. documentType ${documentType} por familia`, config?.documentType === documentType, `recibido=${config?.documentType}`);
  check(`${label}. fileType genuino ${fileType}`, config?.document?.fileType === fileType, `recibido=${config?.document?.fileType}`);
  check(`${label}. type embedded`, config?.type === 'embedded');
  check(`${label}. mode view`, config?.editorConfig?.mode === 'view');
  const permissions = config?.document?.permissions ?? {};
  check(`${label}. permisos read-only completos`,
    ['comment', 'copy', 'download', 'edit', 'print', 'review', 'chat'].every((p) => permissions[p] === false),
    JSON.stringify(permissions));
  const serialized = JSON.stringify(config);
  check(`${label}. sin callbackUrl (no write-back)`, !serialized.includes('callbackUrl'));
  check(`${label}. sin URLs share/embed/save/fullscreen del DocServer`, !/(embedUrl|shareUrl|saveUrl|fullscreenUrl)/.test(serialized));
  check(`${label}. título es el original`, config?.document?.title === title);
  const documentUrl = String(config?.document?.url ?? '');
  check(`${label}. la URL de descarga apunta al BACKEND interno, no al DocServer`,
    INTERNAL_API_URL !== '' && documentUrl.startsWith(`${INTERNAL_API_URL}/api/homecloud/office/`),
    `base=${documentUrl.split('/api')[0] || '(vacía)'}`);
  const tokenMatch = /[?&]token=([0-9a-f]+)/.exec(documentUrl);
  check(`${label}. la URL de descarga lleva el bearer scoped a la sesión`, tokenMatch !== null);
  if (tokenMatch) downloadTokensSeen.push(tokenMatch[1]);
  const key = config?.document?.key;
  check(`${label}. key único por sesión`, key === `office-${contentId}-${body.sessionId}`);
  const verified = verifyOfficeJwt(body.token, JWT_SECRET);
  check(`${label}. el JWT HS256 verifica con el secreto y trae la MISMA config`, JSON.stringify(verified) === JSON.stringify(config));
  const expiresAtMs = Date.parse(body.expiresAt);
  const delta = expiresAtMs - Date.now();
  check(`${label}. expira en la ventana del TTL (~10 min)`, delta > SESSION_TTL_MS - 60000 && delta <= SESSION_TTL_MS + 60000, `delta_ms=${delta}`);
  return body;
}

/* ------------------------------------------------------------------ */
/* Main.                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log('=== HOMECLOUD OFFICE VIEWER: OFFICE-3 INTEGRACIÓN REAL (LOCAL_RUNTIME_REQUIRED) ===');

  // I-A. Preflight: si el stack no está, SKIP honesto (nunca PASS falso).
  console.log('\n--- I-A: preflight del stack ---');
  let docserverOk = false;
  try {
    const response = await fetchWithTimeout(`${DOCSERVER_URL}/healthcheck`, {}, 10000);
    docserverOk = response.ok && (await response.text()).trim() === 'true';
  } catch { /* ausente */ }
  if (!docserverOk) skip(`Document Server no responde en ${DOCSERVER_URL}`);
  check('I-A1. Document Server healthcheck responde true', docserverOk);
  let backendOk = false;
  let backendHealth = null;
  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/health`, {}, 10000);
    backendHealth = await jsonOf(response);
    backendOk = response.ok && backendHealth?.ok === true;
  } catch { /* ausente */ }
  if (!backendOk) skip(`backend no responde en ${BACKEND_URL}`);
  check('I-A2. backend /health responde ok', backendOk);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY || !JWT_SECRET || !INTERNAL_API_URL) {
    skip('faltan variables de entorno requeridas');
  }

  // I-B. Identidad QA: teardown de corridas previas + dos hogares.
  console.log('\n--- I-B: identidad QA (dos hogares aislados) ---');
  const removed = await teardownPreviousRuns();
  console.log(`  (limpieza previa: ${removed} usuario(s) de corridas anteriores)`);
  const hogarA = await setupQaHousehold(QA_EMAIL_A, QA_SLUG_A, 'Hogar QA Office3 A');
  const hogarB = await setupQaHousehold(QA_EMAIL_B, QA_SLUG_B, 'Hogar QA Office3 B');
  check('I-B1. hogar A con coordinator activo y sesión válida', hogarA !== null);
  check('I-B2. hogar B con coordinator activo y sesión válida', hogarB !== null);
  if (!hogarA || !hogarB) {
    console.log(`OFFICE VIEWER INTEGRATION: ${passCount} passed, ${failCount} failed`);
    process.exit(failCount > 0 ? 1 : 0);
  }

  // I-C. Fixtures OOXML genuinos (contenido real, determinista).
  console.log('\n--- I-C: fixtures OOXML genuinos (construidos in-line) ---');
  const docxFixture = buildDocxFixture();
  const xlsxFixture = buildXlsxFixture();
  const pptxFixture = buildPptxFixture();
  check('I-C1. fixture DOCX con contenido real (título, párrafos, tabla, salto de página)', docxFixture.length > 1000 && docxFixture[0] === 0x50 && docxFixture[1] === 0x4b);
  check('I-C2. fixture XLSX con contenido real (3 hojas, formatos, fórmulas)', xlsxFixture.length > 1000 && xlsxFixture[0] === 0x50 && xlsxFixture[1] === 0x4b);
  check('I-C3. fixture PPTX con contenido real (3 slides, texto, formas)', pptxFixture.length > 1000 && pptxFixture[0] === 0x50 && pptxFixture[1] === 0x4b);

  // Fixtures legacy genuinos desde disco (ver procedencia en el encabezado).
  // Se exige magic OLE2 (D0CF11E0…): un OOXML renombrado empieza con PK.
  const FIXTURES_DIR = path.join(__dirname, '..', 'tests', 'fixtures', 'office');
  const loadLegacyFixture = (fileName) => {
    const full = path.join(FIXTURES_DIR, fileName);
    if (!fs.existsSync(full)) return null;
    return fs.readFileSync(full);
  };
  const LEGACY_BYTES = {
    doc: loadLegacyFixture('informe-gastos-97.doc'),
    xls: loadLegacyFixture('plan-hogar-97.xls'),
    ppt: loadLegacyFixture('presentacion-97.ppt'),
  };
  check('I-C4. fixture DOC legacy genuino (OLE2, no OOXML renombrado)',
    LEGACY_BYTES.doc !== null && LEGACY_BYTES.doc.length > 1000 && LEGACY_BYTES.doc.subarray(0, 8).equals(OLE_MAGIC));
  check('I-C5. fixture XLS legacy genuino (OLE2, no OOXML renombrado)',
    LEGACY_BYTES.xls !== null && LEGACY_BYTES.xls.length > 1000 && LEGACY_BYTES.xls.subarray(0, 8).equals(OLE_MAGIC));
  check('I-C6. fixture PPT legacy genuino (OLE2, no OOXML renombrado)',
    LEGACY_BYTES.ppt !== null && LEGACY_BYTES.ppt.length > 1000 && LEGACY_BYTES.ppt.subarray(0, 8).equals(OLE_MAGIC));

  const FORMAT_PLAN = [
    { ext: 'docx', family: 'word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', title: 'informe-gastos.docx', bytes: docxFixture },
    { ext: 'xlsx', family: 'cell', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', title: 'plan-hogar.xlsx', bytes: xlsxFixture },
    { ext: 'pptx', family: 'slide', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', title: 'presentacion.pptx', bytes: pptxFixture },
  ];

  // Subida + sesión + contrato + PROCESAMIENTO REAL de cada OOXML.
  const uploadedByExt = {};
  for (const plan of FORMAT_PLAN) {
    const label = `I-D-${plan.ext}`;
    console.log(`\n--- ${label}: sesión real + procesamiento real del DocServer (${plan.ext}) ---`);
    const content = await uploadContent(hogarA.household.id, plan.bytes, plan.title, plan.mime, plan.ext);
    check(`${label}1. el original ${plan.ext} se sube a Storage con row activo`, content !== null);
    if (!content) continue;
    uploadedByExt[plan.ext] = { ...content, bytes: plan.bytes, plan };
    const session = await createSession(hogarA.accessToken, content.contentId);
    const sessionBody = validateSessionContract(label, session, {
      contentId: content.contentId,
      fileType: plan.ext,
      documentType: plan.family,
      title: plan.title,
    });
    if (!sessionBody) continue;
    uploadedByExt[plan.ext].session = sessionBody;

    // El DocServer DESCARGA por la URL de sesión del backend y PROCESA.
    const conversion = await convertWithDocumentServer({
      url: sessionBody.config.document.url,
      filetype: plan.ext,
      outputtype: 'pdf',
      title: plan.title,
    });
    check(`${label}2. el DocServer descarga por la URL de sesión y PROCESA ${plan.ext} (salida PDF real)`,
      conversion.ok && conversion.bytes?.subarray(0, 4).equals(PDF_MAGIC) && conversion.bytes.length > 1000,
      conversion.ok ? '' : `error=${conversion.error}`);
  }

  const LEGACY_MIME = {
    doc: 'application/msword',
    xls: 'application/vnd.ms-excel',
    ppt: 'application/vnd.ms-powerpoint',
  };
  const LEGACY_FAMILY = { doc: 'word', xls: 'cell', ppt: 'slide' };
  const LEGACY_TITLE = {
    doc: 'informe-gastos-97.doc',
    xls: 'plan-hogar-97.xls',
    ppt: 'presentacion-97.ppt',
  };

  // I-E. Los tres legacy: subida como contenido propio + sesión + contrato +
  // procesamiento real (binarios OLE2 genuinos de I-C4/6, verificados por
  // magic al cargarlos).
  for (const legacyExt of ['doc', 'xls', 'ppt']) {
    const label = `I-E-${legacyExt}`;
    console.log(`\n--- ${label}: sesión real + procesamiento real del DocServer (${legacyExt} legacy binario) ---`);
    const legacyBytes = LEGACY_BYTES[legacyExt];
    check(`${label}0. fixture legacy ${legacyExt} disponible y genuino`, Boolean(legacyBytes?.length), 'falta el fixture en tests/fixtures/office/');
    if (!legacyBytes) continue;
    const content = await uploadContent(hogarA.household.id, legacyBytes, LEGACY_TITLE[legacyExt], LEGACY_MIME[legacyExt], legacyExt);
    check(`${label}1. el original ${legacyExt} se sube a Storage con row activo`, content !== null);
    if (!content) continue;
    uploadedByExt[legacyExt] = { ...content, bytes: legacyBytes, genuine: true };
    const session = await createSession(hogarA.accessToken, content.contentId);
    const sessionBody = validateSessionContract(label, session, {
      contentId: content.contentId,
      fileType: legacyExt,
      documentType: LEGACY_FAMILY[legacyExt],
      title: LEGACY_TITLE[legacyExt],
    });
    if (!sessionBody) continue;
    uploadedByExt[legacyExt].session = sessionBody;
    const conversion = await convertWithDocumentServer({
      url: sessionBody.config.document.url,
      filetype: legacyExt,
      outputtype: 'pdf',
      title: LEGACY_TITLE[legacyExt],
    });
    check(`${label}2. el DocServer descarga por la URL de sesión y PROCESA ${legacyExt} legacy (salida PDF real)`,
      conversion.ok && conversion.bytes?.subarray(0, 4).equals(PDF_MAGIC) && conversion.bytes.length > 1000,
      conversion.ok ? '' : `error=${conversion.error}`);
  }

  // I-F. Seguridad, límites, integridad e higiene de logs.
  console.log('\n--- I-F: matriz de seguridad y límites ---');
  {
    const docxEntry = uploadedByExt.docx;
    if (docxEntry?.session) {
      const url = String(docxEntry.session.config.document.url);

      const wrongTokenUrl = localDownloadUrl(url.replace(/([?&]token=)[0-9a-f]+/, '$10000000000000000000000000000000'));
      const wrong = await fetchDocumentUrl(wrongTokenUrl);
      check('I-F1. token de descarga inválido -> 404 office_session_invalid', wrong.status === 404, `status=${wrong.status}`);

      const noToken = await fetchDocumentUrl(localDownloadUrl(url.replace(/[?&]token=[0-9a-f]+/, '')));
      check('I-F2. descarga sin token -> 404', noToken.status === 404, `status=${noToken.status}`);

      // Entrega byte-exacta del original al DocServer.
      const delivered = await fetchDocumentUrl(localDownloadUrl(url));
      check('I-F3. la descarga autorizada entrega el original BYTE-EXACTO',
        delivered.status === 200 && delivered.buffer?.length === docxEntry.bytes.length
          && crypto.createHash('sha256').update(delivered.buffer).digest('hex') === docxEntry.sha256,
        `status=${delivered.status}`);

      const revokedStatus = await revokeSession(hogarA.accessToken, docxEntry.session.sessionId);
      check('I-F4. DELETE revoca la sesión (204, idempotente)', revokedStatus === 204, `status=${revokedStatus}`);
      const afterRevoke = await fetchDocumentUrl(localDownloadUrl(url));
      check('I-F5. tras revocar, la descarga es 404', afterRevoke.status === 404, `status=${afterRevoke.status}`);
      const revokedAgain = await revokeSession(hogarA.accessToken, docxEntry.session.sessionId);
      check('I-F6. revocar de nuevo sigue siendo 204 (idempotente)', revokedAgain === 204, `status=${revokedAgain}`);
    } else {
      check('I-F1..F6. sesión DOCX disponible para la matriz de seguridad', false, 'la sesión DOCX no existe');
    }

    if (uploadedByExt.xls?.session) {
      // Aislamiento: el hogar B no puede ver el contenido del hogar A.
      const foreign = await createSession(hogarB.accessToken, uploadedByExt.xls.contentId);
      check('I-F7. household ajeno recibe 404 idéntico (aislamiento)', foreign.status === 404 && foreign.body?.error?.code === 'homecloud_content_not_found', `status=${foreign.status}`);
    } else {
      check('I-F7. contenido XLS disponible para la prueba de aislamiento', false, 'no hay contenido XLS');
    }

    const nonexistent = await createSession(hogarA.accessToken, '00000000-0000-4000-8000-000000000000');
    check('I-F8. contenido inexistente -> 404 idéntico (no revela existencia)', nonexistent.status === 404 && nonexistent.body?.error?.code === 'homecloud_content_not_found', `status=${nonexistent.status}`);

    const anonymous = await fetchWithTimeout(`${BACKEND_URL}/api/homecloud/content/${uploadedByExt.docx?.contentId ?? 'x'}/office-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    check('I-F9. sin Bearer -> 401', anonymous.status === 401, `status=${anonymous.status}`);

    // Cap de tamaño (row con size_bytes sobre el límite).
    const oversized = await uploadContent(hogarA.household.id, docxEntry?.bytes ?? Buffer.from('x'), 'enorme.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
    if (oversized) {
      await restRequest('PATCH', 'homecloud_contents', {
        query: `?id=eq.${oversized.contentId}`,
        body: { size_bytes: 150 * 1024 * 1024 },
      });
      const oversizedSession = await createSession(hogarA.accessToken, oversized.contentId);
      check('I-F10. archivo sobre el cap de tamaño -> 413 file_too_large_to_preview',
        oversizedSession.status === 413 && oversizedSession.body?.error?.code === 'file_too_large_to_preview',
        `status=${oversizedSession.status}`);
    } else {
      check('I-F10. se pudo subir el contenido oversized de prueba', false, 'subida fallida');
    }

    // Formato Office no-V1: honestidad, no compatibilidad fingida.
    const odtContent = await uploadContent(hogarA.household.id, Buffer.from('contenido-no-office'), 'documento.odt', 'application/vnd.oasis.opendocument.text', 'odt');
    if (odtContent) {
      const odtSession = await createSession(hogarA.accessToken, odtContent.contentId);
      check('I-F11. formato Office no-V1 (ODT) -> 400 office_format_not_supported',
        odtSession.status === 400 && odtSession.body?.error?.code === 'office_format_not_supported',
        `status=${odtSession.status}`);
    } else {
      check('I-F11. se pudo subir el contenido ODT de prueba', false, 'subida fallida');
    }

    // Documento corrupto (truncado al 30%, como una subida interrumpida):
    // la sesión se crea (clasifica por extensión, el acceso no depende del
    // contenido) y el motor TERMINA en tiempo acotado — recupera lo que
    // puede o falla, pero nunca cuelga la sesión ni toca el original.
    const truncatedBytes = docxEntry.bytes.subarray(0, Math.max(256, Math.floor(docxEntry.bytes.length * 0.3)));
    const truncated = await uploadContent(hogarA.household.id, Buffer.from(truncatedBytes), 'truncado.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
    if (truncated) {
      const truncatedSession = await createSession(hogarA.accessToken, truncated.contentId);
      check('I-F12. el archivo truncado igual crea sesión (el acceso no depende del contenido)', truncatedSession.status === 201, `status=${truncatedSession.status}`);
      if (truncatedSession.status === 201) {
        const truncatedConversion = await convertWithDocumentServer({
          url: truncatedSession.body.config.document.url,
          filetype: 'docx',
          outputtype: 'pdf',
          title: 'truncado.docx',
        });
        check('I-F12b. el motor TERMINA ante el truncado en tiempo acotado (veredicto registrado, sin cuelgue)',
          truncatedConversion.ok === true || typeof truncatedConversion.error === 'string',
          `veredicto=${truncatedConversion.ok ? 'recupera' : truncatedConversion.error}`);
        await revokeSession(hogarA.accessToken, truncatedSession.body.sessionId);
      }
    } else {
      check('I-F12. se pudo subir el contenido truncado de prueba', false, 'subida fallida');
    }

    // Documento protegido con contraseña (OOXML cifrado agile genuino): la
    // sesión se crea, pero el motor lo RECHAZA sin la contraseña — el visor
    // embebido muestra el fallo honesto en lugar de contenido inventado.
    const protectedPath = path.join(FIXTURES_DIR, 'informe-protegido.docx');
    const protectedBytes = fs.existsSync(protectedPath) ? fs.readFileSync(protectedPath) : null;
    check('I-F13. fixture DOCX protegido con contraseña disponible', protectedBytes !== null && protectedBytes.length > 1000);
    if (protectedBytes) {
      const protectedContent = await uploadContent(hogarA.household.id, protectedBytes, 'protegido.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
      if (protectedContent) {
        const protectedSession = await createSession(hogarA.accessToken, protectedContent.contentId);
        check('I-F13b. el protegido igual crea sesión (el acceso no depende del contenido)', protectedSession.status === 201, `status=${protectedSession.status}`);
        if (protectedSession.status === 201) {
          const protectedConversion = await convertWithDocumentServer({
            url: protectedSession.body.config.document.url,
            filetype: 'docx',
            outputtype: 'pdf',
            title: 'protegido.docx',
          });
          check('I-F13c. el motor REAL rechaza el documento cifrado sin contraseña (fallo honesto)',
            protectedConversion.ok === false,
            protectedConversion.ok ? 'la conversión de un cifrado tuvo ÉXITO (inesperado)' : `error=${protectedConversion.error}`);
          await revokeSession(hogarA.accessToken, protectedSession.body.sessionId);
        }
      } else {
        check('I-F13b. se pudo subir el contenido protegido de prueba', false, 'subida fallida');
      }
    }

    // Integridad del original: byte-exacto antes y después de TODO el flujo.
    for (const ext of ['docx', 'doc', 'xls']) {
      const entry = uploadedByExt[ext];
      if (!entry?.storagePath || !entry.bytes) continue;
      const stored = await storageSignedRead(entry.storagePath);
      check(`I-F14. ${ext}: el original en Storage queda INTACTO tras el flujo completo`,
        stored !== null && crypto.createHash('sha256').update(stored).digest('hex') === entry.sha256,
        stored === null ? 'lectura fallida' : 'hash distinto');
    }

    // Higiene de logs: ningún download token en el access log del backend.
    if (BACKEND_LOG && fs.existsSync(BACKEND_LOG)) {
      const logText = fs.readFileSync(BACKEND_LOG, 'utf8');
      const leaking = downloadTokensSeen.filter((token) => logText.includes(token));
      check('I-F15. ningún download token aparece en el log del backend', leaking.length === 0, `${leaking.length} token(s) presentes`);
      const accessLeaking = [hogarA.accessToken, hogarB.accessToken].filter((token) => token && logText.includes(token));
      check('I-F16. ningún access token del usuario aparece en el log del backend', accessLeaking.length === 0);
    } else {
      console.log('  (I-F15/16: sin OFFICE_INTEGRATION_BACKEND_LOG, prueba de logs omitida)');
    }
  }

  // Resumen por formato (evidencia de procesamiento real acumulada).
  console.log('\n--- Resumen por formato (sesión + procesamiento real) ---');
  for (const ext of ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt']) {
    const entry = uploadedByExt[ext];
    const hasSession = Boolean(entry?.session);
    console.log(`  ${ext.padEnd(5)} session=${hasSession ? 'OK' : 'FALTA'} legacy-genuino=${ext === 'doc' || ext === 'xls' || ext === 'ppt' ? (entry?.genuine === true ? 'OK' : 'FALTA') : 'n/a'}`);
  }

  console.log(`\nOFFICE VIEWER INTEGRATION: ${passCount} passed, ${failCount} failed`);
  if (failures.length > 0) {
    console.error('FALLAS:');
    for (const name of failures) console.error(`  - ${name}`);
  }
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`OFFICE VIEWER INTEGRATION: ERROR — ${error?.message ?? error}`);
  process.exit(1);
});
