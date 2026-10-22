/**
 * Evidence seed for the Block 1 + Block 2 runtime reconciliation.
 *
 * It prepares the LOCAL stack only:
 * - the demo user can sign in with the known password;
 * - the demo household is the active household of the coordinator;
 * - the Inventory has locations and products, so the Products root, the
 *   product flow, the shopping list and the purchase flow are real.
 *
 * It never touches the application code.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL = 'donalsmac59@gmail.com';
const PASSWORD = 'Demo123456!';
const SLUG = 'familia-1-test';

const identity = () => {
  const value = `seed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { mutationId: value, idempotencyKey: value };
};

async function main() {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = (list?.users ?? []).find((candidate) => candidate.email === EMAIL);
  if (!user) {
    const created = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true });
  }
  console.log('user ready', user.id);

  const { data: household } = await admin
    .from('households')
    .select('id,name')
    .eq('slug', SLUG)
    .maybeSingle();
  if (!household) throw new Error('the demo household is missing');
  console.log('household', household.id);

  const { error: personError } = await admin
    .from('people')
    .update({ active_household_id: household.id })
    .eq('auth_user_id', user.id);
  if (personError) console.error('people update', personError.message);

  const { data: membership } = await admin
    .from('household_members')
    .select('person_id,role')
    .eq('household_id', household.id)
    .limit(1)
    .maybeSingle();
  console.log('membership', JSON.stringify(membership));

  const { data: existingLocations } = await admin
    .from('inventory_locations')
    .select('id,name')
    .eq('household_id', household.id);
  let locations = existingLocations ?? [];
  if (locations.length === 0) {
    const { data: created, error } = await admin
      .from('inventory_locations')
      .insert([
        { household_id: household.id, name: 'Cocina', icon_key: 'restaurant-outline', sort_order: 0 },
        { household_id: household.id, name: 'Despensa', icon_key: 'cube-outline', sort_order: 1 },
      ])
      .select();
    if (error) throw error;
    locations = created;
  }
  console.log('locations', locations.length);

  const { count } = await admin
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', household.id);
  if (!count) {
    const rows = [
      ['Leche', 2, 'low_stock_threshold'],
      ['Arroz', 1, 'low_stock_threshold'],
      ['Café', 1, 'low_stock_threshold'],
      ['Papel higiénico', 3, 'low_stock_threshold'],
      ['Detergente', 1, 'low_stock_threshold'],
    ].map(([name, quantity], index) => ({
      household_id: household.id,
      name,
      quantity,
      location_id: locations[index % locations.length].id,
      low_stock_threshold: 1,
      target_quantity: 4,
      category_key: 'other',
      auto_restock_enabled: false,
      created_by_person_id: membership?.person_id ?? null,
    }));
    const { error } = await admin.from('inventory_items').insert(rows);
    if (error) console.error('items', error.message);
    console.log('items inserted', rows.length);
  } else {
    console.log('items already present', count);
  }

  console.log('identity', JSON.stringify(identity()));
}

main().catch((error) => {
  console.error('SEED FAILED', error);
  process.exit(1);
});
