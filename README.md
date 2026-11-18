# EduHack

**Zip · Aprende. Aplica. Demuestra.**

Plataforma de aprendizaje experiencial (Social EduHack 2026). Es un sitio estático: no hay servidor ni base de datos.

## Estructura (Model / View / Controller)

```
index.html               Página (la estructura HTML de la VIEW)
model/
  negocio.ts             Toda la lógica de negocio: catálogo, asesor de ventas,
                         plataforma (módulos, bitácora, repaso FSRS, coach, insignia)
                         e inicio de sesión
view/
  css/estilos.css        Todos los estilos
  movimiento.ts          Animaciones (Material Design 3)
  chat.ts                Ventana y burbuja del asesor
  mascota.ts             Animación cuadro por cuadro del zorro
  pantallas.ts           HTML de cada pantalla (login, experiencias, tablero…)
controller/
  app.ts                 Arranque: conecta el asesor y el movimiento
  rutas.ts               Rutas (#login, #experiencias, #mi…) y eventos de cada pantalla
rsc/img/                 Imágenes (favicon y cuadros del zorro)
dist/                    JavaScript compilado desde TypeScript (lo carga index.html)
tipos.d.ts               Tipos globales del navegador (ts-fsrs, dictado por voz)
```

La VIEW solo pinta, el CONTROLLER conecta eventos y el MODEL decide. Los archivos usan
`namespace Zip.*` de TypeScript y se cargan como scripts normales, así que `index.html`
funciona con doble clic (sin servidor).

## Compilar

```bash
npm install
npm run build      # compila model/, view/ y controller/ a dist/
npm run watch      # recompila al guardar
```

`dist/` va en el repositorio para que el sitio funcione sin compilar. Después de cambiar
un `.ts`, corre `npm run build` y sube también `dist/`.

## Entrar (datos de prueba)

"Empezar ahora" lleva a la pantalla de entrada. Las pantallas de la plataforma piden sesión.

| Usuario        | Contraseña |
| -------------- | ---------- |
| `Pedro Paramo` | `123`      |

No hay base de datos: la sesión y el progreso se guardan en `sessionStorage`,
así que duran solo mientras la pestaña está abierta.
