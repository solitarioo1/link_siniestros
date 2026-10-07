// Llama al Worker de lookup (ver ../cloudflare-geo/) para resolver
// departamento/provincia/distrito/sector a partir de lat/lon - el cruce con
// las capas corre en Cloudflare, no en el navegador (decisión tomada con el
// usuario: en zonas rurales, el envío final ya depende de señal, así que no
// se gana nada offline-first aquí, y evita bajar varios MB de capas al
// celular en cada visita al link).
import { GEO_LOOKUP_URL } from './config.js';

export async function buscarUbicacion(lat, lon) {
  const url = `${GEO_LOOKUP_URL}/?lat=${lat}&lon=${lon}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`Geo lookup fallido (HTTP ${respuesta.status})`);
  return respuesta.json();
}
