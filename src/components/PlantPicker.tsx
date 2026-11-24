import React, { useId } from 'react';
import { PLANT_SPECIES, speciesOf } from '../live/plants';
import type { PlantKind } from '../live/plants';
import { PlantThumb } from './PlantArt';

/**
 * Elección de la planta de una meta (radios nativos: flechas del teclado, lector de
 * pantalla y 44 px). Controlado con `value`/`onChange`, o dentro de un formulario con
 * `name` y `defaultValue`.
 */
export function PlantPicker({ value, defaultValue, name, onChange, disabled, legend = '¿Cómo quieres que crezca esta meta?' }:{
  value?: PlantKind; defaultValue?: PlantKind; name?: string; onChange?: (kind: PlantKind) => void; disabled?: boolean; legend?: string;
}) {
  const id = useId();
  const [local, setLocal] = React.useState<PlantKind>(value || defaultValue || 'cosmos');
  const current = value || local;
  return <fieldset className="ag-plant-picker" disabled={disabled}>
    <legend>{legend}</legend>
    <p>Elige la planta que represente tu avance. Puedes cambiarla cuando quieras; tu ahorro no cambia.</p>
    <div className="ag-plant-options">
      {PLANT_SPECIES.map(species => <label key={species.id} className="ag-plant-option">
        <input type="radio" name={name || `plant-${id}`} value={species.id} checked={current === species.id}
          onChange={() => { setLocal(species.id); onChange?.(species.id); }} />
        <PlantThumb kind={species.id} />
        <span>{species.name}</span>
      </label>)}
    </div>
    <p className="ag-plant-symbol" aria-live="polite">{speciesOf(current).symbol}</p>
  </fieldset>;
}
