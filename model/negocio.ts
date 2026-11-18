/* =====================================================================
   Zip · MODEL · Lógica de negocio
   ---------------------------------------------------------------------
   Todo lo que Zip "sabe" y decide vive en este archivo, sin tocar el DOM:
   - Zip.Modelo      · catálogo, planes y el asesor de ventas (bot).
   - Zip.Plataforma  · experiencias, inscripción, módulos, tutor IA,
                       bitácora, repaso espaciado (FSRS), coach e insignia.
   - Zip.Auth        · inicio de sesión con la cuenta de prueba.
   La VIEW pinta y el CONTROLLER conecta; ninguno de los dos decide.

   No hay base de datos: todo se guarda en sessionStorage, así que dura
   solo lo que dura la pestaña abierta.
   ===================================================================== */

/* ---------- Almacenamiento de la sesión (compartido por el modelo) ---------- */
namespace Zip.Memoria {
  /** Lee un JSON de sessionStorage; si no hay o falla, devuelve null. */
  export function leer<T>(clave: string): T | null {
    try {
      const crudo = sessionStorage.getItem(clave);
      return crudo ? (JSON.parse(crudo) as T) : null;
    } catch (e) {
      return null;
    }
  }
  export function escribir(clave: string, valor: unknown): void {
    try { sessionStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
  }
  export function borrar(clave: string): void {
    try { sessionStorage.removeItem(clave); } catch (e) { /* sin almacenamiento */ }
  }
}

/* =====================================================================
   Zip.Modelo · catálogo y asesor de ventas
   ===================================================================== */
namespace Zip.Modelo {

  /* ---------- Tipos ---------- */
  export interface Experiencia { id: string; nombre: string; descripcion: string; claves: readonly string[] }
  export interface Plan { id: string; nombre: string; incluye: readonly string[] }
  export interface PreguntaRapida { pregunta: string; respuesta: string }
  export interface MensajeAsesor { rol: 'usuario' | 'bot'; texto: string }
  /** Lo que puede devolver un bot: texto plano (se escapa) u objeto con HTML ya armado. */
  export type Respuesta = string | { html: string };
  export type Conector = (texto: string, historial: MensajeAsesor[]) => Respuesta | Promise<Respuesta>;

  /* ---------- Datos del negocio ---------- */
  /** Marcadores de datos que el equipo aún debe confirmar. */
  export const PENDIENTE = Object.freeze({
    precio: '[PRECIO]',
    periodo: '[PERIODO]',
    correo: '[CORREO]',
    confirmar: '[CONFIRMAR]'
  });

  export const EXPERIENCIAS: ReadonlyArray<Experiencia> = Object.freeze([
    { id: 'liderazgo', nombre: 'Liderazgo', descripcion: 'guiar a otros sin imponerte',
      claves: ['lider', 'liderar', 'equipo', 'jefe', 'jefa', 'guiar', 'cargo', 'gerente', 'coordinar'] },
    { id: 'comunicacion', nombre: 'Comunicación', descripcion: 'decir lo que piensas con claridad y escuchar de verdad',
      claves: ['hablar', 'comunic', 'presentar', 'exponer', 'conversa', 'escuchar', 'pena', 'nervio', 'publico'] },
    { id: 'pensamiento', nombre: 'Pensamiento crítico', descripcion: 'decidir con argumentos y no con impulsos',
      claves: ['decid', 'analiz', 'argument', 'pensar', 'critic', 'datos', 'evidencia'] },
    { id: 'problemas', nombre: 'Resolver problemas reales', descripcion: 'definir problemas, encontrar causas y probar soluciones',
      claves: ['problema', 'resolver', 'solucion', 'causa', 'atorad', 'mejorar un proceso'] }
  ]);

  export const PLANES: ReadonlyArray<Plan> = Object.freeze([
    { id: 'comunidad', nombre: 'Comunidad', incluye: ['Materiales de aprendizaje autónomo', 'Talleres en comunidad'] },
    { id: 'completa', nombre: 'Experiencia completa', incluye: [
      'Todo lo del plan Comunidad', 'Sesiones de diálogo en comunidad',
      'Coach: sesiones 1 a 1, retos y proyectos a tu medida', 'Tutor IA académico y de reflexión',
      'Bitácora con tu trayectoria y evidencias', 'Evaluaciones por módulo, evaluación final y certificación'] }
  ]);

  /* ---------- Utilidades puras ---------- */
  const ENTIDADES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  export const escapar = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ENTIDADES[c]);
  const marcador = (t: string): string => `<span class="marcador">${t}</span>`;
  /** Minúsculas y sin acentos, para comparar texto escrito por personas. */
  export const normalizar = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /** Convierte una respuesta (texto plano u objeto {html}) a HTML seguro para pintar. */
  export const aHTML = (r: Respuesta | null | undefined): string =>
    (r && typeof r === 'object' && 'html' in r) ? r.html : escapar(r ?? '');

  /* ---------- Reglas del asesor ---------- */
  export const PREGUNTAS = Object.freeze({
    exp: {
      pregunta: '¿Qué es una experiencia?',
      respuesta: 'Es como un curso, pero más largo y completo: por módulos tienes materiales a tu ritmo, talleres en equipo y sesiones de diálogo. Además, un coach que te conoce y un tutor IA que te acompaña en el estudio y en la reflexión.'
    },
    gratis: {
      pregunta: '¿Qué es gratis?',
      respuesta: `Los materiales de aprendizaje autónomo y los talleres en comunidad ${marcador(PENDIENTE.confirmar)}. El coach, el tutor IA y la certificación vienen en la experiencia completa.`
    },
    precio: {
      pregunta: '¿Cuánto cuesta?',
      respuesta: `La experiencia completa cuesta ${marcador(PENDIENTE.precio)} ${marcador(PENDIENTE.periodo)}. Puedes empezar gratis y subir cuando quieras demostrar lo que aprendiste.`
    },
    valida: {
      pregunta: '¿Cómo valido lo que aprendo?',
      respuesta: 'Con evaluaciones por módulo, el seguimiento de tu coach y tu bitácora de evidencias. Al final, tu coach hace una evaluación general para darte la certificación de la experiencia.'
    },
    ya: {
      pregunta: 'Quiero empezar',
      respuesta: '¡Va! Entra con tu cuenta, elige tu experiencia y te inscribes en un minuto: <a href="#login">empezar ahora</a>.'
    }
  } satisfies Record<string, PreguntaRapida>);
  export type ClavePregunta = keyof typeof PREGUNTAS;

  export const esClave = (k: string): k is ClavePregunta => Object.prototype.hasOwnProperty.call(PREGUNTAS, k);

  /** Recomienda una experiencia según lo que la persona quiere lograr. */
  export function recomendar(texto: string): Experiencia | null {
    const t = normalizar(texto);
    let mejor: Experiencia | null = null, puntos = 0;
    for (const e of EXPERIENCIAS) {
      const p = e.claves.filter(k => t.includes(k)).length;
      if (p > puntos) { mejor = e; puntos = p; }
    }
    return mejor;
  }

  /** Respuesta de muestra para texto libre mientras no haya bot conectado. */
  export function respuestaDeMuestra(texto: string): string {
    const e = recomendar(texto);
    if (e) {
      return `Por lo que me cuentas, te recomiendo la experiencia de <strong>${e.nombre}</strong>: es para ${e.descripcion}. <a href="#exp/${e.id}">Ver la experiencia</a>.`;
    }
    return 'Cuéntame qué quieres lograr (por ejemplo: «hablar mejor en juntas» o «coordinar a mi equipo») y te recomiendo una experiencia. También puedes ver <a href="#experiencias">todas las experiencias</a>.';
  }

  /* ---------- Conexión con un bot real ---------- */
  /** Lo que el bot necesita saber de Zip para vender bien (se manda en cada consulta). */
  const CONTEXTO_VENTAS = 'Eres el asesor de ventas de Zip, una plataforma de aprendizaje experiencial para jóvenes y profesionales. ' +
    'Zip ofrece experiencias (más largas y completas que un curso) con cuatro componentes por módulo: aprendizaje autónomo, aprendizaje en comunidad ' +
    '(talleres y sesiones de diálogo), aplicación personalizada con un coach y evaluación y reflexión; además un tutor de IA académico y de reflexión que lleva la bitácora. ' +
    'Experiencias: ' + EXPERIENCIAS.map(e => `${e.nombre} (${e.descripcion})`).join('; ') + '. ' +
    'Responde breve, en español de México, recomienda una experiencia según lo que la persona quiere lograr e invítala a inscribirse. No inventes precios.';

  /**
   * Crea un conector para un bot por HTTP (la terminal de bots, /api/tutor u otro).
   * Manda POST JSON y entiende la respuesta en texto plano o en JSON con
   * { texto } · { respuesta } · { reply } · { message } · { output }.
   */
  export function conectorHTTP(url: string): Conector {
    return async (texto, historial) => {
      const r = await fetch(url, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          modo: 'ventas', contexto: CONTEXTO_VENTAS, mensaje: texto, historial,
          mensajes: historial.map(m => ({ de: m.rol === 'usuario' ? 'yo' : 'bot', t: String(m.texto).replace(/<[^>]+>/g, '') }))
        })
      });
      if (!r.ok) throw new Error(`El bot respondió ${r.status}`);
      const crudo = await r.text();
      let j: unknown = null;
      try { j = JSON.parse(crudo); } catch (e) { /* texto plano */ }
      const o = j as Record<string, unknown>;
      const salida = j && typeof j === 'object' ? (o.texto || o.respuesta || o.reply || o.message || o.output) : (j || crudo);
      if (!salida || typeof salida !== 'string') throw new Error('El bot no mandó texto');
      return salida;
    };
  }

  /* ---------- Conversación ---------- */
  export class AsesorVentas {
    private conector: Conector | null = null;
    private fallas = 0;
    private _historial: MensajeAsesor[] = [];

    get historial(): MensajeAsesor[] { return this._historial.slice(); }
    get conectado(): boolean { return this.conector !== null && this.fallas < 2; }

    /** Punto único para conectar el bot real: una función o la dirección (URL) del bot. */
    conectar(destino: Conector | string | null): void {
      this.fallas = 0;
      this.conector = typeof destino === 'function' ? destino
        : (typeof destino === 'string' && destino.trim() ? conectorHTTP(destino.trim()) : null);
    }

    respuestaRapida(clave: ClavePregunta): PreguntaRapida { return PREGUNTAS[clave]; }

    /** Registra la pregunta y devuelve (promesa) el HTML de la respuesta. */
    async preguntar(texto: string, respuestaFija?: string): Promise<string> {
      this._historial.push({ rol: 'usuario', texto });
      let html: string;
      if (this.conector && !respuestaFija && this.fallas < 2) {
        try { html = aHTML(await this.conector(texto, this.historial)); this.fallas = 0; }
        catch (err) {
          /* Si el bot no contesta, la persona no se queda sin respuesta: sigue el asesor de muestra.
             Tras 2 fallas seguidas deja de intentarlo en esta visita. */
          this.fallas++;
          console.warn('ZipBot: sin conexión con el bot, respondo con el asesor de muestra.', err);
          html = respuestaDeMuestra(texto);
        }
      } else {
        html = respuestaFija ?? respuestaDeMuestra(texto);
      }
      this._historial.push({ rol: 'bot', texto: html });
      return html;
    }
  }
}

/* =====================================================================
   Zip.Auth · inicio de sesión (datos de prueba, sin base de datos)
   ---------------------------------------------------------------------
   Una sola cuenta de prueba. La sesión vive en sessionStorage: al cerrar
   la pestaña se borra.
   ===================================================================== */
namespace Zip.Auth {

  export interface Usuario { usuario: string; nombre: string; iniciales: string }
  export type Resultado = { ok: true; usuario: Usuario } | { ok: false; error: string };

  /** Cuenta de prueba (se muestra en la pantalla de entrada). */
  export const DEMO = Object.freeze({ usuario: 'Pedro Paramo', clave: '123' });

  const CUENTAS: ReadonlyArray<{ usuario: string; clave: string; nombre: string }> = Object.freeze([
    { usuario: DEMO.usuario, clave: DEMO.clave, nombre: 'Pedro Paramo' }
  ]);
  const CLAVE = 'zip-sesion';

  /** Ignora mayúsculas, acentos y espacios de más: «pedro  páramo» también entra. */
  const comparable = (s: string): string => Zip.Modelo.normalizar(s.trim().replace(/\s+/g, ' '));
  const iniciales = (nombre: string): string =>
    nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

  let sesion: Usuario | null = Zip.Memoria.leer<Usuario>(CLAVE);

  export function iniciarSesion(usuario: string, clave: string): Resultado {
    if (!usuario.trim() || !clave) return { ok: false, error: 'Escribe tu usuario y tu contraseña.' };
    const cuenta = CUENTAS.find(c => comparable(c.usuario) === comparable(usuario));
    if (!cuenta || cuenta.clave !== clave) return { ok: false, error: 'Usuario o contraseña incorrectos. Revisa la cuenta de prueba de abajo.' };
    sesion = { usuario: cuenta.usuario, nombre: cuenta.nombre, iniciales: iniciales(cuenta.nombre) };
    Zip.Memoria.escribir(CLAVE, sesion);
    return { ok: true, usuario: sesion };
  }

  export function cerrarSesion(): void {
    sesion = null;
    Zip.Memoria.borrar(CLAVE);
  }

  export const actual = (): Usuario | null => sesion;
  export const activa = (): boolean => sesion !== null;
}

/* =====================================================================
   Zip.Plataforma · experiencias, módulos, bitácora, repaso y coach
   ---------------------------------------------------------------------
   Experiencias, inscripción, los 4 componentes del módulo, tutor IA,
   bitácora, repaso espaciado (ts-fsrs), panel del coach e insignia
   Open Badges. El progreso se guarda solo en esta sesión del navegador.
   ===================================================================== */
namespace Zip.Plataforma {

  /* ---------- Tipos ---------- */
  export interface PreguntaEval { p: string; o: string[]; c: number }
  export interface Modulo {
    t: string;
    materiales?: [string, string][];
    taller?: string;
    dialogo?: string;
    retos?: Record<string, string>;
    eval?: PreguntaEval[];
  }
  export interface Exp { nombre: string; comp: string; semanas: number; desc: string; modulos: Modulo[] }
  export interface Entrada { de: 'yo' | 'bot'; t: string; f?: string }
  /** Tarjeta de ts-fsrs (forma libre: la define la librería). */
  export type CartaFSRS = { due: Date | string; last_review?: Date | string; [k: string]: unknown };
  export interface EstadoTarjeta { card: CartaFSRS | null; due: string; vistas: number; ultima?: number }
  export interface Estado {
    exp: string | null; contexto: string; tab: number; hecho: boolean[];
    chatTutor: Entrada[]; bitacora: Entrada[];
    evalResp: (number | null)[]; autoeval: number; reflexion: string;
    reto: string; retoHecho: boolean; card: CartaFSRS | null; bajo: boolean;
    camino: Record<string, boolean>; tarjetas: Record<string, EstadoTarjeta>;
    repasos: number; buenas: number; dias: string[];
    iaViva?: boolean; ruta?: string[]; rub?: number[];
    coachOK?: boolean; coachNota?: number; coachComent?: string;
    proxRepaso?: string | null; aciertos?: number;
  }
  export interface Participante { nombre: string; donde: string; mod: number; bit: number; dias: number; riesgo: boolean }
  export type Resultado = { ok: true } | { ok: false; error: string };

  export const EXP: Record<string, Exp> = {
    comunicacion: { nombre: 'Comunicación que convence', comp: 'Comunicación', semanas: 6,
      desc: 'Aprende a estructurar una idea, escuchar objeciones y defenderla frente a un grupo.',
      modulos: [
        { t: 'Estructura tu idea',
          materiales: [
            ['Lectura · 8 min', 'La estructura PREP: Punto, Razón, Ejemplo, Punto. Abre tu idea en una frase, explica por qué importa, sostenla con un caso o un dato, y ciérrala con lo que pides.'],
            ['Video · 6 min', 'Ejemplo comentado de una idea defendida en 60 segundos.'],
            ['Pódcast · 15 min', 'Episodio elegido por tu coach sobre cómo hablar con claridad en el trabajo.']],
          taller: 'Pitch de 60 segundos en tríos',
          dialogo: '¿Qué te cuesta defender una idea y de dónde viene eso?',
          retos: {
            'En la escuela': 'Esta semana, en una clase o en un equipo de trabajo, propón una idea usando PREP. Anota cómo reaccionaron.',
            'En mi trabajo': 'En tu próxima junta, presenta una propuesta pequeña usando PREP. Anota qué preguntaron.',
            'Para cambiar de trabajo': 'Prepara tu respuesta a «¿por qué deberíamos contratarte?» con PREP y practícala con alguien.',
            'En mi comunidad': 'Propón algo concreto a tu familia, vecinos o grupo usando PREP. Anota qué funcionó.' },
          eval: [
            { p: '¿Cuál es el orden correcto de PREP?', o: ['Razón, Punto, Ejemplo, Punto', 'Punto, Razón, Ejemplo, Punto', 'Ejemplo, Punto, Razón, Cierre'], c: 1 },
            { p: 'Presentas tu idea y alguien dice «no lo veo claro». ¿Qué parte de PREP te conviene reforzar primero?', o: ['El ejemplo o dato', 'El saludo', 'El volumen de voz'], c: 0 }] },
        { t: 'Escucha y responde objeciones' }, { t: 'Habla frente a un grupo' }] },
    liderazgo: { nombre: 'Liderazgo en la práctica', comp: 'Liderazgo', semanas: 8,
      desc: 'Coordina personas, da retroalimentación y toma decisiones con tu equipo.',
      modulos: [{ t: 'Conócete como líder' }, { t: 'Conversaciones difíciles' }, { t: 'Decidir en equipo' }] },
    pensamiento: { nombre: 'Pensamiento crítico', comp: 'Pensamiento crítico', semanas: 6,
      desc: 'Distingue datos de opiniones, cuestiona supuestos y argumenta con evidencia.',
      modulos: [{ t: 'Dato, opinión o supuesto' }, { t: 'Evalúa fuentes' }, { t: 'Argumenta con evidencia' }] },
    problemas: { nombre: 'Resolver problemas reales', comp: 'Resolución de problemas', semanas: 6,
      desc: 'Define problemas, encuentra causas y prueba soluciones pequeñas.',
      modulos: [{ t: 'Define el problema' }, { t: 'Encuentra causas' }, { t: 'Prueba y aprende' }] }
  };
  export const DISPONIBLE = 'comunicacion';
  export const PESTANAS = ['Autónomo', 'Comunidad', 'Aplicación', 'Evaluación'];
  export const CONTEXTOS = ['En la escuela', 'En mi trabajo', 'Para cambiar de trabajo', 'En mi comunidad'];
  export const RUBRICA = ['Abre con una idea clara', 'Explica por qué importa', 'Sostiene con ejemplo o dato', 'Cierra con lo que pide'];
  const PREG_REFLEXION = ['¿Qué pasó exactamente? Cuéntame la situación.', '¿Qué parte de lo que aprendiste usaste ahí?', '¿Qué harías distinto la próxima vez?', '¿Cómo te sentiste antes y después?'];
  /* [nombre, dónde aplica, componentes hechos, entradas de bitácora, días sin actividad] */
  const GRUPO: [string, string, number, number, number][] = [
    ['Participante A', 'En la escuela', 4, 2, 1], ['Participante B', 'En mi trabajo', 3, 1, 3],
    ['Participante C', 'Para cambiar de trabajo', 2, 0, 9], ['Participante D', 'En mi trabajo', 4, 4, 0],
    ['Participante E', 'En mi comunidad', 1, 0, 12]];
  const DIAS_RIESGO = 7;

  /* ---------- Estado de esta sesión ---------- */
  const CLAVE = 'zip2';
  const base = (): Estado => ({ exp: null, contexto: '', tab: 0, hecho: [false, false, false, false], chatTutor: [], bitacora: [], evalResp: [], autoeval: 0, reflexion: '', reto: '', retoHecho: false, card: null, bajo: false, camino: {}, tarjetas: {}, repasos: 0, buenas: 0, dias: [] });
  /** El estado vivo (la VIEW solo lo lee). */
  export const estado: Estado = Object.assign(base(), Zip.Memoria.leer<Partial<Estado>>(CLAVE) || {});
  const S = estado;
  const guardar = (): void => Zip.Memoria.escribir(CLAVE, S);

  /* ---------- Consultas ---------- */
  export const experiencia = (k: string): Exp | null => EXP[k] || null;
  export const actual = (): Exp | null => (S.exp ? EXP[S.exp] : null);
  export const avance = (): number => S.hecho.filter(Boolean).length;
  export const evidencias = (): Entrada[] => S.bitacora.filter(x => x.de === 'yo');
  export const fechaLarga = (d: Date): string => d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const fechaHora = (): string => new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  /** Próxima fecha de un día de la semana (0 = domingo) a cierta hora. */
  export function proximo(dia: number, hora: string): string {
    const d = new Date();
    d.setDate(d.getDate() + (((dia - d.getDay() + 7) % 7) || 7));
    return `${fechaLarga(d)}, ${hora}`;
  }

  /* ---------- Inscripción y avance ---------- */
  export function inscribir(k: string, contexto: string): boolean {
    if (k !== DISPONIBLE || !CONTEXTOS.includes(contexto)) return false;
    Object.assign(S, base(), {
      bajo: S.bajo, bitacora: S.bitacora, iaViva: S.iaViva,
      exp: k, contexto, reto: EXP[k].modulos[0].retos[contexto],
      ruta: [], rub: [], coachOK: false, coachNota: 0, coachComent: '', proxRepaso: null, aciertos: undefined
    });
    guardar();
    return true;
  }
  export function irAPestana(i: number): void { S.tab = Math.max(0, Math.min(3, i)); guardar(); }
  export function completar(i: number, siguiente?: number): void { S.hecho[i] = true; if (siguiente != null) S.tab = siguiente; guardar(); }
  export function marcarReto(v: boolean): void { S.retoHecho = Boolean(v); guardar(); }

  /* ---------- Tutor IA (académico y de reflexión) ---------- */
  /** Respuesta guía cuando no hay IA conectada: pregunta antes de resolver. */
  function respuestaTutor(q: string): string {
    const v = q.toLowerCase();
    if (/nerv|miedo|ansie|pánico|panico/.test(v)) return 'Es muy común sentir nervios. Algo que ayuda: practicar recordando tu idea sin leerla, varias veces y en días distintos. ¿Quieres que practiquemos tu frase de apertura ahora?';
    if (/ejemplo|dato/.test(v)) return 'El ejemplo es la parte que hace creíble tu idea. Puede ser un caso que viviste o un dato con su fuente. ¿Qué ejemplo tienes para tu idea?';
    if (/prep|orden|estructura|paso/.test(v)) return 'PREP es Punto, Razón, Ejemplo, Punto. Antes de explicarte más: ¿con tus palabras, para qué sirve cerrar repitiendo el punto?';
    return 'Buena pregunta. Antes de responderte, cuéntame: ¿en qué situación concreta quieres usar esto? Así te explico con un ejemplo tuyo.';
  }
  /** IA real del servidor (/api/tutor). Si no responde, devuelve null y se usa la simulada. */
  async function consultarIA(modo: string, mensajes: Entrada[]): Promise<string | null> {
    try {
      const e = actual();
      const contexto = e ? `Experiencia: ${e.nombre}. Módulo 1: ${e.modulos[0].t} (estructura PREP). Aplica: ${S.contexto}. Reto: ${S.reto}` : '';
      const r = await fetch('/api/tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ modo, contexto, mensajes }) });
      if (!r.ok) return null;
      const j = await r.json();
      return j.texto || null;
    } catch (err) { return null; }
  }
  export function registrarPregunta(texto: string): void { S.chatTutor.push({ de: 'yo', t: texto }); guardar(); }
  export async function responderTutor(texto: string): Promise<void> {
    const ia = await consultarIA('academico', S.chatTutor);
    S.chatTutor.push({ de: 'bot', t: ia || respuestaTutor(texto) });
    if (ia) S.iaViva = true;
    guardar();
  }
  /** Guarda una entrada de bitácora (evidencia) y devuelve cuántas había antes. */
  export function registrarEntrada(texto: string): number {
    const n = evidencias().length;
    S.bitacora.push({ de: 'yo', t: texto, f: fechaHora() });
    guardar();
    return n;
  }
  export async function responderReflexion(n: number): Promise<void> {
    const ia = await consultarIA('reflexion', S.bitacora.map(x => ({ de: x.de, t: x.t })));
    S.bitacora.push({ de: 'bot', t: ia || ((n === 0 ? 'Gracias por contarlo. ' : '') + PREG_REFLEXION[n % PREG_REFLEXION.length]) });
    if (ia) S.iaViva = true;
    guardar();
  }

  /* ---------- Evaluación y repaso espaciado (ts-fsrs) ---------- */
  /** ts-fsrs desde jsDelivr (window.FSRS) o un fsrs.js propio del sitio (window.ZipFSRS). */
  const libFSRS = (): any => window.ZipFSRS || window.FSRS || null;
  const PARAMS = { enable_fuzz: false, enable_short_term: false, maximum_interval: 90 };

  export function responderEval(i: number, j: number): void { if (S.evalResp[i] == null) { S.evalResp[i] = j; guardar(); } }
  export function autoevaluar(n: number): void { S.autoeval = n; guardar(); }
  export function reflexionar(t: string): void { S.reflexion = t; guardar(); }
  function programarRepaso(nota: number): Date | null {
    const lib = libFSRS();
    if (!lib) return null;
    const { fsrs, createEmptyCard, Rating, generatorParameters } = lib;
    const f = fsrs(generatorParameters(PARAMS));
    let card = S.card ? revivir(S.card) : createEmptyCard(new Date());
    card = f.next(card, new Date(), [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy][nota]).card;
    S.card = card;
    let sim = card;
    S.ruta = [new Date(card.due).toISOString()];
    for (let i = 0; i < 3; i++) { sim = f.next(sim, sim.due, Rating.Good).card; S.ruta.push(new Date(sim.due).toISOString()); }
    guardar();
    return new Date(card.due);
  }
  export function terminarModulo(): Resultado {
    const m = actual().modulos[0], r = S.evalResp;
    if (r.filter(x => x != null).length < m.eval.length || !S.autoeval || S.reflexion.trim().length < 10) {
      return { ok: false, error: 'Responde las tres preguntas y escribe tu reflexión.' };
    }
    const aciertos = m.eval.filter((q, i) => r[i] === q.c).length;
    const d = programarRepaso(aciertos === 2 ? 2 : (aciertos === 1 ? 1 : 0));
    S.hecho[3] = true; S.aciertos = aciertos; S.proxRepaso = d ? d.toISOString() : null;
    guardar();
    return { ok: true };
  }

  /* ---------- Coach ---------- */
  export function grupoCoach(): Participante[] {
    const nombre = Zip.Auth.actual()?.nombre;
    const yo: [string, string, number, number, number][] = S.exp ? [[`${nombre || 'Tú'} (esta sesión)`, S.contexto, avance(), evidencias().length, 0]] : [];
    return yo.concat(GRUPO).map(([nombre, donde, mod, bit, dias]) => ({ nombre, donde, mod, bit, dias, riesgo: dias >= DIAS_RIESGO }));
  }
  export function calificar(criterio: number, nota: number): void { S.rub = S.rub || []; S.rub[criterio] = nota; guardar(); }
  export function validarEvidencia(comentario: string): Resultado {
    const r = S.rub || [];
    if (r.filter(Boolean).length < RUBRICA.length) return { ok: false, error: 'Califica los cuatro criterios.' };
    S.coachOK = true; S.coachNota = r.reduce((a, b) => a + b, 0); S.coachComent = String(comentario || '').trim();
    guardar();
    return { ok: true };
  }

  /* ---------- Insignia (Open Badges 3.0, sin firma digital) ---------- */
  export function credencialInsignia(): Record<string, unknown> {
    const e = actual();
    const persona = Zip.Auth.actual();
    return {
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'],
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: { type: ['Profile'], name: 'Zip (prototipo, sin firma digital)' },
      ...(S.coachOK ? { endorsement: [{ type: ['EndorsementCredential'], name: 'Validación del coach', description: `Rúbrica PREP: ${S.coachNota} de 16. ${S.coachComent || ''}` }] } : {}),
      validFrom: new Date().toISOString(),
      name: `${e.nombre} · Módulo 1`,
      credentialSubject: { type: ['AchievementSubject'], ...(persona ? { name: persona.nombre } : {}),
        achievement: { type: ['Achievement'], name: `${e.nombre} · Módulo 1: ${e.modulos[0].t}`, description: e.desc,
          criteria: { narrative: `Completó materiales, taller o diálogo, un reto aplicado ${S.contexto.toLowerCase()} y la evaluación del módulo.` } } },
      evidence: evidencias().map(x => ({ type: ['Evidence'], name: `Entrada de bitácora · ${x.f}`, narrative: x.t }))
        .concat(S.reflexion ? [{ type: ['Evidence'], name: 'Reflexión del módulo', narrative: S.reflexion }] : [])
    };
  }

  /* =====================================================================
     Tablero de la experiencia: camino de aprendizaje, situaciones y flashcards
     ===================================================================== */
  /** Enlace del video de introducción (YouTube). Pégalo aquí cuando lo tengas. */
  const VIDEO_INTRO: string = '';

  export interface PasoCamino { n: number; tipo: string; titulo: string; resumen: string }
  export interface Situacion { ambito: string; titulo: string; problema: string; camino: string[]; evita: string }
  export interface Tarjeta { id: string; concepto: string; frente: string; reverso: string[] }

  export const CAMINO: PasoCamino[] = [
    { n: 1, tipo: 'Video', titulo: 'Introducción a la comunicación', resumen: 'Un video corto para entender qué es comunicar bien y por qué pesa tanto en el trabajo.' },
    { n: 2, tipo: 'Casos', titulo: 'Situaciones donde la comunicación es clave', resumen: 'Casos del trabajo y de la vida diaria, con el mejor camino para resolverlos.' },
    { n: 3, tipo: 'Práctica', titulo: 'Flashcards: ¿qué harías tú?', resumen: 'Cinco situaciones para imaginar tu respuesta, voltear la tarjeta y comparar.' },
    { n: 4, tipo: 'Aplicación', titulo: 'Estructura tu idea con PREP', resumen: 'Materiales, comunidad, un reto con tu coach y la evaluación.' }
  ];

  export const SITUACIONES: Situacion[] = [
    { ambito: 'En el trabajo', titulo: 'Tu jefa descarta tu idea en diez segundos',
      problema: 'Propones algo en la junta y te responde «no creo que funcione» antes de que termines.',
      camino: ['Pregunta qué le preocupa', 'Repite su objeción con tus palabras', 'Responde con un dato o un ejemplo', 'Pide un paso pequeño: una prueba'],
      evita: 'Repetir lo mismo, pero más fuerte.' },
    { ambito: 'En el trabajo', titulo: 'Necesitas más tiempo para una entrega',
      problema: 'Ya viste que no llegas a la fecha y te da pena avisar.',
      camino: ['Avisa en cuanto lo sepas', 'Di primero lo que pides: «necesito dos días más»', 'Explica la razón en una frase', 'Propón qué entregas hoy y qué después'],
      evita: 'Avisar el mismo día o dar vueltas antes de pedirlo.' },
    { ambito: 'En el trabajo', titulo: 'Un compañero no entrega su parte',
      problema: 'Su retraso frena lo tuyo y empiezas a molestarte.',
      camino: ['Háblalo en privado', 'Describe el hecho, sin etiquetas', 'Di cómo te afecta', 'Pregunta qué pasó y acuerden una fecha'],
      evita: 'Quejarte con otros o decir «siempre haces lo mismo».' },
    { ambito: 'En la vida diaria', titulo: 'En casa nadie se pone de acuerdo con los gastos',
      problema: 'Cada plática sobre dinero termina en discusión.',
      camino: ['Elige un momento tranquilo', 'Propón una idea concreta, no una queja', 'Escucha la postura de cada quien', 'Acuerden probarlo un mes y revisarlo'],
      evita: 'Sacar el tema en medio de un enojo.' }
  ];

  /* frente = la situación · reverso = la mejor forma de resolverla */
  export const TARJETAS: Tarjeta[] = [
    { id: 't1', concepto: 'El ejemplo en PREP', frente: 'Presentas tu propuesta y alguien dice: «no lo veo claro».',
      reverso: ['No repitas lo mismo con otras palabras.', 'Da un ejemplo o un dato concreto que la haga visible.', 'Cierra volviendo a tu punto en una frase.'] },
    { id: 't2', concepto: 'PREP en un minuto', frente: 'Te encuentras a la directora en el elevador y tienes un minuto para contarle tu idea.',
      reverso: ['Punto: tu idea en una frase.', 'Razón: por qué importa.', 'Ejemplo: un caso breve.', 'Punto: lo que pides, por ejemplo una reunión de 15 minutos.'] },
    { id: 't3', concepto: 'Escucha activa', frente: 'Un cliente molesto te interrumpe y levanta la voz.',
      reverso: ['No te defiendas todavía: déjalo terminar.', 'Repite lo que entendiste: «entonces lo que pasó fue…».', 'Reconoce la molestia y después propón la solución.'] },
    { id: 't4', concepto: 'PREP en una entrevista', frente: 'En una entrevista te preguntan: «¿por qué deberíamos contratarte?».',
      reverso: ['Punto: lo que aportas al puesto.', 'Razón: por qué eso les sirve.', 'Ejemplo: un logro tuyo, concreto.', 'Punto: conecta ese logro con lo que necesitan.'] },
    { id: 't5', concepto: 'Hablar frente a un grupo', frente: 'Te piden explicar tu avance frente a todo el equipo, sin aviso, y te pones nervioso.',
      reverso: ['Respira y elige una sola idea central.', 'Dila con PREP, en corto.', 'Mira a dos o tres personas, no al piso.', 'Cierra con lo que sigue.'] }
  ];
  /* Las 4 calificaciones que alimentan a FSRS: Again · Hard · Good · Easy */
  export const NOTAS = ['No la supe', 'Me costó', 'Bien', 'Fácil'];
  const DIA = 864e5;
  const RESPALDO_DIAS = [0, 1, 3, 7];   /* si la librería FSRS no cargó */

  export function videoEmbed(): string {
    const m = VIDEO_INTRO.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : '';
  }
  export const tarjeta = (id: string): Tarjeta | null => TARJETAS.find(t => t.id === id) || null;
  const fechaClave = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  export function completarModulo(n: number): void { S.camino = S.camino || {}; S.camino['m' + n] = true; guardar(); }
  /** [módulo 1, 2, 3, 4] completados. El 3 se completa al calificar las 5 tarjetas; el 4, con sus 4 componentes. */
  export function caminoEstado(): boolean[] {
    const c = S.camino || {}, t = S.tarjetas || {};
    return [Boolean(c.m1), Boolean(c.m2), TARJETAS.every(x => t[x.id]), S.hecho.every(Boolean)];
  }

  /* ---------- Repaso espaciado por tarjeta (FSRS) ---------- */
  const motorFSRS = (): { lib: any; f: any } | null => {
    const lib = libFSRS();
    return lib ? { lib, f: lib.fsrs(lib.generatorParameters(PARAMS)) } : null;
  };
  const revivir = (c: CartaFSRS): CartaFSRS => ({ ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined });
  /** Calcula cuándo vuelve una tarjeta si se califica con `nota` (0 a 3), sin guardar nada. */
  function siguiente(id: string, nota: number, ahora: Date): { due: Date; card: CartaFSRS | null } {
    const t = (S.tarjetas || {})[id], m = motorFSRS();
    if (!m) return { due: new Date(ahora.getTime() + RESPALDO_DIAS[nota] * DIA), card: null };
    const { lib, f } = m;
    const card = t && t.card ? revivir(t.card) : lib.createEmptyCard(ahora);
    const sig = f.next(card, ahora, [lib.Rating.Again, lib.Rating.Hard, lib.Rating.Good, lib.Rating.Easy][nota]).card;
    return { due: new Date(sig.due), card: sig };
  }
  const enPalabras = (due: Date, ahora: Date): string => {
    const d = Math.round((due.getTime() - ahora.getTime()) / DIA);
    return d <= 0 ? 'hoy otra vez' : (d === 1 ? 'mañana' : `en ${d} días`);
  };
  /** Texto de «cuándo vuelve» para cada una de las 4 calificaciones. */
  export function intervalos(id: string): string[] { const ahora = new Date(); return NOTAS.map((_, n) => enPalabras(siguiente(id, n, ahora).due, ahora)); }
  /** Guarda la calificación: es el dato con el que FSRS decide cada cuánto recordar ese concepto. */
  export function calificarTarjeta(id: string, nota: number): Date {
    const ahora = new Date(), r = siguiente(id, nota, ahora);
    S.tarjetas = S.tarjetas || {};
    const t: EstadoTarjeta = S.tarjetas[id] || { card: null, due: '', vistas: 0 };
    t.card = r.card; t.due = r.due.toISOString(); t.vistas++; t.ultima = nota;
    S.tarjetas[id] = t;
    S.repasos = (S.repasos || 0) + 1;
    if (nota >= 2) S.buenas = (S.buenas || 0) + 1;
    S.dias = S.dias || [];
    if (!S.dias.includes(fechaClave(ahora))) S.dias.push(fechaClave(ahora));
    guardar();
    return r.due;
  }
  /** Tarjetas que tocan hoy: las nuevas y las que ya vencieron. */
  export function pendientes(): string[] {
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    const t = S.tarjetas || {};
    return TARJETAS.filter(x => !t[x.id] || new Date(t[x.id].due) <= fin).map(x => x.id);
  }
  export function proximoRepaso(): Date | null {
    const fechas = Object.values(S.tarjetas || {}).map(t => new Date(t.due)).sort((a, b) => a.getTime() - b.getTime());
    return fechas[0] || null;
  }
  function racha(): number {
    const dias = new Set(S.dias || []), d = new Date();
    if (!dias.has(fechaClave(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (dias.has(fechaClave(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  /** Métricas del tablero: todas empiezan en 0 y salen de lo que la persona hace. */
  export function metricas() {
    const est = caminoEstado(), t = S.tarjetas || {}, hechos = est.filter(Boolean).length;
    return {
      modulos: hechos, totalModulos: est.length, avance: Math.round(hechos / est.length * 100),
      racha: racha(),
      dominadas: TARJETAS.filter(x => t[x.id] && t[x.id].ultima >= 2).length, totalTarjetas: TARJETAS.length,
      repasos: S.repasos || 0, recuerdo: S.repasos ? Math.round((S.buenas || 0) / S.repasos * 100) : 0,
      pendientes: pendientes().length
    };
  }

  /* ---------- Preferencia: modo bajo estímulo ---------- */
  export function bajoEstimulo(v?: boolean): boolean { if (v !== undefined) { S.bajo = Boolean(v); guardar(); } return Boolean(S.bajo); }
}
