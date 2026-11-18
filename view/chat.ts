/* =====================================================================
   Zip · VIEW · Chat del asesor
   ---------------------------------------------------------------------
   Pinta mensajes y avisa al controlador de lo que hace la persona.
   No decide qué responder: eso es del MODEL (model/negocio.ts).
   ===================================================================== */
namespace Zip.Vista {

  export interface IdsChat { lista: string; rapidas: string; form: string; input: string }

  /** Una ventana de chat (la de la burbuja flotante u otra con los mismos ids). */
  export class VentanaChat {
    readonly lista: HTMLElement;
    readonly rapidas: HTMLElement;
    readonly form: HTMLFormElement;
    readonly input: HTMLInputElement;

    constructor(ids: IdsChat) {
      this.lista = document.getElementById(ids.lista);
      this.rapidas = document.getElementById(ids.rapidas);
      this.form = document.getElementById(ids.form) as HTMLFormElement;
      this.input = document.getElementById(ids.input) as HTMLInputElement;
    }
    get existe(): boolean { return Boolean(this.lista && this.rapidas && this.form && this.input); }

    agregar(html: string, quien: 'yo' | 'bot'): HTMLLIElement {
      const li = document.createElement('li');
      li.className = `msj nuevo ${quien}`;
      li.innerHTML = html;
      this.lista.append(li);
      this.lista.scrollTop = this.lista.scrollHeight;
      return li;
    }

    /** Muestra "escribiendo…" y devuelve una función para poner la respuesta en su lugar. */
    escribiendo(): (html: string) => void {
      const li = this.agregar('<span class="escribiendo" aria-label="Escribiendo"><i></i><i></i><i></i></span>', 'bot');
      li.classList.add('pensando');
      return html => {
        li.classList.remove('pensando');
        li.innerHTML = html;
        this.lista.scrollTop = this.lista.scrollHeight;
      };
    }

    alElegirRapida(cb: (clave: string) => void): void {
      this.rapidas.addEventListener('click', e => {
        const b = (e.target as Element).closest<HTMLButtonElement>('button[data-q]');
        if (b && b.dataset.q) cb(b.dataset.q);
      });
    }

    alEnviar(cb: (texto: string) => void): void {
      this.form.addEventListener('submit', e => {
        e.preventDefault();
        const v = this.input.value.trim();
        if (!v) return;
        this.input.value = '';
        cb(v);
      });
    }

    alSeguirEnlaceInterno(cb: () => void): void {
      this.lista.addEventListener('click', e => { if ((e.target as Element).closest('a[href^="#"]')) cb(); });
    }
  }

  /** Burbuja flotante (FAB) que se transforma en el panel del chat: "container transform" de M3. */
  export class BurbujaFlotante {
    private readonly raiz = document.getElementById('zipbot');
    private readonly panel = document.getElementById('zb-panel');
    private readonly boton = document.getElementById('zb-boton');
    private readonly saludo = document.getElementById('zb-saludo');

    constructor(private readonly ventana: VentanaChat) {
      this.boton.addEventListener('click', () => (this.abierta ? (this.cerrar(), this.boton.focus()) : this.abrir()));
      document.getElementById('zb-cerrar')?.addEventListener('click', () => { this.cerrar(); this.boton.focus(); });
      document.getElementById('zb-saludo-x')?.addEventListener('click', () => this.saludo.classList.remove('visible'));
      this.saludo.querySelector('.zb-saludo-txt')?.addEventListener('click', () => this.abrir());
      addEventListener('keydown', e => { if (e.key === 'Escape' && this.abierta) { this.cerrar(); this.boton.focus(); } });
    }

    get abierta(): boolean { return this.raiz.classList.contains('abierto'); }

    abrir(): void {
      this.raiz.classList.add('abierto');
      this.raiz.classList.remove('nuevo');
      this.boton.setAttribute('aria-expanded', 'true');
      this.panel.removeAttribute('inert');
      this.saludo.classList.remove('visible');
      setTimeout(() => this.ventana.input.focus({ preventScroll: true }), QUIETO ? 0 : M3.duracion.media2);
    }

    cerrar(): void {
      this.raiz.classList.remove('abierto');
      this.boton.setAttribute('aria-expanded', 'false');
      this.panel.setAttribute('inert', '');
    }

    /** Entrada de la burbuja y un saludo, una sola vez por sesión. */
    presentarse(): void {
      if (QUIETO) { this.raiz.classList.add('listo'); return; }
      setTimeout(() => this.raiz.classList.add('listo'), 1200);
      setTimeout(() => {
        if (this.abierta || Zip.Memoria.leer('zb-saludo')) return;
        this.saludo.classList.add('visible');
        Zip.Memoria.escribir('zb-saludo', 1);
      }, 4200);
    }
  }
}
