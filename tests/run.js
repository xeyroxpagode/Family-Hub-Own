#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { repositoryRoot, runCommand } = require('./helpers/process');

const frontend = 'front/mi-front-limpio';
const frontendRoot = path.join(repositoryRoot, frontend);
const backendRoot = path.join(repositoryRoot, 'backend');
const compileFrontendTests = ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.test.json'];

const commands = {
  'backend-syntax': () => runCommand('Backend/test syntax', 'node', ['tests/static/backend-syntax.js']),
  'migration-uniqueness': () => runCommand('Migration uniqueness guard', 'node', ['tests/static/migration-uniqueness.js']),
  'backend-eslint': () => runCommand('Backend ESLint', 'npm', ['exec', 'eslint', '--', '.'], { cwd: backendRoot }),
  'frontend-lint': () => runCommand('Frontend ESLint', 'npm', ['run', 'lint'], { cwd: frontendRoot }),
  'frontend-typecheck': () => runCommand('Frontend TypeScript', 'npm', ['exec', 'tsc', '--', '--noEmit'], { cwd: frontendRoot }),
  'test-typecheck': () => runCommand('Test TypeScript', 'npm', ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.test.json', '--noEmit']),
  'testing-core': () => runCommand('Testing Core unit tests', 'node', ['--test', 'tests/core/testing-core.test.js']),
  'core-backend': () => runCommand('Core backend contracts', 'node', ['scripts/homeplus_core_contract_tests.js']),
  'homecloud-2a-backend-structure': () => runCommand('HomeCloud 2A backend structure tests', 'node', ['scripts/homecloud_2a_backend_structure_tests.js']),
  'homecloud-2a-intake-validation': () => runCommand('HomeCloud 2A intake validation tests', 'node', ['scripts/homecloud_2a_intake_validation_tests.js']),
  'homecloud-2a-runtime-intake': () => runCommand('HomeCloud 2A runtime intake tests', 'node', ['scripts/homecloud_2a_runtime_intake_tests.js']),
  'homecloud-2a-frontend-structure': () => runCommand('HomeCloud 2A frontend structure tests', 'node', ['scripts/homecloud_2a_upload_job_tests.js']),
  'homecloud-2c-intake-validation': () => runCommand('HomeCloud 2C intake validation tests', 'node', ['scripts/homecloud_2c_intake_validation_tests.js']),
  'homecloud-2c-runtime-intake': () => runCommand('HomeCloud 2C runtime intake tests', 'node', ['scripts/homecloud_2c_runtime_intake_tests.js']),
  'homecloud-2c-frontend-structure': () => runCommand('HomeCloud 2C memory intake frontend structure tests', 'node', ['scripts/homecloud_2c_memory_intake_tests.js']),
  'homecloud-2a-upload-job': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'HomeCloud 2A upload job runtime tests',
      'node',
      ['scripts/compiled/scripts/homecloud_2a_upload_job_runtime_tests.js'],
      { env },
    );
  },
  'homecloud-upload-recovery': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'HomeCloud shared upload runtime recovery tests',
      'node',
      ['scripts/compiled/scripts/homecloud_upload_recovery_tests.js'],
      { env },
    );
  },
  'homecloud-t1-queue-persistence': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'HomeCloud T1 queue/persistence corruption tests',
      'node',
      ['scripts/compiled/scripts/homecloud_t1_queue_persistence_tests.js'],
      { env },
    );
  },
  'homecloud-t1-stale-job': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    runCommand(
      'HomeCloud T1 compile stale-job / UI-ownership tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_t1_stale_test.json'],
    );
    return runCommand(
      'HomeCloud T1 stale job reconciliation / per-job UI ownership tests',
      'node',
      ['scripts/compiled-t1stale/scripts/homecloud_t1_stale_job_tests.js'],
      { env },
    );
  },
  'homecloud-s2i-durable-recovery': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    runCommand(
      'HomeCloud S2-i compile durable recovery / cold start tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_s2i_test.json'],
    );
    return runCommand(
      'HomeCloud S2-i durable recovery / cold start lifecycle tests',
      'node',
      ['scripts/compiled-s2i/scripts/homecloud_s2i_durable_recovery_tests.js'],
      { env },
    );
  },
  'homecloud-w1a-authority': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    runCommand(
      'HomeCloud W1-A compile authority/capabilities/invalidation tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_w1a_test.json'],
    );
    return runCommand(
      'HomeCloud W1-A authority / capabilities / household invalidation tests',
      'node',
      ['scripts/compiled-w1a/scripts/homecloud_w1a_authority_tests.js'],
      { env },
    );
  },
  'homecloud-w1bc-pagination-reconciliation': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    runCommand(
      'HomeCloud W1-B/W1-C compile pagination/reconciliation tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_w1bc_test.json'],
    );
    return runCommand(
      'HomeCloud W1-B/W1-C files pagination / global completion reconciliation tests',
      'node',
      ['scripts/compiled-w1bc/scripts/homecloud_w1bc_pagination_reconciliation_tests.js'],
      { env },
    );
  },
  'homecloud-w1c-scanner-acceptance': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    runCommand(
      'HomeCloud W1-C compile scanner accept/detach tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_w1c_scanner_test.json'],
    );
    return runCommand(
      'HomeCloud W1-C scanner accept -> detach regression tests',
      'node',
      ['scripts/compiled-w1cscanner/scripts/homecloud_w1c_scanner_acceptance_tests.js'],
      { env },
    );
  },
  'homecloud-3e-scanner': () => runCommand(
    'HomeCloud 3E scanner logic tests',
    'node',
    ['scripts/compiled/scripts/homecloud_3e_scanner_tests.js'],
  ),
  'homecloud-4a2-written-validation': () => runCommand(
    'HomeCloud 4A2 written register validation tests',
    'node',
    ['scripts/homecloud_4a2_written_validation_tests.js'],
  ),
  'homecloud-4a2-schema': () => runCommand(
    'HomeCloud 4A2 persistence schema tests (local DB)',
    'node',
    ['scripts/homecloud_4a2_schema_tests.js'],
  ),
  'homecloud-4a2-written-runtime': () => runCommand(
    'HomeCloud 4A2 written runtime intake tests (local Supabase)',
    'node',
    ['scripts/homecloud_4a2_written_runtime_tests.js'],
  ),
  'homecloud-4b1-memories-read-model': () => runCommand(
    'HomeCloud 4B1 memories read model tests (local Supabase)',
    'node',
    ['scripts/homecloud_4b1_memories_read_model_tests.js'],
  ),
  'homecloud-4b1-preview': () => runCommand(
    'HomeCloud 4B1 preview foundation tests (local Supabase)',
    'node',
    ['scripts/homecloud_4b1_preview_tests.js'],
  ),
  'homecloud-4b2-timeline': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'HomeCloud 4B2 memories timeline tests',
      'node',
      ['scripts/compiled/scripts/homecloud_4b2_memories_timeline_tests.js'],
      { env },
    );
  },
  'homecloud-t2-d1-native-upload': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9999',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    runCommand(
      'HomeCloud T2-D1 compile native upload tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_t2_d1_test.json'],
    );
    return runCommand(
      'HomeCloud T2-D1 native PUT progress/cancel tests',
      'node',
      ['scripts/compiled-t2d1/scripts/homecloud_t2_d1_native_upload_tests.js'],
      { env },
    );
  },
  'homecloud-4c1-memory-create': () => runCommand(
    'HomeCloud 4C1 memory create tests',
    'node',
    ['scripts/compiled/scripts/homecloud_4c1_memory_create_tests.js'],
  ),
  'homecloud-4c1-1-memory-create-recovery': () => runCommand(
    'HomeCloud 4C1.1 memory create runtime recovery tests',
    'node',
    ['scripts/compiled/scripts/homecloud_4c1_1_memory_create_recovery_tests.js'],
  ),
  'homecloud-lifecycle-backend-contract': () => runCommand(
    'HomeCloud lifecycle backend contract tests',
    'node',
    ['scripts/homecloud_lifecycle_backend_contract_tests.js'],
  ),
  'homecloud-delete-capability-enforcement': () => runCommand(
    'HomeCloud delete capability enforcement tests',
    'node',
    ['scripts/homecloud_delete_capability_enforcement_tests.js'],
  ),
  'homecloud-purge-storage-honesty': () => runCommand(
    'HomeCloud purge storage honesty tests',
    'node',
    ['scripts/homecloud_purge_storage_honesty_tests.js'],
  ),
  'homecloud-selection-caller-context': () => runCommand(
    'HomeCloud selection caller context tests',
    'node',
    ['scripts/homecloud_selection_caller_context_tests.js'],
  ),
  'homecloud-viewer-android-back': () => runCommand(
    'HomeCloud Viewer Android Back tests',
    'node',
    ['scripts/homecloud_viewer_android_back_tests.js'],
  ),
  'homecloud-viewer-immersive': () => runCommand(
    'HomeCloud Viewer immersive tests',
    'node',
    ['scripts/homecloud_viewer_immersive_tests.js'],
  ),
  'homecloud-viewer-loading-states': () => runCommand(
    'HomeCloud Viewer loading states tests',
    'node',
    ['scripts/homecloud_viewer_loading_states_tests.js'],
  ),
  'homecloud-viewer-no-nested-modal': () => runCommand(
    'HomeCloud Viewer no nested modal tests',
    'node',
    ['scripts/homecloud_viewer_no_nested_modal_tests.js'],
  ),
  'homecloud-global-tab-switch': () => runCommand(
    'HomeCloud global tab switch tests',
    'node',
    ['scripts/homecloud_global_tab_switch_tests.js'],
  ),
  'homecloud-scroll-offsets': () => runCommand(
    'HomeCloud scroll offset tests',
    'node',
    ['scripts/homecloud_scroll_offset_tests.js'],
  ),

  'homecloud-s0-gallery-intake-contract': () => runCommand(
    'HomeCloud S0 gallery intake contract tests',
    'node',
    ['scripts/homecloud_s0_gallery_intake_contract_tests.js'],
  ),
  'homecloud-s0-modal-host-contract': () => runCommand(
    'HomeCloud S0 single modal host contract tests',
    'node',
    ['scripts/homecloud_s0_modal_host_contract_tests.js'],
  ),

  'homecloud-p2-foundation': () => runCommand(
    'HomeCloud P2 memories foundation tests',
    'node',
    ['scripts/compiled/scripts/homecloud_p2_memories_foundation_tests.js'],
  ),
  'homecloud-st3-patch-favorites': () => runCommand(
    'HomeCloud ST-3 memory PATCH + favorites contract tests',
    'node',
    ['scripts/homecloud_st3_memory_patch_tests.js'],
  ),
  'homecloud-st3-semantic-date-compile': () => runCommand(
    'Compile HomeCloud ST-3 semantic date focused tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_st3_test.json'],
  ),
  'homecloud-st3-semantic-date': () => runCommand(
    'HomeCloud ST-3 semantic date / written date tests',
    'node',
    ['scripts/compiled/scripts/homecloud_st3_semantic_date_tests.js'],
  ),
  'homecloud-4c1-compile': () => runCommand(
    'Compile HomeCloud 4C1 focused tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_4c1_test.json'],
  ),

  // MO-A1 — Albums contract / backend / read model.
  //
  // homecloud-moa1-album-contract is deterministic (no database, no network):
  // capability model, Album DTO contract, Album order vs Timeline order, cover
  // suitability, mutation route surface, schema freeze, read-model boundaries
  // and shared-foundation decoupling.
  //
  // homecloud-moa1-album-runtime is ENVIRONMENT-DEPENDENT: it exercises the REAL
  // backend services against the LOCAL Supabase reported by `supabase status`
  // and refuses any non-local URL. It is the runtime proof for the five Album
  // mutations, the exact itemCount (including >1000), the derived cover, the
  // Album read mode and the capability/household authority. Without a running
  // local Supabase it reports RUNTIME_REQUIRED and fails; it never degrades to a
  // pretend pass.
  'homecloud-moa1-album-contract': () => runCommand(
    'HomeCloud MO-A1 Album contract deterministic tests',
    'node',
    ['scripts/homecloud_moa1_album_contracts_tests.js'],
  ),
  'homecloud-moa1-album-runtime': () => runCommand(
    'HomeCloud MO-A1 Album runtime tests (local Supabase)',
    'node',
    ['scripts/homecloud_moa1_album_runtime_tests.js'],
  ),
  // MO-A2 — Albums SURFACE (the UI slice that consumes the closed MO-A1
  // contract).
  //
  // homecloud-moa2-album-surface is deterministic: it EXECUTES the two
  // framework-free Album controllers (generations, stale-answer rejection,
  // replace vs append, dedupe, terminal missing-Album, reset) and reads the real
  // component sources for the boundaries that only source can prove.
  //
  // homecloud-moa2-album-runtime is ENVIRONMENT-DEPENDENT: it boots the REAL
  // backend HomeCloud routes in process on an EPHEMERAL local port and drives
  // the REAL compiled frontend client over HTTP against the LOCAL Supabase
  // reported by `supabase status`, so every Album request shape, status and
  // typed refusal is exercised as the app sends it. It refuses a non-local URL.
  'homecloud-moa2-album-surface': () => {
    runCommand(
      'HomeCloud MO-A2 compile Album surface/controller tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_moa2_test.json'],
    );
    return runCommand(
      'HomeCloud MO-A2 Album surface / controller deterministic tests',
      'node',
      ['scripts/compiled-moa2/scripts/homecloud_moa2_album_surface_tests.js'],
    );
  },
  'homecloud-moa2-album-runtime': () => {
    runCommand(
      'HomeCloud MO-A2 compile the Album client contract',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_moa2_client_test.json'],
    );
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'HomeCloud MO-A2 Album runtime tests (local Supabase, real client over HTTP)',
      'node',
      ['scripts/homecloud_moa2_album_runtime_tests.js'],
      { env },
    );
  },
  // MO-A3 — MEMORY SELECTION + ALBUM INTEGRATION.
  //
  // homecloud-moa3-selection is deterministic: it EXECUTES the framework-free
  // selection session, drag state machine, mounted-row registry + hit testing,
  // edge auto-scroll solver/ticker, collection read contracts and membership
  // composer, and it reads the real component sources for the boundaries only a
  // source can prove (no Viewer, no route, no delete, no global store, no smart
  // collection). It also carries the HC-1 order closure: an explicit
  // characterization of the pre-existing Album visual-order gap plus the exact
  // Timeline-unchanged / Album-corrected proof.
  //
  // homecloud-moa3-selection-runtime is ENVIRONMENT-DEPENDENT: it boots the REAL
  // backend HomeCloud routes in process on an EPHEMERAL local port and drives the
  // REAL compiled frontend client AND the REAL pure modules over HTTP against the
  // LOCAL Supabase reported by `supabase status`. It refuses a non-local URL.
  'homecloud-moa3-selection': () => {
    runCommand(
      'HomeCloud MO-A3 compile selection / drag / collections / order tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_moa3_test.json'],
    );
    return runCommand(
      'HomeCloud MO-A3 memory selection deterministic tests',
      'node',
      ['scripts/compiled-moa3/scripts/homecloud_moa3_memory_selection_tests.js'],
    );
  },
  'homecloud-moa3-selection-runtime': () => {
    runCommand(
      'HomeCloud MO-A3 compile the selection client contract',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_moa3_client_test.json'],
    );
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'HomeCloud MO-A3 memory selection runtime tests (local Supabase, real client over HTTP)',
      'node',
      ['scripts/homecloud_moa3_memory_selection_runtime_tests.js'],
      { env },
    );
  },
  // MO-A3 DEVICE FIX (D1/D2/D3) — the three physical-iPhone gesture defects the
  // automated gates could not see: the auto-scroll crash, the drag leaking into
  // pull-to-refresh, and the drag leaking into the parent exit swipe.
  //
  // It is deterministic and framework free. Its fixtures are built from the
  // RUNTIME facts proven against the installed React Native (a SectionList ref
  // publishes getScrollResponder and NOT scrollToOffset), so the "supported" and
  // "missing method" cases describe the real object rather than a convenient one.
  'homecloud-moa3-device-gestures': () => {
    runCommand(
      'HomeCloud MO-A3 device fix compile scroll-adapter / refresh-gate / exit-gesture tests',
      'npm',
      ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_moa3_device_gesture_fix_test.json'],
    );
    return runCommand(
      'HomeCloud MO-A3 device fix scroll adapter / refresh gate / exit gesture tests',
      'node',
      ['scripts/compiled-moa3-device-gesture/scripts/homecloud_moa3_device_gesture_fix_tests.js'],
    );
  },
  // HC2-C Run A — the Memories FOUNDATION gate (C0..C4).
  //
  // Three deterministic suites, ONE compile: the Viewer's opening invariant, the
  // Albums first paint, and the root/selection contracts. They are wired as a
  // suite so they can never become orphans again — which is exactly how
  // `homecloud-hc2a-memories-viewer` became one (audit R9).
  'homecloud-hc2c-memories-foundation': () => {
    runCommand('HomeCloud HC2-C Run A compile', 'npm', ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_hc2c_test.json']);
    runCommand('HomeCloud HC2-C Viewer opening tests', 'node', ['scripts/compiled-hc2c/scripts/homecloud_hc2c_viewer_opening_tests.js']);
    runCommand('HomeCloud HC2-C Albums rail tests', 'node', ['scripts/compiled-hc2c/scripts/homecloud_hc2c_albums_rail_tests.js']);
    return runCommand('HomeCloud HC2-C Memories root and selection tests', 'node', ['scripts/compiled-hc2c/scripts/homecloud_hc2c_memories_root_tests.js']);
  },
  'homecloud-hc2a-memories-viewer': () => {
    runCommand('HomeCloud HC2-A memory viewer compile', 'npm', ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_hc2a_test.json']);
    return runCommand('HomeCloud HC2-A memory viewer foundation tests', 'node', ['scripts/compiled-hc2a/scripts/homecloud_hc2a_memories_viewer_tests.js']);
  },
  'homecloud-hc2b-media-viewer-contract': () => {
    runCommand('HomeCloud HC2-B Slice 0 compile', 'npm', ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_hc2b_test.json']);
    return runCommand('HomeCloud HC2-B Slice 0 tests', 'node', ['scripts/compiled-hc2b/scripts/homecloud_hc2b_media_viewer_tests.js']);
  },
  'homecloud-st9-media-reliability': () => {
    runCommand('HomeCloud ST-9 media reliability compile', 'npm', ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_hc2b_test.json']);
    return runCommand('HomeCloud ST-9 media reliability tests', 'node', ['scripts/compiled-hc2b/scripts/homecloud_st9_media_reliability_tests.js']);
  },
  'homecloud-st10-image-zoom-compile': () => runCommand(
    'HomeCloud ST-10 image zoom compile',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_st10_zoom_test.json'],
  ),
  'homecloud-st10-image-zoom': () => runCommand(
    'HomeCloud ST-10 image zoom tests',
    'node',
    ['scripts/compiled-st10-zoom/scripts/homecloud_st10_image_zoom_tests.js'],
  ),
  'homecloud-st10-intake-debt-compile': () => runCommand(
    'HomeCloud ST-10 intake debt compile',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_st10_debt_test.json'],
  ),
  'homecloud-st10-intake-debt': () => runCommand(
    'HomeCloud ST-10 intake debt tests',
    'node',
    ['scripts/compiled-st10-debt/scripts/homecloud_st10_intake_debt_tests.js'],
  ),
  'homecloud-st10-camera-compile': () => runCommand(
    'HomeCloud ST-10 camera convergence compile',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_st10_camera_test.json'],
  ),
  'homecloud-st10-camera': () => runCommand(
    'HomeCloud ST-10 camera convergence tests',
    'node',
    ['scripts/compiled-st10-camera/scripts/homecloud_st10_camera_convergence_tests.js'],
  ),
  'homecloud-st10-batch-compile': () => runCommand(
    'HomeCloud ST-10 batch intake compile',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_st10_batch_test.json'],
  ),
  'homecloud-st10-batch': () => runCommand(
    'HomeCloud ST-10 batch intake tests',
    'node',
    ['scripts/compiled-st10-batch/scripts/homecloud_st10_batch_intake_tests.js'],
  ),
  'homecloud-1f-dto-leak': () => runCommand(
    'HomeCloud 1F DTO leak regression tests',
    'node',
    ['scripts/homecloud_1f_dto_leak_tests.js'],
  ),
  'homecloud-1d-backend-enforcement': () => runCommand(
    'HomeCloud 1D backend enforcement tests',
    'node',
    ['scripts/homecloud_1d_backend_enforcement_tests.js'],
  ),
  'homecloud-1d-capability-resolution': () => runCommand(
    'HomeCloud 1D capability resolution contract tests',
    'node',
    ['scripts/homecloud_1d_capability_resolution_contract_tests.js'],
  ),
  'homecloud-1d-frontend-projection': () => runCommand(
    'HomeCloud 1D frontend projection tests',
    'node',
    ['scripts/homecloud_1d_frontend_projection_tests.js'],
  ),
  'homecloud-1d-new-household-capability-regression': () => runCommand(
    'HomeCloud 1D new household capability regression tests',
    'node',
    ['scripts/homecloud_1d_new_household_capability_regression_tests.js'],
  ),
  'homecloud-1d-rls-bypass': () => runCommand(
    'HomeCloud 1D RLS bypass tests',
    'node',
    ['scripts/homecloud_1d_rls_bypass_tests.js'],
  ),
  'homecloud-stage-a1-capture-recovery': () => runCommand(
    'HomeCloud Stage A1 in-app capture runtime recovery tests',
    'node',
    ['scripts/homecloud_stage_a1_capture_recovery_tests.js'],
  ),
  'homecloud-slice01-integrity': () => runCommand(
    'HomeCloud Slice 01 artifact/storage/download integrity tests',
    'node',
    ['scripts/homecloud_slice01_integrity_tests.js'],
  ),
  'homecloud-slice01-auth-runtime': () => runCommand(
    'HomeCloud Slice 01 auth runtime recovery tests',
    'node',
    ['scripts/homecloud_slice01_auth_runtime_tests.ts'],
  ),
  'homecloud-slice01-download-runtime': () => runCommand(
    'HomeCloud Slice 01 download runtime recovery tests',
    'node',
    ['scripts/homecloud_slice01_download_runtime_tests.ts'],
  ),
  'homecloud-slice01-storage-runtime': () => runCommand(
    'HomeCloud Slice 01 disposable 60 MiB Storage runtime test',
    'node',
    ['scripts/homecloud_slice01_storage_runtime_tests.js'],
  ),
  'compile-frontend-tests': () => runCommand('Compile frontend tests', 'npm', compileFrontendTests),
  'compile-planner-reliability-tests': () => runCommand(
    'Compile Planner Reliability tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.planner_reliability_test.json'],
  ),
  'compile-planner-reliability-frontend-tests': () => runCommand(
    'Compile Planner Reliability Frontend tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.planner_reliability_frontend_test.json'],
  ),
  'compile-planner-reliability-integration-tests': () => runCommand(
    'Compile Planner Reliability Integration tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.planner_reliability_integration_test.json'],
  ),
  'core-frontend': () => runCommand('Core frontend contracts', 'node', ['scripts/compiled/scripts/homeplus_core_frontend_tests.js']),
  'g0.3': () => runCommand('G0.3 cache/context contracts', 'node', ['scripts/compiled/scripts/planner_g0_3_cache_tests.js']),
  'planner-v1-m1': () => runCommand(
    'Planner V1 M1 navigation tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_navigation_tests.js'],
  ),
  'planner-v1-m2': () => runCommand(
    'Planner V1 M2 shell state tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_shell_state_tests.js'],
  ),
  'planner-v1-m3': () => runCommand(
    'Planner V1 M3 sheet state tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_sheet_state_tests.js'],
  ),
  'planner-v1-m4': () => runCommand(
    'Planner V1 M4 quick actions tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_quick_actions_tests.js'],
  ),
  'planner-v1-m5': () => runCommand(
    'Planner V1 M5 goal quick create tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_goal_quick_create_tests.js'],
  ),
  'planner-v1-m6': () => runCommand(
    'Planner V1 M6 tab preferences tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_tab_preferences_tests.js'],
  ),
  'planner-v1-m7': () => runCommand(
    'Planner V1 M7 household transition search tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_m7_tests.js'],
  ),
  'planner-v1-m8': () => runCommand(
    'Planner V1 M8 home summary backend tests',
    'node',
    ['scripts/planner_v1_m8_tests.js'],
  ),
  'planner-v1-m9': () => runCommand(
    'Planner V1 M9 home summary frontend tests',
    'node',
    ['scripts/planner_v1_m9_tests.js'],
  ),
  'planner-v1-m10': () => runCommand(
    'Planner V1 M10 deep links runtime tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_m10_tests.js'],
  ),
  'planner-v1-foundation': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 frontend foundation tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_foundation_tests.js'],
      { env },
    );
  },
  'planner-v1-reliability': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 M11.7A reliability tests',
      'node',
      ['scripts/compiled-reliability/scripts/planner_m11_7a_reliability_tests.js'],
      { env },
    );
  },
  'planner-v1-reliability-frontend': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 M11.7B reliability frontend tests',
      'node',
      ['scripts/compiled-reliability-frontend/scripts/planner_m11_7b_reliability_frontend_tests.js'],
      { env },
    );
  },
  'planner-v1-reliability-integration': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:54321',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 M11.7C reliability integration tests',
      'node',
      ['scripts/compiled-reliability-integration/scripts/planner_m11_7c_reliability_integration_tests.js'],
      { env },
    );
  },
  'planner-v1-frontend-core-integration': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 frontend core integration tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_core_integration_tests.js'],
      { env },
    );
  },
  'planner-v1-frontend-tasks': () => runCommand(
    'Planner V1 tasks frontend tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_frontend_tasks_tests.js'],
  ),
  'planner-v1-frontend-events': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:54321',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 events frontend tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_events_tests.js'],
      { env },
    );
  },
  'planner-v1-frontend-plans': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:54321',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 plans frontend tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_plans_tests.js'],
      { env },
    );
  },
  'planner-v1-presets-drafts': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 presets/drafts frontend tests',
      'node',
      ['scripts/planner_v1_presets_drafts_frontend_tests.js'],
      { env },
    );
  },
  'planner-v1-presets-drafts-integration': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 presets/drafts integration tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_presets_drafts_integration_tests.js'],
      { env },
    );
  },
  'planner-v1-s2-runtime-owner': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 Shared S2 Runtime Owner tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_shared_s2_runtime_owner_tests.js'],
      { env },
    );
  },
  'planner-v1-s2-terminal-contract': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 Shared S2 Terminal Contract tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_shared_s2_terminal_contract_tests.js'],
      { env },
    );
  },
  'planner-v1-s2-runtime-composition': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 Shared S2 Runtime Composition tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_shared_s2_runtime_composition_tests.js'],
      { env },
    );
  },
  'planner-v1-plan-duplicate-dispatch': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 PLAN-DUP-01 duplicate dispatch tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_plan_duplicate_dispatch_tests.js'],
      { env },
    );
  },
'planner-p1-structure-contract': () => runCommand(
    'Planner P1 structure domain contract tests',
    'node',
    ['scripts/compiled/scripts/planner_p1_structure_contract_tests.js'],
  ),
  'planner-p2a-milestone-editor': () => runCommand(
     'Planner P2A milestone editor tests',
     'node',
     ['scripts/compiled/scripts/planner_v1_p2a_milestone_editor_tests.js'],
   ),
  'planner-p1-structure-db': () => runCommand(
    'Planner P1 structure database tests',
    'node',
    ['scripts/planner_p1_structure_database_tests.js'],
  ),
  'finance-1b-contract': () => runCommand(
    'Finance 1B financial context authority contract tests',
    'node',
    ['scripts/finance_1b_context_contract_tests.js'],
  ),
  'finance-1b-database': () => runCommand(
    'Finance 1B financial context authority database tests',
    'node',
    ['scripts/finance_1b_context_database_tests.js'],
  ),
  'finance-1c-ownership-privacy': () => runCommand(
    'Finance 1C ownership and privacy enforcement tests',
    'node',
    ['scripts/finance_1c_ownership_privacy_tests.js'],
  ),
  'finance-1d-source-context-boundary': () => runCommand(
    'Finance 1D source vs financial context boundary tests',
    'node',
    ['scripts/finance_1d_source_context_boundary_tests.js'],
  ),
  'finance-1e-frontend': () => runCommand(
    'Finance 1E final context UX frontend tests',
    'node',
    ['scripts/compiled/scripts/finance_1e_frontend_context_ux_tests.js'],
  ),
  'finance-1f-integration': () => runCommand(
    'Finance 1F integrated privacy gate tests',
    'node',
    ['scripts/compiled/scripts/finance_1f_integrated_privacy_gate_tests.js'],
  ),
  'finance-2a-transaction-contract': () => runCommand(
    'Finance 2A transaction contract tests',
    'node',
    ['scripts/finance_2a_transaction_contract_tests.js'],
  ),
  'finance-2b-category-authority': () => runCommand(
    'Finance 2B category authority tests',
    'node',
    ['scripts/finance_2b_category_authority_tests.js'],
  ),
  'finance-2c-expense-income': () => runCommand(
    'Finance 2C expense/income mutation tests',
    'node',
    ['scripts/finance_2c_expense_income_mutation_tests.js'],
  ),
  'finance-2d-money-input': () => runCommand(
    'Finance 2D MoneyInput tests',
    'node',
    ['scripts/compiled/scripts/finance_2d_money_input_tests.js'],
  ),
  'finance-2e-expense-income-ui': () => runCommand(
    'Finance 2E expense/income final UI tests',
    'node',
    ['scripts/compiled/scripts/finance_2e_expense_income_final_ui_tests.js'],
  ),
  'finance-2f-read-authority': () => runCommand(
    'Finance 2F-A minimum read authority tests',
    'node',
    ['scripts/finance_2f_read_authority_tests.js'],
  ),
  'finance-2f-ui': () => runCommand(
    'Finance 2F-B frontend consumption tests',
    'node',
    ['scripts/compiled/scripts/finance_2f_frontend_consumption_tests.js'],
  ),
'finance-3a-account-authority': () => runCommand(
    'Finance 3A account authority tests',
    'node',
    ['scripts/finance_3a_account_authority_tests.js'],
  ),
  'finance-3b-balance-anchor': () => runCommand(
    'Finance 3B balance anchor and account effects tests',
    'node',
    ['scripts/finance_3b_balance_anchor_account_effect_tests.js'],
  ),
  'finance-3c-balance-correction': () => runCommand(
    'Finance 3C balance correction tests',
    'node',
    ['scripts/finance_3c_balance_correction_tests.js'],
  ),
  'finance-3d-credit-card-semantics': () => runCommand(
    'Finance 3D credit card semantics tests',
    'node',
    ['scripts/finance_3d_credit_card_semantics_tests.js'],
  ),
  'finance-3e-canonical-transfer': () => runCommand(
    'Finance 3E canonical transfer tests',
    'node',
    ['scripts/finance_3e_canonical_transfer_tests.js'],
  ),
  'finance-3f-cross-currency-transfer': () => runCommand(
    'Finance 3F cross-currency transfer tests',
    'node',
    ['scripts/finance_3f_cross_currency_transfer_tests.js'],
  ),
  'finance-3g-transfer-commission-composition': () => runCommand(
    'Finance 3G transfer commission composition tests',
    'node',
    ['scripts/finance_3g_transfer_commission_composition_tests.js'],
  ),
'finance-3h-account-transfer-ui': () => runCommand(
    'Finance 3H account/transfer final UI tests',
    'node',
    ['scripts/compiled/scripts/finance_3h_account_transfer_final_ui_tests.js'],
  ),
  'finance-4b-effect-status': () => runCommand(
    'Finance 4B account effect status foundation tests',
    'node',
    ['scripts/finance_4b_effect_status_foundation_tests.js'],
  ),
  'finance-4c-lifecycle': () => runCommand(
    'Finance 4C transaction lifecycle foundation tests',
    'node',
    ['scripts/finance_4c_transaction_lifecycle_foundation_tests.js'],
  ),
  'finance-4d-trash': () => runCommand(
    'Finance 4D transaction trash mutation tests',
    'node',
    ['scripts/finance_4d_transaction_trash_tests.js'],
  ),
  'finance-4g-restore': () => runCommand(
    'Finance 4G transaction restore mutation tests',
    'node',
    ['scripts/finance_4g_transaction_restore_tests.js'],
  ),
  'finance-4i-b': () => runCommand(
    'Finance 4I-B canonical transaction correction tests',
    'node',
    ['scripts/finance_4i_b_transaction_correction_tests.js'],
  ),
  'finance-4j': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 4J-R transaction detail consumption tests',
      'node',
      ['scripts/compiled/scripts/finance_4j_transaction_correction_ui_tests.js'],
      { env },
    );
  },
  'finance-5e-frontend': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 5E payments frontend tests',
      'node',
      ['scripts/compiled/scripts/finance_5e_payments_frontend_tests.js'],
      { env },
    );
  },
  'finance-5f-backend': () => runCommand(
    'Finance 5F payment attention backend tests',
    'node',
    ['scripts/finance_5f_payment_attention_tests.js'],
  ),
'finance-5f-frontend': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 5F payment attention frontend tests',
      'node',
      ['scripts/compiled/scripts/finance_5f_payment_attention_frontend_tests.js'],
      { env },
    );
  },
'finance-5g-frontend': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 5G credit card payment frontend tests',
      'node',
      ['scripts/compiled/scripts/finance_5g_credit_card_payment_frontend_tests.js'],
      { env },
    );
  },
  'finance-6c1-pool-foundation': () => runCommand(
    'Finance 6C.1 Pool Foundation tests',
    'node',
    ['scripts/finance_6c1_pool_foundation_tests.js'],
  ),
  'finance-6c2-pool-financial-integration': () => runCommand(
    'Finance 6C.2 Pool financial integration tests',
    'node',
    ['scripts/finance_6c2_pool_financial_integration_tests.js'],
  ),
  'finance-6c3-spending-limit-foundation': () => runCommand(
    'Finance 6C.3 Spending Limit foundation tests',
    'node',
    ['scripts/finance_6c3_spending_limit_foundation_tests.js'],
  ),
'finance-6c4-analysis-progress': () => runCommand(
    'Finance 6C.4 Analysis / progress tests',
    'node',
    ['scripts/finance_6c4_analysis_progress_tests.js'],
  ),
  'finance-6d-resumen-dashboard': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 6D Resumen Dashboard tests',
      'node',
      ['scripts/compiled/scripts/finance_6d_resumen_dashboard_tests.js'],
      { env },
    );
  },
  'finance-6e1-pool-management': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 6E.1 Pool Management tests',
      'node',
      ['scripts/compiled/scripts/finance_6e1_pool_management_tests.js'],
      { env },
    );
  },
  'finance-6e2-expense-pool-frontend': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 6E.2 Expense Pool frontend tests',
      'node',
      ['scripts/compiled/scripts/finance_6e2_expense_pool_frontend_tests.js'],
      { env },
    );
  },
  'finance-6e4-category-pool-default-frontend': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 6E.4 Category Pool Default frontend tests',
      'node',
      ['scripts/compiled/scripts/finance_6e4_category_pool_default_tests.js'],
      { env },
    );
  },
  'finance-6f-spending-limits-frontend': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 6F Spending Limits Frontend tests',
      'node',
      ['scripts/compiled/scripts/finance_6f_spending_limits_frontend_tests.js'],
      { env },
    );
  },
  'finance-7d-unified-movements-frontend': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Finance 7D Unified Movements Frontend tests',
      'node',
      ['scripts/compiled/scripts/finance_7d_unified_movements_frontend_tests.js'],
      { env },
    );
  },
  'runtime-smoke': () => runCommand(
    'Frontend runtime smoke',
    'node',
    ['scripts/runtime_smoke_test.js'],
  ),
  'g0.4-contracts': () => runCommand('G0.4 feature/telemetry/outbox contracts', 'node', ['scripts/homeplus_g0_4_contract_tests.js']),
  'g0.4-db': () => runCommand('G0.4 database contracts', 'node', ['scripts/homeplus_g0_4_database_tests.js']),
  'integration-g0.4': () => runCommand('G0.4 runtime integration', 'node', ['tests/integration/run.js', '--suite=g0.4']),
  'integration-all': () => runCommand('Runtime integration', 'node', ['tests/integration/run.js']),
  db: () => runCommand('Database suite', 'node', ['tests/db/run.js']),
  secrets: () => runCommand('Secret/privacy file scan', 'node', ['tests/static/secret-scan.js']),
  coverage: () => runCommand('Core coverage baseline', 'npm', ['run', 'test:coverage']),
  'ci-syntax': () => runCommand('CI workflow syntax', 'node', ['tests/static/workflow-syntax.js']),
  whitespace: () => runCommand('Whitespace check', 'git', ['diff', '--check']),
  'homecloud-st5-action-authority-compile': () => runCommand(
    'HomeCloud ST-5 compile action authority tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.homecloud_st5_test.json'],
  ),
  'homecloud-st5-action-authority': () => runCommand(
    'HomeCloud ST-5 action authority tests',
    'node',
    ['scripts/compiled-st5/scripts/homecloud_memory_action_authority_tests.js'],
  ),
  'homecloud-st5-viewer-action-menu': () => runCommand(
    'HomeCloud ST-5 viewer action menu tests',
    'node',
    ['scripts/homecloud_viewer_action_menu_tests.js'],
  ),
  'homecloud-st5-favorite-actions': () => runCommand(
    'HomeCloud ST-5 favorite action tests',
    'node',
    ['scripts/homecloud_favorite_action_tests.js'],
  ),
  'homecloud-st5-written-share': () => runCommand(
    'HomeCloud ST-5 written memory share tests',
    'node',
    ['scripts/homecloud_written_memory_share_tests.js'],
  ),
  'homecloud-st5-share-temp-cleanup': () => runCommand(
    'HomeCloud ST-5 share temp cleanup tests',
    'node',
    ['scripts/homecloud_share_temp_cleanup_tests.js'],
  ),
  'homecloud-st5-multishare-contract': () => runCommand(
    'HomeCloud ST-5 multishare platform contract tests',
    'node',
    ['scripts/homecloud_multishare_contract_tests.js'],
  ),
};

const suites = {
typecheck: ['frontend-typecheck', 'test-typecheck'],
  'homecloud-hc2b-media-viewer': ['homecloud-hc2b-media-viewer-contract'],
  // HC2-C Run A gate. It carries BOTH the new Foundation evidence AND the whole
  // Viewer evidence it sits on top of, because Run A must never weaken what HC2-A
  // and HC2-B froze: the opening invariant is a correction OF that pager, not a
  // replacement for it. `homecloud-hc2a-memories-viewer` was an ORPHAN command —
  // registered, referenced by no suite, so it ran in no `npm run quality` at all
  // (audit R9). It is wired here so the Viewer evidence is never silent again.
  'homecloud-hc2c-run-a': [
    'homecloud-hc2c-memories-foundation',
    'homecloud-hc2a-memories-viewer',
    'homecloud-hc2b-media-viewer-contract',
    'homecloud-moa3-selection',
    'homecloud-moa3-device-gestures',
    'homecloud-moa2-album-surface',
    'homecloud-moa1-album-contract',
    'frontend-typecheck',
  ],
  'homecloud-p1-lifecycle': [
    'homecloud-lifecycle-backend-contract',
    'homecloud-delete-capability-enforcement',
    'homecloud-purge-storage-honesty',
    'homecloud-selection-caller-context',
    'homecloud-viewer-android-back',
    'homecloud-global-tab-switch',
    'homecloud-scroll-offsets',
    'homecloud-1d-backend-enforcement',
    'homecloud-1d-capability-resolution',
    'homecloud-1d-frontend-projection',
    'homecloud-1d-new-household-capability-regression',
    'homecloud-1d-rls-bypass',
  ],
  'homecloud-st3': [
    'homecloud-st3-patch-favorites',
    'homecloud-st3-semantic-date-compile',
    'homecloud-st3-semantic-date',
    'homecloud-4c1-compile',
    'homecloud-lifecycle-backend-contract',
    'homecloud-p2-foundation',
    'frontend-typecheck',
  ],
  'homecloud-st4': [
    'homecloud-viewer-immersive',
    'homecloud-viewer-loading-states',
    'homecloud-viewer-no-nested-modal',
    'homecloud-hc2b-media-viewer-contract',
    'homecloud-viewer-android-back',
    'homecloud-global-tab-switch',
    'homecloud-selection-caller-context',
    'frontend-typecheck',
  ],
  'homecloud-st5': [
    'homecloud-st5-action-authority-compile',
    'homecloud-st5-action-authority',
    'homecloud-st5-viewer-action-menu',
    'homecloud-st5-favorite-actions',
    'homecloud-st5-written-share',
    'homecloud-st5-share-temp-cleanup',
    'homecloud-st5-multishare-contract',
    'frontend-typecheck',
  ],
  'homecloud-st9': [
    'homecloud-hc2b-media-viewer-contract',
    'homecloud-st9-media-reliability',
    'homecloud-viewer-immersive',
    'homecloud-viewer-loading-states',
    'homecloud-viewer-no-nested-modal',
    'frontend-typecheck',
  ],
  'homecloud-st10': [
    'homecloud-st10-image-zoom-compile',
    'homecloud-st10-image-zoom',
    'homecloud-st10-camera-compile',
    'homecloud-st10-camera',
    'homecloud-st10-intake-debt-compile',
    'homecloud-st10-intake-debt',
    'homecloud-st10-batch-compile',
    'homecloud-st10-batch',
    'homecloud-hc2b-media-viewer-contract',
    'homecloud-st9-media-reliability',
    'homecloud-viewer-immersive',
    'homecloud-viewer-loading-states',
    'homecloud-viewer-no-nested-modal',
    'homecloud-viewer-android-back',
    'homecloud-hc2c-memories-foundation',
    'homecloud-hc2a-memories-viewer',
    'homecloud-moa3-device-gestures',
    'homecloud-st3-semantic-date-compile',
    'homecloud-st3-semantic-date',
    'homecloud-st3-patch-favorites',
    'homecloud-st5-action-authority-compile',
    'homecloud-st5-action-authority',
    'homecloud-2c-frontend-structure',
    'homecloud-s0-gallery-intake-contract',
    'homecloud-s0-modal-host-contract',
    'homecloud-stage-a1-capture-recovery',
    'homecloud-p2-foundation',
    'homecloud-upload-recovery',
    'homecloud-t1-queue-persistence',
    'homecloud-t1-stale-job',
    'homecloud-s2i-durable-recovery',
    'homecloud-moa2-album-surface',
    'homecloud-moa1-album-contract',
    'homecloud-lifecycle-backend-contract',
    'homecloud-selection-caller-context',
    'frontend-typecheck',
    'frontend-lint',
  ],
  lint: ['backend-syntax', 'backend-eslint', 'frontend-lint'],
  backend: ['testing-core', 'core-backend'],
  frontend: ['compile-frontend-tests', 'core-frontend', 'g0.3'],
  contracts: ['core-backend', 'g0.4-contracts'],
  'core-backend': ['testing-core', 'core-backend'],
  'core-frontend': ['compile-frontend-tests', 'core-frontend'],
  core: ['testing-core', 'core-backend', 'compile-frontend-tests', 'core-frontend'],
  'homecloud-2a': ['homecloud-2a-backend-structure', 'homecloud-2a-intake-validation', 'homecloud-2a-runtime-intake', 'homecloud-2a-frontend-structure', 'compile-frontend-tests', 'homecloud-2a-upload-job', 'homecloud-upload-recovery'],
  'homecloud-recovery': ['homecloud-upload-recovery', 'homecloud-t1-queue-persistence', 'homecloud-t1-stale-job', 'homecloud-t2-d1-native-upload', 'homecloud-s2i-durable-recovery'],
  'homecloud-s2i': [
    'homecloud-s2i-durable-recovery',
    'homecloud-upload-recovery',
    'homecloud-t1-queue-persistence',
    'homecloud-t1-stale-job',
    'homecloud-t2-d1-native-upload',
    'homecloud-w1bc-pagination-reconciliation',
    'frontend-typecheck',
  ],
  'homecloud-t2-d1': ['homecloud-t2-d1-native-upload'],
  'homecloud-2c': ['homecloud-2c-intake-validation', 'homecloud-2c-runtime-intake', 'homecloud-2c-frontend-structure', 'compile-frontend-tests'],
  'homecloud-3e': ['compile-frontend-tests', 'homecloud-3e-scanner'],
  'homecloud-4a2': ['homecloud-4a2-written-validation', 'homecloud-4a2-schema', 'homecloud-4a2-written-runtime'],
  'homecloud-4b1': [
    'homecloud-4b1-memories-read-model',
    'homecloud-4b1-preview',
    'frontend-typecheck',
    'homecloud-4a2-written-validation',
    'homecloud-4a2-schema',
    'homecloud-4a2-written-runtime',
  ],
  'homecloud-4b2': [
    'compile-frontend-tests',
    'homecloud-4b2-timeline',
    'frontend-typecheck',
    'homecloud-4b1-memories-read-model',
    'homecloud-4b1-preview',
    'homecloud-4a2-written-validation',
  ],
'homecloud-4c1': [
    'homecloud-4c1-compile',
    'homecloud-4c1-memory-create',
    'homecloud-4c1-1-memory-create-recovery',
    'homecloud-s0-gallery-intake-contract',
    'homecloud-s0-modal-host-contract',
    'homecloud-stage-a1-capture-recovery',
    'homecloud-4b2-timeline',
    'homecloud-2c-frontend-structure',
    'homecloud-2a-upload-job',
    'homecloud-upload-recovery',
    'homecloud-w1a-authority',
    'homecloud-w1bc-pagination-reconciliation',
    'homecloud-w1c-scanner-acceptance',
    'frontend-typecheck',
  ],
  // MO-A1 gate. Every new MO-A1 evidence belongs here; there are no orphan
  // scripts. The two `*-runtime` members need a local Supabase and classify
  // themselves as RUNTIME_REQUIRED when it is not available.
  'homecloud-moa1': [
    'homecloud-moa1-album-contract',
    'homecloud-1f-dto-leak',
    'homecloud-moa1-album-runtime',
    'homecloud-4b1-memories-read-model',
    'homecloud-4b2-timeline',
    'homecloud-4a2-written-validation',
    'homecloud-4a2-written-runtime',
    'frontend-typecheck',
  ],
  // MO-A2 gate. Every new MO-A2 evidence belongs here; there are no orphan
  // scripts. It carries its own surface + runtime evidence AND the whole MO-A1
  // album contract, because the UI slice must never weaken the contract it
  // consumes. The two `*-runtime` members need a local Supabase and classify
  // themselves as RUNTIME_REQUIRED / ENVIRONMENT_FAILURE when it is not
  // available; they never degrade to a pretend pass.
  'homecloud-moa2': [
    'homecloud-moa2-album-surface',
    'homecloud-moa2-album-runtime',
    'homecloud-moa1-album-contract',
    'homecloud-moa1-album-runtime',
    'homecloud-1f-dto-leak',
    'homecloud-4b1-memories-read-model',
    'homecloud-4b1-preview',
    'homecloud-4b2-timeline',
    'homecloud-4a2-written-validation',
    'homecloud-4a2-written-runtime',
    'homecloud-4c1-1-memory-create-recovery',
    'homecloud-w1a-authority',
    'homecloud-w1bc-pagination-reconciliation',
    'frontend-typecheck',
  ],
  // MO-A3 gate. Every new MO-A3 evidence belongs here; there are no orphan
  // scripts. It carries its own selection + runtime evidence AND the whole MO-A2
  // / MO-A1 album contract, because the selection slice must never weaken the
  // contract it consumes. The three `*-runtime` members need a local Supabase and
  // classify themselves as ENVIRONMENT_FAILURE / RUNTIME_REQUIRED when it is not
  // available; they never degrade to a pretend pass.
  'homecloud-moa3': [
    'homecloud-moa3-selection',
    'homecloud-moa3-selection-runtime',
    'homecloud-moa3-device-gestures',
    'homecloud-moa2-album-surface',
    'homecloud-moa2-album-runtime',
    'homecloud-moa1-album-contract',
    'homecloud-moa1-album-runtime',
    'homecloud-1f-dto-leak',
    'homecloud-4b1-memories-read-model',
    'homecloud-4b1-preview',
    'homecloud-4b2-timeline',
    'homecloud-2c-frontend-structure',
    'homecloud-upload-recovery',
    'homecloud-w1a-authority',
    'homecloud-w1bc-pagination-reconciliation',
    'frontend-typecheck',
  ],
  'homecloud-w1': [
    'homecloud-w1a-authority',
    'homecloud-w1bc-pagination-reconciliation',
    'homecloud-w1c-scanner-acceptance',
    'homecloud-t1-stale-job',
    'homecloud-t1-queue-persistence',
    'homecloud-4b2-timeline',
    'frontend-typecheck',
  ],
  'homecloud-slice01': [
    'homecloud-slice01-auth-runtime',
    'homecloud-slice01-download-runtime',
    'homecloud-4c1-compile',
    'homecloud-stage-a1-capture-recovery',
    'homecloud-3e-scanner',
'homecloud-upload-recovery',
    'homecloud-t1-queue-persistence',
    'homecloud-t1-stale-job',
    'homecloud-slice01-integrity',
    'homecloud-slice01-storage-runtime',
  ],

  planner: ['compile-frontend-tests', 'g0.3', 'planner-v1-m1', 'planner-v1-m2', 'planner-v1-m3', 'planner-v1-m4', 'planner-v1-m5', 'planner-v1-m6', 'planner-v1-m7', 'planner-v1-m8', 'planner-v1-m9', 'planner-v1-m10', 'planner-v1-foundation', 'compile-planner-reliability-tests', 'planner-v1-reliability', 'compile-planner-reliability-frontend-tests', 'planner-v1-reliability-frontend', 'compile-planner-reliability-integration-tests', 'planner-v1-reliability-integration', 'planner-v1-frontend-core-integration', 'planner-v1-frontend-tasks', 'planner-v1-frontend-events', 'planner-v1-frontend-plans', 'planner-v1-plan-duplicate-dispatch', 'planner-p1-structure-contract', 'planner-p2a-milestone-editor', 'planner-v1-presets-drafts', 'planner-v1-presets-drafts-integration', 'planner-v1-s2-runtime-owner', 'planner-v1-s2-terminal-contract', 'planner-v1-s2-runtime-composition'],
  home: ['planner-v1-m9'],
  'planner-m1': ['compile-frontend-tests', 'planner-v1-m1'],
  'planner-m2': ['compile-frontend-tests', 'planner-v1-m2'],
  'planner-m3': ['compile-frontend-tests', 'planner-v1-m3'],
  'planner-m4': ['compile-frontend-tests', 'planner-v1-m4'],
  'planner-m5': ['compile-frontend-tests', 'planner-v1-m5'],
  'planner-m6': ['compile-frontend-tests', 'planner-v1-m6'],
  'planner-m7': ['compile-frontend-tests', 'planner-v1-m7'],
  'planner-m8': ['planner-v1-m8'],
  'planner-m9': ['planner-v1-m9'],
  'planner-m10': ['compile-frontend-tests', 'planner-v1-m10'],
  'planner-foundation': ['compile-frontend-tests', 'planner-v1-foundation'],
  'planner-reliability': ['compile-planner-reliability-tests', 'planner-v1-reliability'],
  'planner-reliability-frontend': ['compile-planner-reliability-frontend-tests', 'planner-v1-reliability-frontend'],
  'planner-reliability-integration': ['compile-planner-reliability-integration-tests', 'planner-v1-reliability-integration'],
  'planner-frontend-core-integration': ['compile-frontend-tests', 'planner-v1-frontend-core-integration'],
  'planner-frontend-tasks': ['compile-frontend-tests', 'planner-v1-frontend-tasks'],
  'planner-frontend-events': ['compile-frontend-tests', 'planner-v1-frontend-events'],
  'planner-frontend-plans': ['compile-frontend-tests', 'planner-v1-frontend-plans'],
  'planner-plan-duplicate-dispatch': ['compile-frontend-tests', 'planner-v1-plan-duplicate-dispatch'],
  'planner-p1-structure': ['compile-frontend-tests', 'planner-p1-structure-contract'],
  'planner-p1-structure-contract': ['compile-frontend-tests', 'planner-p1-structure-contract'],
  'planner-p2a-milestone-editor': ['compile-frontend-tests', 'planner-p2a-milestone-editor'],
  'planner-p1-structure-db': ['planner-p1-structure-db'],
  'finance-1b-contract': ['finance-1b-contract'],
  'finance-1b-database': ['finance-1b-database'],
  'finance-1c-ownership-privacy': ['finance-1c-ownership-privacy'],
  'finance-1d-source-context-boundary': ['finance-1d-source-context-boundary'],
  'finance-1e-frontend': ['compile-frontend-tests', 'finance-1e-frontend'],
  'finance-1f-integration': ['compile-frontend-tests', 'finance-1f-integration'],
  'finance-2a': ['finance-2a-transaction-contract'],
  'finance-2b': ['finance-2b-category-authority'],
  'finance-2c': ['finance-2c-expense-income'],
  'finance-2d': ['compile-frontend-tests', 'finance-2d-money-input'],
  'finance-2e': ['compile-frontend-tests', 'finance-2e-expense-income-ui', 'finance-2c-expense-income'],
  'finance-2f-read': ['finance-2f-read-authority'],
  'finance-2f-ui': ['compile-frontend-tests', 'finance-2f-ui'],
  'finance-2f': ['finance-2f-read-authority', 'compile-frontend-tests', 'finance-2f-ui'],
'finance-3a': ['finance-3a-account-authority'],
  'finance-3b': ['finance-3b-balance-anchor'],
  'finance-3c': ['finance-3c-balance-correction'],
  'finance-3d': ['finance-3d-credit-card-semantics'],
  'finance-3e': ['finance-3e-canonical-transfer'],
  'finance-3f': ['finance-3f-cross-currency-transfer'],
'finance-3g': ['finance-3g-transfer-commission-composition'],
  'finance-3h': ['compile-frontend-tests', 'finance-3h-account-transfer-ui'],
  'finance-4b': ['finance-4b-effect-status'],
  'finance-4c': ['finance-4c-lifecycle'],
  'finance-4d': ['finance-4d-trash'],
  'finance-4g': ['finance-4g-restore'],
  'finance-4i-b': ['finance-4i-b'],
  'finance-4j': ['compile-frontend-tests', 'finance-4j'],
'finance-5e-frontend': ['compile-frontend-tests', 'finance-5e-frontend'],
  'finance-5f': ['finance-5f-backend', 'compile-frontend-tests', 'finance-5f-frontend'],
  'finance-5g': ['compile-frontend-tests', 'finance-5g-frontend'],
  'finance-6c2': ['finance-6c2-pool-financial-integration'],
  'finance-6c1': ['finance-6c1-pool-foundation'],
  'finance-6c3': ['finance-6c3-spending-limit-foundation'],
'finance-6c4': ['finance-6c4-analysis-progress'],
  'finance-6d': ['compile-frontend-tests', 'finance-6d-resumen-dashboard'],
  'finance-6e1': ['compile-frontend-tests', 'finance-6e1-pool-management'],
  'finance-6e2': ['compile-frontend-tests', 'finance-6e2-expense-pool-frontend', 'finance-6c2-pool-financial-integration'],
  'finance-6e4': ['compile-frontend-tests', 'finance-6e4-category-pool-default-frontend'],
  'finance-6f': ['compile-frontend-tests', 'finance-6f-spending-limits-frontend'],
  'finance-7d': ['compile-frontend-tests', 'finance-7d-unified-movements-frontend'],
  finance: ['compile-frontend-tests', 'finance-1b-contract', 'finance-1b-database', 'finance-1c-ownership-privacy', 'finance-1d-source-context-boundary', 'finance-1e-frontend', 'finance-1f-integration', 'finance-2a-transaction-contract', 'finance-2b-category-authority', 'finance-2c-expense-income', 'finance-2d-money-input', 'finance-2e-expense-income-ui', 'finance-2f-read-authority', 'finance-2f-ui', 'finance-3a-account-authority', 'finance-3b-balance-anchor', 'finance-3c-balance-correction', 'finance-3d-credit-card-semantics', 'finance-3e-canonical-transfer', 'finance-3f-cross-currency-transfer', 'finance-3g-transfer-commission-composition', 'finance-3h-account-transfer-ui', 'finance-4b-effect-status', 'finance-4c-lifecycle', 'finance-4d-trash', 'finance-4g-restore', 'finance-4i-b', 'finance-4j', 'finance-5e-frontend', 'finance-5f', 'finance-5g', 'finance-6d', 'finance-6e1', 'finance-6f'],
  'planner-presets-drafts': ['compile-frontend-tests', 'planner-v1-presets-drafts'],
  'planner-presets-drafts-integration': ['compile-frontend-tests', 'planner-v1-presets-drafts-integration'],
  'planner-shared-s2-runtime': ['compile-frontend-tests', 'planner-v1-s2-runtime-owner'],
  'planner-shared-s2-terminal': ['compile-frontend-tests', 'planner-v1-s2-terminal-contract'],
  'planner-shared-s2-composition': ['compile-frontend-tests', 'planner-v1-s2-runtime-composition'],
  'g0.3': ['compile-frontend-tests', 'g0.3'],
  'g0.4': ['g0.4-contracts', 'g0.4-db', 'integration-g0.4'],
  'feature-flags': ['g0.4-contracts'],
  telemetry: ['g0.4-contracts'],
  'audit-outbox': ['g0.4-contracts', 'g0.4-db'],
  quality: [
    'frontend-typecheck', 'test-typecheck', 'backend-syntax', 'migration-uniqueness', 'backend-eslint', 'frontend-lint',
    'testing-core', 'core-backend', 'compile-frontend-tests', 'core-frontend', 'g0.3',
    'g0.4-contracts', 'runtime-smoke', 'db', 'coverage', 'secrets', 'ci-syntax', 'whitespace',
  ],
  g0: [
    'frontend-typecheck', 'test-typecheck', 'backend-syntax', 'backend-eslint', 'frontend-lint',
    'testing-core', 'core-backend', 'compile-frontend-tests', 'core-frontend', 'g0.3',
    'g0.4-contracts', 'db', 'coverage', 'secrets', 'ci-syntax', 'whitespace', 'integration-all',
  ],
};

async function main() {
  process.chdir(repositoryRoot);
  const suiteName = process.argv[2];
  const suite = suites[suiteName];
  if (!suite) {
    console.error(`Unknown suite: ${suiteName || '[missing]'}`);
    console.error(`Available: ${Object.keys(suites).sort().join(', ')}`);
    process.exitCode = 2;
    return;
  }
  const startedAt = Date.now();
  for (const commandName of suite) commands[commandName]();
  console.log(`\nHOMEPLUS TEST SUITE: ${suiteName} PASSED (${suite.length} commands, ${Date.now() - startedAt} ms)`);
}

main().catch((error) => {
  console.error(`HOMEPLUS TEST SUITE: FAILED (${error.message})`);
  process.exitCode = error.exitCode || 1;
});
