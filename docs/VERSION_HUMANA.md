# Versión humana de Alcancía Viva

Rama `version-humana`, construida sobre el rediseño PC04 (`rediseno-pc04`). Objetivo: que la app se sienta más humana, cercana y cálida, además de más rápida.

- **Sitio:** https://alcancia-viva-humana.netlify.app (la versión PC04 sigue en https://alcancia-viva-pc04.netlify.app).
- **Backend:** el proyecto Supabase del equipo (`haqdsmtildbcubvtitfk`), con las mismas migraciones y la función `financial-assistant`.

## Qué cambia

| Área | Cambio | Dónde |
|---|---|---|
| Mascota | Cerdito-alcancía dibujado en SVG, con el estilo del logo y un brote en la ranura que crece con el avance de tus metas (florece al 100 %). Siete estados de ánimo: feliz, escuchando, pensando, hablando, celebrando, animando y dormida. Animaciones breves (< 5 s), anuladas con movimiento reducido. | `src/components/Mascot.tsx` |
| Nombre propio | Cada persona bautiza a su alcancía: en la bienvenida, desde el saludo del jardín o en Preferencias. Se guarda en `preferences.petName` (JSON, sin migración). | `Onboarding.tsx`, `CompanionGreeting.tsx` |
| Saludo del jardín | «Buenas tardes, Ana» según la hora de Lima, y el relato amable de tu semana: lo ahorrado, la meta que más creció, comparación sin juicio con la semana anterior y días de constancia. Firma la mascota. | `src/live/companion.ts` |
| Bienvenida guiada | Tres pasos: tu nombre y consentimiento → el nombre de tu alcancía → tu primera meta (opcional). El foco va al título de cada paso. | `src/components/Onboarding.tsx` |
| Asistente | Habla como la mascota, en burbujas de conversación, y se presenta siempre como apoyado en inteligencia artificial y sin mover dinero. | `Workspace.tsx`, `AnswerAudio.tsx` |
| Voz | La mascota ocupa el anillo de escucha y cambia de ánimo según el estado; frases variadas («¿Cuánto fue?», «¡Hecho! Ya está en tu jardín.»); se eligen las voces más naturales del navegador (neuronales de Edge, Google, voces mejoradas de Apple). | `ListeningIndicator.tsx`, `useVoiceFlow.ts`, `voices.ts` |
| Celebraciones y vacíos | La mascota celebra en los avisos y anima en los estados vacíos. | `Toast.tsx`, `EmptyState.tsx` |
| Modo demo | «Probar sin cuenta» en el acceso: un Supabase simulado dentro del navegador con metas, un grupo y movimientos de práctica. Empieza por la bienvenida, no hace peticiones de red y se borra al salir. | `src/live/demo.ts` |
| Rendimiento | Espacio con sesión y panel de voz en carga diferida; React y Supabase en archivos propios; `preconnect` a Supabase; acceso prerenderizado en la build e hidratado por React; imagen del acceso precargada solo sin sesión. | `Workspace.tsx`, `vite.config.ts`, `scripts/prerender-auth.mjs` |
| Textos | Tono cálido en la carga («Despertando a tu alcancía…»), el registro («Cuéntame qué pasó con tu dinero…») y el acceso («Qué bueno verte por el jardín»). | varios |

## Resultados

- Pruebas unitarias: 80 en verde (`test:recovery` 11, `test:playback` 13, `test:voice` 17, `test:history` 23 con `companion` y `demo`, `test:garden` 16).
- Comprobaciones de interfaz (Playwright): las 36 anteriores más 6 de esta versión (`scripts/evidence/check-humana.cjs`: demo de punta a punta, bienvenida, saludo, aporte con deshacer, asistente y ausencia de red externa).
- axe-core (WCAG 2.2 AA): 0 violaciones en las 6 pestañas, el registro y el panel de voz (320–1440 px, 5 modos) y en la bienvenida y el acceso (320–1440 px, normal, oscuro, alto contraste y texto 200 %).
- Lighthouse móvil del acceso: Performance 91–93 (antes 87–89), LCP 3,1 s, CLS 0; Accessibility, Best Practices y PWA 100.
- JavaScript del acceso: de 605 KB a ~490 KB; el espacio con sesión (94 KB) y la voz (22 KB) se descargan aparte.

Capturas en [`docs/evidence/humana/`](evidence/humana/) (generadas con `check-humana.cjs` y `capture-humana.cjs`).

## Pendiente

- **Asistente con IA:** añadir `GROQ_API_KEY` en Supabase → Edge Functions → Secrets. Sin ella responde que falta configurarla (el resto funciona; la demo usa un ejemplo sin IA).
- Probar la voz, la vibración y la bienvenida en dispositivos reales.
- La transcripción para navegadores sin reconocimiento de voz (Firefox, algunos iOS) quedó descartada en esta versión.
