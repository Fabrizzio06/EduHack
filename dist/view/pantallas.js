"use strict";
/* =====================================================================
   Zip · VIEW · Pantallas de la plataforma
   ---------------------------------------------------------------------
   Entrar (login) · Experiencias · Detalle · Mi experiencia (4 componentes) ·
   Bitácora · Trayectoria · Coach. Solo arma HTML con la identidad de Zip;
   los datos y las reglas vienen del MODEL (model/negocio.ts) y los eventos
   los pone el CONTROLLER (controller/rutas.ts).
   ===================================================================== */
var Zip;
(function (Zip) {
    var Vista;
    (function (Vista) {
        var Pantallas;
        (function (Pantallas) {
            const esc = (s) => Zip.Modelo.escapar(s);
            const ic = (id) => `<svg class="z-ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
            const flecha = '<svg width="20" height="20" aria-hidden="true"><use href="#flecha"/></svg>';
            /* El zorro animado (view/mascota.ts): leer, pensar, celebrar, trabajar, correr, saludar */
            const mascota = (escena, clase) => Vista.zorroHTML(escena, clase);
            const conZorro = (titulo, escena) => `<div class="z-h-fila"><h2 class="z-h">${titulo}</h2>${mascota(escena, 'redonda mini')}</div>`;
            const etiqueta = (txt, tipo) => `<span class="z-etiqueta${tipo ? ' z-etiqueta--' + tipo : ''}">${txt}</span>`;
            const iaEtiqueta = (P) => (P.estado.iaViva ? etiqueta('IA conectada', 'disponible') : etiqueta('simulado', 'simulado'));
            const cab = (titulo, sub, pre) => `<header class="z-cab">${pre || ''}<h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</header>`;
            const pre = (t) => `<p class="eti mono">${t}</p>`;
            const dientes = (n, total = 4) => `<div class="z-dientes" style="--n:${total}" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<span class="${i < n ? 'on' : (i === n ? 'ahora' : '')}"></span>`).join('')}</div>`;
            const ICONO_MATERIAL = { 'Lectura': 'libro', 'Video': 'video', 'Pódcast': 'audio' };
            const color = (P, k) => `t${(Object.keys(P.EXP).indexOf(k) % 4) + 1}`;
            const datos = (e) => `<p class="z-datos mono">${e.semanas} semanas · ${e.modulos.length} módulos · coach asignado</p>`;
            /* ---------- Entrar (login con la cuenta de prueba) ---------- */
            function login(demo) {
                return `<section class="z-login contenedor">
      <div class="z-login-caja">
        <aside class="z-login-arte" aria-hidden="true">
          ${mascota('saludar', 'redonda z-login-zorro')}
          <p class="mono">Aprende. Aplica. Demuestra.</p>
          <ol class="z-login-pasos"><li><b>1</b>Elige tu experiencia</li><li><b>2</b>Aplícala en tu realidad</li><li><b>3</b>Demuéstralo con evidencia</li></ol>
        </aside>
        <form class="z-login-form" id="z-login" novalidate>
          <header class="z-cab">${pre('Entrar a Zip')}<h1>Qué bueno verte.</h1><p>Entra con tu cuenta para elegir tu experiencia y seguir tu camino.</p></header>
          <div class="z-campo"><label for="z-usuario">Usuario</label>
            <input id="z-usuario" name="usuario" type="text" autocomplete="username" autocapitalize="words" spellcheck="false" placeholder="Tu nombre de usuario" required></div>
          <div class="z-campo"><label for="z-clave">Contraseña</label>
            <div class="z-clave"><input id="z-clave" name="clave" type="password" autocomplete="current-password" placeholder="Tu contraseña" required>
              <button type="button" class="z-clave-ver" id="z-ver-clave" aria-pressed="false" aria-controls="z-clave">Mostrar</button></div></div>
          <p class="z-login-error" id="z-login-error" role="alert"></p>
          <button class="btn btn-principal z-login-entrar" type="submit" data-ripple>Entrar ${flecha}</button>
          <div class="z-demo">
            <div><span class="mono">Cuenta de prueba</span>
              <p>Usuario <code>${esc(demo.usuario)}</code> · Contraseña <code>${esc(demo.clave)}</code></p></div>
            <button type="button" class="btn btn-sec btn-chico" id="z-rellenar" data-ripple>Usar esta cuenta</button>
          </div>
          <p class="z-nota">Prototipo sin base de datos: tu sesión y tu progreso viven solo en esta pestaña y se borran al cerrarla.</p>
        </form>
      </div>
    </section>`;
            }
            Pantallas.login = login;
            /** Lo que se ve en el encabezado: quién entró y el botón para salir (o el enlace para entrar). */
            function sesion(u) {
                if (!u)
                    return `<a class="z-sesion-entrar" href="#login">Entrar</a>`;
                return `<span class="z-sesion-quien" title="${esc(u.nombre)}"><span class="z-sesion-ini" aria-hidden="true">${esc(u.iniciales)}</span><span class="z-sesion-nombre">${esc(u.nombre)}</span></span>
      <button type="button" class="z-sesion-salir" id="z-salir">Salir</button>`;
            }
            Pantallas.sesion = sesion;
            /* ---------- Experiencias ---------- */
            function experiencias(P) {
                return `<section class="z-pagina contenedor">
      ${cab('Elige tu experiencia.', 'Diseñadas por especialistas en educación y expertos en cada competencia. Más largas y completas que un curso, y con un coach asignado.', pre('Catálogo'))}
      <div class="z-exps">${Object.entries(P.EXP).map(([k, e]) => {
                    const disp = k === P.DISPONIBLE;
                    return `<a class="tarjeta-exp ${color(P, k)}" href="#exp/${k}">
          <div class="banda"><span class="mono">${esc(e.comp)}</span><h2>${esc(e.nombre)}</h2></div>
          <div class="cuerpo"><p>${esc(e.desc)}</p>${datos(e)}
            <div class="z-pie-tarjeta">${disp ? etiqueta('Disponible', 'disponible') : etiqueta('Vista previa', 'vista')}<span class="z-ver">Ver ${flecha}</span></div></div></a>`;
                }).join('')}</div></section>`;
            }
            Pantallas.experiencias = experiencias;
            /* ---------- Detalle e inscripción ---------- */
            function detalle(k, e, P) {
                const disp = k === P.DISPONIBLE;
                return `<section class="z-pagina contenedor">
      <a class="z-volver" href="#experiencias">${ic('atras')} Experiencias</a>
      <div class="z-portada ${color(P, k)}"><span class="mono">${esc(e.comp)}</span><h1>${esc(e.nombre)}</h1><p>${esc(e.desc)}</p>${datos(e)}</div>
      <div class="z-dos">
        <div class="z-tarjeta"><h2 class="z-h">Módulos</h2>
          <ol class="z-modulos">${e.modulos.map((m, i) => `<li class="${i === 0 ? 'abierto' : ''}"><span class="z-hito">${i === 0 ? i + 1 : ic('candado')}</span><div><strong>Módulo ${i + 1}. ${esc(m.t)}</strong><span>${i === 0 ? 'Autónomo · comunidad · aplicación · evaluación' : 'Se abre al terminar el anterior'}</span></div></li>`).join('')}</ol></div>
        <div class="z-tarjeta z-destacada"><h2 class="z-h">Inscríbete</h2>
          <div class="z-campo"><label for="z-ctx">¿Dónde quieres aplicar esta competencia?</label>
            <select id="z-ctx"><option value="">Elige una opción</option>${P.CONTEXTOS.map(o => `<option>${o}</option>`).join('')}</select></div>
          <p class="z-nota">Tu coach diseña los retos para ese lugar: así aplicas en tu realidad.</p>
          <button class="btn btn-principal" id="z-ins" disabled data-ripple>${disp ? 'Inscribirme' : 'Disponible pronto'}</button></div>
      </div></section>`;
            }
            Pantallas.detalle = detalle;
            /* ---------- Mi experiencia ---------- */
            function mi(P) {
                const S = P.estado, e = P.actual(), m = e.modulos[0], n = P.avance();
                return `<section class="z-pagina contenedor">
      <a class="z-volver" href="#camino">${ic('atras')} Camino de aprendizaje</a>
      ${cab(esc(m.t), `Con PREP · para aplicarlo ${esc(S.contexto.toLowerCase())}`, pre('Módulo 4 · Aplicación'))}
      <div class="z-progreso">${dientes(n)}<p class="z-nota"><strong>${n} de 4</strong> componentes completos</p></div>
      <div class="z-pestanas" role="tablist" aria-label="Componentes del módulo">${P.PESTANAS.map((t, i) => `<button role="tab" class="z-pestana" data-tab="${i}" aria-selected="${S.tab === i}" ${S.hecho[i] ? 'data-hecho' : ''} data-ripple><span class="z-num-p">${S.hecho[i] ? ic('check') : i + 1}</span><span>${t}</span></button>`).join('')}</div>
      <div id="z-panel" class="z-panel" role="tabpanel"></div></section>`;
            }
            Pantallas.mi = mi;
            const burbujas = (lista, saludo) => (lista.length
                ? lista.map(x => `<li class="msj ${x.de === 'yo' ? 'yo' : 'bot'}">${esc(x.t)}${x.f ? `<small>${esc(x.f)}</small>` : ''}</li>`).join('')
                : `<li class="msj bot">${saludo}</li>`);
            function autonomo(m, P) {
                return `<div class="z-dos">
      <div class="z-tarjeta">${conZorro('Materiales del módulo', 'leer')}
        <ul class="z-materiales">${m.materiales.map(([tipo, txt]) => { const [t, dur] = tipo.split(' · '); return `<li>${ic(ICONO_MATERIAL[t] || 'libro')}<div><strong>${t}</strong> <span class="mono">${dur}</span><p>${esc(txt)}</p></div></li>`; }).join('')}</ul>
        <p class="z-nota">Materiales de ejemplo. En la versión completa los asigna quien dirige la experiencia: capítulos de libros, pódcasts, artículos y películas.</p></div>
      <div class="z-tarjeta"><h2 class="z-h">Tutor académico ${iaEtiqueta(P)}</h2>
        <p class="z-sub">Pregunta lo que no te quedó claro. Te guía con preguntas en vez de darte todo resuelto.</p>
        <ol class="z-chat" id="z-chat" aria-live="polite">${burbujas(P.estado.chatTutor, 'Hola. ¿Qué duda tienes sobre este módulo?')}</ol>
        <div class="z-campo z-campo-fila"><label for="z-q" class="vh">Tu pregunta</label><input id="z-q" type="text" placeholder="Ej.: ¿qué hago si me pongo nervioso?" autocomplete="off"><button class="btn btn-principal" id="z-env" data-ripple>Preguntar</button></div></div>
    </div>
    <div class="z-acciones"><button class="btn btn-sec" id="z-lei" data-ripple>${ic('check')} Terminé los materiales</button></div>`;
            }
            Pantallas.autonomo = autonomo;
            function comunidad(m, P) {
                const sala = `https://meet.jit.si/Zip-EduHack-${P.estado.exp}-dialogo`;
                return `<div class="z-dos">
      <article class="z-tarjeta">${etiqueta('Taller colaborativo')}<h2 class="z-h">${esc(m.taller)}</h2>
        <p class="z-cuando">${ic('calendario')} ${P.proximo(4, '19:00')} · en línea · 6 a 10 personas</p>
        <p class="z-sub">Practicas en equipo con quienes toman la misma experiencia.</p>
        <div class="z-acciones"><button class="btn btn-sec" id="z-apartar" data-ripple>Apartar mi lugar</button></div></article>
      <article class="z-tarjeta">${etiqueta('Sesión de diálogo')}<h2 class="z-h">${esc(m.dialogo)}</h2>
        <p class="z-cuando">${ic('calendario')} ${P.proximo(2, '20:00')} · en línea</p>
        <p class="z-sub">Una conversación reflexiva sobre cómo vive cada quien esta habilidad.</p>
        <div class="z-acciones"><a class="btn btn-principal" href="${sala}" target="_blank" rel="noopener" data-ripple>${ic('video')} Entrar a la sala</a></div></article>
    </div>
    <div class="z-acciones"><button class="btn btn-sec" id="z-ok" data-ripple>${ic('check')} Ya participé</button><span class="z-nota">La sala abre una videollamada real de Jitsi Meet.</span></div>`;
            }
            Pantallas.comunidad = comunidad;
            function aplicacion(P) {
                const S = P.estado;
                return `<div class="z-tarjeta z-reto">${conZorro(`Tu reto con tu coach ${etiqueta('coach simulado', 'simulado')}`, 'trabajar')}
      <p class="z-sub">Tu coach diseñó este reto para aplicarlo ${esc(S.contexto.toLowerCase())}:</p>
      <blockquote>${esc(S.reto)}</blockquote>
      <label class="z-check"><input type="checkbox" id="z-hc" ${S.retoHecho ? 'checked' : ''}><span>Ya lo hice</span></label>
      <p class="z-nota">Cuando lo hagas, cuéntaselo a tu compañero de reflexión en la bitácora: eso se vuelve tu evidencia.</p>
      <div class="z-acciones"><a class="btn btn-sec" href="#bitacora" data-ripple>${ic('bitacora')} Contarlo en mi bitácora</a><button class="btn btn-sec" id="z-agendar" data-ripple>${ic('calendario')} Agendar con mi coach</button><button class="btn btn-principal" id="z-ok" ${S.retoHecho ? '' : 'disabled'} data-ripple>Continuar a la evaluación</button></div></div>`;
            }
            Pantallas.aplicacion = aplicacion;
            function evaluacion(m, P) {
                const S = P.estado, r = S.evalResp;
                return `<div class="z-tarjeta z-eval">${conZorro('Evaluación del módulo', 'pensar')}
      <p class="z-sub">Responde sin mirar los materiales: recordar es lo que fija lo aprendido.</p>
      ${m.eval.map((q, i) => `<fieldset class="z-pregunta"><legend>${i + 1}. ${esc(q.p)}</legend>${q.o.map((o, j) => {
                    const respondida = r[i] != null;
                    const est = respondida ? (j === q.c ? 'bien' : (r[i] === j ? 'mal' : '')) : '';
                    return `<button class="z-opc ${est}" data-opc="${i},${j}" ${respondida ? 'disabled' : ''}>${est === 'bien' ? ic('check') : ''}<span>${esc(o)}</span></button>`;
                }).join('')}</fieldset>`).join('')}
      <fieldset class="z-pregunta"><legend>3. ¿Qué tan seguro te sientes de usar esta habilidad?</legend>
        <div class="z-escala">${['Nada', 'Poco', 'Algo', 'Bastante'].map((t, i) => `<button data-auto="${i + 1}" aria-pressed="${S.autoeval === i + 1}">${t}</button>`).join('')}</div></fieldset>
      <div class="z-campo"><label for="z-refl">Reflexión: ¿qué cambió en cómo comunicas tus ideas?</label><textarea id="z-refl">${esc(S.reflexion)}</textarea></div>
      <div class="z-acciones"><button class="btn btn-principal" id="z-fin" data-ripple>Terminar módulo</button><span id="z-msg" class="z-nota" role="status"></span></div></div>`;
            }
            Pantallas.evaluacion = evaluacion;
            /* ---------- Bitácora ---------- */
            function bitacora(P, voz) {
                return `<section class="z-pagina contenedor">
      ${cab('Mi bitácora', 'Cuéntale a tu compañero de reflexión cómo aplicaste lo que aprendes. Por ejemplo: «hoy hablé con mi jefe y usé PREP». Cada entrada se vuelve evidencia de tu trayectoria.', pre('Tutor IA · compañero de reflexión'))}
      <div class="chat z-chat-grande">
        <div class="chat-top"><span class="avatar">${Vista.caraHTML()}</span><div><strong>Compañero de reflexión</strong><span class="estado"><i></i>${P.estado.iaViva ? 'IA conectada' : 'simulado'}</span></div></div>
        <ol class="z-chat" id="z-chat" aria-live="polite">${burbujas(P.estado.bitacora, 'Hola. ¿Usaste hoy algo de lo que estás aprendiendo? Cuéntame, aunque sea pequeño.')}</ol>
        <div class="z-redactar"><label for="z-t" class="vh">Lo que pasó</label><textarea id="z-t" placeholder="Escribe o dicta lo que pasó"></textarea>
          <div class="z-acciones"><button class="btn btn-principal" id="z-env" data-ripple>Guardar en mi bitácora</button>${voz ? `<button class="btn btn-sec" id="z-mic" data-ripple>${ic('mic')} Dictar con voz</button>` : ''}<span id="z-est" class="z-nota" role="status"></span></div></div>
      </div></section>`;
            }
            Pantallas.bitacora = bitacora;
            /* ---------- Trayectoria ---------- */
            function trayectoria(P) {
                const S = P.estado, e = P.actual(), n = P.avance(), ev = P.evidencias(), listo = n === 4;
                const prox = S.proxRepaso ? P.fechaLarga(new Date(S.proxRepaso)) : null;
                return `<section class="z-pagina contenedor">
      ${cab('Mi trayectoria', 'Lo que aprendiste, cómo lo aplicaste y quién lo validó: tu crecimiento, con evidencia.', pre(esc(e.comp)))}
      <div class="z-insignia-grande ${listo ? '' : 'pendiente'}">${mascota(listo ? 'celebrar' : 'pensar', 'redonda sello')}
        <div><h2>${esc(e.nombre)} · Módulo 1</h2>
          <p>${listo ? 'Módulo completado.' : `Módulo en curso: ${n} de 4 componentes.`} ${S.aciertos != null ? `Evaluación: ${S.aciertos} de 2 respuestas correctas.` : ''}</p>
          <div class="z-etiquetas">${etiqueta('Tutor de IA: ' + (listo ? 'evaluado' : 'pendiente'), listo ? 'disponible' : 'simulado')}${etiqueta('Coach humano: ' + (S.coachOK ? `validado (${S.coachNota} de 16)` : 'pendiente'), S.coachOK ? 'disponible' : 'simulado')}</div>
          <p class="z-nota">${S.coachOK ? `Tu coach revisó tu evidencia: «${esc(S.coachComent || '')}»` : 'La insignia la valida tu coach con la evidencia de tu bitácora adentro. Pruébalo en la pestaña Coach.'}</p>
          <button class="btn btn-sec" id="z-dl" ${listo ? '' : 'disabled'} data-ripple>${ic('descarga')} Descargar insignia (Open Badges)</button></div></div>
      <div class="z-dos">
        <div class="z-tarjeta"><h2 class="z-h">Para que no se te olvide</h2>${prox
                    ? `<p>Tu próximo repaso es el <strong>${prox}</strong>.</p><ol class="z-repasos">${(S.ruta || []).slice(1).map(x => `<li>${new Date(x).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</li>`).join('')}</ol><p class="z-nota">Calculado con FSRS: si te va bien, los repasos se separan; si te cuesta, se acercan.</p>`
                    : '<p class="z-sub">Al terminar la evaluación se programa tu primer repaso.</p>'}</div>
        <div class="z-tarjeta"><h2 class="z-h">Mi reto</h2><p>${esc(S.reto)}</p>${etiqueta(S.retoHecho ? 'hecho' : 'pendiente', S.retoHecho ? 'disponible' : 'vista')}</div>
      </div>
      <div class="z-tarjeta"><h2 class="z-h">Evidencias de aplicación (${ev.length})</h2>${ev.length
                    ? `<ol class="z-linea">${ev.map(x => `<li><span class="z-punto"></span><div><p>${esc(x.t)}</p><time>${esc(x.f)}</time></div></li>`).join('')}</ol>`
                    : '<p class="z-sub">Todavía no hay entradas. <a href="#bitacora">Escribe en tu bitácora</a>.</p>'}
        ${S.reflexion ? `<p class="z-reflexion"><strong>Reflexión del módulo:</strong> ${esc(S.reflexion)}</p>` : ''}</div>
    </section>`;
            }
            Pantallas.trayectoria = trayectoria;
            /* ---------- Coach ---------- */
            function coach(P) {
                const S = P.estado, g = P.grupoCoach(), listo = S.exp && S.hecho.every(Boolean);
                const yo = g.length && S.exp ? g[0].nombre : 'Tú (esta sesión)';
                return `<section class="z-pagina contenedor">
      ${cab('Panel del coach', 'Así ve el coach a su grupo de la experiencia «Comunicación que convence». Los participantes A a E son ejemplos.', pre('Vista de demostración'))}
      <div class="tabla-caja"><table class="z-tabla"><thead><tr><th scope="col">Participante</th><th scope="col">Dónde aplica</th><th scope="col">Módulo 1</th><th scope="col">Bitácora</th><th scope="col">Última actividad</th></tr></thead><tbody>
      ${g.map(p => `<tr class="${p.riesgo ? 'riesgo' : ''}"><th scope="row">${esc(p.nombre)}</th><td>${esc(p.donde)}</td>
        <td><div class="z-avance">${dientes(p.mod).replace('z-dientes', 'z-dientes mini')}<span>${p.mod} de 4</span></div></td>
        <td>${p.bit} ${p.bit === 1 ? 'entrada' : 'entradas'}</td>
        <td>${p.dias === 0 ? 'hoy' : `hace ${p.dias} ${p.dias === 1 ? 'día' : 'días'}`}${p.riesgo ? ' ' + etiqueta('contactar', 'alerta') : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="z-nota">El panel avisa quién lleva 7 días o más sin actividad, para que el coach lo busque antes de que abandone.</p>
      ${listo ? `<div class="z-tarjeta z-rubrica"><h2 class="z-h">Evaluar la evidencia de «${esc(yo)}»</h2>
          ${P.evidencias().map(x => `<p class="msj yo">${esc(x.t)}</p>`).join('') || '<p class="z-sub">Sin entradas de bitácora todavía.</p>'}
          ${S.reflexion ? `<p><strong>Reflexión:</strong> ${esc(S.reflexion)}</p>` : ''}
          <div class="z-criterios">${P.RUBRICA.map((c, i) => `<div class="z-criterio"><span>${c}</span><div class="z-escala">${[1, 2, 3, 4].map(n => `<button data-rub="${i},${n}" aria-pressed="${(S.rub || [])[i] === n}" aria-label="${c}: ${n} de 4">${n}</button>`).join('')}</div></div>`).join('')}</div>
          <div class="z-campo"><label for="z-com">Comentario para el participante</label><textarea id="z-com">${esc(S.coachComent || '')}</textarea></div>
          <div class="z-acciones"><button class="btn btn-principal" id="z-val" data-ripple>Validar evidencia</button><span id="z-cm" class="z-nota" role="status"></span></div></div>`
                    : `<div class="z-vacio">${mascota('trabajar', 'redonda vacio')}<p>Cuando termines el módulo 1, aquí podrás ver cómo el coach evalúa tu evidencia con una rúbrica.</p></div>`}
    </section>`;
            }
            Pantallas.coach = coach;
            /* =====================================================================
               Tablero de la experiencia · Camino de aprendizaje · Módulos · Flashcards
               ===================================================================== */
            const volver = (href, txt) => `<a class="z-volver" href="${href}">${ic('atras')} ${txt}</a>`;
            /* Tablero: métricas (empiezan en 0) + Camino de aprendizaje | Coach y Repaso del día */
            function tablero(P) {
                const e = P.actual(), S = P.estado, m = P.metricas(), est = P.caminoEstado(), prox = P.proximoRepaso();
                const metrica = (num, uni, eti) => `<li><p class="z-met-num">${num}${uni ? `<small>${uni}</small>` : ''}</p><p class="z-met-eti">${eti}</p></li>`;
                return `<section class="z-pagina contenedor">
      ${cab(esc(e.nombre), 'Tu tablero empieza en cero y crece con cada módulo, repaso y reto que haces.', pre(`${esc(e.comp)} · para aplicarlo ${esc(S.contexto.toLowerCase())}`))}
      <ul class="z-metricas" aria-label="Tus métricas">
        ${metrica(m.avance, '%', 'Avance del camino')}
        ${metrica(m.racha, m.racha === 1 ? ' día' : ' días', 'Racha de repaso')}
        ${metrica(m.dominadas, ` de ${m.totalTarjetas}`, 'Tarjetas dominadas')}
        ${metrica(m.recuerdo, '%', 'Recuerdo en repasos')}
      </ul>
      <div class="z-tablero">
        <a class="z-tarjeta z-destacada z-t-camino" href="#camino">
          <div class="z-h-fila"><div>${pre('Camino de aprendizaje')}<h2 class="z-h">${m.modulos} de ${m.totalModulos} módulos</h2></div>${mascota('correr', 'redonda mini')}</div>
          ${dientes(m.modulos, m.totalModulos)}
          <ol class="z-mini-camino">${P.CAMINO.map((x, i) => `<li class="${est[i] ? 'hecho' : ''}"><span class="z-hito">${est[i] ? ic('check') : x.n}</span><span>${x.titulo}</span></li>`).join('')}</ol>
          <span class="z-ver">Abrir el camino ${flecha}</span>
        </a>
        <div class="z-tarjeta z-t-coach">
          <h2 class="z-h">Coach ${etiqueta('simulado', 'simulado')}</h2>
          <p class="z-sub">Tu coach te conoce y diseña tu reto para aplicarlo ${esc(S.contexto.toLowerCase())}.</p>
          <p class="z-reto-mini">${esc(S.reto)}</p>
          ${etiqueta(S.retoHecho ? 'Reto hecho' : 'Reto pendiente', S.retoHecho ? 'disponible' : 'vista')}
          <div class="z-acciones"><a class="btn btn-sec" href="#modulo/4" id="z-ver-reto" data-ripple>Ver mi reto</a><button class="btn btn-sec" id="z-agendar-t" data-ripple>${ic('calendario')} Agendar sesión</button></div>
        </div>
        <div class="z-tarjeta z-t-repaso">
          <div class="z-h-fila"><h2 class="z-h">Repaso del día</h2>${mascota('pensar', 'redonda mini')}</div>
          <p class="z-met-num">${m.pendientes}<small> ${m.pendientes === 1 ? 'tarjeta para hoy' : 'tarjetas para hoy'}</small></p>
          <p class="z-sub">${m.pendientes
                    ? 'Unos minutos al día para no olvidar lo aprendido. Tu calificación decide cuándo vuelve cada tarjeta.'
                    : `Vas al día.${prox ? ` Tu próximo repaso es el ${P.fechaLarga(prox)}.` : ''}`}</p>
          <div class="z-acciones">${m.pendientes
                    ? `<a class="btn btn-principal" href="#repaso" data-ripple>Repasar ahora ${flecha}</a>`
                    : '<a class="btn btn-sec" href="#modulo/3" data-ripple>Practicar de todos modos</a>'}</div>
        </div>
      </div></section>`;
            }
            Pantallas.tablero = tablero;
            /* Camino de aprendizaje: los módulos */
            function camino(P) {
                const est = P.caminoEstado();
                return `<section class="z-pagina contenedor">
      ${volver('#mi', 'Mi tablero')}
      ${cab('Camino de aprendizaje', 'Cuatro módulos. Primero entiendes, luego ves casos resueltos, después practicas tú y al final lo aplicas en tu realidad.', pre(esc(P.actual().comp)))}
      <ol class="z-camino">${P.CAMINO.map((x, i) => `<li><a class="z-tarjeta z-mod${est[i] ? ' hecho' : ''}" href="#modulo/${x.n}">
        <span class="z-hito">${est[i] ? ic('check') : x.n}</span>
        <div><span class="mono">Módulo ${x.n} · ${x.tipo}</span><h2 class="z-h">${x.titulo}</h2><p class="z-sub">${x.resumen}</p></div>
        <span class="z-mod-fin">${est[i] ? etiqueta('Completado', 'disponible') : etiqueta('Pendiente')}<span class="z-ver">Abrir ${flecha}</span></span></a></li>`).join('')}</ol>
    </section>`;
            }
            Pantallas.camino = camino;
            /* Módulo 1: video de introducción */
            function moduloVideo(P) {
                const src = P.videoEmbed(), hecho = P.caminoEstado()[0];
                return `<section class="z-pagina contenedor">
      ${volver('#camino', 'Camino de aprendizaje')}
      ${cab('Introducción a la comunicación', 'Mira el video y quédate con una idea: comunicar bien no es un talento, se entrena.', pre('Módulo 1 · Video'))}
      <div class="z-video">${src
                    ? `<iframe src="${src}" title="Video: introducción a la comunicación" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
                    : '<div class="z-video-vacio"><span class="marcador">[VIDEO DE YOUTUBE: falta el enlace]</span><p>Aquí va el video de introducción.</p></div>'}</div>
      <div class="z-acciones"><button class="btn btn-principal" id="z-m1" data-ripple>${hecho ? ic('check') + ' Visto' : 'Ya lo vi'}</button><a class="btn btn-sec" href="#modulo/2" data-ripple>Siguiente: situaciones ${flecha}</a></div>
    </section>`;
            }
            Pantallas.moduloVideo = moduloVideo;
            /* Módulo 2: situaciones con su mejor camino de solución */
            function moduloSituaciones(P) {
                const hecho = P.caminoEstado()[1];
                return `<section class="z-pagina contenedor">
      ${volver('#camino', 'Camino de aprendizaje')}
      ${cab('Situaciones donde la comunicación es clave', 'Cuatro momentos que a todos nos pasan. En cada uno, el mejor camino para resolverlo, paso a paso.', pre('Módulo 2 · Casos'))}
      <div class="z-situs">${P.SITUACIONES.map(s => `<article class="z-tarjeta z-situ">
        ${etiqueta(s.ambito)}<h2 class="z-h">${s.titulo}</h2><p class="z-sub">${s.problema}</p>
        <p class="z-situ-eti mono">El mejor camino</p>
        <ol class="z-pasos">${s.camino.map((p, i) => `<li><b>${i + 1}</b><span>${p}</span></li>`).join('')}</ol>
        <p class="z-evita"><strong>Evita:</strong> ${s.evita}</p></article>`).join('')}</div>
      <div class="z-acciones"><button class="btn btn-principal" id="z-m2" data-ripple>${hecho ? ic('check') + ' Entendido' : 'Entendido'}</button><a class="btn btn-sec" href="#modulo/3" data-ripple>Siguiente: flashcards ${flecha}</a></div>
    </section>`;
            }
            Pantallas.moduloSituaciones = moduloSituaciones;
            /* Módulo 3 y Repaso del día: una tarjeta a la vez. Frente = situación; reverso = la mejor forma. */
            function tarjetas(P, sesion) {
                const repaso = sesion.modo === 'repaso', t = P.tarjeta(sesion.cola[0]);
                return `<section class="z-pagina contenedor">
      ${volver(repaso ? '#mi' : '#camino', repaso ? 'Mi tablero' : 'Camino de aprendizaje')}
      ${cab(repaso ? 'Repaso del día' : 'Flashcards: ¿qué harías tú?', 'Lee la situación, imagina cómo la resolverías y voltea la tarjeta para comparar.', pre(repaso ? 'Para no olvidar' : 'Módulo 3 · Práctica'))}
      <div class="z-progreso">${dientes(sesion.hechas, sesion.total)}<p class="z-nota"><strong>Tarjeta ${Math.min(sesion.hechas + 1, sesion.total)} de ${sesion.total}</strong></p></div>
      <div class="z-carta" id="z-carta">
        <div class="z-cara frente"><span class="mono">Situación</span><p class="z-carta-txt">${t.frente}</p><p class="z-nota">Piensa tu respuesta antes de voltear.</p></div>
        <div class="z-cara reverso" aria-hidden="true">${etiqueta(t.concepto, 'vista')}<p class="mono">La mejor forma</p><ol class="z-reverso">${t.reverso.map(r => `<li>${r}</li>`).join('')}</ol></div>
      </div>
      <div class="z-flash-zona" id="z-zona"><div class="z-acciones"><button class="btn btn-principal" id="z-voltear" data-ripple>Voltear tarjeta</button></div></div>
    </section>`;
            }
            Pantallas.tarjetas = tarjetas;
            /* Las 4 calificaciones (lo que FSRS usa para decidir cuándo vuelve la tarjeta) */
            function notas(P, id) {
                const cuando = P.intervalos(id);
                return `<fieldset class="z-pregunta"><legend>¿Qué tan cerca estuviste de esta respuesta?</legend>
      <div class="z-notas">${P.NOTAS.map((n, i) => `<button class="z-nota-btn" data-nota="${i}" data-ripple><strong>${n}</strong><small>vuelve ${cuando[i]}</small></button>`).join('')}</div></fieldset>`;
            }
            Pantallas.notas = notas;
            function tarjetasFin(P, sesion) {
                const repaso = sesion.modo === 'repaso', prox = P.proximoRepaso(), m = P.metricas();
                return `<section class="z-pagina contenedor">
      ${cab(repaso ? 'Repaso terminado' : 'Flashcards terminadas', '', pre(repaso ? 'Para no olvidar' : 'Módulo 3 · Práctica'))}
      <div class="z-vacio">${mascota('celebrar', 'redonda vacio')}
        <p><strong>${sesion.hechas} ${sesion.hechas === 1 ? 'tarjeta calificada' : 'tarjetas calificadas'}.</strong> ${prox ? `Tu próximo repaso es el ${P.fechaLarga(prox)}.` : ''} Llevas ${m.dominadas} de ${m.totalTarjetas} dominadas.</p>
        <div class="z-acciones"><a class="btn btn-principal" href="#mi" data-ripple>Ver mi tablero ${flecha}</a>${repaso ? '' : '<a class="btn btn-sec" href="#modulo/4" data-ripple>Siguiente: aplícalo</a>'}</div></div>
    </section>`;
            }
            Pantallas.tarjetasFin = tarjetasFin;
            /* ---------- Piezas comunes ---------- */
            function vacio(titulo, texto) {
                return `<section class="z-pagina contenedor">${cab(titulo)}<div class="z-vacio">${mascota('correr', 'redonda vacio')}<p>${texto}</p><a class="btn btn-principal" href="#experiencias" data-ripple>Ver experiencias ${flecha}</a></div></section>`;
            }
            Pantallas.vacio = vacio;
            function continuar(P, nombre) {
                const e = P.actual(), n = P.avance(), S = P.estado;
                return `<div class="z-continuar"><div>${pre(nombre ? `Hola, ${esc(nombre)} · continúa donde te quedaste` : 'Continúa donde te quedaste')}<h2>${esc(e.nombre)}</h2>${dientes(n)}
      <p class="z-nota">${n} de 4 componentes del módulo 1${S.proxRepaso ? ' · próximo repaso: ' + P.fechaLarga(new Date(S.proxRepaso)) : ''}</p></div>
      <a class="btn btn-principal" href="#mi" data-ripple>Seguir ${flecha}</a></div>`;
            }
            Pantallas.continuar = continuar;
            Pantallas.pensando = () => '<li class="msj bot pensando"><span class="escribiendo" aria-label="Escribiendo"><i></i><i></i><i></i></span></li>';
            /** Aviso breve (snackbar M3) en lugar de alert(). */
            let tAviso = 0;
            function avisar(texto) {
                let s = document.getElementById('z-aviso');
                if (!s) {
                    s = document.createElement('div');
                    s.id = 'z-aviso';
                    s.className = 'z-aviso';
                    s.setAttribute('role', 'status');
                    document.body.append(s);
                }
                s.textContent = texto;
                s.classList.add('visible');
                clearTimeout(tAviso);
                tAviso = setTimeout(() => s.classList.remove('visible'), 3600);
            }
            Pantallas.avisar = avisar;
        })(Pantallas = Vista.Pantallas || (Vista.Pantallas = {}));
    })(Vista = Zip.Vista || (Zip.Vista = {}));
})(Zip || (Zip = {}));
