'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const migration = [
  read('supabase/migrations/20260821010000_presence_live_location_mvp.sql'),
  read('supabase/migrations/20260904010000_presence_privacy_history_places_mvp.sql'),
].join('\n');
const backendIndex = read('backend/index.js');
const presenceService = read('backend/src/services/presence.locations.service.js');
const presenceRoute = read('backend/src/routes/presence.js');
const presenceScreen = read('front/mi-front-limpio/screens/presence/PresenceScreen.tsx');
const presenceClient = read('front/mi-front-limpio/services/presence.ts');
const familyScreen = read('front/mi-front-limpio/screens/FamilyScreen.tsx');
const moreScreen = read('front/mi-front-limpio/screens/MoreScreen.tsx');

assert.match(migration, /create table if not exists public\.presence_member_locations/);
assert.match(migration, /sharing_mode in \('off', 'foreground', 'background'\)/);
assert.match(migration, /create table if not exists public\.location_share_grants/);
assert.match(migration, /create table if not exists public\.minor_location_guardians/);
assert.match(migration, /create table if not exists public\.location_samples/);
assert.match(migration, /create table if not exists public\.places/);
assert.match(migration, /create table if not exists public\.geofence_events/);
assert.match(migration, /create table if not exists public\.place_alert_subscriptions/);
assert.match(migration, /public\.can_view_presence/);
assert.match(migration, /process_presence_geofence_transition/);

assert.match(backendIndex, /app\.use\('\/api\/presence', presenceRoutes\)/);
assert.match(presenceRoute, /router\.get\('\/locations'/);
assert.match(presenceRoute, /router\.put\('\/location'/);
assert.match(presenceRoute, /members\/:membershipId\/history/);
assert.match(presenceRoute, /router\.get\('\/places'/);
assert.match(presenceService, /SHARE_MODES/);
assert.match(presenceService, /BACKGROUND_MIN_INTERVAL_MS/);
assert.match(presenceService, /location_samples/);

assert.match(presenceClient, /PresenceSharingMode/);
assert.match(presenceScreen, /requestForegroundLocationPermission/);
assert.match(presenceScreen, /startBackgroundSharing/);
assert.match(presenceScreen, /timeInterval: 15000/);
assert.match(presenceScreen, /distanceInterval: 15/);
assert.match(presenceScreen, /react-native-maps/);
assert.match(familyScreen, /FamilyMapPanel embedded/);
assert.doesNotMatch(moreScreen, /screen: 'Presence'/);

console.log('Presence privacy and location contract PASS');
