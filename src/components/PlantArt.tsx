import React from 'react';
import type { PlantKind } from '../live/plants';

/**
 * Plantas ilustradas en SVG (árbol, girasol, cactus y bambú) en seis etapas, dentro de
 * una maceta de terracota del mismo tamaño que la del cosmos. Decorativas: el nombre
 * accesible lo da la maceta (botón) que las contiene.
 * Los colores salen de los tokens --plant-* (src/styles/tokens.css). El vaivén
 * (.ag-svg-sway) se detiene con «Pausar movimiento», .av-still y prefers-reduced-motion.
 */

const SOIL_Y = 114;
const v = (name: string) => `var(--plant-${name})`;

/** Hoja lanceolada que nace en (x, y), orientada en grados (0 = hacia la derecha). */
function Leaf({ x, y, angle, size = 18, fill = v('leaf') }: { x: number; y: number; angle: number; size?: number; fill?: string }) {
  return <path d={`M0 0 Q${size * 0.5} ${-size * 0.38} ${size} 0 Q${size * 0.5} ${size * 0.38} 0 0Z`} transform={`translate(${x} ${y}) rotate(${angle})`} fill={fill} />;
}

function Pot() {
  return <g>
    <ellipse cx="100" cy="186" rx="42" ry="5" fill={v('shadow')} />
    <path d="M60 124 H140 L131 182 Q130 185 127 185 H73 Q70 185 69 182 Z" fill={v('pot')} />
    <path d="M118 124 H140 L131 182 Q130 185 127 185 H112 Z" fill={v('pot-dark')} opacity="0.55" />
    <path d="M66 126 H78 L80 182 H73 Q70 185 69 182 Z" fill={v('highlight')} opacity="0.35" />
    <rect x="54" y="108" width="92" height="17" rx="4" fill={v('pot-rim')} />
    <rect x="54" y="121" width="92" height="4" rx="2" fill={v('pot-dark')} opacity="0.35" />
    <rect x="58" y="110" width="30" height="3" rx="1.5" fill={v('highlight')} opacity="0.5" />
    <ellipse cx="100" cy={SOIL_Y} rx="40" ry="5" fill={v('soil')} />
  </g>;
}

function Seed({ kind }: { kind: PlantKind }) {
  return <g>
    <ellipse cx="100" cy={SOIL_Y - 2} rx="12" ry="4" fill={v('soil-light')} />
    {kind === 'arbol' && <><ellipse cx="100" cy={SOIL_Y - 7} rx="5" ry="6" fill={v('seed')} /><path d={`M94.5 ${SOIL_Y - 10} Q100 ${SOIL_Y - 15} 105.5 ${SOIL_Y - 10} Z`} fill={v('trunk')} /></>}
    {kind === 'girasol' && <><ellipse cx="100" cy={SOIL_Y - 6} rx="3.5" ry="6.5" fill={v('sun-center')} /><path d={`M100 ${SOIL_Y - 12} V${SOIL_Y}`} stroke={v('soil-light')} strokeWidth="1" /></>}
    {kind === 'cactus' && <circle cx="100" cy={SOIL_Y - 5} r="5" fill={v('cactus')} />}
    {kind === 'bambu' && <path d={`M96 ${SOIL_Y - 2} L100 ${SOIL_Y - 14} L104 ${SOIL_Y - 2} Z`} fill={v('bamboo')} />}
  </g>;
}

function Tree({ stage }: { stage: number }) {
  if (stage === 1) return <g>
    <path d={`M100 ${SOIL_Y} V88`} stroke={v('stem')} strokeWidth="3" strokeLinecap="round" />
    <Leaf x={100} y={92} angle={-35} size={20} /><Leaf x={100} y={90} angle={-150} size={18} fill={v('leaf-light')} />
  </g>;
  const trunkTop = stage === 2 ? 72 : 62;
  const width = stage === 2 ? 5 : 8;
  const canopy = stage === 2
    ? [[100, 58, 20], [86, 68, 12], [114, 68, 12]]
    : [[100, 44, 30], [74, 60, 21], [126, 60, 21], [88, 34, 18], [114, 34, 18], [100, 66, 18]];
  return <g>
    <path d={`M${100 - width / 2} ${SOIL_Y} Q${100 - width / 3} 90 ${100 - 1} ${trunkTop} H${101} Q${100 + width / 3} 90 ${100 + width / 2} ${SOIL_Y} Z`} fill={v('trunk')} />
    {stage >= 3 && <><path d="M100 78 Q88 70 80 64" stroke={v('trunk')} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M100 74 Q112 68 120 62" stroke={v('trunk')} strokeWidth="3" fill="none" strokeLinecap="round" /></>}
    {canopy.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? v('leaf-dark') : v('leaf')} />)}
    {canopy.slice(0, 3).map(([x, y, r], i) => <circle key={`h${i}`} cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.45} fill={v('leaf-light')} opacity="0.55" />)}
    {stage === 4 && [[86, 36], [112, 30], [100, 52], [76, 58], [124, 56], [94, 22], [118, 46], [82, 46]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="4" fill={v('blossom')} /><circle cx={x} cy={y} r="1.4" fill={v('sun-petal')} /></g>)}
    {stage === 5 && [[86, 40], [114, 34], [100, 56], [74, 62], [126, 60], [104, 24], [120, 50], [80, 50], [96, 40]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="5" fill={v('fruit')} /><circle cx={x - 1.5} cy={y - 1.5} r="1.5" fill={v('highlight')} /></g>)}
  </g>;
}

function Sunflower({ stage }: { stage: number }) {
  const top = [0, 96, 70, 46, 40, 38][stage];
  const leaves = stage === 1
    ? [<Leaf key="a" x={100} y={98} angle={-25} size={16} />, <Leaf key="b" x={100} y={98} angle={-155} size={16} fill={v('leaf-light')} />]
    : [[96, -30], [86, -150], [76, -20], [66, -160]].filter(([y]) => y > top + 6).map(([y, a], i) => <Leaf key={i} x={100} y={y} angle={a} size={22 + (i < 2 ? 4 : 0)} fill={i % 2 ? v('leaf-dark') : v('leaf')} />);
  const petals = (count: number, length: number, open: number) => Array.from({ length: count }, (_, i) => {
    const angle = (360 / count) * i;
    return <path key={i} d={`M0 0 Q${length * 0.5} ${-length * 0.22 * open} ${length} 0 Q${length * 0.5} ${length * 0.22 * open} 0 0Z`} transform={`translate(100 ${top}) rotate(${angle})`} fill={v('sun-petal')} />;
  });
  return <g>
    <path d={`M100 ${SOIL_Y} Q102 ${(SOIL_Y + top) / 2} 100 ${top}`} stroke={v('stem')} strokeWidth={stage >= 3 ? 4 : 3} fill="none" strokeLinecap="round" />
    {leaves}
    {stage === 3 && <ellipse cx="100" cy={top - 2} rx="8" ry="9" fill={v('leaf-dark')} />}
    {stage === 4 && <>{petals(12, 16, 0.7)}<circle cx="100" cy={top} r="10" fill={v('sun-center')} /></>}
    {stage === 5 && <>{petals(18, 27, 1)}<circle cx="100" cy={top} r="15" fill={v('sun-center')} /><circle cx="97" cy={top - 3} r="4" fill={v('sun-center-light')} opacity="0.6" /></>}
  </g>;
}

function Cactus({ stage }: { stage: number }) {
  const height = [0, 18, 46, 62, 70, 74][stage];
  const top = SOIL_Y - height;
  const body = stage === 1
    ? <ellipse cx="100" cy={SOIL_Y - 9} rx="12" ry="11" fill={v('cactus')} />
    : <rect x="88" y={top} width="24" height={height + 4} rx="12" fill={v('cactus')} />;
  const arm = (side: 1 | -1, y: number, h: number) => <path d={`M${100 + side * 10} ${y + 12} H${100 + side * 22} Q${100 + side * 28} ${y + 12} ${100 + side * 28} ${y + 6} V${y - h}`} stroke={v('cactus')} strokeWidth="11" fill="none" strokeLinecap="round" />;
  const flower = (x: number, y: number, r = 5) => <g key={`${x}-${y}`}>{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx={x} cy={y - r * 0.7} rx={r * 0.45} ry={r * 0.8} transform={`rotate(${a} ${x} ${y})`} fill={v('cactus-flower')} />)}<circle cx={x} cy={y} r={r * 0.35} fill={v('sun-petal')} /></g>;
  return <g>
    {stage >= 3 && arm(1, top + 26, 14)}
    {stage >= 4 && arm(-1, top + 34, 10)}
    {body}
    {stage >= 2 && <path d={`M100 ${top + 8} V${SOIL_Y - 2}`} stroke={v('cactus-dark')} strokeWidth="1.5" opacity="0.6" />}
    {stage >= 2 && Array.from({ length: Math.floor(height / 12) }, (_, i) => <g key={i} stroke={v('cactus-dark')} strokeWidth="1"><path d={`M88 ${top + 10 + i * 12} l-3 -2`} /><path d={`M112 ${top + 16 + i * 12} l3 -2`} /></g>)}
    {stage === 1 && <g stroke={v('cactus-dark')} strokeWidth="1"><path d="M90 102 l-3 -2" /><path d="M110 100 l3 -2" /><path d="M100 96 v-3" /></g>}
    {stage === 4 && <><circle cx="100" cy={top + 1} r="3.5" fill={v('cactus-flower')} /><circle cx="128" cy={top + 24} r="3" fill={v('cactus-flower')} /></>}
    {stage === 5 && <>{flower(100, top - 1, 8)}{flower(128, top + 16, 6)}{flower(72, top + 26, 5)}</>}
  </g>;
}

function Bamboo({ stage }: { stage: number }) {
  const canes: [number, number][] = stage === 1 ? [[100, 22]] : stage === 2 ? [[100, 54]] : stage === 3 ? [[98, 78], [112, 46]] : stage === 4 ? [[96, 88], [112, 66], [84, 50]] : [[96, 98], [113, 82], [82, 66]];
  return <g>
    {canes.map(([x, h], i) => {
      const top = SOIL_Y - h, nodes = Math.max(1, Math.floor(h / 18));
      return <g key={i}>
        <rect x={x - 4.5} y={top} width="9" height={h} rx="3.5" fill={i % 2 ? v('bamboo-dark') : v('bamboo')} />
        {Array.from({ length: nodes }, (_, n) => <rect key={n} x={x - 5.5} y={SOIL_Y - (n + 1) * 18} width="11" height="2.4" rx="1" fill={v('bamboo-node')} />)}
        <Leaf x={x} y={top + 4} angle={-40} size={24} fill={v('leaf')} />
        {h > 30 && <Leaf x={x} y={top + 14} angle={-160} size={22} fill={v('leaf-light')} />}
        {h > 60 && <><Leaf x={x} y={top + 32} angle={-20} size={21} fill={v('leaf-dark')} /><Leaf x={x} y={top + 44} angle={-170} size={20} fill={v('leaf')} /></>}
        {stage === 5 && i === 0 && <><Leaf x={x} y={top + 22} angle={-60} size={20} fill={v('leaf-light')} /><Leaf x={x} y={top + 54} angle={-15} size={19} fill={v('leaf')} /><Leaf x={x} y={top + 66} angle={-165} size={18} fill={v('leaf-dark')} /></>}
      </g>;
    })}
  </g>;
}

const DRAW: Record<Exclude<PlantKind, 'cosmos'>, (props: { stage: number }) => React.ReactElement> = { arbol: Tree, girasol: Sunflower, cactus: Cactus, bambu: Bamboo };

export function PlantArt({ kind, stage, className = '', style }: { kind: Exclude<PlantKind, 'cosmos'>; stage: number; className?: string; style?: React.CSSProperties }) {
  const Draw = DRAW[kind];
  return <svg className={`ag-svg-plant ${className}`} viewBox="14 4 172 188" aria-hidden="true" focusable="false" style={style}>
    <Pot />
    <g className="ag-svg-sway">{stage <= 0 ? <Seed kind={kind} /> : <Draw stage={Math.min(5, stage)} />}</g>
  </svg>;
}

/** Miniatura para el selector de planta: la etapa más vistosa de cada especie. */
export function PlantThumb({ kind }: { kind: PlantKind }) {
  if (kind === 'cosmos') return <span className="ag-plant-thumb ag-plant-thumb-cosmos" aria-hidden="true" />;
  return <PlantArt kind={kind} stage={5} className="ag-plant-thumb" />;
}
