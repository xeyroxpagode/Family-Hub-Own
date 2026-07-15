/**
 * SEED-DEMO-1: Safe demo seed for Familia 1 test
 * 
 * This script:
 * - Finds existing auth users by email
 * - Creates/updates people rows linked to auth users
 * - Cleans previous demo data for household slug 'familia-1-test'
 * - Creates demo household, memberships, tasks, and events
 * - Is safe to run multiple times (idempotent)
 * 
 * Required env vars:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL=' + (SUPABASE_URL ? '[SET]' : '[MISSING]'));
  console.error('   SUPABASE_SERVICE_ROLE_KEY=' + (SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : '[MISSING]'));
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const DEMO_HOUSEHOLD_SLUG = 'familia-1-test';
const DEMO_HOUSEHOLD_NAME = 'Familia 1 test';

const DEMO_USERS = [
  {
    email: 'donalsmac59@gmail.com',
    displayName: 'Donals Mac',
    role: 'coordinator',
  },
  {
    email: 'gabrieldb008@gmail.com',
    displayName: 'Gabriel DB',
    role: 'adult',
  },
  {
    email: 'gtechituzaingo@gmail.com',
    displayName: 'GTech Ituzaingó',
    role: 'child',
  },
  {
    email: 'resoypobre@gmail.com',
    displayName: 'Soy Re Pobre',
    role: 'adolescent',
  },
];

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const YESTERDAY = new Date(TODAY);
YESTERDAY.setDate(YESTERDAY.getDate() - 1);

const TOMORROW = new Date(TODAY);
TOMORROW.setDate(TOMORROW.getDate() + 1);

const IN_2_DAYS = new Date(TODAY);
IN_2_DAYS.setDate(IN_2_DAYS.getDate() + 2);

const IN_3_DAYS = new Date(TODAY);
IN_3_DAYS.setDate(IN_3_DAYS.getDate() + 3);

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

async function findOrCreateAuthUser(email, displayName) {
  try {
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser && !fetchError) {
      return existingUser;
    }
  } catch {
    console.log(`   Note: Could not fetch user ${email}, attempting to create...`);
  }

  const tempPassword = 'Demo123456!';
  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      nombre: displayName,
    },
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log(`   ⚠ User ${email} exists in auth but not accessible via RLS. Attempting workaround...`);
      const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 100,
      });

      if (allUsers && allUsers.users) {
        const foundUser = allUsers.users.find(u => u.email === email);
        if (foundUser) {
          console.log(`   ✓ Found user via listUsers: ${displayName} (${email})`);
          return foundUser;
        }
      }
    }
    throw new Error(`Failed to create auth user ${email}: ${error.message}`);
  }

  console.log(`   ✓ Created auth user: ${displayName} (${email})`);
  return newUser.user;
}

async function findAuthUserByEmail(email) {
  try {
    const { data, error } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function findOrCreatePerson(authUserId, displayName) {
  const { data: existingPerson } = await supabaseAdmin
    .from('people')
    .select('id, display_name, auth_user_id')
    .eq('auth_user_id', authUserId)
    .single();

  if (existingPerson) {
    const { data: updatedPerson, error } = await supabaseAdmin
      .from('people')
      .update({
        display_name: displayName,
      })
      .eq('id', existingPerson.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update person: ${error.message}`);
    }
    console.log(`   ✓ Updated person: ${displayName} (id: ${updatedPerson.id})`);
    return updatedPerson;
  }

  const { data: newPerson, error } = await supabaseAdmin
    .from('people')
    .insert({
      auth_user_id: authUserId,
      display_name: displayName,
      default_language: 'es-419',
      personal_settings: {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create person: ${error.message}`);
  }
  console.log(`   ✓ Created person: ${displayName} (id: ${newPerson.id})`);
  return newPerson;
}

async function cleanupExistingDemoData() {
  console.log('\n📋 Step 1: Cleaning up existing demo data...');

  const { data: existingHousehold } = await supabaseAdmin
    .from('households')
    .select('id, name, slug')
    .eq('slug', DEMO_HOUSEHOLD_SLUG)
    .single();

  if (existingHousehold) {
    console.log(`   Found existing demo household: "${existingHousehold.name}" (slug: ${existingHousehold.slug}, id: ${existingHousehold.id})`);

    console.log('   Deleting planner tasks...');
    const { error: deleteTasksError } = await supabaseAdmin
      .from('planner_tasks')
      .delete()
      .eq('household_id', existingHousehold.id);
    if (deleteTasksError) {
      console.error(`   ⚠ Error deleting tasks: ${deleteTasksError.message}`);
    }

    console.log('   Deleting planner events...');
    const { error: deleteEventsError } = await supabaseAdmin
      .from('planner_events')
      .delete()
      .eq('household_id', existingHousehold.id);
    if (deleteEventsError) {
      console.error(`   ⚠ Error deleting events: ${deleteEventsError.message}`);
    }

    console.log('   Clearing active_household_id for people...');
    const { error: clearActiveHouseholdError } = await supabaseAdmin
      .from('people')
      .update({ active_household_id: null })
      .eq('active_household_id', existingHousehold.id);
    if (clearActiveHouseholdError) {
      console.error(`   ⚠ Error clearing active_household_id: ${clearActiveHouseholdError.message}`);
    }

    console.log('   Deleting household members...');
    const { error: deleteMembersError } = await supabaseAdmin
      .from('household_members')
      .delete()
      .eq('household_id', existingHousehold.id);
    if (deleteMembersError) {
      console.error(`   ⚠ Error deleting members: ${deleteMembersError.message}`);
    }

    console.log('   Deleting household invite links...');
    const { error: deleteInviteLinksError } = await supabaseAdmin
      .from('household_invite_links')
      .delete()
      .eq('household_id', existingHousehold.id);
    if (deleteInviteLinksError) {
      console.error(`   ⚠ Error deleting invite links: ${deleteInviteLinksError.message}`);
    }

    console.log('   Deleting household...');
    const { error: deleteHouseholdError } = await supabaseAdmin
      .from('households')
      .delete()
      .eq('id', existingHousehold.id);
    if (deleteHouseholdError) {
      console.error(`   ⚠ Error deleting household: ${deleteHouseholdError.message}`);
      throw new Error(`Failed to delete existing household: ${deleteHouseholdError.message}`);
    }

    console.log(`   ✓ Cleaned up demo household: ${existingHousehold.id}`);
  } else {
    console.log('   No existing demo household found. Proceeding with fresh insert.');
  }
}

async function seedDemoHousehold(coordinatorPersonId) {
  console.log('\n📋 Step 2: Creating demo household...');

  const { data: household, error } = await supabaseAdmin
    .from('households')
    .insert({
      name: DEMO_HOUSEHOLD_NAME,
      slug: DEMO_HOUSEHOLD_SLUG,
      timezone: 'America/Argentina/Buenos_Aires',
      default_language: 'es-419',
      config: {},
      created_by_person_id: coordinatorPersonId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create household: ${error.message}`);
  }

  console.log(`   ✓ Created household: "${household.name}" (id: ${household.id}, slug: ${household.slug})`);
  return household;
}

async function seedHouseholdMembers(householdId, peopleData) {
  console.log('\n📋 Step 3: Creating household memberships...');

  const memberships = [];

  for (const personData of peopleData) {
    const { data: membership, error } = await supabaseAdmin
      .from('household_members')
      .insert({
        household_id: householdId,
        person_id: personData.person.id,
        role: personData.role,
        status: 'active',
        joined_at: new Date().toISOString(),
        household_onboarding_status: 'completed',
        household_onboarding_completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create membership for ${personData.person.display_name}: ${error.message}`);
    }

    console.log(`   ✓ Created membership: ${personData.person.display_name} as ${personData.role} (id: ${membership.id})`);
    memberships.push(membership);

    const { error: updatePersonError } = await supabaseAdmin
      .from('people')
      .update({
        active_household_id: householdId,
        app_onboarding_status: 'completed',
        app_onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', personData.person.id);

    if (updatePersonError) {
      console.error(`   ⚠ Warning: Could not update active_household_id for ${personData.person.display_name}: ${updatePersonError.message}`);
    }
  }

  return memberships;
}

async function seedDemoTasks(householdId, peopleByRole, membershipsByPersonId) {
  console.log('\n📋 Step 4: Creating demo tasks...');

  const tasks = [
    {
      title: 'Ordenar la cocina',
      description: 'Dejar mesada limpia y guardar lo usado.',
      assignedToEmail: 'resoypobre@gmail.com',
      status: 'awaiting_verification',
      priority: 'high',
      dueDate: toDateStr(TODAY),
      requiresVerification: true,
    },
    {
      title: 'Sacar la basura',
      description: 'Bajar las bolsas antes de la noche.',
      assignedToEmail: 'gabrieldb008@gmail.com',
      status: 'pending',
      priority: 'high',
      dueDate: toDateStr(YESTERDAY),
      requiresVerification: false,
    },
    {
      title: 'Preparar mochila del colegio',
      description: 'Revisar cuadernos, cartuchera y botella de agua.',
      assignedToEmail: 'gtechituzaingo@gmail.com',
      status: 'pending',
      priority: 'medium',
      dueDate: toDateStr(TODAY),
      requiresVerification: false,
    },
    {
      title: 'Comprar leche y pan',
      description: 'Agregar al pedido de compras del hogar.',
      assignedToEmail: 'donalsmac59@gmail.com',
      status: 'pending',
      priority: 'medium',
      dueDate: toDateStr(TODAY),
      requiresVerification: false,
    },
    {
      title: 'Lavar ropa blanca',
      description: 'Separar ropa clara y tender al terminar.',
      assignedToEmail: 'gabrieldb008@gmail.com',
      status: 'pending',
      priority: 'medium',
      dueDate: toDateStr(IN_2_DAYS),
      requiresVerification: false,
    },
    {
      title: 'Regar las plantas',
      description: 'Regar plantas del balcón.',
      assignedToEmail: 'resoypobre@gmail.com',
      status: 'completed',
      priority: 'low',
      dueDate: toDateStr(YESTERDAY),
      requiresVerification: false,
    },
  ];

  const coordinatorPerson = peopleByRole['coordinator'];

  for (const taskData of tasks) {
    const assignedPerson = peopleByRole[DEMO_USERS.find(u => u.email === taskData.assignedToEmail).role];
    const assignedMember = membershipsByPersonId[assignedPerson.id];

    let completedByPersonId = null;
    let completedAt = null;

    if (taskData.status === 'completed' || taskData.status === 'verified') {
      completedByPersonId = assignedPerson.id;
      completedAt = new Date().toISOString();
    }

    const { data: task, error } = await supabaseAdmin
      .from('planner_tasks')
      .insert({
        household_id: householdId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.dueDate,
        requires_verification: taskData.requiresVerification,
        created_by_person_id: coordinatorPerson.id,
        assigned_to_member_id: assignedMember ? assignedMember.id : null,
        completed_by_person_id: completedByPersonId,
        completed_at: completedAt,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task "${taskData.title}": ${error.message}`);
    }

    console.log(`   ✓ Created task: "${task.title}" (${task.status}, ${task.priority}) → ${assignedPerson.display_name}`);
  }

  console.log(`   ✓ Created ${tasks.length} demo tasks`);
}

async function seedDemoEvents(householdId, coordinatorPerson) {
  console.log('\n📋 Step 5: Creating demo events...');

  const events = [
    {
      title: 'Cena familiar',
      description: 'Cena para organizar la semana.',
      startsAt: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 20, 30),
      endsAt: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 22, 0),
      locationName: 'Casa',
      recurrence: 'none',
    },
    {
      title: 'Reunión del colegio',
      description: 'Revisar horarios y pendientes.',
      startsAt: new Date(TOMORROW.getFullYear(), TOMORROW.getMonth(), TOMORROW.getDate(), 9, 30),
      endsAt: new Date(TOMORROW.getFullYear(), TOMORROW.getMonth(), TOMORROW.getDate(), 10, 30),
      locationName: 'Colegio',
      recurrence: 'none',
    },
    {
      title: 'Compra semanal',
      description: 'Reponer básicos de la casa.',
      startsAt: new Date(IN_3_DAYS.getFullYear(), IN_3_DAYS.getMonth(), IN_3_DAYS.getDate(), 18, 0),
      endsAt: new Date(IN_3_DAYS.getFullYear(), IN_3_DAYS.getMonth(), IN_3_DAYS.getDate(), 19, 0),
      locationName: 'Supermercado',
      recurrence: 'none',
    },
  ];

  for (const eventData of events) {
    const { data: event, error } = await supabaseAdmin
      .from('planner_events')
      .insert({
        household_id: householdId,
        title: eventData.title,
        description: eventData.description,
        status: 'scheduled',
        starts_at: eventData.startsAt.toISOString(),
        ends_at: eventData.endsAt.toISOString(),
        all_day: false,
        location_name: eventData.locationName,
        recurrence: eventData.recurrence,
        created_by_person_id: coordinatorPerson.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create event "${eventData.title}": ${error.message}`);
    }

    console.log(`   ✓ Created event: "${event.title}" (${event.starts_at.split('T')[0]})`);
  }

  console.log(`   ✓ Created ${events.length} demo events`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SEED-DEMO-1: Safe demo seed for Familia 1 test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n🔍 Connecting to Supabase: ${SUPABASE_URL}`);

  try {
    console.log('\n📋 Step 0: Finding or creating auth users...');
    const authUsers = [];

    for (const userData of DEMO_USERS) {
      let authUser = await findAuthUserByEmail(userData.email);
      
      if (!authUser) {
        console.log(`   Auth user not found, creating: ${userData.email}`);
        authUser = await findOrCreateAuthUser(userData.email, userData.displayName);
      } else {
        console.log(`   ✓ Found auth user: ${userData.displayName} (${userData.email})`);
      }
      
      authUsers.push({ ...userData, authUserId: authUser.id });
    }

    console.log('\n📋 Step 0b: Creating/updating people...');
    const peopleByRole = {};
    const peopleByEmail = {};

    for (const userData of authUsers) {
      const person = await findOrCreatePerson(userData.authUserId, userData.displayName);
      peopleByRole[userData.role] = person;
      peopleByEmail[userData.email] = person;
    }

    await cleanupExistingDemoData();

    const coordinatorPerson = peopleByRole['coordinator'];
    const household = await seedDemoHousehold(coordinatorPerson.id);

    const peopleData = authUsers.map(u => ({
      person: peopleByEmail[u.email],
      role: u.role,
    }));

    const memberships = await seedHouseholdMembers(household.id, peopleData);

    const membershipsByPersonId = {};
    for (const membership of memberships) {
      membershipsByPersonId[membership.person_id] = membership;
    }

    await seedDemoTasks(household.id, peopleByRole, membershipsByPersonId);

    await seedDemoEvents(household.id, coordinatorPerson);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SEED COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📊 Summary:`);
    console.log(`   • Auth users found: ${authUsers.length}`);
    console.log(`   • People created/updated: ${Object.keys(peopleByRole).length}`);
    console.log(`   • Household created: "${household.name}" (${household.slug})`);
    console.log(`   • Memberships created: ${memberships.length}`);
    console.log(`   • Tasks created: 6`);
    console.log(`   • Events created: 3`);
    console.log(`\n🏠 Demo household details:`);
    console.log(`   • Name: ${household.name}`);
    console.log(`   • Slug: ${household.slug}`);
    console.log(`   • ID: ${household.id}`);
    console.log(`   • Timezone: ${household.timezone}`);
    console.log(`   • Language: ${household.default_language}`);
    console.log(`\n👥 Members:`);
    for (const userData of authUsers) {
      console.log(`   • ${peopleByEmail[userData.email].display_name} → ${userData.role}`);
    }
    console.log('\n✨ Seed is safe to run multiple times (idempotent).');
    console.log('   Run again with: npm run seed:demo\n');

  } catch (error) {
    console.error('\n❌ SEED FAILED');
    console.error('   Error:', error.message);
    console.error('\n   Stack:', error.stack);
    process.exit(1);
  }
}

main();
