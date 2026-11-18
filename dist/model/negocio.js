"use strict";
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
var Zip;
(function (Zip) {
    var Memoria;
    (function (Memoria) {
        /** Lee un JSON de sessionStorage; si no hay o falla, devuelve null. */
        function leer(clave) {
            try {
                const crudo = sessionStorage.getItem(clave);
                return crudo ? JSON.parse(crudo) : null;
            }
            catch (e) {
                return null;
            }
        }
        Memoria.leer = leer;
        function escribir(clave, valor) {
            try {
                sessionStorage.setItem(clave, JSON.stringify(valor));
            }
            catch (e) { /* sin almacenamiento */ }
        }
        Memoria.escribir = escribir;
        function borrar(clave) {
            try {
                sessionStorage.removeItem(clave);
            }
            catch (e) { /* sin almacenamiento */ }
        }
        Memoria.borrar = borrar;
    })(Memoria = Zip.Memoria || (Zip.Memoria = {}));
})(Zip || (Zip = {}));
/* =====================================================================
   Zip.Modelo · catálogo y asesor de ventas
   ===================================================================== */
(function (Zip) {
    var Modelo;
    (function (Modelo) {
        /* ---------- Datos del negocio ---------- */
        /** Marcadores de datos que el equipo aún debe confirmar. */
        Modelo.PENDIENTE = Object.freeze({
            precio: '[PRECIO]',
            periodo: '[PERIODO]',
            correo: '[CORREO]',
            confirmar: '[CONFIRMAR]'
        });
        Modelo.EXPERIENCIAS = Object.freeze([
            { id: 'liderazgo', nombre: 'Liderazgo', descripcion: 'guiar a otros sin imponerte',
                claves: ['lider', 'liderar', 'equipo', 'jefe', 'jefa', 'guiar', 'cargo', 'gerente', 'coordinar'] },
            { id: 'comunicacion', nombre: 'Comunicación', descripcion: 'decir lo que piensas con claridad y escuchar de verdad',
                claves: ['hablar', 'comunic', 'presentar', 'exponer', 'conversa', 'escuchar', 'pena', 'nervio', 'publico'] },
            { id: 'pensamiento', nombre: 'Pensamiento crítico', descripcion: 'decidir con argumentos y no con impulsos',
                claves: ['decid', 'analiz', 'argument', 'pensar', 'critic', 'datos', 'evidencia'] },
            { id: 'problemas', nombre: 'Resolver problemas reales', descripcion: 'definir problemas, encontrar causas y probar soluciones',
                claves: ['problema', 'resolver', 'solucion', 'causa', 'atorad', 'mejorar un proceso'] }
        ]);
        Modelo.PLANES = Object.freeze([
            { id: 'comunidad', nombre: 'Comunidad', incluye: ['Materiales de aprendizaje autónomo', 'Talleres en comunidad'] },
            { id: 'completa', nombre: 'Experiencia completa', incluye: [
                    'Todo lo del plan Comunidad', 'Sesiones de diálogo en comunidad',
                    'Coach: sesiones 1 a 1, retos y proyectos a tu medida', 'Tutor IA académico y de reflexión',
                    'Bitácora con tu trayectoria y evidencias', 'Evaluaciones por módulo, evaluación final y certificación'
                ] }
        ]);
        /* ---------- Utilidades puras ---------- */
        const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        Modelo.escapar = (s) => String(s ?? '').replace(/[&<>"']/g, c => ENTIDADES[c]);
        const marcador = (t) => `<span class="marcador">${t}</span>`;
        /** Minúsculas y sin acentos, para comparar texto escrito por personas. */
        Modelo.normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        /** Convierte una respuesta (texto plano u objeto {html}) a HTML seguro para pintar. */
        Modelo.aHTML = (r) => (r && typeof r === 'object' && 'html' in r) ? r.html : Modelo.escapar(r ?? '');
        /* ---------- Reglas del asesor ---------- */
        Modelo.PREGUNTAS = Object.freeze({
            exp: {
                pregunta: '¿Qué es una experiencia?',
                respuesta: 'Es como un curso, pero más largo y completo: por módulos tienes materiales a tu ritmo, talleres en equipo y sesiones de diálogo. Además, un coach que te conoce y un tutor IA que te acompaña en el estudio y en la reflexión.'
            },
            gratis: {
                pregunta: '¿Qué es gratis?',
                respuesta: `Los materiales de aprendizaje autónomo y los talleres en comunidad ${marcador(Modelo.PENDIENTE.confirmar)}. El coach, el tutor IA y la certificación vienen en la experiencia completa.`
            },
            precio: {
                pregunta: '¿Cuánto cuesta?',
                respuesta: `La experiencia completa cuesta ${marcador(Modelo.PENDIENTE.precio)} ${marcador(Modelo.PENDIENTE.periodo)}. Puedes empezar gratis y subir cuando quieras demostrar lo que aprendiste.`
            },
            valida: {
                pregunta: '¿Cómo valido lo que aprendo?',
                respuesta: 'Con evaluaciones por módulo, el seguimiento de tu coach y tu bitácora de evidencias. Al final, tu coach hace una evaluación general para darte la certificación de la experiencia.'
            },
            ya: {
                pregunta: 'Quiero empezar',
                respuesta: '¡Va! Entra con tu cuenta, elige tu experiencia y te inscribes en un minuto: <a href="#login">empezar ahora</a>.'
            }
        });
        Modelo.esClave = (k) => Object.prototype.hasOwnProperty.call(Modelo.PREGUNTAS, k);
        /** Recomienda una experiencia según lo que la persona quiere lograr. */
        function recomendar(texto) {
            const t = Modelo.normalizar(texto);
            let mejor = null, puntos = 0;
            for (const e of Modelo.EXPERIENCIAS) {
                const p = e.claves.filter(k => t.includes(k)).length;
                if (p > puntos) {
                    mejor = e;
                    puntos = p;
                }
            }
            return mejor;
        }
        Modelo.recomendar = recomendar;
        /** Respuesta de muestra para texto libre mientras no haya bot conectado. */
        function respuestaDeMuestra(texto) {
            const e = recomendar(texto);
            if (e) {
                return `Por lo que me cuentas, te recomiendo la experiencia de <strong>${e.nombre}</strong>: es para ${e.descripcion}. <a href="#exp/${e.id}">Ver la experiencia</a>.`;
            }
            return 'Cuéntame qué quieres lograr (por ejemplo: «hablar mejor en juntas» o «coordinar a mi equipo») y te recomiendo una experiencia. También puedes ver <a href="#experiencias">todas las experiencias</a>.';
        }
        Modelo.respuestaDeMuestra = respuestaDeMuestra;
        /* ---------- Conexión con un bot real ---------- */
        /** Lo que el bot necesita saber de Zip para vender bien (se manda en cada consulta). */
        const CONTEXTO_VENTAS = 'Eres el asesor de ventas de Zip, una plataforma de aprendizaje experiencial para jóvenes y profesionales. ' +
            'Zip ofrece experiencias (más largas y completas que un curso) con cuatro componentes por módulo: aprendizaje autónomo, aprendizaje en comunidad ' +
            '(talleres y sesiones de diálogo), aplicación personalizada con un coach y evaluación y reflexión; además un tutor de IA académico y de reflexión que lleva la bitácora. ' +
            'Experiencias: ' + Modelo.EXPERIENCIAS.map(e => `${e.nombre} (${e.descripcion})`).join('; ') + '. ' +
            'Responde breve, en español de México, recomienda una experiencia según lo que la persona quiere lograr e invítala a inscribirse. No inventes precios.';
        /**
         * Crea un conector para un bot por HTTP (la terminal de bots, /api/tutor u otro).
         * Manda POST JSON y entiende la respuesta en texto plano o en JSON con
         * { texto } · { respuesta } · { reply } · { message } · { output }.
         */
        function conectorHTTP(url) {
            return async (texto, historial) => {
                const r = await fetch(url, {
                    method: 'POST', headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        modo: 'ventas', contexto: CONTEXTO_VENTAS, mensaje: texto, historial,
                        mensajes: historial.map(m => ({ de: m.rol === 'usuario' ? 'yo' : 'bot', t: String(m.texto).replace(/<[^>]+>/g, '') }))
                    })
                });
                if (!r.ok)
                    throw new Error(`El bot respondió ${r.status}`);
                const crudo = await r.text();
                let j = null;
                try {
                    j = JSON.parse(crudo);
                }
                catch (e) { /* texto plano */ }
                const o = j;
                const salida = j && typeof j === 'object' ? (o.texto || o.respuesta || o.reply || o.message || o.output) : (j || crudo);
                if (!salida || typeof salida !== 'string')
                    throw new Error('El bot no mandó texto');
                return salida;
            };
        }
        Modelo.conectorHTTP = conectorHTTP;
        /* ---------- Conversación ---------- */
        class AsesorVentas {
            constructor() {
                this.conector = null;
                this.fallas = 0;
                this._historial = [];
            }
            get historial() { return this._historial.slice(); }
            get conectado() { return this.conector !== null && this.fallas < 2; }
            /** Punto único para conectar el bot real: una función o la dirección (URL) del bot. */
            conectar(destino) {
                this.fallas = 0;
                this.conector = typeof destino === 'function' ? destino
                    : (typeof destino === 'string' && destino.trim() ? conectorHTTP(destino.trim()) : null);
            }
            respuestaRapida(clave) { return Modelo.PREGUNTAS[clave]; }
            /** Registra la pregunta y devuelve (promesa) el HTML de la respuesta. */
            async preguntar(texto, respuestaFija) {
                this._historial.push({ rol: 'usuario', texto });
                let html;
                if (this.conector && !respuestaFija && this.fallas < 2) {
                    try {
                        html = Modelo.aHTML(await this.conector(texto, this.historial));
                        this.fallas = 0;
                    }
                    catch (err) {
                        /* Si el bot no contesta, la persona no se queda sin respuesta: sigue el asesor de muestra.
                           Tras 2 fallas seguidas deja de intentarlo en esta visita. */
                        this.fallas++;
                        console.warn('ZipBot: sin conexión con el bot, respondo con el asesor de muestra.', err);
                        html = respuestaDeMuestra(texto);
                    }
                }
                else {
                    html = respuestaFija ?? respuestaDeMuestra(texto);
                }
                this._historial.push({ rol: 'bot', texto: html });
                return html;
            }
        }
        Modelo.AsesorVentas = AsesorVentas;
    })(Modelo = Zip.Modelo || (Zip.Modelo = {}));
})(Zip || (Zip = {}));
/* =====================================================================
   Zip.Auth · inicio de sesión (datos de prueba, sin base de datos)
   ---------------------------------------------------------------------
   Una sola cuenta de prueba. La sesión vive en sessionStorage: al cerrar
   la pestaña se borra.
   ===================================================================== */
(function (Zip) {
    var Auth;
    (function (Auth) {
        /** Cuenta de prueba (se muestra en la pantalla de entrada). */
        Auth.DEMO = Object.freeze({ usuario: 'Pedro Paramo', clave: '123' });
        const CUENTAS = Object.freeze([
            { usuario: Auth.DEMO.usuario, clave: Auth.DEMO.clave, nombre: 'Pedro Paramo' }
        ]);
        const CLAVE = 'zip-sesion';
        /** Ignora mayúsculas, acentos y espacios de más: «pedro  páramo» también entra. */
        const comparable = (s) => Zip.Modelo.normalizar(s.trim().replace(/\s+/g, ' '));
        const iniciales = (nombre) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
        let sesion = Zip.Memoria.leer(CLAVE);
        function iniciarSesion(usuario, clave) {
            if (!usuario.trim() || !clave)
                return { ok: false, error: 'Escribe tu usuario y tu contraseña.' };
            const cuenta = CUENTAS.find(c => comparable(c.usuario) === comparable(usuario));
            if (!cuenta || cuenta.clave !== clave)
                return { ok: false, error: 'Usuario o contraseña incorrectos. Revisa la cuenta de prueba de abajo.' };
            sesion = { usuario: cuenta.usuario, nombre: cuenta.nombre, iniciales: iniciales(cuenta.nombre) };
            Zip.Memoria.escribir(CLAVE, sesion);
            return { ok: true, usuario: sesion };
        }
        Auth.iniciarSesion = iniciarSesion;
        function cerrarSesion() {
            sesion = null;
            Zip.Memoria.borrar(CLAVE);
        }
        Auth.cerrarSesion = cerrarSesion;
        Auth.actual = () => sesion;
        Auth.activa = () => sesion !== null;
    })(Auth = Zip.Auth || (Zip.Auth = {}));
})(Zip || (Zip = {}));
/* =====================================================================
   Zip.Plataforma · experiencias, módulos, bitácora, repaso y coach
   ---------------------------------------------------------------------
   Experiencias, inscripción, los 4 componentes del módulo, tutor IA,
   bitácora, repaso espaciado (ts-fsrs), panel del coach e insignia
   Open Badges. El progreso se guarda solo en esta sesión del navegador.
   ===================================================================== */
(function (Zip) {
    var Plataforma;
    (function (Plataforma) {
        Plataforma.EXP = {
            comunicacion: { nombre: 'Comunicación que convence', comp: 'Comunicación', semanas: 6,
                desc: 'Aprende a estructurar una idea, escuchar objeciones y defenderla frente a un grupo.',
                modulos: [
                    { t: 'Estructura tu idea',
                        materiales: [
                            ['Lectura · 8 min', 'La estructura PREP: Punto, Razón, Ejemplo, Punto. Abre tu idea en una frase, explica por qué importa, sostenla con un caso o un dato, y ciérrala con lo que pides.'],
                            ['Video · 6 min', 'Ejemplo comentado de una idea defendida en 60 segundos.'],
                            ['Pódcast · 15 min', 'Episodio elegido por tu coach sobre cómo hablar con claridad en el trabajo.']
                        ],
                        taller: 'Pitch de 60 segundos en tríos',
                        dialogo: '¿Qué te cuesta defender una idea y de dónde viene eso?',
                        retos: {
                            'En la escuela': 'Esta semana, en una clase o en un equipo de trabajo, propón una idea usando PREP. Anota cómo reaccionaron.',
                            'En mi trabajo': 'En tu próxima junta, presenta una propuesta pequeña usando PREP. Anota qué preguntaron.',
                            'Para cambiar de trabajo': 'Prepara tu respuesta a «¿por qué deberíamos contratarte?» con PREP y practícala con alguien.',
                            'En mi comunidad': 'Propón algo concreto a tu familia, vecinos o grupo usando PREP. Anota qué funcionó.'
                        },
                        eval: [
                            { p: '¿Cuál es el orden correcto de PREP?', o: ['Razón, Punto, Ejemplo, Punto', 'Punto, Razón, Ejemplo, Punto', 'Ejemplo, Punto, Razón, Cierre'], c: 1 },
                            { p: 'Presentas tu idea y alguien dice «no lo veo claro». ¿Qué parte de PREP te conviene reforzar primero?', o: ['El ejemplo o dato', 'El saludo', 'El volumen de voz'], c: 0 }
                        ] },
                    { t: 'Escucha y responde objeciones' }, { t: 'Habla frente a un grupo' }
                ] },
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
        Plataforma.DISPONIBLE = 'comunicacion';
        Plataforma.PESTANAS = ['Autónomo', 'Comunidad', 'Aplicación', 'Evaluación'];
        Plataforma.CONTEXTOS = ['En la escuela', 'En mi trabajo', 'Para cambiar de trabajo', 'En mi comunidad'];
        Plataforma.RUBRICA = ['Abre con una idea clara', 'Explica por qué importa', 'Sostiene con ejemplo o dato', 'Cierra con lo que pide'];
        const PREG_REFLEXION = ['¿Qué pasó exactamente? Cuéntame la situación.', '¿Qué parte de lo que aprendiste usaste ahí?', '¿Qué harías distinto la próxima vez?', '¿Cómo te sentiste antes y después?'];
        /* [nombre, dónde aplica, componentes hechos, entradas de bitácora, días sin actividad] */
        const GRUPO = [
            ['Participante A', 'En la escuela', 4, 2, 1], ['Participante B', 'En mi trabajo', 3, 1, 3],
            ['Participante C', 'Para cambiar de trabajo', 2, 0, 9], ['Participante D', 'En mi trabajo', 4, 4, 0],
            ['Participante E', 'En mi comunidad', 1, 0, 12]
        ];
        const DIAS_RIESGO = 7;
        /* ---------- Estado de esta sesión ---------- */
        const CLAVE = 'zip2';
        const base = () => ({ exp: null, contexto: '', tab: 0, hecho: [false, false, false, false], chatTutor: [], bitacora: [], evalResp: [], autoeval: 0, reflexion: '', reto: '', retoHecho: false, card: null, bajo: false, camino: {}, tarjetas: {}, repasos: 0, buenas: 0, dias: [] });
        /** El estado vivo (la VIEW solo lo lee). */
        Plataforma.estado = Object.assign(base(), Zip.Memoria.leer(CLAVE) || {});
        const S = Plataforma.estado;
        const guardar = () => Zip.Memoria.escribir(CLAVE, S);
        /* ---------- Consultas ---------- */
        Plataforma.experiencia = (k) => Plataforma.EXP[k] || null;
        Plataforma.actual = () => (S.exp ? Plataforma.EXP[S.exp] : null);
        Plataforma.avance = () => S.hecho.filter(Boolean).length;
        Plataforma.evidencias = () => S.bitacora.filter(x => x.de === 'yo');
        Plataforma.fechaLarga = (d) => d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
        const fechaHora = () => new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
        /** Próxima fecha de un día de la semana (0 = domingo) a cierta hora. */
        function proximo(dia, hora) {
            const d = new Date();
            d.setDate(d.getDate() + (((dia - d.getDay() + 7) % 7) || 7));
            return `${Plataforma.fechaLarga(d)}, ${hora}`;
        }
        Plataforma.proximo = proximo;
        /* ---------- Inscripción y avance ---------- */
        function inscribir(k, contexto) {
            if (k !== Plataforma.DISPONIBLE || !Plataforma.CONTEXTOS.includes(contexto))
                return false;
            Object.assign(S, base(), {
                bajo: S.bajo, bitacora: S.bitacora, iaViva: S.iaViva,
                exp: k, contexto, reto: Plataforma.EXP[k].modulos[0].retos[contexto],
                ruta: [], rub: [], coachOK: false, coachNota: 0, coachComent: '', proxRepaso: null, aciertos: undefined
            });
            guardar();
            return true;
        }
        Plataforma.inscribir = inscribir;
        function irAPestana(i) { S.tab = Math.max(0, Math.min(3, i)); guardar(); }
        Plataforma.irAPestana = irAPestana;
        function completar(i, siguiente) { S.hecho[i] = true; if (siguiente != null)
            S.tab = siguiente; guardar(); }
        Plataforma.completar = completar;
        function marcarReto(v) { S.retoHecho = Boolean(v); guardar(); }
        Plataforma.marcarReto = marcarReto;
        /* ---------- Tutor IA (académico y de reflexión) ---------- */
        /** Respuesta guía cuando no hay IA conectada: pregunta antes de resolver. */
        function respuestaTutor(q) {
            const v = q.toLowerCase();
            if (/nerv|miedo|ansie|pánico|panico/.test(v))
                return 'Es muy común sentir nervios. Algo que ayuda: practicar recordando tu idea sin leerla, varias veces y en días distintos. ¿Quieres que practiquemos tu frase de apertura ahora?';
            if (/ejemplo|dato/.test(v))
                return 'El ejemplo es la parte que hace creíble tu idea. Puede ser un caso que viviste o un dato con su fuente. ¿Qué ejemplo tienes para tu idea?';
            if (/prep|orden|estructura|paso/.test(v))
                return 'PREP es Punto, Razón, Ejemplo, Punto. Antes de explicarte más: ¿con tus palabras, para qué sirve cerrar repitiendo el punto?';
            return 'Buena pregunta. Antes de responderte, cuéntame: ¿en qué situación concreta quieres usar esto? Así te explico con un ejemplo tuyo.';
        }
        /** IA real del servidor (/api/tutor). Si no responde, devuelve null y se usa la simulada. */
        async function consultarIA(modo, mensajes) {
            try {
                const e = Plataforma.actual();
                const contexto = e ? `Experiencia: ${e.nombre}. Módulo 1: ${e.modulos[0].t} (estructura PREP). Aplica: ${S.contexto}. Reto: ${S.reto}` : '';
                const r = await fetch('/api/tutor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ modo, contexto, mensajes }) });
                if (!r.ok)
                    return null;
                const j = await r.json();
                return j.texto || null;
            }
            catch (err) {
                return null;
            }
        }
        function registrarPregunta(texto) { S.chatTutor.push({ de: 'yo', t: texto }); guardar(); }
        Plataforma.registrarPregunta = registrarPregunta;
        async function responderTutor(texto) {
            const ia = await consultarIA('academico', S.chatTutor);
            S.chatTutor.push({ de: 'bot', t: ia || respuestaTutor(texto) });
            if (ia)
                S.iaViva = true;
            guardar();
        }
        Plataforma.responderTutor = responderTutor;
        /** Guarda una entrada de bitácora (evidencia) y devuelve cuántas había antes. */
        function registrarEntrada(texto) {
            const n = Plataforma.evidencias().length;
            S.bitacora.push({ de: 'yo', t: texto, f: fechaHora() });
            guardar();
            return n;
        }
        Plataforma.registrarEntrada = registrarEntrada;
        async function responderReflexion(n) {
            const ia = await consultarIA('reflexion', S.bitacora.map(x => ({ de: x.de, t: x.t })));
            S.bitacora.push({ de: 'bot', t: ia || ((n === 0 ? 'Gracias por contarlo. ' : '') + PREG_REFLEXION[n % PREG_REFLEXION.length]) });
            if (ia)
                S.iaViva = true;
            guardar();
        }
        Plataforma.responderReflexion = responderReflexion;
        /* ---------- Evaluación y repaso espaciado (ts-fsrs) ---------- */
        /** ts-fsrs desde jsDelivr (window.FSRS) o un fsrs.js propio del sitio (window.ZipFSRS). */
        const libFSRS = () => window.ZipFSRS || window.FSRS || null;
        const PARAMS = { enable_fuzz: false, enable_short_term: false, maximum_interval: 90 };
        function responderEval(i, j) { if (S.evalResp[i] == null) {
            S.evalResp[i] = j;
            guardar();
        } }
        Plataforma.responderEval = responderEval;
        function autoevaluar(n) { S.autoeval = n; guardar(); }
        Plataforma.autoevaluar = autoevaluar;
        function reflexionar(t) { S.reflexion = t; guardar(); }
        Plataforma.reflexionar = reflexionar;
        function programarRepaso(nota) {
            const lib = libFSRS();
            if (!lib)
                return null;
            const { fsrs, createEmptyCard, Rating, generatorParameters } = lib;
            const f = fsrs(generatorParameters(PARAMS));
            let card = S.card ? revivir(S.card) : createEmptyCard(new Date());
            card = f.next(card, new Date(), [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy][nota]).card;
            S.card = card;
            let sim = card;
            S.ruta = [new Date(card.due).toISOString()];
            for (let i = 0; i < 3; i++) {
                sim = f.next(sim, sim.due, Rating.Good).card;
                S.ruta.push(new Date(sim.due).toISOString());
            }
            guardar();
            return new Date(card.due);
        }
        function terminarModulo() {
            const m = Plataforma.actual().modulos[0], r = S.evalResp;
            if (r.filter(x => x != null).length < m.eval.length || !S.autoeval || S.reflexion.trim().length < 10) {
                return { ok: false, error: 'Responde las tres preguntas y escribe tu reflexión.' };
            }
            const aciertos = m.eval.filter((q, i) => r[i] === q.c).length;
            const d = programarRepaso(aciertos === 2 ? 2 : (aciertos === 1 ? 1 : 0));
            S.hecho[3] = true;
            S.aciertos = aciertos;
            S.proxRepaso = d ? d.toISOString() : null;
            guardar();
            return { ok: true };
        }
        Plataforma.terminarModulo = terminarModulo;
        /* ---------- Coach ---------- */
        function grupoCoach() {
            const nombre = Zip.Auth.actual()?.nombre;
            const yo = S.exp ? [[`${nombre || 'Tú'} (esta sesión)`, S.contexto, Plataforma.avance(), Plataforma.evidencias().length, 0]] : [];
            return yo.concat(GRUPO).map(([nombre, donde, mod, bit, dias]) => ({ nombre, donde, mod, bit, dias, riesgo: dias >= DIAS_RIESGO }));
        }
        Plataforma.grupoCoach = grupoCoach;
        function calificar(criterio, nota) { S.rub = S.rub || []; S.rub[criterio] = nota; guardar(); }
        Plataforma.calificar = calificar;
        function validarEvidencia(comentario) {
            const r = S.rub || [];
            if (r.filter(Boolean).length < Plataforma.RUBRICA.length)
                return { ok: false, error: 'Califica los cuatro criterios.' };
            S.coachOK = true;
            S.coachNota = r.reduce((a, b) => a + b, 0);
            S.coachComent = String(comentario || '').trim();
            guardar();
            return { ok: true };
        }
        Plataforma.validarEvidencia = validarEvidencia;
        /* ---------- Insignia (Open Badges 3.0, sin firma digital) ---------- */
        function credencialInsignia() {
            const e = Plataforma.actual();
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
                evidence: Plataforma.evidencias().map(x => ({ type: ['Evidence'], name: `Entrada de bitácora · ${x.f}`, narrative: x.t }))
                    .concat(S.reflexion ? [{ type: ['Evidence'], name: 'Reflexión del módulo', narrative: S.reflexion }] : [])
            };
        }
        Plataforma.credencialInsignia = credencialInsignia;
        /* =====================================================================
           Tablero de la experiencia: camino de aprendizaje, situaciones y flashcards
           ===================================================================== */
        /** Enlace del video de introducción (YouTube). Pégalo aquí cuando lo tengas. */
        const VIDEO_INTRO = '';
        Plataforma.CAMINO = [
            { n: 1, tipo: 'Video', titulo: 'Introducción a la comunicación', resumen: 'Un video corto para entender qué es comunicar bien y por qué pesa tanto en el trabajo.' },
            { n: 2, tipo: 'Casos', titulo: 'Situaciones donde la comunicación es clave', resumen: 'Casos del trabajo y de la vida diaria, con el mejor camino para resolverlos.' },
            { n: 3, tipo: 'Práctica', titulo: 'Flashcards: ¿qué harías tú?', resumen: 'Cinco situaciones para imaginar tu respuesta, voltear la tarjeta y comparar.' },
            { n: 4, tipo: 'Aplicación', titulo: 'Estructura tu idea con PREP', resumen: 'Materiales, comunidad, un reto con tu coach y la evaluación.' }
        ];
        Plataforma.SITUACIONES = [
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
        Plataforma.TARJETAS = [
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
        Plataforma.NOTAS = ['No la supe', 'Me costó', 'Bien', 'Fácil'];
        const DIA = 864e5;
        const RESPALDO_DIAS = [0, 1, 3, 7]; /* si la librería FSRS no cargó */
        function videoEmbed() {
            const m = VIDEO_INTRO.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
            return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : '';
        }
        Plataforma.videoEmbed = videoEmbed;
        Plataforma.tarjeta = (id) => Plataforma.TARJETAS.find(t => t.id === id) || null;
        const fechaClave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        function completarModulo(n) { S.camino = S.camino || {}; S.camino['m' + n] = true; guardar(); }
        Plataforma.completarModulo = completarModulo;
        /** [módulo 1, 2, 3, 4] completados. El 3 se completa al calificar las 5 tarjetas; el 4, con sus 4 componentes. */
        function caminoEstado() {
            const c = S.camino || {}, t = S.tarjetas || {};
            return [Boolean(c.m1), Boolean(c.m2), Plataforma.TARJETAS.every(x => t[x.id]), S.hecho.every(Boolean)];
        }
        Plataforma.caminoEstado = caminoEstado;
        /* ---------- Repaso espaciado por tarjeta (FSRS) ---------- */
        const motorFSRS = () => {
            const lib = libFSRS();
            return lib ? { lib, f: lib.fsrs(lib.generatorParameters(PARAMS)) } : null;
        };
        const revivir = (c) => ({ ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined });
        /** Calcula cuándo vuelve una tarjeta si se califica con `nota` (0 a 3), sin guardar nada. */
        function siguiente(id, nota, ahora) {
            const t = (S.tarjetas || {})[id], m = motorFSRS();
            if (!m)
                return { due: new Date(ahora.getTime() + RESPALDO_DIAS[nota] * DIA), card: null };
            const { lib, f } = m;
            const card = t && t.card ? revivir(t.card) : lib.createEmptyCard(ahora);
            const sig = f.next(card, ahora, [lib.Rating.Again, lib.Rating.Hard, lib.Rating.Good, lib.Rating.Easy][nota]).card;
            return { due: new Date(sig.due), card: sig };
        }
        const enPalabras = (due, ahora) => {
            const d = Math.round((due.getTime() - ahora.getTime()) / DIA);
            return d <= 0 ? 'hoy otra vez' : (d === 1 ? 'mañana' : `en ${d} días`);
        };
        /** Texto de «cuándo vuelve» para cada una de las 4 calificaciones. */
        function intervalos(id) { const ahora = new Date(); return Plataforma.NOTAS.map((_, n) => enPalabras(siguiente(id, n, ahora).due, ahora)); }
        Plataforma.intervalos = intervalos;
        /** Guarda la calificación: es el dato con el que FSRS decide cada cuánto recordar ese concepto. */
        function calificarTarjeta(id, nota) {
            const ahora = new Date(), r = siguiente(id, nota, ahora);
            S.tarjetas = S.tarjetas || {};
            const t = S.tarjetas[id] || { card: null, due: '', vistas: 0 };
            t.card = r.card;
            t.due = r.due.toISOString();
            t.vistas++;
            t.ultima = nota;
            S.tarjetas[id] = t;
            S.repasos = (S.repasos || 0) + 1;
            if (nota >= 2)
                S.buenas = (S.buenas || 0) + 1;
            S.dias = S.dias || [];
            if (!S.dias.includes(fechaClave(ahora)))
                S.dias.push(fechaClave(ahora));
            guardar();
            return r.due;
        }
        Plataforma.calificarTarjeta = calificarTarjeta;
        /** Tarjetas que tocan hoy: las nuevas y las que ya vencieron. */
        function pendientes() {
            const fin = new Date();
            fin.setHours(23, 59, 59, 999);
            const t = S.tarjetas || {};
            return Plataforma.TARJETAS.filter(x => !t[x.id] || new Date(t[x.id].due) <= fin).map(x => x.id);
        }
        Plataforma.pendientes = pendientes;
        function proximoRepaso() {
            const fechas = Object.values(S.tarjetas || {}).map(t => new Date(t.due)).sort((a, b) => a.getTime() - b.getTime());
            return fechas[0] || null;
        }
        Plataforma.proximoRepaso = proximoRepaso;
        function racha() {
            const dias = new Set(S.dias || []), d = new Date();
            if (!dias.has(fechaClave(d)))
                d.setDate(d.getDate() - 1);
            let n = 0;
            while (dias.has(fechaClave(d))) {
                n++;
                d.setDate(d.getDate() - 1);
            }
            return n;
        }
        /** Métricas del tablero: todas empiezan en 0 y salen de lo que la persona hace. */
        function metricas() {
            const est = caminoEstado(), t = S.tarjetas || {}, hechos = est.filter(Boolean).length;
            return {
                modulos: hechos, totalModulos: est.length, avance: Math.round(hechos / est.length * 100),
                racha: racha(),
                dominadas: Plataforma.TARJETAS.filter(x => t[x.id] && t[x.id].ultima >= 2).length, totalTarjetas: Plataforma.TARJETAS.length,
                repasos: S.repasos || 0, recuerdo: S.repasos ? Math.round((S.buenas || 0) / S.repasos * 100) : 0,
                pendientes: pendientes().length
            };
        }
        Plataforma.metricas = metricas;
        /* ---------- Preferencia: modo bajo estímulo ---------- */
        function bajoEstimulo(v) { if (v !== undefined) {
            S.bajo = Boolean(v);
            guardar();
        } return Boolean(S.bajo); }
        Plataforma.bajoEstimulo = bajoEstimulo;
    })(Plataforma = Zip.Plataforma || (Zip.Plataforma = {}));
})(Zip || (Zip = {}));
