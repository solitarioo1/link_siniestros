// Equivalente web de email_service.dart (enviarReporteSiniestro): un solo
// POST multipart con todas las fotos del lote al mismo Worker que ya usa la
// app (ver APP FOTO/cloudflare/). Sin DNI ni Evento climático ni nota: en la
// web se quitó ese formulario a propósito, ver CLAUDE.md de esta carpeta.
import { ENVIO_URL, APP_KEY } from './config.js';

// Si una categoria se repite en el lote (ej. 4 fotos de Daños), se numeran
// "Daños 1".."Daños 4" para distinguirlas - mismo criterio que
// etiquetasDeFotos() en reporte_siniestro.dart (app Flutter). Debe viajar
// en el mismo orden que las fotos.
export function etiquetasDeFotos(fotos) {
  const total = {};
  fotos.forEach((f) => { total[f.grupo] = (total[f.grupo] || 0) + 1; });
  const contador = {};
  return fotos.map((f) => {
    if (total[f.grupo] <= 1) return f.grupo;
    contador[f.grupo] = (contador[f.grupo] || 0) + 1;
    return `${f.grupo} ${contador[f.grupo]}`;
  });
}

function formatoFechaHoraPeru(fecha) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} - ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

export async function enviarReporteSiniestro(fotos) {
  const etiquetas = etiquetasDeFotos(fotos);
  const primerGeo = fotos.find((f) => f.geo)?.geo;

  const form = new FormData();
  form.append('id', Date.now().toString());
  form.append('tipo', 'siniestro');
  form.append('fechaHora', formatoFechaHoraPeru(new Date()));
  form.append('coordenadas', fotos.map((f) => `${f.lat},${f.lon}`).join('|'));
  form.append('categorias', etiquetas.join(','));
  form.append('departamento', primerGeo?.departamento || '');
  form.append('provincia', primerGeo?.provincia || '');
  form.append('distrito', primerGeo?.distrito || '');
  form.append('sectorEstadistico', primerGeo?.sectorEstadistico || '');
  fotos.forEach((f, i) => form.append('foto', f.blob, `${etiquetas[i]}.jpg`));

  const respuesta = await fetch(ENVIO_URL, {
    method: 'POST',
    headers: { 'X-App-Key': APP_KEY },
    body: form,
  });
  if (!respuesta.ok) throw new Error(`Envío fallido (HTTP ${respuesta.status})`);
}
