/** Piezas compartidas por el acceso y el espacio con sesión. */
export function BrandIcon() {
  return <img className="av-brand-icon" src="/brand/piggy-bank.svg" alt="" aria-hidden="true" width={40} height={40}/>;
}

import { friendlyError } from './errors';
export const errorMessage = (e:unknown) => friendlyError(e);
