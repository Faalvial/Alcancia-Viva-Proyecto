# Evidencia PC04 · Fase 4 (celebración, transiciones y deshacer de 10 s)

FR-18 (refuerzo al crecer y florecer) y HU-17 (deshacer). Backend simulado con estado (`scripts/evidence/mock-backend.cjs`): registrar y revertir cambian el avance de la meta como lo haría el servidor.

## Archivos

| Archivo | Qué muestra |
|---|---|
| `meta-al-100.gif` | 10 s (12 fps): se elige «Viaje a Cusco» (95 %), se registra un aporte de S/ 90, la planta pasa a «Meta florecida» con fundido cruzado, el monto sube con count-up, caen pétalos y aparece el aviso «¡Viaje a Cusco floreció!» con «Deshacer» y la barra de 10 s. |
| `celebracion-1024.png`, `celebracion-375.png` | El mismo momento en tablet y móvil (los pétalos son una capa fija: se ven aunque el foco haya vuelto al botón de aporte). |
| `celebracion-oscuro-1440.png`, `celebracion-contraste-1440.png`, `celebracion-texto-200-375.png` | Tema oscuro, alto contraste y texto 200 %. |
| `deshacer-10s.png` | Aviso con «Deshacer», segundos restantes y barra que se vacía. |

## Cómo se genera

```bash
npm run build
npx vite preview --port 4173
node scripts/evidence/check-phase4.cjs docs/evidence/pc04/fase4   # comprobaciones + capturas + GIF (ffmpeg)
```

## Resultados

`check-phase4.cjs` (7 comprobaciones):

- Al llegar al 100 %: transición de etapa (sprite anterior y nuevo superpuestos 600 ms), 16 pétalos que se retiran a los 2,6 s, aviso «¡<Meta> floreció!» y count-up del monto (29 valores intermedios medidos en 500 ms, tanto en el aside como en «Avance conjunto»).
- «Deshacer» dentro de los 10 s llama a `reverse_movement` con el mismo id y el avance vuelve a 95 %.
- Sin pulsar, el aviso sigue a los 6,8 s, desaparece a los 10 s y la reversión sigue disponible en Movimientos.
- Micro-interacciones: botón al 97 % mientras se presiona, maceta elevada 5 px al pasar el puntero o con foco, fundido de 150 ms al cambiar de pestaña.
- Movimiento reducido: sin pétalos, sin fundido de etapa ni de pestaña, sin presión animada y monto sin animar; el aviso y el texto de la meta se mantienen. La barra de 10 s queda fija y los segundos restantes siguen a la vista.
- Acceso: capa de follaje con brisa de 14 s (`ag-breeze`), oculta con movimiento reducido y sin duplicar el texto alternativo.

Regresión: comprobaciones de las Fases 1–3 (8 + 6 + 12), sin scroll horizontal en 5 anchos × 7 pantallas × 4 modos, axe-core con 0 violaciones en 200 combinaciones de la app y en la pantalla de acceso (5 anchos, claro y oscuro).
