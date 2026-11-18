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
  conocerte.ts           Pantalla del diagnóstico por voz (el zorro pregunta)
controller/
  app.ts                 Arranque: conecta el asesor y el movimiento
  conocerte.ts           Flujo del diagnóstico: graba con MediaRecorder y lo manda al backend
  rutas.ts               Rutas (#login, #registro, #conocerte, #experiencias…) y eventos
server/
  servidor.mts           Backend: sirve la página y expone POST /api/analizar-voz
  gemini.mts             Prompt maestro, esquema JSON y llamada a Gemini
rsc/img/                 Imágenes (favicon y cuadros del zorro)
dist/                    JavaScript compilado desde TypeScript (lo carga index.html)
tipos.d.ts               Tipos globales del navegador (ts-fsrs, dictado por voz)
```

La VIEW solo pinta, el CONTROLLER conecta eventos y el MODEL decide. Los archivos usan
`namespace Zip.*` de TypeScript y se cargan como scripts normales, así que `index.html`
funciona con doble clic (sin servidor).

## Correr la página y el backend

El diagnóstico por voz necesita el backend (manda los audios a Gemini), así que ya no basta
con abrir `index.html`: hay que levantar el servidor. Necesitas **Node.js 22 o más nuevo**.

```bash
npm install                 # solo la primera vez (TypeScript y tipos de Node)
cp .env.example .env        # y pega tu GEMINI_API_KEY dentro de .env
npm run build               # compila la página y el backend a dist/
npm start                   # http://localhost:3000
```

`.env` no se sube a GitHub (está en `.gitignore`). Variables:

| Variable         | Para qué                                   | Valor por defecto   |
| ---------------- | ------------------------------------------ | ------------------- |
| `GEMINI_API_KEY` | Llave de la API de Gemini (obligatoria)    | —                   |
| `GEMINI_MODEL`   | Modelo principal                           | `gemini-3.5-flash-lite` |
| `PORT`           | Puerto del servidor                        | `3000`              |

Si el modelo principal falla o tarda más de 45 s, el servidor reintenta con `gemini-3.8-flash`.

### Cómo funciona el diagnóstico

```
[Usuario habla] → MediaRecorder (navegador) → Blob de audio (.webm)
  → POST /api/analizar-voz (server/servidor.mts)
  → prompt maestro + API key (server/gemini.mts) → Gemini (JSON con esquema fijo)
  → la página reordena las 5 experiencias de urgente a opcional
```

El zorro solo pregunta (3 preguntas): nunca muestra lo que respondió Gemini. El resultado solo
reordena el camino en `#experiencias`.

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

| Usuario        | Contraseña | Qué pasa                                                        |
| -------------- | ---------- | --------------------------------------------------------------- |
| `Pedro Paramo` | `123`      | Cuenta existente, ya tiene su camino (de muestra)                |
| `Fabri`        | `123`      | Se crea con "Crea tu cuenta" y pasa por el diagnóstico por voz  |

No hay base de datos: la sesión y el progreso se guardan en `sessionStorage`,
así que duran solo mientras la pestaña está abierta.
