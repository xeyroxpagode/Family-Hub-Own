'use strict';

// The validation helper imports the Supabase factory, but these input-only
// contracts never make a network call. Supply inert values for a standalone test.
process.env.SUPABASE_URL ??= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key';

const { validateRegisterInput } = require('../backend/src/lib/auth.service');

let failures = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`PASS: ${label}`);
    return;
  }
  failures += 1;
  console.error(`FAIL: ${label}`);
}

function rejects(input, expectedCode) {
  try {
    validateRegisterInput(input);
    return false;
  } catch (error) {
    return error.code === expectedCode;
  }
}

const validRegistration = {
  email: 'valeria@example.com',
  password: 'password-segura',
  display_name: 'Valeria García',
  first_name: 'Valeria',
  last_name: 'García',
};

try {
  validateRegisterInput(validRegistration);
  assert(true, 'registro acepta nombre y apellido válidos');
} catch {
  assert(false, 'registro acepta nombre y apellido válidos');
}

assert(
  rejects({ ...validRegistration, first_name: '' }, 'first_name_required'),
  'registro exige nombre',
);
assert(
  rejects({ ...validRegistration, last_name: '' }, 'last_name_required'),
  'registro exige apellido',
);
assert(
  !rejects({ ...validRegistration, phone: undefined, date_of_birth: undefined }, 'unexpected'),
  'registro no exige teléfono ni cumpleaños',
);

if (failures > 0) process.exitCode = 1;
else console.log('PROFILE SETTINGS CONTRACTS PASSED');
