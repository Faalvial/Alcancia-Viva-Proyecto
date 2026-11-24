import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANT_SPECIES, plantKindsFrom, plantKindOf, speciesOf, DEFAULT_PLANT } from '../src/live/plants.ts';

test('cada especie tiene seis etapas y seis mensajes, sin juicios', () => {
  for (const species of PLANT_SPECIES) {
    assert.equal(species.stages.length, 6, species.id);
    assert.equal(species.messages.length, 6, species.id);
    for (const text of species.messages) assert.doesNotMatch(text, /demasiado|mal|marchit|muri|error/i);
  }
});

test('la elección guardada se lee con tolerancia y el cosmos es el valor por defecto', () => {
  assert.deepEqual(plantKindsFrom(null), {});
  assert.deepEqual(plantKindsFrom({ plantKinds: 'x' }), {});
  assert.deepEqual(plantKindsFrom({ plantKinds: { a: 'arbol', b: 'roble', c: 7 } }), { a: 'arbol' });
  assert.equal(plantKindOf({ a: 'cactus' }, 'a'), 'cactus');
  assert.equal(plantKindOf({}, 'z'), DEFAULT_PLANT);
  assert.equal(speciesOf('nada').id, 'cosmos');
});
