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

const ICONO_PANORAMICA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18l6-8 4 5 3-4 5 7H3z"/><circle cx="17" cy="6" r="2"/></svg>';
const ICONO_CULTIVO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M12 10C12 6 9 4 5 4c0 4 2 7 7 7"/><path d="M12 10c0-4 3-6 7-6c0 4-2 7-7 7"/></svg>';
const ICONO_DANOS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/></svg>';
const ICONO_AGRICULTOR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 21c0-4.2 3.1-7.5 7-7.5s7 3.3 7 7.5"/></svg>';
const ICONO_LIBRE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3"/></svg>';

// Mismo orden/categorias que SiniestroScreen en la app Flutter (ver
// CLAUDE.md, "Reporte de Siniestro") - la grilla de 9 casillas. `icono` es
// solo dato (string SVG), no toca el DOM - lo pinta app.js.
export const CATEGORIAS = [
  { grupo: 'Panorámica', frontal: false, icono: ICONO_PANORAMICA },
  { grupo: 'Cultivo', frontal: false, icono: ICONO_CULTIVO },
  { grupo: 'Cultivo', frontal: false, icono: ICONO_CULTIVO },
  { grupo: 'Daños', frontal: false, icono: ICONO_DANOS },
  { grupo: 'Daños', frontal: false, icono: ICONO_DANOS },
  { grupo: 'Daños', frontal: false, icono: ICONO_DANOS },
  { grupo: 'Daños', frontal: false, icono: ICONO_DANOS },
  { grupo: 'Agricultor', frontal: true, icono: ICONO_AGRICULTOR },
  { grupo: 'Foto adicional', frontal: false, icono: ICONO_LIBRE },
];
