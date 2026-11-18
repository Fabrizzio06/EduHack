"use strict";
/* =====================================================================
   Zip · CONTROLLER · Rutas de la plataforma
   ---------------------------------------------------------------------
   #inicio (la landing) · #login · #experiencias · #exp/<id> · #mi ·
   #camino · #modulo/<n> · #repaso · #bitacora · #trayectoria · #coach.
   Cualquier otro #ancla (#precio, #preguntas…) abre Inicio y baja a esa
   sección. Las rutas de la plataforma piden haber entrado con la cuenta
   de prueba: si no hay sesión, mandan a #login y después regresan.
   También maneja el modo bajo estímulo y el botón de sesión del encabezado.
   ===================================================================== */
var Zip;
(function (Zip) {
    var Rutas;
    (function (Rutas) {
        const P = Zip.Plataforma;
        const V = Zip.Vista.Pantallas;
        const Vista = Zip.Vista;
        const Auth = Zip.Auth;
        const RUTAS = ['inicio', 'login', 'registro', 'conocerte', 'experiencias', 'mi', 'camino', 'repaso', 'bitacora', 'trayectoria', 'coach'];
        /** Rutas de la plataforma con parámetro (#exp/<id>, #modulo/<n>). */
        const CON_PARAMETRO = ['exp', 'modulo'];
        const NAV = { camino: 'mi', repaso: 'mi' }; /* qué pestaña del menú se marca en cada ruta */
        let inicio = null, app = null;
        /** A dónde iba la persona antes de que le pidiéramos entrar. */
        let pendiente = null;
        const $ = (s) => app.querySelector(s);
        const $$ = (s) => [...app.querySelectorAll(s)];
        const esperar = (promesa) => Promise.all([promesa, new Promise(r => setTimeout(r, Vista.QUIETO || P.bajoEstimulo() ? 0 : 650))]);
        const bajarChat = () => { const c = $('#z-chat'); if (c)
            c.scrollTop = c.scrollHeight; };
        function marcarNav(r) {
            document.querySelectorAll('[data-ruta]').forEach(a => {
                if (a.dataset.ruta === r)
                    a.setAttribute('aria-current', 'page');
                else
                    a.removeAttribute('aria-current');
            });
        }
        function mostrar(esInicio) {
            const yaEstaba = esInicio && !inicio.hidden;
            inicio.hidden = !esInicio;
            app.hidden = esInicio;
            document.documentElement.dataset.vista = esInicio ? 'inicio' : 'app'; /* el menú de secciones solo sale en Inicio */
            if (yaEstaba)
                return;
            const v = esInicio ? inicio : app;
            v.classList.remove('entra');
            void v.offsetWidth;
            v.classList.add('entra');
        }
        function arriba() {
            scrollTo(0, 0);
            const h1 = app.querySelector('h1');
            if (h1) {
                h1.setAttribute('tabindex', '-1');
                h1.focus({ preventScroll: true });
            }
        }
        /* ---------- Sesión: entrar y salir ---------- */
        function pintarSesion() {
            const caja = document.getElementById('z-sesion');
            if (caja)
                caja.innerHTML = V.sesion(Auth.actual());
        }
        /** Entrar o crear cuenta: la misma pantalla con dos modos. */
        function cuenta(modo) {
            const reg = modo === 'registro';
            if (Auth.activa()) {
                irA(pendiente || 'experiencias', true);
                pendiente = null;
                return;
            }
            const demo = reg ? Auth.DEMO_REGISTRO : Auth.DEMO;
            app.innerHTML = V.cuenta(modo, demo);
            const form = $('#z-login'), usuario = $('#z-usuario'), clave = $('#z-clave');
            const error = $('#z-login-error'), ver = $('#z-ver-clave');
            const limpiar = () => { error.textContent = ''; [usuario, clave].forEach(i => i.removeAttribute('aria-invalid')); };
            usuario.oninput = clave.oninput = limpiar;
            ver.onclick = () => {
                const mostrarla = clave.type === 'password';
                clave.type = mostrarla ? 'text' : 'password';
                ver.textContent = mostrarla ? 'Ocultar' : 'Mostrar';
                ver.setAttribute('aria-pressed', String(mostrarla));
                clave.focus();
            };
            if (!reg)
                $('#z-rellenar').onclick = () => {
                    usuario.value = demo.usuario;
                    clave.value = demo.clave;
                    limpiar();
                    $('.z-login-entrar').focus();
                };
            form.onsubmit = ev => {
                ev.preventDefault();
                const r = reg ? Auth.registrar(usuario.value, clave.value) : Auth.iniciarSesion(usuario.value, clave.value);
                if (r.ok === false) {
                    error.textContent = r.error;
                    const vacio = !usuario.value.trim() ? usuario : (!clave.value ? clave : null);
                    (vacio ? [vacio] : (reg ? [usuario] : [usuario, clave])).forEach(i => i.setAttribute('aria-invalid', 'true'));
                    form.classList.remove('sacude');
                    void form.offsetWidth;
                    form.classList.add('sacude');
                    const foco = vacio || (reg ? usuario : clave);
                    foco.focus();
                    if (!vacio)
                        foco.select();
                    return;
                }
                pintarSesion();
                aplicarEstimulo(P.bajoEstimulo());
                /* Cuenta nueva: primero conocer a la persona para armar su camino */
                if (reg) {
                    pendiente = null;
                    irA('conocerte', true);
                    return;
                }
                V.avisar(`Hola, ${r.usuario.nombre}. ¡Bienvenido a Zip!`);
                const destino = pendiente || 'experiencias';
                pendiente = null;
                irA(destino, true);
            };
            usuario.focus({ preventScroll: true });
        }
        function salir() {
            Auth.cerrarSesion();
            pintarSesion();
            aplicarEstimulo(P.bajoEstimulo());
            V.avisar('Cerraste tu sesión. ¡Vuelve pronto!');
            irA('inicio');
        }
        /** Cambia de ruta; con `reemplazar` no deja la ruta actual en el historial (para redirecciones). */
        function irA(hash, reemplazar = false) {
            /* Si ya estamos ahí no hay hashchange: se vuelve a pintar a mano */
            if (decodeURIComponent(location.hash.slice(1)) === hash) {
                ruta();
                return;
            }
            if (reemplazar)
                location.replace(`#${hash}`);
            else
                location.hash = hash;
        }
        /* ---------- Vistas ---------- */
        function experiencias() { app.innerHTML = V.experiencias(P); }
        function detalle(k) {
            const e = P.experiencia(k);
            if (!e) {
                location.hash = 'experiencias';
                return;
            }
            app.innerHTML = V.detalle(k, e, P);
            const sel = $('#z-ctx'), btn = $('#z-ins');
            sel.onchange = () => { btn.disabled = !sel.value || k !== P.DISPONIBLE; };
            sel.onchange(null); /* el diagnóstico ya puede traer el lugar elegido */
            btn.onclick = () => { if (P.inscribir(k, sel.value)) {
                V.avisar(`Listo: ya estás en «${e.nombre}».`);
                location.hash = 'mi';
            } };
        }
        function mi() {
            if (!P.actual()) {
                app.innerHTML = V.vacio('Mi experiencia', 'Todavía no te inscribes a ninguna experiencia.');
                return;
            }
            app.innerHTML = V.mi(P);
            const enfocarPestana = () => $(`[data-tab="${P.estado.tab}"]`).focus();
            $$('[data-tab]').forEach(b => {
                b.onclick = () => { P.irAPestana(+b.dataset.tab); mi(); enfocarPestana(); };
                b.onkeydown = ev => {
                    const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
                    if (!d)
                        return;
                    ev.preventDefault();
                    P.irAPestana((P.estado.tab + d + 4) % 4);
                    mi();
                    enfocarPestana();
                };
            });
            [autonomo, comunidad, aplicacion, evaluacion][P.estado.tab]();
        }
        const panel = () => $('#z-panel');
        function autonomo() {
            const m = P.actual().modulos[0];
            panel().innerHTML = V.autonomo(m, P);
            bajarChat();
            const enviar = async () => {
                const q = $('#z-q'), v = q.value.trim();
                if (!v)
                    return;
                P.registrarPregunta(v);
                autonomo();
                $('#z-env').disabled = true;
                $('#z-chat').insertAdjacentHTML('beforeend', V.pensando());
                bajarChat();
                await esperar(P.responderTutor(v));
                autonomo();
                $('#z-q').focus();
            };
            $('#z-env').onclick = enviar;
            $('#z-q').onkeydown = ev => { if (ev.key === 'Enter')
                enviar(); };
            $('#z-lei').onclick = () => { P.completar(0, 1); V.avisar('Materiales listos. Sigue con tu comunidad.'); mi(); };
        }
        function comunidad() {
            panel().innerHTML = V.comunidad(P.actual().modulos[0], P);
            $('#z-apartar').onclick = () => V.avisar('Lugar apartado en el taller (simulado).');
            $('#z-ok').onclick = () => { P.completar(1, 2); V.avisar('¡Bien! Ahora aplica en tu realidad.'); mi(); };
        }
        function aplicacion() {
            panel().innerHTML = V.aplicacion(P);
            const hc = $('#z-hc'), ok = $('#z-ok');
            hc.onchange = () => { P.marcarReto(hc.checked); ok.disabled = !hc.checked; };
            $('#z-agendar').onclick = () => V.avisar('Sesión agendada con tu coach (simulado).');
            ok.onclick = () => { P.completar(2, 3); mi(); };
        }
        function evaluacion() {
            panel().innerHTML = V.evaluacion(P.actual().modulos[0], P);
            $$('[data-opc]').forEach(b => b.onclick = () => { const [i, j] = b.dataset.opc.split(',').map(Number); P.responderEval(i, j); evaluacion(); });
            $$('[data-auto]').forEach(b => b.onclick = () => { P.autoevaluar(+b.dataset.auto); evaluacion(); });
            const refl = $('#z-refl');
            refl.oninput = () => P.reflexionar(refl.value);
            $('#z-fin').onclick = () => {
                const r = P.terminarModulo();
                if (r.ok === false) {
                    $('#z-msg').textContent = r.error;
                    return;
                }
                V.avisar('Módulo terminado. Mira tu trayectoria.');
                location.hash = 'trayectoria';
            };
        }
        function bitacora() {
            const voz = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
            app.innerHTML = V.bitacora(P, voz);
            bajarChat();
            $('#z-env').onclick = async () => {
                const t = $('#z-t'), v = t.value.trim();
                if (v.length < 3) {
                    $('#z-est').textContent = 'Cuéntame un poco más.';
                    return;
                }
                const n = P.registrarEntrada(v);
                bitacora();
                $('#z-env').disabled = true;
                $('#z-chat').insertAdjacentHTML('beforeend', V.pensando());
                bajarChat();
                await esperar(P.responderReflexion(n));
                bitacora();
                V.avisar('Guardado en tu bitácora como evidencia.');
            };
            const mic = $('#z-mic');
            if (mic)
                mic.onclick = () => {
                    const R = window.SpeechRecognition || window.webkitSpeechRecognition, rec = new R(), est = $('#z-est'), t = $('#z-t');
                    rec.lang = 'es-MX';
                    rec.interimResults = false;
                    est.textContent = 'Escuchando…';
                    mic.classList.add('escuchando');
                    rec.onresult = (e) => { t.value = `${t.value} ${e.results[0][0].transcript}`.trim(); est.textContent = ''; };
                    rec.onerror = () => { est.textContent = 'No se pudo usar el micrófono.'; };
                    rec.onend = () => { mic.classList.remove('escuchando'); if (est.textContent === 'Escuchando…')
                        est.textContent = ''; };
                    rec.start();
                };
        }
        function trayectoria() {
            if (!P.actual()) {
                app.innerHTML = V.vacio('Trayectoria', 'Inscríbete a una experiencia para empezar tu trayectoria.');
                return;
            }
            app.innerHTML = V.trayectoria(P);
            const dl = $('#z-dl');
            if (dl && !dl.disabled)
                dl.onclick = () => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(new Blob([JSON.stringify(P.credencialInsignia(), null, 2)], { type: 'application/json' }));
                    a.download = 'insignia_zip.json';
                    a.click();
                    V.avisar('Insignia descargada (Open Badges).');
                };
        }
        function coach() {
            app.innerHTML = V.coach(P);
            $$('[data-rub]').forEach(b => b.onclick = () => {
                const [c, n] = b.dataset.rub.split(',').map(Number);
                P.calificar(c, n);
                b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
            });
            const val = $('#z-val');
            if (val)
                val.onclick = () => {
                    const r = P.validarEvidencia($('#z-com').value);
                    if (r.ok === false) {
                        $('#z-cm').textContent = r.error;
                        return;
                    }
                    V.avisar('Evidencia validada. La insignia ya lleva el respaldo del coach.');
                    location.hash = 'trayectoria';
                };
        }
        /* ---------- Tablero, camino y módulos de la experiencia ---------- */
        const sinExperiencia = (titulo) => {
            if (P.actual())
                return false;
            app.innerHTML = V.vacio(titulo, 'Inscríbete a una experiencia para empezar.');
            return true;
        };
        function tablero() {
            if (sinExperiencia('Mi experiencia'))
                return;
            app.innerHTML = V.tablero(P);
            $('#z-agendar-t').onclick = () => V.avisar('Sesión agendada con tu coach (simulado).');
            $('#z-ver-reto').onclick = () => P.irAPestana(2);
        }
        function camino() { if (!sinExperiencia('Camino de aprendizaje'))
            app.innerHTML = V.camino(P); }
        function modulo(n) {
            if (sinExperiencia('Camino de aprendizaje'))
                return;
            if (n === '1') {
                app.innerHTML = V.moduloVideo(P);
                $('#z-m1').onclick = () => { P.completarModulo(1); V.avisar('Módulo 1 completado.'); location.hash = 'modulo/2'; };
            }
            else if (n === '2') {
                app.innerHTML = V.moduloSituaciones(P);
                $('#z-m2').onclick = () => { P.completarModulo(2); V.avisar('Módulo 2 completado. Ahora practica tú.'); location.hash = 'modulo/3'; };
            }
            else if (n === '3')
                tarjetas('modulo');
            else if (n === '4')
                mi();
            else
                location.hash = 'camino';
        }
        function repaso() { if (!sinExperiencia('Repaso del día'))
            tarjetas('repaso'); }
        /* Flashcards: la sesión recorre una cola de tarjetas; «No la supe» la regresa al final una vez */
        let sesion = null;
        function tarjetas(modo) {
            if (!sesion || sesion.modo !== modo) {
                const ids = modo === 'repaso' ? P.pendientes() : P.TARJETAS.map(t => t.id);
                sesion = { modo, cola: ids.slice(), total: ids.length, hechas: 0, repetidas: new Set() };
            }
            pintarTarjeta();
        }
        function pintarTarjeta() {
            if (!sesion.cola.length) {
                app.innerHTML = V.tarjetasFin(P, sesion);
                sesion = null;
                return;
            }
            app.innerHTML = V.tarjetas(P, sesion);
            const id = sesion.cola[0], carta = $('#z-carta'), zona = $('#z-zona');
            $('#z-voltear').onclick = () => {
                carta.classList.add('volteada');
                carta.querySelector('.frente').setAttribute('aria-hidden', 'true');
                carta.querySelector('.reverso').removeAttribute('aria-hidden');
                zona.innerHTML = V.notas(P, id);
                zona.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => {
                    const nota = +b.dataset.nota;
                    P.calificarTarjeta(id, nota); /* el dato que FSRS usa para programar el siguiente repaso */
                    sesion.cola.shift();
                    sesion.hechas++;
                    if (nota === 0 && !sesion.repetidas.has(id)) {
                        sesion.repetidas.add(id);
                        sesion.cola.push(id);
                        sesion.total++;
                    }
                    pintarTarjeta();
                });
            };
        }
        const VISTAS = { experiencias, mi: tablero, camino, repaso, bitacora, trayectoria, coach };
        function pintarContinuar() {
            const c = document.getElementById('continuar');
            if (c)
                c.innerHTML = Auth.activa() && P.actual() ? V.continuar(P, Auth.actual().nombre) : '';
        }
        function ruta() {
            const h = decodeURIComponent((location.hash || '#inicio').slice(1));
            const [r, p] = h.split('/');
            const dePlataforma = CON_PARAMETRO.includes(r) || (RUTAS.includes(r) && !['inicio', 'login', 'registro'].includes(r));
            Zip.Conocerte.salir(); /* suelta el micrófono si veníamos del diagnóstico */
            /* Sin sesión no se entra a la plataforma: primero el login y luego de vuelta a donde iba */
            if (dePlataforma && !Auth.activa()) {
                pendiente = h;
                irA('login', true);
                return;
            }
            if (r === 'login' || r === 'registro') {
                marcarNav('');
                mostrar(false);
                cuenta(r);
                arriba();
                $('#z-usuario')?.focus({ preventScroll: true });
                return;
            }
            if (r === 'conocerte') {
                marcarNav('');
                mostrar(false);
                document.documentElement.dataset.vista = 'conocerte';
                scrollTo(0, 0);
                Zip.Conocerte.iniciar(app);
                return;
            }
            if (r === 'exp') {
                marcarNav('experiencias');
                mostrar(false);
                detalle(p);
                arriba();
                return;
            }
            if (r === 'modulo') {
                marcarNav('mi');
                mostrar(false);
                modulo(p);
                arriba();
                return;
            }
            if (dePlataforma) {
                marcarNav(NAV[r] || r);
                mostrar(false);
                VISTAS[r]();
                arriba();
                return;
            }
            marcarNav('inicio');
            const venia = inicio.hidden;
            mostrar(true);
            pintarContinuar();
            const destino = r && r !== 'inicio' ? document.getElementById(h) : null;
            if (destino)
                destino.scrollIntoView({ behavior: venia || P.bajoEstimulo() ? 'auto' : 'smooth' });
            else if (venia || r === 'inicio')
                scrollTo(0, 0);
        }
        Rutas.ruta = ruta;
        function aplicarEstimulo(bajo) {
            if (bajo)
                document.documentElement.setAttribute('data-estimulo', 'bajo');
            else
                document.documentElement.removeAttribute('data-estimulo');
            const sw = document.getElementById('bajo');
            if (sw)
                sw.checked = bajo;
        }
        function iniciar() {
            inicio = document.getElementById('vista-inicio');
            app = document.getElementById('vista-app');
            if (!inicio || !app)
                return;
            const sw = document.getElementById('bajo');
            aplicarEstimulo(P.bajoEstimulo());
            if (sw) {
                sw.checked = P.bajoEstimulo();
                sw.onchange = () => {
                    P.bajoEstimulo(sw.checked);
                    aplicarEstimulo(sw.checked);
                    V.avisar(sw.checked ? 'Modo bajo estímulo: sin movimiento y con colores más calmados.' : 'Modo bajo estímulo desactivado.');
                };
            }
            pintarSesion();
            document.getElementById('z-sesion')?.addEventListener('click', e => { if (e.target.closest('#z-salir'))
                salir(); });
            addEventListener('hashchange', ruta);
            ruta();
            espiarSecciones();
        }
        Rutas.iniciar = iniciar;
        /* Menú de secciones de Inicio: marca la sección que se está leyendo y la trae a la vista en el menú */
        function espiarSecciones() {
            const menu = document.getElementById('subnav');
            if (!menu || !('IntersectionObserver' in window))
                return;
            const enlaces = new Map([...menu.querySelectorAll('a')].map(a => [a.getAttribute('href').slice(1), a]));
            /* En celular el menú se abre con un botón y se cierra al elegir una sección */
            const nav = menu.closest('.subnav'), boton = document.getElementById('subnav-boton'), actual = document.getElementById('subnav-actual');
            const cerrar = () => { nav.classList.remove('abierto'); if (boton)
                boton.setAttribute('aria-expanded', 'false'); };
            if (boton)
                boton.onclick = () => { const abre = !nav.classList.contains('abierto'); nav.classList.toggle('abierto', abre); boton.setAttribute('aria-expanded', String(abre)); };
            menu.addEventListener('click', e => { if (e.target.closest('a'))
                cerrar(); });
            addEventListener('hashchange', cerrar);
            const io = new IntersectionObserver(es => es.forEach(e => {
                if (!e.isIntersecting)
                    return;
                enlaces.forEach(a => a.removeAttribute('aria-current'));
                const a = enlaces.get(e.target.id);
                if (actual)
                    actual.textContent = a ? a.textContent : '';
                if (!a)
                    return;
                a.setAttribute('aria-current', 'location');
                menu.scrollTo({ left: a.offsetLeft - (menu.clientWidth - a.offsetWidth) / 2, behavior: Vista.QUIETO || P.bajoEstimulo() ? 'auto' : 'smooth' });
            }), { rootMargin: '-35% 0px -55% 0px' });
            enlaces.forEach((_, id) => { const s = document.getElementById(id); if (s)
                io.observe(s); });
            const hero = inicio.querySelector('.hero');
            if (hero)
                io.observe(hero);
        }
    })(Rutas = Zip.Rutas || (Zip.Rutas = {}));
})(Zip || (Zip = {}));
if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => Zip.Rutas.iniciar());
else
    Zip.Rutas.iniciar();
