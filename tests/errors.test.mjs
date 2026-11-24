import test from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError, amountProblem, GENERIC_ERROR, NETWORK_ERROR, amountTooLarge } from '../src/live/errors.ts';

test('traduce errores de Supabase y de red a español', () => {
  assert.equal(friendlyError(new TypeError('Failed to fetch')), NETWORK_ERROR);
  assert.equal(friendlyError({ name: 'AuthApiError', message: 'User already registered', status: 422, code: 'user_already_exists' }), 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.');
  assert.equal(friendlyError({ name: 'AuthApiError', message: 'Invalid login credentials', status: 400 }), 'Correo o contraseña incorrectos.');
  assert.match(friendlyError({ name: 'AuthApiError', message: 'email rate limit exceeded', status: 429 }), /Espera/);
  assert.match(friendlyError({ name: 'AuthWeakPasswordError', message: 'Password should be at least 6 characters.', status: 422 }), /6 caracteres/);
  assert.equal(friendlyError({ code: '22003', message: 'numeric field overflow' }), amountTooLarge);
  assert.equal(friendlyError({ code: 'P0001', message: 'Selecciona una meta válida' }), 'Selecciona una meta válida');
  assert.equal(friendlyError({ code: 'XX999', message: 'something internal' }), GENERIC_ERROR);
  assert.equal(friendlyError(new Error('Indica la categoría.')), 'Indica la categoría.');
  assert.equal(friendlyError(null), GENERIC_ERROR);
});

test('valida montos', () => {
  assert.equal(amountProblem(25), null);
  assert.ok(amountProblem(0));
  assert.ok(amountProblem(Number.NaN));
  assert.equal(amountProblem(5_000_000), amountTooLarge);
});
