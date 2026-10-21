#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets <-> HomeCloud — S8-01: FILE RELATION SCHEMA certification.
 *
 * LOCAL_RUNTIME_REQUIRED. Runs against the ISOLATED S8 stack (HpAssetsS8).
 * It NEVER resets, drops or truncates any database: it only READS the
 * catalog.
 *
 * What is proven here (the S8-01 contract, frozen):
 *   1. THREE relation tables exist (no polymorphic table):
 *      public.assets_asset_files, public.assets_record_files,
 *      public.assets_care_files.
 *   2. Each one has the canonical columns: id (uuid, PK, gen_random_uuid()),
 *      household_id (NOT NULL), the owner id (NOT NULL), file_id (NOT NULL),
 *      created_by_member_id, created_at, removed_at, removed_by_member_id.
 *   3. The owner FK is the COMPOSITE (owner_id, household_id) ->
 *      (owner_table.id, owner_table.household_id) with ON DELETE RESTRICT,
 *      and household_id -> households(id) ON DELETE RESTRICT.
 *   4. file_id has NO foreign key to public.homecloud_contents: the File
 *      reference is SOFT, so HomeCloud can purge its row and the Assets
 *      relation survives as a tombstone.
 *   5. There is NO ON DELETE CASCADE anywhere in the relation tables.
 *   6. The partial unique index (owner_id, file_id) WHERE removed_at IS NULL
 *      exists, plus the partial owner index and the partial file index.
 *   7. RLS is ENABLED on all three tables with NO client policies and NO
 *      client grants (anon/authenticated).
 *   8. The relation tables carry NO cloned File metadata (no display_name,
 *      mime_type, extension, size_bytes, document_date, note, storage path,
 *      preview path, blob or HomeCloud lifecycle column).
 *   9. The removed_at CHECK constraint exists (removed_at >= created_at).
 *  10. The composite owner uniques already existed on assets, assets_records
 *      and assets_care (no new composite unique was invented).
 */

const { Client } = require('../backend/node_modules/pg');
const { loadS8RuntimeEnv, createRecorder } = require('./assets_s8_runtime_helpers');

const RELATION_TABLES = [
  {
    name: 'assets_asset_files',
    ownerColumn: 'asset_id',
    ownerTable: 'assets',
    ownerIndex: 'assets_asset_files_active_asset_idx',
    ownerUnique: 'assets_asset_files_active_uidx',
    fileIndex: 'assets_asset_files_active_file_idx',
  },
  {
    name: 'assets_record_files',
    ownerColumn: 'record_id',
    ownerTable: 'assets_records',
    ownerIndex: 'assets_record_files_active_record_idx',
    ownerUnique: 'assets_record_files_active_uidx',
    fileIndex: 'assets_record_files_active_file_idx',
  },
  {
    name: 'assets_care_files',
    ownerColumn: 'care_id',
    ownerTable: 'assets_care',
    ownerIndex: 'assets_care_files_active_care_idx',
    ownerUnique: 'assets_care_files_active_uidx',
    fileIndex: 'assets_care_files_active_file_idx',
  },
];

const REQUIRED_COLUMNS = [
  'id',
  'household_id',
  'file_id',
  'created_by_member_id',
  'created_at',
  'removed_at',
  'removed_by_member_id',
];

/** Columns that would mean a CLONED File metadata. None may exist. */
const FORBIDDEN_COLUMNS = [
  'display_name',
  'mime_type',
  'extension',
  'size_bytes',
  'document_date',
  'note',
  'original_storage_path',
  'preview_storage_path',
  'storage_path',
  'blob',
  'lifecycle',
  'has_preview',
  'viewer_state',
  'content',
];

async function main() {
  const recorder = createRecorder('ASSETS_S8_SCHEMA');
  const env = loadS8RuntimeEnv();
  const client = new Client({ connectionString: env.LOCAL_DATABASE_URL });
  await client.connect();

  try {
    // ── 1. the three tables exist ───────────────────────────────────────────
    const { rows: tables } = await client.query(`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1)
      order by c.relname
    `, [RELATION_TABLES.map((t) => t.name)]);

    recorder.record(tables.length === 3, `existen las 3 tablas de relacion (${tables.map((t) => t.relname).join(', ')})`);

    // ── 2/3/9. columns, FKs and CHECK of every table ────────────────────────
    for (const spec of RELATION_TABLES) {
      const { rows: columns } = await client.query(`
        select column_name, is_nullable, column_default, data_type
        from information_schema.columns
        where table_schema = 'public' and table_name = $1
        order by ordinal_position
      `, [spec.name]);
      const byName = new Map(columns.map((c) => [c.column_name, c]));

      recorder.record(columns.length > 0, `${spec.name}: la tabla existe`);
      recorder.record(byName.has(spec.ownerColumn), `${spec.name}: columna de propietario ${spec.ownerColumn}`);
      recorder.record(byName.has('file_id'), `${spec.name}: columna file_id`);

      const id = byName.get('id');
      recorder.record(
        Boolean(id) && id.data_type === 'uuid' && id.is_nullable === 'NO'
          && String(id.column_default ?? '').includes('gen_random_uuid'),
        `${spec.name}.id es uuid NOT NULL PK con gen_random_uuid()`,
      );

      for (const column of REQUIRED_COLUMNS) {
        const col = byName.get(column);
        recorder.record(Boolean(col), `${spec.name}.${column} existe`);
      }
      recorder.record(byName.get('household_id')?.is_nullable === 'NO', `${spec.name}.household_id es NOT NULL`);
      recorder.record(byName.get('file_id')?.is_nullable === 'NO', `${spec.name}.file_id es NOT NULL`);
      recorder.record(byName.get(spec.ownerColumn)?.is_nullable === 'NO', `${spec.name}.${spec.ownerColumn} es NOT NULL`);
      recorder.record(
        byName.get('created_by_member_id')?.is_nullable === 'YES'
          && byName.get('removed_by_member_id')?.is_nullable === 'YES',
        `${spec.name}: los ids de miembro son NULL-ables (ON DELETE SET NULL)`,
      );
      recorder.record(
        byName.get('created_at')?.is_nullable === 'NO'
          && String(byName.get('created_at')?.column_default ?? '').includes('now'),
        `${spec.name}.created_at es timestamptz NOT NULL default now()`,
      );

      // FK catalog
      const { rows: constraints } = await client.query(`
        select conname, contype, pg_get_constraintdef(oid) as def
        from pg_constraint
        where conrelid = $1::regclass
      `, [`public.${spec.name}`]);

      const ownerFk = constraints.find((c) => c.contype === 'f' && c.def.includes(`${spec.ownerColumn}, household_id`));
      recorder.record(
        Boolean(ownerFk)
          && ownerFk.def.includes(`REFERENCES ${spec.ownerTable}(id, household_id)`)
          && ownerFk.def.includes('ON DELETE RESTRICT'),
        `${spec.name}: FK compuesta (${spec.ownerColumn}, household_id) -> ${spec.ownerTable}(id, household_id) ON DELETE RESTRICT`,
      );

      const householdFk = constraints.find((c) => c.contype === 'f' && c.def.includes('household_id) REFERENCES households'));
      recorder.record(
        Boolean(householdFk) && householdFk.def.includes('ON DELETE RESTRICT'),
        `${spec.name}: household_id -> households(id) ON DELETE RESTRICT`,
      );

      const memberFks = constraints.filter((c) => c.contype === 'f' && c.def.includes('household_members'));
      recorder.record(memberFks.length === 2, `${spec.name}: 2 FK a household_members (created_by / removed_by)`);
      recorder.record(
        memberFks.every((c) => c.def.includes('ON DELETE SET NULL')),
        `${spec.name}: los FK de miembro usan ON DELETE SET NULL`,
      );

      // ── 4. NO FK to HomeCloud (soft file reference) ───────────────────────
      const homecloudFk = constraints.find((c) => c.contype === 'f' && c.def.includes('homecloud_contents'));
      recorder.record(
        !homecloudFk,
        `${spec.name}: NO existe FK a public.homecloud_contents (file_id es una referencia suave)`,
      );

      // ── 5. NO CASCADE ─────────────────────────────────────────────────────
      const cascades = constraints.filter((c) => c.contype === 'f' && c.def.includes('ON DELETE CASCADE'));
      recorder.record(cascades.length === 0, `${spec.name}: ningun FK usa ON DELETE CASCADE`);

      // ── 9. the soft-unlink CHECK ─────────────────────────────────────────
      const removedCheck = constraints.find(
        (c) => c.contype === 'c' && c.def.includes('removed_at'),
      );
      recorder.record(
        Boolean(removedCheck) && removedCheck.def.includes('removed_at >= created_at'),
        `${spec.name}: CHECK (removed_at IS NULL OR removed_at >= created_at)`,
      );

      // ── 6. indexes ────────────────────────────────────────────────────────
      const { rows: indexes } = await client.query(`
        select indexname, indexdef
        from pg_indexes
        where schemaname = 'public' and tablename = $1
      `, [spec.name]);

      const uniqueIdx = indexes.find((i) => i.indexname === spec.ownerUnique);
      recorder.record(
        Boolean(uniqueIdx)
          && uniqueIdx.indexdef.includes('UNIQUE')
          && uniqueIdx.indexdef.includes(`(${spec.ownerColumn}, file_id)`)
          && uniqueIdx.indexdef.includes('WHERE (removed_at IS NULL)'),
        `${spec.name}: indice unico parcial (${spec.ownerColumn}, file_id) WHERE removed_at IS NULL`,
      );

      const ownerIdx = indexes.find((i) => i.indexname === spec.ownerIndex);
      recorder.record(
        Boolean(ownerIdx)
          && ownerIdx.indexdef.includes(`(${spec.ownerColumn})`)
          && ownerIdx.indexdef.includes('WHERE (removed_at IS NULL)')
          && !ownerIdx.indexdef.includes('UNIQUE'),
        `${spec.name}: indice parcial de propietario (${spec.ownerColumn}) WHERE removed_at IS NULL`,
      );

      const fileIdx = indexes.find((i) => i.indexname === spec.fileIndex);
      recorder.record(
        Boolean(fileIdx)
          && fileIdx.indexdef.includes('(file_id)')
          && fileIdx.indexdef.includes('WHERE (removed_at IS NULL)'),
        `${spec.name}: indice parcial de archivo (file_id) WHERE removed_at IS NULL`,
      );

      // ── 7. RLS + no client policies + no client grants ────────────────────
      const tableRow = tables.find((t) => t.relname === spec.name);
      recorder.record(tableRow?.relrowsecurity === true, `${spec.name}: RLS habilitado`);

      const { rows: policies } = await client.query(
        `select policyname from pg_policies where schemaname = 'public' and tablename = $1`,
        [spec.name],
      );
      recorder.record(policies.length === 0, `${spec.name}: sin policies de cliente`);

      const { rows: grants } = await client.query(`
        select grantee
        from information_schema.role_table_grants
        where table_schema = 'public' and table_name = $1 and grantee in ('anon', 'authenticated')
      `, [spec.name]);
      recorder.record(grants.length === 0, `${spec.name}: sin permisos para anon/authenticated`);

      // ── 8. NO cloned File metadata ────────────────────────────────────────
      const cloned = columns.map((c) => c.column_name).filter((name) => FORBIDDEN_COLUMNS.includes(name));
      recorder.record(cloned.length === 0, `${spec.name}: sin metadata de File clonada (${cloned.join(', ') || 'ninguna'})`);
    }

    // ── 10. the composite owner uniques already existed ─────────────────────
    for (const ownerTable of ['assets', 'assets_records', 'assets_care']) {
      const { rows: ownerIndexes } = await client.query(`
        select indexname, indexdef from pg_indexes
        where schemaname = 'public' and tablename = $1 and indexdef like '%UNIQUE%'
      `, [ownerTable]);
      recorder.record(
        ownerIndexes.some((i) => i.indexdef.includes('(id, household_id)')),
        `${ownerTable}: ya existe el unico compuesto (id, household_id)`,
      );
    }

    // ── HomeCloud contents itself has no client policies either ────────────
    const { rows: hcPolicies } = await client.query(
      `select policyname from pg_policies where schemaname = 'public' and tablename = 'homecloud_contents'`,
    );
    recorder.record(hcPolicies.length === 0, 'homecloud_contents: sin policies de cliente (el frontend no puede leerlo)');
  } finally {
    await client.end();
  }

  recorder.finish('ASSETS_S8_FILE_RELATIONS_SCHEMA');
}

main().catch((error) => {
  console.error('[assets_s8_file_relations_schema_tests] ERROR', error);
  process.exitCode = 1;
});
