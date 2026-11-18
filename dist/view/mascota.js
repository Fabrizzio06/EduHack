"use strict";
/* =====================================================================
   Zip · VIEW · Mascota (el zorro)
   ---------------------------------------------------------------------
   Reproduce las ilustraciones del zorro cuadro por cuadro (stop motion).
   - Cada escena es una lista de cuadros (PNG en rsc/img/zorro) y de pasos [cuadro, ms].
   - El primer cuadro va en el HTML; los demás se bajan solo cuando la
     escena entra a la pantalla. Fuera de pantalla, se pausa.
   - Con «bajo estímulo» o «reducir movimiento» se queda en el primer cuadro.
   Uso en HTML:   <figure class="zorro-escena" data-zorro="leer"><img class="ver" src="rsc/img/zorro/leer-1.png" alt="…"></figure>
   Uso desde TS:  Zip.Vista.zorroHTML('celebrar', 'redonda')
   Para sumar una animación nueva: agrega una entrada en ESCENAS_ZORRO con sus cuadros y pasos.
   ===================================================================== */
var Zip;
(function (Zip) {
    var Vista;
    (function (Vista) {
        const RUTA = 'rsc/img/zorro/';
        /** Cuadros numerados: cuadros('leer', 3) → leer-1.png, leer-2.png, leer-3.png */
        const cuadros = (nombre, n) => Array.from({ length: n }, (_, i) => `${RUTA}${nombre}-${i + 1}.png`);
        /* pasos: [índice de cuadro, milisegundos que se queda] */
        Vista.ESCENAS_ZORRO = {
            saludar: {
                alt: 'El zorro de Zip saluda con la mano',
                cuadros: [`${RUTA}saludar.png`],
                pasos: [[0, 1000]]
            },
            leer: {
                alt: 'El zorro de Zip lee un libro y pasa la página',
                cuadros: cuadros('leer', 3),
                pasos: [[0, 1900], [1, 520], [2, 170], [0, 1300], [1, 420]]
            },
            pensar: {
                alt: 'El zorro de Zip piensa y se le prende el foco',
                cuadros: cuadros('pensar', 3),
                pasos: [[0, 1500], [1, 800], [2, 1700]]
            },
            celebrar: {
                alt: 'El zorro de Zip celebra entre confeti',
                cuadros: cuadros('celebrar', 3),
                pasos: [[0, 460], [1, 240], [2, 560], [1, 240]]
            },
            trabajar: {
                alt: 'El zorro de Zip trabaja en su laptop',
                cuadros: cuadros('trabajar', 3),
                pasos: [[0, 620], [1, 190], [2, 150], [1, 190], [0, 380], [2, 150]]
            },
            correr: {
                alt: 'El zorro de Zip corre con su mochila y su lápiz',
                cuadros: cuadros('correr', 2),
                pasos: [[0, 170], [1, 170]]
            }
        };
        const quieto = () => Vista.QUIETO || document.documentElement.dataset.estimulo === 'bajo';
        /** HTML de una escena (con su primer cuadro) para pintarla desde TS. */
        function zorroHTML(nombre, clase) {
            const e = Vista.ESCENAS_ZORRO[nombre];
            if (!e)
                return '';
            return `<figure class="zorro-escena${clase ? ' ' + clase : ''}" data-zorro="${nombre}"><img class="ver" src="${e.cuadros[0]}" alt="${e.alt}" width="512" height="512" loading="lazy" decoding="async"></figure>`;
        }
        Vista.zorroHTML = zorroHTML;
        /** La cara del zorro para avatares redondos. */
        Vista.caraHTML = () => `<img class="zorro-cara" src="${Vista.ESCENAS_ZORRO.saludar.cuadros[0]}" alt="" width="44" height="44" loading="lazy" decoding="async">`;
        const estados = new WeakMap();
        const mostrar = (st, n) => { const k = n < st.imgs.length ? n : 0; st.imgs.forEach((im, i) => im.classList.toggle('ver', i === k)); };
        const escenaDe = (el) => Vista.ESCENAS_ZORRO[el.dataset.zorro];
        async function cargar(el, st, esc) {
            st.cargado = true;
            const nuevos = esc.cuadros.slice(1).map(src => {
                const i = new Image();
                i.alt = '';
                i.width = 512;
                i.height = 512;
                i.decoding = 'async';
                i.setAttribute('aria-hidden', 'true');
                i.src = src;
                el.append(i);
                return i;
            });
            await Promise.all(nuevos.map(i => (i.decode ? i.decode().catch(() => { }) : Promise.resolve())));
            st.imgs = st.imgs.concat(nuevos);
        }
        function tic(el, st, esc) {
            clearTimeout(st.t);
            if (!st.visible || quieto()) {
                mostrar(st, 0);
                el.classList.remove('vivo');
                return;
            }
            el.classList.add('vivo');
            const [cuadro, ms] = esc.pasos[st.paso % esc.pasos.length];
            mostrar(st, cuadro);
            st.paso++;
            st.t = setTimeout(() => tic(el, st, esc), ms);
        }
        const io = new IntersectionObserver(es => es.forEach(async (e) => {
            const el = e.target, st = estados.get(el), esc = escenaDe(el);
            if (!st || !esc)
                return;
            st.visible = e.isIntersecting;
            if (st.visible && !quieto() && !st.cargado)
                await cargar(el, st, esc);
            tic(el, st, esc);
        }), { threshold: 0.25 });
        function preparar(el) {
            if (el.dataset.listo)
                return;
            el.dataset.listo = '1';
            const esc = escenaDe(el), primero = el.querySelector('img');
            if (!esc || !primero || esc.cuadros.length < 2)
                return;
            estados.set(el, { imgs: [primero], paso: 0, t: 0, cargado: false, visible: false });
            io.observe(el);
        }
        /** Activa todas las escenas dentro de un elemento (o de toda la página). */
        function animarZorros(raiz) {
            (raiz || document).querySelectorAll('[data-zorro]').forEach(preparar);
        }
        Vista.animarZorros = animarZorros;
        /* Las pantallas de la plataforma se pintan con TS: cada escena nueva se activa sola. */
        new MutationObserver(cambios => cambios.forEach(c => c.addedNodes.forEach(n => {
            if (n.nodeType !== 1)
                return;
            const el = n;
            if (el.matches('[data-zorro]'))
                preparar(el);
            animarZorros(el);
        }))).observe(document.documentElement, { childList: true, subtree: true });
        if (document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', () => animarZorros());
        else
            animarZorros();
    })(Vista = Zip.Vista || (Zip.Vista = {}));
})(Zip || (Zip = {}));
