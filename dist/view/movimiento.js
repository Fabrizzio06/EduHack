"use strict";
/* =====================================================================
   Zip · VIEW · Movimiento (Material Design 3)
   ---------------------------------------------------------------------
   Curvas, duraciones y resortes de M3 + las escenas de la página.
   Solo se anima transform y opacity (y stroke-dashoffset en SVG).
   Con "reducir movimiento" o en captura automática se pinta el estado final.
   Va en el <head>: marca <html class="anim"> antes de pintar.
   ===================================================================== */
var Zip;
(function (Zip) {
    var Vista;
    (function (Vista) {
        /* ---------- Entorno ---------- */
        Vista.QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver === true;
        /** ?t=0.5 congela todas las escenas en ese instante (para revisar). */
        Vista.T_FIJO = new URLSearchParams(location.search).get('t');
        Vista.M3 = Object.freeze({
            duracion: { corta2: 100, corta3: 150, corta4: 200, media2: 300, media4: 400, larga2: 500, larga4: 600, extraLarga2: 800 },
            curva: {
                enfatizada: [0.2, 0, 0, 1],
                enfatizadaDesacelera: [0.05, 0.7, 0.1, 1],
                enfatizadaAcelera: [0.3, 0, 0.8, 0.15],
                estandar: [0.2, 0, 0, 1]
            }
        });
        /** Curva cúbica de Bézier como función (igual que en CSS). */
        function bezier(x1, y1, x2, y2) {
            const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
            const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
            const x = (t) => ((ax * t + bx) * t + cx) * t;
            const y = (t) => ((ay * t + by) * t + cy) * t;
            const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
            return p => {
                if (p <= 0)
                    return 0;
                if (p >= 1)
                    return 1;
                let t = p;
                for (let i = 0; i < 6; i++) {
                    const d = dx(t);
                    if (Math.abs(d) < 1e-6)
                        break;
                    t -= (x(t) - p) / d;
                }
                return y(Math.min(1, Math.max(0, t)));
            };
        }
        Vista.bezier = bezier;
        Vista.curvaEnfatizada = bezier(...Vista.M3.curva.enfatizada);
        Vista.curvaDesacelera = bezier(...Vista.M3.curva.enfatizadaDesacelera);
        Vista.clamp01 = (x) => Math.max(0, Math.min(1, x));
        Vista.tramo = (p, a, b) => Vista.clamp01((p - a) / (b - a));
        if (!Vista.QUIETO)
            document.documentElement.classList.add('anim');
        /** Corre render(p) con p∈[0,1] solo mientras el elemento está visible. Devuelve repintar(). */
        function escena(el, ms, render) {
            let ult = 0;
            const pinta = (p) => render(ult = p), repintar = () => render(ult);
            if (Vista.T_FIJO !== null) {
                pinta(Vista.clamp01(+Vista.T_FIJO));
                return repintar;
            }
            if (Vista.QUIETO) {
                pinta(1);
                return repintar;
            }
            pinta(0);
            let t = 0, prev = 0, raf = 0;
            const paso = (now) => {
                t += Math.min(now - (prev || now), 50);
                prev = now;
                pinta(Vista.clamp01(t / ms));
                raf = t < ms ? requestAnimationFrame(paso) : 0;
            };
            new IntersectionObserver(([e]) => {
                if (e.isIntersecting && !raf && t < ms) {
                    prev = 0;
                    raf = requestAnimationFrame(paso);
                }
                else if (!e.isIntersecting && raf) {
                    cancelAnimationFrame(raf);
                    raf = 0;
                }
            }, { threshold: 0.4 }).observe(el);
            return repintar;
        }
        Vista.escena = escena;
        /* ---------- Revelado al hacer scroll (enfatizada desacelera + stagger) ---------- */
        function activarRevelado(selector) {
            if (Vista.QUIETO)
                return;
            const io = new IntersectionObserver(es => es.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('on');
                    io.unobserve(e.target);
                }
            }), { rootMargin: '0px 0px -10% 0px' });
            document.querySelectorAll(selector).forEach(el => {
                if (el.hasAttribute('data-r') && el.parentElement) {
                    const hermanos = [...el.parentElement.children].filter(x => x.hasAttribute('data-r'));
                    el.style.setProperty('--i', String(hermanos.indexOf(el)));
                }
                io.observe(el);
            });
        }
        Vista.activarRevelado = activarRevelado;
        /* ---------- Ripple M3: nace donde tocas y se desvanece al soltar ---------- */
        function activarRipple(selector) {
            if (Vista.QUIETO)
                return;
            document.addEventListener('pointerdown', ev => {
                const objetivo = ev.target;
                const el = objetivo && objetivo.closest ? objetivo.closest(selector) : null;
                if (!el || ev.button !== 0)
                    return;
                const r = el.getBoundingClientRect();
                const tam = Math.hypot(Math.max(ev.clientX - r.left, r.right - ev.clientX), Math.max(ev.clientY - r.top, r.bottom - ev.clientY)) * 2;
                const o = document.createElement('span');
                o.className = 'ripple';
                o.style.cssText = `width:${tam}px;height:${tam}px;left:${ev.clientX - r.left - tam / 2}px;top:${ev.clientY - r.top - tam / 2}px`;
                el.append(o);
                requestAnimationFrame(() => o.classList.add('crece'));
                const soltar = () => {
                    o.classList.add('fuera');
                    setTimeout(() => o.remove(), Vista.M3.duracion.larga4);
                    removeEventListener('pointerup', soltar);
                    removeEventListener('pointercancel', soltar);
                };
                addEventListener('pointerup', soltar);
                addEventListener('pointercancel', soltar);
            }, { passive: true });
        }
        Vista.activarRipple = activarRipple;
        /* ---------- Barra superior M3: se eleva con el scroll, se esconde al bajar ---------- */
        function barraSuperior(barra) {
            let ultimo = scrollY, raf = 0;
            const calc = () => {
                raf = 0;
                const y = scrollY, baja = y > ultimo + 4, sube = y < ultimo - 4;
                barra.classList.toggle('elevada', y > 8);
                if (!Vista.QUIETO) {
                    if (baja && y > 160)
                        barra.classList.add('oculta');
                    else if (sube)
                        barra.classList.remove('oculta');
                }
                if (baja || sube)
                    ultimo = y;
            };
            addEventListener('scroll', () => { if (!raf)
                raf = requestAnimationFrame(calc); }, { passive: true });
            barra.addEventListener('focusin', () => barra.classList.remove('oculta'));
            calc();
        }
        Vista.barraSuperior = barraSuperior;
        /* ---------- Contadores (el número final ya está en el HTML) ---------- */
        function contadores(selector) {
            document.querySelectorAll(selector).forEach(el => {
                const fin = Number(el.dataset.contar);
                escena(el, Vista.M3.duracion.extraLarga2 * 1.6, p => { el.textContent = String(Math.round(fin * Vista.curvaDesacelera(p))); });
            });
        }
        Vista.contadores = contadores;
        /* ---------- Hero: el avance se cierra diente por diente ---------- */
        function dientes(contenedor) {
            if (Vista.QUIETO || Vista.T_FIJO !== null)
                return;
            const d = [...contenedor.children];
            const fin = d.map(s => s.className);
            d.forEach(s => (s.className = ''));
            fin.forEach((c, i) => { if (c)
                setTimeout(() => (d[i].className = c), 900 + i * 180); });
        }
        Vista.dientes = dientes;
        /* ---------- Cómo funciona: el jalador del cierre sigue tu lectura ---------- */
        function rielCierre(caja) {
            const riel = caja.querySelector('.riel');
            if (!riel)
                return;
            const pinta = (p) => { riel.style.setProperty('--p', String(p)); riel.style.setProperty('--py', `${p * riel.clientHeight}px`); };
            if (Vista.T_FIJO !== null) {
                pinta(Vista.clamp01(+Vista.T_FIJO));
                return;
            }
            if (Vista.QUIETO) {
                pinta(1);
                return;
            }
            let raf = 0;
            const calc = () => { raf = 0; const r = caja.getBoundingClientRect(); pinta(Vista.clamp01((innerHeight * 0.6 - r.top) / r.height)); };
            addEventListener('scroll', () => { if (!raf)
                raf = requestAnimationFrame(calc); }, { passive: true });
            addEventListener('resize', calc);
            calc();
        }
        Vista.rielCierre = rielCierre;
        /* ---------- Conectores anclados a las tarjetas reales (coach / tutor IA) ---------- */
        function conectores(caja, pares) {
            const svg = caja.querySelector('svg');
            if (!svg)
                return;
            const NS = 'http://www.w3.org/2000/svg';
            const nodo = (k) => caja.querySelector(`[data-n="${k}"]`);
            const mk = (tag, at, padre = svg) => {
                const e = document.createElementNS(NS, tag);
                for (const k in at)
                    e.setAttribute(k, String(at[k]));
                padre.append(e);
                return e;
            };
            let lineas = [];
            const armar = () => {
                svg.replaceChildren();
                const o = caja.getBoundingClientRect(), G = 10;
                const defs = mk('defs', {});
                lineas = pares.map(([a, b], i) => {
                    const A = nodo(a).getBoundingClientRect(), B = nodo(b).getBoundingClientRect();
                    const x1 = A.right + G - o.left, y1 = A.top + A.height / 2 - o.top;
                    const x2 = B.left - G - o.left, y2 = B.top + B.height / 2 - o.top, k = (x2 - x1) / 2;
                    const d = `M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2},${y2}`;
                    const m = mk('mask', { id: `mg${i}`, maskUnits: 'userSpaceOnUse' }, defs);
                    const mascara = mk('path', { d, class: 'mask-p', pathLength: 1 }, m);
                    mk('path', { d, class: 'ver', mask: `url(#mg${i})` });
                    const punta = mk('path', { d: `M${x2 - 7},${y2 - 6} L${x2},${y2} L${x2 - 7},${y2 + 6}`, class: 'punta' });
                    return { mascara, punta, destino: nodo(b) };
                });
            };
            let repintar = () => { };
            armar();
            new ResizeObserver(() => { armar(); repintar(); }).observe(caja);
            repintar = escena(caja, 2200, p => lineas.forEach((l, i) => {
                const k = Vista.curvaEnfatizada(Vista.tramo(p, i * 0.13, i * 0.13 + 0.45));
                l.mascara.style.strokeDashoffset = String(1 - k);
                l.punta.style.opacity = k > 0.96 ? '1' : '0';
                l.destino.classList.toggle('on', k > 0.96);
            }));
        }
        Vista.conectores = conectores;
        /* ---------- Bitácora: la plática aparece por turnos y al final se actualiza la ruta ---------- */
        function conversacionDemo(caja, marcas) {
            const pasos = [...caja.querySelectorAll('[data-paso]')];
            escena(caja, 5200, p => pasos.forEach((el, i) => el.classList.toggle('on', p >= (marcas[i] ?? 1))));
        }
        Vista.conversacionDemo = conversacionDemo;
        /* ---------- Titular con fuente variable: "lupa" de peso que sigue al cursor ----------
           Cada letra mide su ancho en reposo y lo fija, así el cambio de peso no mueve las líneas.
           Cerca del cursor: peso 800 → 380 y sube 0.05em; al salir regresa con resorte M3.
           En pantallas táctiles, al tocar el título pasa una ola por las letras. */
        function tituloVariable(h1) {
            if (!h1 || Vista.QUIETO)
                return;
            const PESO = 800, LIGERO = 380;
            const envolver = (nodo) => {
                for (const n of [...nodo.childNodes]) {
                    if (n.nodeType === 1) {
                        envolver(n);
                        continue;
                    }
                    if (n.nodeType !== 3)
                        continue;
                    const frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(trozo => {
                        if (!trozo)
                            return;
                        if (/^\s+$/.test(trozo)) {
                            frag.append(trozo);
                            return;
                        }
                        const palabra = document.createElement('span');
                        palabra.className = 'palabra';
                        for (const ch of trozo) {
                            const l = document.createElement('span');
                            l.className = 'letra';
                            l.textContent = ch;
                            palabra.append(l);
                        }
                        frag.append(palabra);
                    });
                    n.replaceWith(frag);
                }
            };
            h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
            envolver(h1);
            [...h1.children].forEach(c => c.setAttribute('aria-hidden', 'true'));
            h1.classList.add('titulo-vf');
            const letras = [...h1.querySelectorAll('.letra')];
            const medir = () => {
                letras.forEach(l => (l.style.width = ''));
                const anchos = letras.map(l => l.getBoundingClientRect().width);
                letras.forEach((l, i) => (l.style.width = `${anchos[i]}px`));
            };
            (document.fonts ? document.fonts.ready : Promise.resolve()).then(medir);
            let tRes = 0;
            addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(medir, 150); });
            const poner = (l, k) => {
                l.style.setProperty('--w', String(Math.round(PESO - (PESO - LIGERO) * k)));
                l.style.setProperty('--y', `${(-0.05 * k).toFixed(3)}em`);
            };
            const reposo = () => { h1.classList.remove('activo'); letras.forEach(l => poner(l, 0)); };
            let centros = [], radio = 120, raf = 0, px = 0, py = 0;
            const calcular = () => {
                raf = 0;
                letras.forEach((l, i) => {
                    const [cx, cy] = centros[i];
                    const d = Math.hypot(px - cx, (py - cy) * 1.4);
                    const k = Math.max(0, 1 - d / radio);
                    poner(l, k * k * (3 - 2 * k));
                });
            };
            h1.addEventListener('pointerenter', e => {
                if (e.pointerType === 'touch')
                    return;
                const fs = parseFloat(getComputedStyle(h1).fontSize);
                radio = fs * 1.5;
                centros = letras.map(l => { const r = l.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
                h1.classList.add('activo');
            });
            h1.addEventListener('pointermove', e => {
                if (e.pointerType === 'touch' || !centros.length)
                    return;
                px = e.clientX;
                py = e.clientY;
                if (!raf)
                    raf = requestAnimationFrame(calcular);
            });
            h1.addEventListener('pointerleave', () => { centros = []; reposo(); });
            /* Táctil: una ola de izquierda a derecha */
            h1.addEventListener('pointerdown', e => {
                if (e.pointerType !== 'touch')
                    return;
                letras.forEach((l, i) => {
                    setTimeout(() => poner(l, 1), i * 22);
                    setTimeout(() => poner(l, 0), i * 22 + 260);
                });
            });
        }
        Vista.tituloVariable = tituloVariable;
    })(Vista = Zip.Vista || (Zip.Vista = {}));
})(Zip || (Zip = {}));
