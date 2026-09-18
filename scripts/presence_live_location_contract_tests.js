'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const migration = read('supabase/migrations/20260821010000_presence_live_location_mvp.sql');
const backendIndex = read('backend/index.js');
const presenceService = read('backend/src/services/presence.locations.service.js');
const presenceRoute = read('backend/src/routes/presence.js');
const presenceScreen = read('front/mi-front-limpio/screens/presence/PresenceScreen.tsx');
const presenceClient = read('front/mi-front-limpio/services/presence.ts');
const locationSharing = read('front/mi-front-limpio/services/presenceLocationSharing.ts');
const realtimeRepair = read('supabase/migrations/20260917000100_presence_location_household_realtime_repair.sql');

assert.match(migration, /create table if not exists public\.presence_member_locations/);
assert.match(migration, /alter table public\.presence_member_locations enable row level security/);
assert.match(migration, /public\.is_active_household_member\(household_id\)/);
assert.match(migration, /person_id = public\.current_person_id\(\)/);
assert.match(migration, /alter publication supabase_realtime add table public\.presence_member_locations/);
assert.doesNotMatch(migration, /history|geofence|places/i);

assert.match(backendIndex, /app\.use\('\/api\/presence', presenceRoutes\)/);
assert.match(presenceRoute, /router\.use\(authFinalMiddleware\)/);
assert.match(presenceRoute, /router\.get\('\/locations'/);
assert.match(presenceRoute, /router\.put\('\/location'/);
assert.match(presenceService, /getPlannerContext|household_people_public|presence_member_locations/s);
assert.match(presenceService, /STALE_AFTER_MINUTES = 10/);
assert.match(presenceService, /payload\.sharing_enabled === false/);
assert.match(presenceService, /presence_updated_at: location\?\.updated_at \?\? null/);
assert.match(presenceService, /onConflict: 'membership_id'/);
assert.match(presenceService, /latitude < -90 \|\| latitude > 90/);

assert.match(realtimeRepair, /replica identity full/);
assert.match(realtimeRepair, /drop policy if exists "presence_locations_select_visible_only"/);
assert.match(realtimeRepair, /public\.is_active_household_member\(household_id\)/);
assert.match(realtimeRepair, /sharing_enabled = true/);

assert.match(presenceClient, /\/api\/presence\/locations/);
assert.match(presenceClient, /\/api\/presence\/location/);
assert.match(presenceClient, /mergePresenceMembers/);
assert.match(presenceClient, /shouldApplyPresenceMember/);
assert.match(locationSharing, /Location\.requestForegroundPermissionsAsync/);
assert.match(locationSharing, /Location\.watchPositionAsync/);
assert.match(locationSharing, /timeInterval: MINIMUM_PUBLISH_INTERVAL_MS/);
assert.match(locationSharing, /distanceInterval: MINIMUM_PUBLISH_DISTANCE_METERS/);
assert.match(presenceScreen, /react-native-maps/);
assert.match(presenceScreen, /postgres_changes/);
assert.match(presenceScreen, /shouldApplyPresenceMember/);
assert.doesNotMatch(presenceScreen, /mock/i);

console.log('Presence live location contract PASS');
