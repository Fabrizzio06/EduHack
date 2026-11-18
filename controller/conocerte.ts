/* =====================================================================
   Zip · CONTROLLER · Conocerte (diagnóstico por voz)
   ---------------------------------------------------------------------
   [Usuario habla] → MediaRecorder → Blob de audio → POST /api/analizar-voz
   → backend (prompt maestro + Gemini) → JSON → se reordena el camino.
   El chat solo pregunta: nunca muestra lo que respondió Gemini.
   ===================================================================== */
namespace Zip.Conocerte {
  const V = Zip.Vista.Conocerte;
  const D = Zip.Diagnostico;
  const MAX_SEGUNDOS = 120;

  /* ---------- Grabadora: MediaRecorder + nivel del micrófono para la animación ---------- */
  class Grabadora {
    private stream: MediaStream = null;
    private rec: MediaRecorder = null;
    private trozos: Blob[] = [];
    private ctx: AudioContext = null;
    private raf = 0;
    private inicio = 0;

    async iniciar(alNivel: (n: number) => void): Promise<void> {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const tipo = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
      this.rec = new MediaRecorder(this.stream, tipo ? { mimeType: tipo, audioBitsPerSecond: 32000 } : undefined);
      this.trozos = [];
      this.rec.ondataavailable = e => { if (e.data.size) this.trozos.push(e.data); };
      this.rec.start(250);
      this.inicio = performance.now();
      /* Nivel de voz (0 a 1) para que el botón "respire" mientras hablas */
      try {
        this.ctx = new AudioContext();
        const an = this.ctx.createAnalyser(); an.fftSize = 512;
        this.ctx.createMediaStreamSource(this.stream).connect(an);
        const datos = new Uint8Array(an.fftSize);
        const medir = () => {
          an.getByteTimeDomainData(datos);
          let suma = 0; for (const v of datos) suma += ((v - 128) / 128) ** 2;
          alNivel(Math.min(1, Math.sqrt(suma / datos.length) * 4));
          this.raf = requestAnimationFrame(medir);
        };
        medir();
      } catch (e) { /* sin medidor: solo no se anima */ }
    }

    get segundos(): number { return this.rec ? (performance.now() - this.inicio) / 1000 : 0; }

    detener(): Promise<{ blob: Blob; segundos: number }> {
      const segundos = this.segundos;
      return new Promise(res => {
        this.rec.onstop = () => { const blob = new Blob(this.trozos, { type: this.rec.mimeType || 'audio/webm' }); this.liberar(); res({ blob, segundos }); };
        this.rec.stop();
      });
    }

    liberar(): void {
      cancelAnimationFrame(this.raf);
      if (this.rec && this.rec.state !== 'inactive') { this.rec.onstop = null; this.rec.stop(); }
      this.stream?.getTracks().forEach(t => t.stop());
      this.ctx?.close().catch(() => {});
      this.rec = null; this.stream = null; this.ctx = null;
    }
  }

  /* ---------- Flujo ---------- */
  let grabadora: Grabadora = null;
  let respuestas: Zip.Diagnostico.Respuesta[] = [];
  let paso = 0, reloj = 0, activo = false;
  const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
  const espera = (ms: number) => new Promise(r => setTimeout(r, Zip.Vista.QUIETO ? 0 : ms));

  /** El zorro escribe y luego aparece el texto (transición suave). */
  async function decir(texto: string): Promise<void> {
    const chat = $('cn-chat');
    chat.querySelectorAll('.cn-msj.zorro').forEach(m => m.classList.add('anterior'));
    chat.insertAdjacentHTML('beforeend', V.preguntaZorro());
    const burbuja = chat.lastElementChild.querySelector('.cn-burbuja');
    burbuja.scrollIntoView({ behavior: 'smooth', block: 'end' });
    await espera(900);
    if (!activo) return;
    burbuja.textContent = texto;
    burbuja.classList.add('lista');
  }

  function ayuda(t: string): void { $('cn-ayuda').textContent = t; }

  async function preguntar(): Promise<void> {
    const total = D.PREGUNTAS.length;
    $('cn-paso').textContent = `${paso + 1} de ${total}`;
    $('cn-avance').style.setProperty('--p', String(paso / total));
    const mic = $<HTMLButtonElement>('cn-mic');
    mic.disabled = true; ayuda('');
    await decir(D.PREGUNTAS[paso].texto);
    if (!activo) return;
    mic.disabled = false;
    ayuda('Toca el micrófono para responder');
  }

  async function alTocarMic(): Promise<void> {
    const mic = $<HTMLButtonElement>('cn-mic');
    if (!grabadora) {
      grabadora = new Grabadora();
      try {
        await grabadora.iniciar(n => mic.style.setProperty('--nivel', n.toFixed(2)));
      } catch (e) {
        grabadora = null;
        ayuda('No pude usar tu micrófono. Dale permiso en el navegador y vuelve a tocar el botón.');
        return;
      }
      mic.setAttribute('aria-pressed', 'true'); mic.setAttribute('aria-label', 'Terminar respuesta');
      const tic = () => {
        const s = Math.floor(grabadora.segundos);
        ayuda(`Te escucho… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · toca para terminar`);
        if (s >= MAX_SEGUNDOS) alTocarMic();
      };
      tic(); reloj = setInterval(tic, 500);
      return;
    }
    /* Terminar la respuesta */
    clearInterval(reloj);
    const g = grabadora; grabadora = null;
    mic.setAttribute('aria-pressed', 'false'); mic.setAttribute('aria-label', 'Responder con tu voz'); mic.style.setProperty('--nivel', '0');
    const { blob, segundos } = await g.detener();
    if (segundos < 1 || blob.size < 1000) { ayuda('No alcancé a escucharte. Toca el micrófono e inténtalo de nuevo.'); return; }
    respuestas.push({ pregunta: D.PREGUNTAS[paso].id, audio: blob });
    $('cn-chat').insertAdjacentHTML('beforeend', V.respuestaVoz(segundos));
    paso++;
    if (paso < D.PREGUNTAS.length) { await espera(500); if (activo) preguntar(); }
    else terminar();
  }

  async function terminar(): Promise<void> {
    $('cn-avance').style.setProperty('--p', '1');
    $('cn-paso').textContent = 'Listo';
    const nombre = Zip.Auth.actual()?.nombre || '';
    $('cn-dock').innerHTML = '';
    await decir(`Gracias${nombre ? ', ' + nombre : ''}. Con esto armo tu camino.`);
    enviar();
  }

  async function enviar(): Promise<void> {
    const dock = $('cn-dock');
    dock.innerHTML = V.cargando();
    try {
      await D.analizar(respuestas);
      if (!activo) return;
      $('cn').classList.add('sale');
      await espera(450);
      Zip.Vista.Pantallas.avisar('Tu camino está listo.');
      location.hash = 'experiencias';
    } catch (e) {
      if (!activo) return;
      console.warn('Zip: no se pudo analizar el diagnóstico', e);
      dock.innerHTML = V.error('No pude armar tu camino en este momento. Revisa tu conexión e inténtalo otra vez.');
      $('cn-reintentar').onclick = enviar;
    }
  }

  /** Pinta la pantalla dentro de `app` y arranca las preguntas. */
  export function iniciar(app: HTMLElement): void {
    salir();
    activo = true; paso = 0; respuestas = [];
    app.innerHTML = V.pantalla(D.PREGUNTAS.length);
    $('cn-mic').onclick = () => { alTocarMic(); };
    const nombre = Zip.Auth.actual()?.nombre;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      ayuda('Tu navegador no permite grabar audio. Prueba con Chrome, Edge o Firefox.');
      return;
    }
    (async () => {
      await decir(`Hola${nombre ? ', ' + nombre : ''}. Antes de empezar quiero conocerte. Te haré ${D.PREGUNTAS.length} preguntas cortas: respóndelas con tu voz, como si platicáramos.`);
      await espera(700);
      if (activo) preguntar();
    })();
  }

  /** Al cambiar de pantalla: suelta el micrófono y detiene el flujo. */
  export function salir(): void {
    activo = false;
    clearInterval(reloj);
    if (grabadora) { grabadora.liberar(); grabadora = null; }
  }
}
