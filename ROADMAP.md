# MAZE.EXE — Plan de desarrollo

## Visión
Convertir el prototipo de laberinto (TypeScript + Vite + Canvas 2D) en un arcade
retro temática *nerd/tech de los 80*. El jugador recorre un laberinto procedural
generado con DFS, recoge **BITS** (`·`), esquiva **DAEMONS** (`&`) que lo persiguen
(BFS) y al **GLITCH** (`?`), se vuelve **ANTIVIRUS** con las píldoras `+`, y abre
el **EXIT** (`E`) al final de la sesión para la siguiente ronda de dificultad
creciente. Estética de terminal fósforo verde + overlay CRT + fuente monospace.

## Estado actual — Fases 1 a 6 completadas

| Fase | Scope | Estado |
| --- | --- | --- |
| **1** | Sonido WebAudio, HUD retro, bits coleccionables, movimiento continuo (110ms), overlay CRT, hi-score persistente | ✅ |
| **2** | Secuencia de boot tipo terminal, dificultad por SESSION, múltiples daemons, power-up ANTIVIRUS con modo `scared` | ✅ |
| **3** | Vidas (3) con respawn e invencibilidad, pantalla de título, GAME OVER con tablón top-5 e iniciales arcade | ✅ |
| **4** | Pausa (P/Esc), mute silencioso persistente (M), bucle de música chiptune, intro de sesión ("SESSION NN READY?"), popups de puntos flotantes | ✅ |
| **5** | Partículas, screen shake, glow neón (`shadowBlur`), secuencia de muerte con retardo ("SYSTEM FAILURE") | ✅ |
| **6** | Soporte gamepad (d-pad + stick, A/Start confirman, B=pausa, Select=mute) | ✅ |
| **7** | Attract mode: demo autoplay con bot (BFS a bits/píldoras/exit), contador en el título, "DEMO MODE" y corte con cualquier tecla | ✅ |
| **8** | Enemigos y dificultad: sesión 1 patrullan (sin cazar), caza desde S2, **HUNTER** naranja y veloz desde S3 (+300), GLITCH empieza más cerca (S+), velocidad progresiva | ✅ |
| **9** | Nuevas mecánicas: píldora **FREEZE** `*` (congela enemigos), **1UP** `1` (rara, +1 vida), **teletransportes** `T` (pares), combo de bits (×2..×5) | ✅ |
| **10** | Ayuda y opciones: pantalla **HELP** desde el título (`?`/`H`), selector de **dificultad** FÁCIL/NORMAL/RANKED (vidas y velocidad, persistente), indicador de **gamepad** conectado en HUD y en HELP | ✅ |

## Decisiones técnicas y convenciones

- TS ~6.0.2 con `tsconfig` estricto: `verbatimModuleSyntax` (usar `import type`
  para tipos), `noUnusedLocals/Parameters`, `erasableSyntaxOnly`,
  `noFallthroughCasesInSwitch`.
- **Arquitectura de archivos** (`src/`):
  - `main.ts` — canvas, cable Boot → `game.start()`.
  - `game.ts` — orquestador (bucle, estado, colisiones, scoring, música, HUD).
  - `game-state.ts` — `GameState`, `GameStatus`, `Popup`, `Particle`, `ScoreEntry`.
  - `maze.ts` — generación procedural (DFS + loops + píldoras), colisión y dots.
  - `grid.ts` / `pathfinder.ts` — constantes, utilidades y BFS.
  - `player.ts` / `enemy.ts` (persigue BFS, vaga si `scared`) / `ghost.ts`.
  - `renderer.ts` — todo el dibujo (mundo, HUD-canvas, overlays, glowing).
  - `hud.ts` — HUD DOM (score, sesión, bits, vidas, fright, mute, estado).
  - `audio.ts` — sfx cuadrada + secuenciador chiptune en bucle.
  - `boot.ts` — overlay de arranque; el input queda bloqueado hasta `started`.
  - `gamepad.ts` — despacha `KeyboardEvent` sintéticos → reutiliza la lógica de teclado.
- **localStorage**: `maze-hi-score`, `maze-scores` (top-5 JSON), `maze-muted`.
- **Gotchas ya resueltos**: el renderer guarda *referencias* a `enemies` y `ghost`
  → mutar en sitio (`length = 0; push(...)`) o recrear renderer al regenerar la
  partida; el audio requiere gesto del usuario (`unlock()` desde `keydown`).

## Controles

- **Teclado**: flechas / WASD mover · Enter / Espacio confirmar · P / Esc pausa · M mute.
- **Gamepad**: d-pad + stick izquierdo · A / Start confirmar · B pausa · Select mute.

## Roadmap futuro

Prioridad sugerida: 11 (vale también como pulido transversal).

### Fase 11 — Rendimiento y pulido final
- Cachear el fondo estático (laberinto + bits) en un canvas offscreen y redibujar
  solo las celdas que cambian al recoger / pisar.
- Reutilizar objetos de partículas/popups (evitar GC), capar partículas en pantalla.
- Verificación: perfil de FPS en un laberinto casi vacío (sin dots) se mantiene a 60.

### Ideas a considerar más adelante
- Modo 2 jugadores (turnos) aprovechando recuerdos locales por jugador.
- Jingle estilo arranque de Windows/AMIGA en el boot.
- Logros/trofeos (parciales de bits, daemons comidos, sesiones).
- Accesibilidad: mapeado de teclas y DPI de la fuente.

## Nota de despliegue
- En este entorno no hay runtime de Node/JS: **toda verificación de build corre a
  cargo del usuario** (`npm run dev`, `npm run build`).
- No hay suite de tests actualmente; la verificación es manual por fase (listada
  en cada fase).