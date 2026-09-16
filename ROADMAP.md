# MAZE.EXE — Plan de desarrollo

## Visión
Convertir el prototipo de laberinto (TypeScript + Vite + Canvas 2D) en un arcade
retro temática *nerd/tech de los 80*. El jugador recorre un laberinto procedural
generado con DFS, recoge **BITS** (`·`) que van **directo al SCORE** (un único
puntaje), esquiva **DAEMONS** (`&`) que lo persiguen (BFS) y al **GLITCH** (`?`),
se vuelve **ANTIVIRUS** con las píldoras `+`, y el **EXIT** (`E`) está siempre
abierto para saltar a la siguiente ronda de dificultad creciente.
Estética de terminal fósforo verde + overlay CRT + fuente monospace.

## Estado actual — Fases 1 a 19 completadas

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
| **11** | Rendimiento: fondo estático (muros + bits + teletransportes) cacheado en canvas offscreen con limpieza incremental por celda, partículas/popups compactados in-place (sin realloc) y con cap de 120/30 | ✅ |
| **12** | **Logros** (11): estadísticas persistentes (`maze-stats`, `maze-achievements`), desbloqueo en vivo con toast dorado, pantalla colección tras HELP (`?`/`H`/botón Y) y contador en el título | ✅ |
| **13** | Jingle de arranque tipo Windows/Amiga al completar el boot y llegar al título | ✅ |
| **14** | Accesibilidad: re-mapeo de teclas (pantalla **KEYS**, persistente `maze-keys`, bindings aditivos sobre flechas/WASD) y **zoom de terminal** (100/125/150% por CSS, persistente `maze-zoom`) | ✅ |
| **15** | **2 jugadores por turnos**: selector `PLAYERS 1/2` en el título (`1`/`2`, persistente `maze-players`), etiqueta P1/P2 en HUD e intro, turno automático al GAME OVER de P1 (su marcador entra en la tabla como `P1`), comparativa final y ganador en la pantalla de P2 | ✅ |
| **16** | **Game feel y vibes**: tick de bit con pitch por combo, medidor de combo visible (HUD `xN` + barra), slow-mo de partículas al morir, vibración+rumble al perder vida, lluvia de hex tras los menús, aviso `HUNTER INBOUND` en la intro, música acelerada con fright/freeze, count-up del marcador final, pausa con R reiniciar / Q salir, aviso de última vida, boot con 3 variantes, controles táctiles por swipe | ✅ |
| **17** | **Visualizador de música en el navbar**: `AnalyserNode` sobre el master de audio, forma de onda en canvas (scope) con línea + relleno en colores cíclicos según la energía, atenuado cuando está silenciado o sin señal | ✅ |
| **18** | **Un solo puntaje**: los bits `·` se mantienen en el laberinto pero **van directo al SCORE** (`+10 × combo`, max ×5), sin métrica de bits separada (fuera contador BITS y `dotsRemaining`); el **EXIT está siempre abierto** (victoria solo al pisarlo); HUD de **una sola línea** (SESSION PLAYER SCORE COMBO LIVES FRIGHT MUTE STATUS + visualizador, sin BITS/HI-SCORE/PAD); texto de HELP/título/boot adaptado | ✅ |
| **19** | **Navbar de una sola línea + osciloscopio vivo**: HUD comprimido (fuente 12px, `letter-spacing` 1px, gaps 8×10, min-widths reducidos, textos de estado cortos) para que todos los datos + visualizador quepan sin saltar de línea; la gráfica pasa a ser un **scope con forma de onda** (AUC por intensidad: las subidas/bajadas muestran la forma del audio según lo fuerte que suene) con **seno de respiro** animado cuando no hay música y atenuado si está en mute | ✅ |

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
  - `hud.ts` — HUD DOM de una línea (SESSION, PLAYER, SCORE, COMBO, LIVES, FRIGHT, MUTE, STATUS).
  - `audio.ts` — sfx cuadrada + secuenciador chiptune en bucle.
  - `visualizer.ts` — scope del audio en el navbar (canvas `#visualizer`).
  - `boot.ts` — overlay de arranque; el input queda bloqueado hasta `started`.
  - `gamepad.ts` — despacha `KeyboardEvent` sintéticos → reutiliza la lógica de teclado.
- **localStorage**: `maze-hi-score`, `maze-scores` (top-5 JSON), `maze-muted`,
  `maze-difficulty`, `maze-stats`, `maze-achievements`, `maze-keys`, `maze-zoom`,
  `maze-players`.
- **Gotchas ya resueltos**: el renderer guarda *referencias* a `enemies` y `ghost`
  → mutar en sitio (`length = 0; push(...)`) o recrear renderer al regenerar la
  partida; el audio requiere gesto del usuario (`unlock()` desde `keydown`).

## Controles

- **Teclado**: flechas / WASD mover · Enter / Espacio confirmar · P / Esc pausa · R reiniciar / Q salir (en pausa) · M mute · `?` abre el ciclo HELP → ACHIEVEMENTS → KEYS · `1`/`2` eligen número de jugadores.
- **Gamepad**: d-pad + stick izquierdo · A / Start confirmar · B pausa · Select mute · Y menús.
- **Táctil**: swipe en el canvas para moverse (teléfono).
- Re-mapeo configurable (flechas/WASD se mantienen siempre; los bindings se añaden): pantalla **KEYS** desde el ciclo de menús. `maze-keys`, `maze-zoom`, `maze-players` persisten la configuración.

## Roadmap futuro

El juego está feature-complete: todas las fases planificadas e ideas abiertas se han implementado (logros, jingle, accesibilidad, 2 jugadores). Cualquier siguiente paso sería una ampliación nueva a propuesta del usuario.

## Nota de despliegue
- En este entorno no hay runtime de Node/JS: **toda verificación de build corre a
  cargo del usuario** (`npm run dev`, `npm run build`).
- No hay suite de tests actualmente; la verificación es manual por fase (listada
  en cada fase).