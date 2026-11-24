/**
 * Especies del jardín: cada meta puede crecer como una planta distinta, con su propio
 * simbolismo. Las seis etapas siguen el mismo porcentaje que growthStage() (garden.ts);
 * solo cambian el dibujo, el nombre de la etapa y el mensaje.
 * La elección es personal: se guarda en profile.preferences.plantKinds (sin cambios
 * en la base de datos). Las metas sin elección conservan el cosmos original.
 * Tono sin juicios: ninguna planta se marchita ni retrocede por una demora.
 */

export type PlantKind = 'cosmos' | 'arbol' | 'girasol' | 'cactus' | 'bambu';
export const DEFAULT_PLANT: PlantKind = 'cosmos';

export interface PlantSpecies {
  id: PlantKind;
  name: string;
  /** Qué representa la planta: se muestra al elegirla. */
  symbol: string;
  stages: readonly [string, string, string, string, string, string];
  messages: readonly [string, string, string, string, string, string];
}

export const PLANT_SPECIES: readonly PlantSpecies[] = [
  {
    id: 'cosmos', name: 'Flor cosmos', symbol: 'Cada aporte suma un poco de color.',
    stages: ['Semilla', 'Primeros brotes', 'Planta joven', 'Lista para florecer', 'Primeras flores', 'Meta florecida'],
    messages: ['Una nueva meta acaba de echar raíces.', 'Tu ahorro está echando raíces. Cada aporte cuenta.', 'Tu planta gana hojas y tu meta toma forma.', 'Ya superaste la mitad. Tu constancia se hace visible.', 'Las primeras flores anuncian lo cerca que estás.', 'Lo lograste. Esta floración celebra tu esfuerzo.'],
  },
  {
    id: 'arbol', name: 'Árbol frutal', symbol: 'Para metas grandes: echa raíces profundas y al final da frutos.',
    stages: ['Semilla', 'Brote', 'Arbolito', 'Árbol joven', 'Árbol en flor', 'Árbol con frutos'],
    messages: ['Plantaste una semilla que crecerá con calma.', 'Asomó el primer brote. Las raíces empiezan abajo, donde no se ven.', 'Tu arbolito ya tiene tronco: la meta toma firmeza.', 'Más de la mitad: tu árbol da sombra y se sostiene solo.', 'Aparecieron las flores; los frutos están cerca.', '¡Cosecha! Tu constancia dio frutos.'],
  },
  {
    id: 'girasol', name: 'Girasol', symbol: 'Crece buscando la luz: cada día un poco más alto.',
    stages: ['Semilla', 'Brote', 'Tallo con hojas', 'Botón cerrado', 'Botón abriéndose', 'Girasol abierto'],
    messages: ['Una semilla de girasol espera su primer rayo de sol.', 'Asomó el brote y ya mira hacia la luz.', 'El tallo sube y gana hojas: tu meta va tomando altura.', 'Pasaste la mitad: el botón ya se ve.', 'Los pétalos empiezan a abrirse. Falta muy poco.', '¡Tu girasol mira al sol! Meta cumplida.'],
  },
  {
    id: 'cactus', name: 'Cactus', symbol: 'Paciencia: crece sin prisa y florece aunque el camino sea seco.',
    stages: ['Semilla', 'Cactus pequeño', 'Columna', 'Primer brazo', 'Con botones', 'Cactus en flor'],
    messages: ['Una semilla resistente empieza su camino.', 'Tu cactus ya asoma: pequeño, pero firme.', 'Crece despacio y guarda fuerzas, igual que tu ahorro.', 'Más de la mitad: le salió su primer brazo.', 'Aparecieron botones: tu constancia está por florecer.', '¡Floreció! La paciencia también da flores.'],
  },
  {
    id: 'bambu', name: 'Bambú', symbol: 'Sube nudo a nudo: cada aporte es un tramo más.',
    stages: ['Semilla', 'Primer brote', 'Primeros nudos', 'Caña firme', 'Bosquecito', 'Bambú pleno'],
    messages: ['Una raíz de bambú se prepara bajo tierra.', 'Salió el primer brote: un tramo a la vez.', 'Ya se ven los primeros nudos de tu meta.', 'Más de la mitad: tu caña ya se sostiene firme.', 'Nacieron nuevas cañas: tu esfuerzo se multiplica.', '¡Bambú pleno! Llegaste nudo a nudo.'],
  },
];

const BY_ID = new Map(PLANT_SPECIES.map(species => [species.id, species]));
export const isPlantKind = (value: unknown): value is PlantKind => typeof value === 'string' && BY_ID.has(value as PlantKind);
export const speciesOf = (kind: PlantKind | undefined | null) => BY_ID.get(kind || DEFAULT_PLANT) || BY_ID.get(DEFAULT_PLANT)!;

/** Lee la elección guardada en las preferencias; tolera datos ausentes o inválidos. */
export function plantKindsFrom(preferences: unknown): Record<string, PlantKind> {
  const raw = (preferences as { plantKinds?: unknown } | null)?.plantKinds;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, PlantKind> = {};
  for (const [goalId, kind] of Object.entries(raw as Record<string, unknown>)) if (isPlantKind(kind)) out[goalId] = kind;
  return out;
}
export const plantKindOf = (kinds: Record<string, PlantKind>, goalId: string | undefined) => (goalId && kinds[goalId]) || DEFAULT_PLANT;
