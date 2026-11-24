/**
 * Traduce los errores de Supabase (Auth, PostgREST, Edge Functions) y de la red a
 * mensajes en español, sin juicios y con una salida clara. Los mensajes propios de la
 * app (lanzados con `new Error('…')`) y las excepciones de los RPC (código P0001, ya
 * redactadas en español en el backend) se muestran tal cual.
 */

export const GENERIC_ERROR = 'No pudimos completar la acción. Conservamos tus datos para reintentar.';
export const NETWORK_ERROR = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
/** Tope de montos: muy por encima de cualquier uso real y lejos del límite de numeric(14,2). */
export const MAX_AMOUNT = 1_000_000;
export const amountTooLarge = 'El monto es demasiado grande. Usa un monto menor a S/ 1 000 000.';

type AnyError = { message?: unknown; code?: unknown; status?: unknown; name?: unknown; details?: unknown };

const AUTH_CODES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  user_already_exists: 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
  email_exists: 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.',
  weak_password: 'Usa una contraseña más segura, de al menos 6 caracteres.',
  email_address_invalid: 'Revisa el correo: no parece una dirección válida.',
  validation_failed: 'Revisa los datos: falta algo o no tiene el formato esperado.',
  email_not_confirmed: 'Tu correo aún no está confirmado. Intenta iniciar sesión de nuevo en unos minutos.',
  signup_disabled: 'Por ahora no se pueden crear cuentas nuevas. Puedes probar la app sin cuenta.',
  over_email_send_rate_limit: 'Hay muchas solicitudes de correo en este momento. Espera unos minutos y vuelve a intentarlo.',
  over_request_rate_limit: 'Hay muchas solicitudes en este momento. Espera un minuto y vuelve a intentarlo.',
  session_not_found: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  refresh_token_not_found: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  same_password: 'Elige una contraseña diferente a la anterior.',
};

const PG_CODES: Record<string, string> = {
  '22003': amountTooLarge,
  '22001': 'Uno de los textos es demasiado largo. Acórtalo y vuelve a intentarlo.',
  '22P02': 'Algún dato no tiene el formato esperado. Revisa los campos.',
  '22007': 'Revisa la fecha: no tiene el formato esperado.',
  '22008': 'Revisa la fecha: está fuera del rango permitido.',
  '23505': 'Ese registro ya existe.',
  '23514': 'Algún dato no cumple las reglas (por ejemplo, un monto mayor que cero). Revisa los campos.',
  '42501': 'No tienes permiso para esta acción. Si acabas de entrar, recarga la página.',
  PGRST301: 'Tu sesión venció. Vuelve a iniciar sesión.',
  PGRST303: 'Tu sesión venció. Vuelve a iniciar sesión.',
};

const isNetwork = (message: string) => /failed to fetch|networkerror|load failed|network request failed|fetch failed|timed? ?out|aborted/i.test(message);

export function friendlyError(error: unknown, fallback = GENERIC_ERROR): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error || fallback;
  const e = error as AnyError;
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';
  const status = typeof e.status === 'number' ? e.status : 0;
  const name = typeof e.name === 'string' ? e.name : '';

  if (isNetwork(message) || name === 'AuthRetryableFetchError' || name === 'FunctionsFetchError') return NETWORK_ERROR;
  if (code && AUTH_CODES[code]) return AUTH_CODES[code];
  if (code === 'P0001' && message) return message; // Excepciones del backend, ya en español.
  if (code && PG_CODES[code]) return PG_CODES[code];
  if (status === 429 || /rate limit/i.test(message)) return AUTH_CODES.over_request_rate_limit;
  if (/user already registered/i.test(message)) return AUTH_CODES.user_already_exists;
  if (/invalid login credentials/i.test(message)) return AUTH_CODES.invalid_credentials;
  if (/password should be|password.*(at least|characters)/i.test(message)) return AUTH_CODES.weak_password;
  if (/unable to validate email|invalid.*email|email.*invalid/i.test(message)) return AUTH_CODES.email_address_invalid;
  if (/jwt|token.*expired|expired.*token/i.test(message)) return PG_CODES.PGRST301;
  if (/numeric field overflow/i.test(message)) return amountTooLarge;
  if (name === 'FunctionsHttpError' || name === 'FunctionsRelayError') return 'El asistente no está disponible en este momento. Inténtalo de nuevo en un rato.';
  // Errores de Supabase sin traducción conocida: mensaje genérico, nunca texto técnico en inglés.
  if (code || status || /^(Auth|Postgrest|Functions|Storage)/.test(name) || name === 'TypeError') return fallback;
  return message || fallback;
}

/** Valida un monto escrito o dictado. Devuelve un mensaje si no sirve; null si está bien. */
export function amountProblem(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return 'Ingresa un monto mayor que cero.';
  if (value >= MAX_AMOUNT) return amountTooLarge;
  return null;
}

/** localStorage que nunca lanza (modo privado, cuota llena o almacenamiento bloqueado). */
export const safeStorage = {
  get(key: string): string | null { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { window.localStorage.setItem(key, value); return true; } catch { return false; } },
  remove(key: string) { try { window.localStorage.removeItem(key); } catch { /* sin almacenamiento */ } },
  json<T>(key: string, fallback: T): T { try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } },
};
