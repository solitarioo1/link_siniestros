// Configuracion del proyecto. Sin secretos reales: la API key de Resend
// vive solo en el Worker de envio (ver APP FOTO/cloudflare/), nunca aqui.
// X-App-Key solo frena abuso casual de la URL - cualquiera que abra el
// codigo fuente de esta pagina puede leerla (a diferencia de un APK
// compilado). Si eso se vuelve un problema real, mover el envio detras de
// un servidor propio en vez de llamar a Cloudflare directo desde el
// navegador (ver conversacion con el usuario sobre esta decision).
export const ENVIO_URL = 'https://fotos-gps-enviar-correo.intismartsac.workers.dev';
export const GEO_LOOKUP_URL = 'https://fotos-gps-geo-lookup.intismartsac.workers.dev';
export const APP_KEY = 'codigoS2026';

export const MIN_FOTOS = 3;
export const LIMITE_PRECISION_M = 50;
export const LECTURA_FRESCA_MS = 10000;

// Mismo orden/categorias que SiniestroScreen en la app Flutter (ver
// CLAUDE.md, "Reporte de Siniestro") - la grilla de 9 casillas.
export const CATEGORIAS = [
  { grupo: 'Panorámica', frontal: false },
  { grupo: 'Cultivo', frontal: false },
  { grupo: 'Cultivo', frontal: false },
  { grupo: 'Daños', frontal: false },
  { grupo: 'Daños', frontal: false },
  { grupo: 'Daños', frontal: false },
  { grupo: 'Daños', frontal: false },
  { grupo: 'Agricultor', frontal: true },
  { grupo: 'Foto adicional', frontal: false },
];
