/* =====================================================================
   Zip · BACKEND · Servidor
   ---------------------------------------------------------------------
   Sirve la página y expone POST /api/analizar-voz:
   audios del diagnóstico (multipart) → Gemini → JSON del camino.
   Uso: npm run build && npm start  →  http://localhost:3000
   ===================================================================== */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { analizar, type Entrada, type Pregunta } from './gemini.mjs';

const RAIZ = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
if (existsSync(join(RAIZ, '.env'))) process.loadEnvFile(join(RAIZ, '.env'));
const PUERTO = Number(process.env.PORT) || 3000;
const MAX_CUERPO = 25 * 1024 * 1024;
const MAX_AUDIO = 6 * 1024 * 1024;

/* Solo se sirven estas carpetas: nunca .env ni el código del servidor */
const PUBLICO = ['index.html', 'rsc/', 'view/css/', 'dist/model/', 'dist/view/', 'dist/controller/'];
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'
};

function json(res: ServerResponse, estado: number, datos: unknown): void {
  res.writeHead(estado, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos));
}

async function estatico(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const archivo = normalize(join(RAIZ, ruta));
  if (!archivo.startsWith(RAIZ + sep) || !PUBLICO.some(p => ruta === p || (p.endsWith('/') && ruta.startsWith(p)))) {
    res.writeHead(404).end('No encontrado'); return;
  }
  try {
    if (!(await stat(archivo)).isFile()) throw new Error();
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] || 'application/octet-stream' });
    res.end(await readFile(archivo));
  } catch { res.writeHead(404).end('No encontrado'); }
}

async function analizarVoz(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (Number(req.headers['content-length'] || 0) > MAX_CUERPO) { json(res, 413, { ok: false, error: 'Los audios pesan demasiado.' }); return; }
  /* Request de la web estándar lee el multipart sin librerías */
  const form = await new Request('http://x', { method: 'POST', headers: req.headers as HeadersInit, body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } as RequestInit).formData();
  const preguntas: Pregunta[] = JSON.parse(String(form.get('preguntas') || '[]')).slice(0, 12);
  const entradas: Entrada[] = [];
  for (const p of preguntas) {
    const audio = form.get(`audio:${p.id}`);
    if (!(audio instanceof Blob) || !audio.type.startsWith('audio/') || audio.size > MAX_AUDIO) continue;
    entradas.push({ pregunta: { id: String(p.id).slice(0, 40), texto: String(p.texto).slice(0, 300) }, audio: { datos: Buffer.from(await audio.arrayBuffer()), mime: audio.type } });
  }
  if (!entradas.length) { json(res, 400, { ok: false, error: 'No llegó ninguna respuesta de voz.' }); return; }
  const inicio = Date.now();
  const perfil = await analizar(entradas);
  console.log(`[analizar-voz] ${entradas.length} audios analizados en ${Date.now() - inicio} ms`);
  json(res, 200, { ok: true, perfil });
}

createServer(async (req, res) => {
  try {
    const ruta = new URL(req.url, 'http://x').pathname;
    if (req.method === 'POST' && ruta === '/api/analizar-voz') return await analizarVoz(req, res);
    if (ruta.startsWith('/api/')) return json(res, 404, { ok: false, error: 'No existe ese servicio.' });
    if (req.method === 'GET' || req.method === 'HEAD') return await estatico(req, res);
    res.writeHead(405).end();
  } catch (e) {
    console.error('[servidor]', e);
    if (!res.headersSent) json(res, 502, { ok: false, error: 'No se pudo analizar el diagnóstico.' });
  }
}).listen(PUERTO, () => console.log(`Zip en http://localhost:${PUERTO}`));
