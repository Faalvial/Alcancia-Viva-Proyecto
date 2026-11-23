/** Piezas compartidas por el acceso y el espacio con sesión. */
export function BrandIcon() {
  return <img className="av-brand-icon" src="/brand/piggy-bank.svg" alt="" aria-hidden="true" width={40} height={40}/>;
}

export const errorMessage = (e:unknown) => e instanceof Error ? e.message : 'No pudimos completar la acción. Conservamos tus datos para reintentar.';
