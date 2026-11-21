import { useEffect } from 'react';

export type ThemePreference='system'|'light'|'dark';
const KEY='av-theme';
const query=()=>window.matchMedia('(prefers-color-scheme: dark)');

export function storedTheme():ThemePreference {
  try{const value=localStorage.getItem(KEY);if(value==='light'||value==='dark'||value==='system')return value;}catch{/* sin almacenamiento */}
  return 'system';
}

/** Fija data-theme="light"|"dark" (ya resuelto) en <html> y recuerda la preferencia en este dispositivo. */
export function applyTheme(preference:ThemePreference) {
  const dark=preference==='dark'||(preference==='system'&&query().matches);
  const root=document.documentElement;
  root.dataset.theme=dark?'dark':'light';
  root.dataset.themePreference=preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#0d1a13':'#f7f8f3');
  try{localStorage.setItem(KEY,preference);}catch{/* sin almacenamiento */}
}

/** Aplica el tema guardado antes de iniciar sesión y sigue al sistema si así se eligió. */
export function initTheme() {
  applyTheme(storedTheme());
  query().addEventListener('change',()=>{if(storedTheme()==='system')applyTheme('system');});
}

/** Sincroniza el tema con la preferencia del perfil. */
export function useTheme(preference:ThemePreference) {
  useEffect(()=>{applyTheme(preference);},[preference]);
}
