/* =====================================================================
   Zip · VIEW · Conocerte (diagnóstico por voz)
   ---------------------------------------------------------------------
   Pantalla en blanco, minimalista: el zorro pregunta en un chat y la
   persona responde con el micrófono. Aquí solo se arma el HTML; el flujo
   está en controller/conocerte.ts y las preguntas en model/negocio.ts.
   ===================================================================== */
namespace Zip.Vista.Conocerte {
  const ic = (id: string): string => `<svg class="z-ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  export function pantalla(total: number): string {
    return `<section class="cn" id="cn" aria-label="Conozcámonos">
      <div class="cn-cab"><div class="cn-barra" aria-hidden="true"><span id="cn-avance"></span></div><p class="cn-paso mono" id="cn-paso">0 de ${total}</p></div>
      <ol class="cn-chat" id="cn-chat" aria-live="polite"></ol>
      <div class="cn-dock" id="cn-dock">
        <button type="button" class="cn-mic" id="cn-mic" aria-pressed="false" disabled aria-label="Responder con tu voz">${ic('mic')}<svg class="cn-alto" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg></button>
        <p class="cn-ayuda" id="cn-ayuda" role="status"></p>
      </div>
    </section>`;
  }

  /** Burbuja del zorro; empieza con «escribiendo…» y devuelve la función que pone el texto. */
  export function preguntaZorro(): string {
    return `<li class="cn-msj zorro"><span class="cn-ava">${caraHTML()}</span><p class="cn-burbuja"><span class="escribiendo" aria-label="Escribiendo"><i></i><i></i><i></i></span></p></li>`;
  }

  export function respuestaVoz(segundos: number): string {
    const s = Math.max(1, Math.round(segundos));
    return `<li class="cn-msj yo"><p class="cn-burbuja">${ic('mic')} Respuesta de voz · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</p></li>`;
  }

  export function cargando(): string {
    return `<div class="cn-cargando"><span class="cn-ava grande">${caraHTML()}</span><p>Armando tu camino<span class="escribiendo" aria-hidden="true"><i></i><i></i><i></i></span></p></div>`;
  }

  export function error(texto: string): string {
    return `<div class="cn-error"><p>${Zip.Modelo.escapar(texto)}</p>
      <div class="z-acciones"><button type="button" class="btn btn-principal btn-chico" id="cn-reintentar">Reintentar</button><a class="btn btn-sec btn-chico" href="#experiencias">Ver experiencias sin diagnóstico</a></div></div>`;
  }
}
