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
const moreScreen = read('front/mi-front-limpio/screens/MoreScreen.tsx');

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
assert.match(presenceService, /sharing_enabled !== false/);
assert.match(presenceService, /latitude < -90 \|\| latitude > 90/);

assert.match(presenceClient, /\/api\/presence\/locations/);
assert.match(presenceClient, /\/api\/presence\/location/);
assert.match(presenceScreen, /Location\.requestForegroundPermissionsAsync/);
assert.match(presenceScreen, /Location\.watchPositionAsync/);
assert.match(presenceScreen, /timeInterval: 60000/);
assert.match(presenceScreen, /distanceInterval: 100/);
assert.match(presenceScreen, /react-native-maps/);
assert.match(presenceScreen, /postgres_changes/);
assert.doesNotMatch(presenceScreen, /mock/i);
assert.match(moreScreen, /screen: 'Presence'/);

console.log('Presence live location contract PASS');
