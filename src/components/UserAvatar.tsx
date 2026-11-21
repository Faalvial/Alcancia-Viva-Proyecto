/** Avatar circular con la inicial del nombre. Decorativo: el nombre se muestra (o se anuncia) aparte. */
export function initialOf(name:string) {
  const letter=[...name.trim()][0];
  return letter?letter.toLocaleUpperCase('es-PE'):'?';
}
export function UserAvatar({name}:{name:string}) {
  return <span className="av-avatar" aria-hidden="true">{initialOf(name)}</span>;
}
