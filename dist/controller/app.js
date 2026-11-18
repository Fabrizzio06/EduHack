"use strict";
/* =====================================================================
   Zip · CONTROLLER · Arranque de la página
   ---------------------------------------------------------------------
   Crea el modelo, monta las vistas y las conecta.
   Expone window.ZipBot para conectar el bot real:

     ZipBot.conectar(async (texto, historial) => {
       const r = await fetch('/api/bot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                           body: JSON.stringify({ mensaje: texto, historial }) });
       return (await r.json()).respuesta;   // texto plano (se escapa) o { html: '...' }
     });

   Otras funciones: ZipBot.abrir() · ZipBot.cerrar() · ZipBot.enviar('texto')
                    ZipBot.decir('texto del bot') · ZipBot.historial
   Enlace con el chat abierto: index.html?chat=abierto
   ===================================================================== */
var Zip;
(function (Zip) {
    var Controlador;
    (function (Controlador) {
        const Modelo = Zip.Modelo;
        const Vista = Zip.Vista;
        function iniciar() {
            /* ----- Movimiento de la página ----- */
            Vista.activarRevelado('[data-r], .resalte');
            Vista.activarRipple('[data-ripple]');
            Vista.tituloVariable(document.getElementById('t-hero'));
            const barra = document.querySelector('.cabecera');
            if (barra)
                Vista.barraSuperior(barra);
            const dientes = document.getElementById('dientes');
            if (dientes)
                Vista.dientes(dientes);
            Vista.contadores('[data-contar]');
            const pasos = document.getElementById('pasos');
            if (pasos)
                Vista.rielCierre(pasos);
            const guias = document.getElementById('guias');
            if (guias)
                Vista.conectores(guias, [['coach', 'chal'], ['coach', 'eva'], ['coach', 'cert'], ['tutor', 'mod'], ['tutor', 'bit']]);
            const demo = document.getElementById('demo-bit');
            if (demo)
                Vista.conversacionDemo(demo, [0, 0.2, 0.42, 0.62, 0.85]);
            /* ----- Asesor de ventas ----- */
            const asesor = new Modelo.AsesorVentas();
            /* Conexión del botón con el bot: la dirección va en <meta name="zip-bot" content="…"> de index.html.
               Si el bot no contesta, sigue respondiendo el asesor de muestra. */
            const destinoBot = document.querySelector('meta[name="zip-bot"]');
            if (destinoBot && destinoBot.content.trim())
                asesor.conectar(destinoBot.content.trim());
            const ventanas = [
                new Vista.VentanaChat({ lista: 'zb-mensajes', rapidas: 'zb-rapidas', form: 'zb-form', input: 'zb-input' })
            ].filter(v => v.existe);
            const flotante = ventanas.find(v => v.lista.id === 'zb-mensajes');
            const burbuja = flotante ? new Vista.BurbujaFlotante(flotante) : null;
            const preguntar = async (v, texto, fija) => {
                v.agregar(Modelo.escapar(texto), 'yo');
                const poner = v.escribiendo();
                const espera = Vista.QUIETO || asesor.conectado ? 0 : 700;
                const [html] = await Promise.all([asesor.preguntar(texto, fija), new Promise(r => setTimeout(r, espera))]);
                poner(html);
            };
            ventanas.forEach(v => {
                v.alElegirRapida(clave => {
                    if (!Modelo.esClave(clave))
                        return;
                    const { pregunta, respuesta } = asesor.respuestaRapida(clave);
                    preguntar(v, pregunta, respuesta);
                });
                v.alEnviar(texto => { preguntar(v, texto); });
                v.alSeguirEnlaceInterno(() => burbuja && burbuja.cerrar());
            });
            if (burbuja) {
                /* Cualquier elemento con data-abrir-bot abre el chat del asesor */
                document.querySelectorAll('[data-abrir-bot]').forEach(b => b.addEventListener('click', () => burbuja.abrir()));
                burbuja.presentarse();
                if (new URLSearchParams(location.search).get('chat') === 'abierto')
                    burbuja.abrir();
            }
            window.ZipBot = Object.freeze({
                conectar: (fn) => asesor.conectar(fn),
                abrir: () => burbuja && burbuja.abrir(),
                cerrar: () => burbuja && burbuja.cerrar(),
                enviar: (texto) => { if (flotante && burbuja) {
                    burbuja.abrir();
                    preguntar(flotante, texto);
                } },
                decir: (texto) => ventanas.forEach(v => v.agregar(Modelo.aHTML(texto), 'bot')),
                get historial() { return asesor.historial; }
            });
        }
        Controlador.iniciar = iniciar;
    })(Controlador = Zip.Controlador || (Zip.Controlador = {}));
})(Zip || (Zip = {}));
if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => Zip.Controlador.iniciar());
else
    Zip.Controlador.iniciar();
