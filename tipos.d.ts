/* Tipos globales del navegador que usa Zip (librerías externas y APIs opcionales). */
interface Window {
  /** ts-fsrs (jsDelivr) expone window.FSRS; un fsrs.js propio del sitio puede exponer window.ZipFSRS. */
  FSRS?: any;
  ZipFSRS?: any;
  /** API pública del asesor (la crea controller/app.ts). */
  ZipBot?: unknown;
  /** Dictado por voz (Web Speech API, no estándar). */
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}
