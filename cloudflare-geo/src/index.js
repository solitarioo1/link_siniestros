// Point-in-polygon offline para la version web: dado lat/lon, resuelve
// departamento/provincia/distrito/sector_estadistico contra las mismas
// capas que usa la app (ver ../README.md para el origen y la simplificacion
// de data/distrito.json y data/sector_estadistico.json).
import distrito from "../data/distrito.json";
import sectorEstadistico from "../data/sector_estadistico.json";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Bounding box de cada feature, precalculado una sola vez al arrancar el
// isolate (no en cada request) - mismo rol que el indice R-tree del lado
// Dart: descarta la mayoria de poligonos con una comparacion numerica barata
// antes de probar la contencion exacta anillo por anillo.
function indexar(featureCollection) {
  return featureCollection.features.map((feature) => {
    const [minX, minY, maxX, maxY] = calcularBbox(feature.geometry);
    return { feature, minX, minY, maxX, maxY };
  });
}

function calcularBbox(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visitarAnillo = (anillo) => {
    for (const [x, y] of anillo) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };
  const poligonos = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  for (const poligono of poligonos) {
    for (const anillo of poligono) visitarAnillo(anillo);
  }
  return [minX, minY, maxX, maxY];
}

// Ray casting estandar, con soporte de huecos (anillos interiores) y
// MultiPolygon. Equivalente a geometria.covers(punto) en el lado Dart.
function puntoEnAnillo(x, y, anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    const cruza = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function puntoEnPoligono(x, y, anillos) {
  if (!puntoEnAnillo(x, y, anillos[0])) return false;
  for (let i = 1; i < anillos.length; i++) {
    if (puntoEnAnillo(x, y, anillos[i])) return false; // dentro de un hueco
  }
  return true;
}

function cubre(geometry, x, y) {
  const poligonos = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return poligonos.some((anillos) => puntoEnPoligono(x, y, anillos));
}

function buscarEnCapa(indice, lon, lat) {
  for (const { feature, minX, minY, maxX, maxY } of indice) {
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
    if (cubre(feature.geometry, lon, lat)) return feature.properties;
  }
  return null;
}

// indexar() corre una sola vez por isolate (scope de modulo), se reusa en
// cada request mientras el isolate siga "caliente".
const indiceDistrito = indexar(distrito);
const indiceSector = indexar(sectorEstadistico);

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== "GET") {
      return new Response("Metodo no permitido", { status: 405, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(JSON.stringify({ error: "Faltan o son invalidos 'lat'/'lon'" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const distritoProps = buscarEnCapa(indiceDistrito, lon, lat);
    const sectorProps = buscarEnCapa(indiceSector, lon, lat);

    const resultado = {
      departamento: distritoProps?.nombdep ?? null,
      provincia: distritoProps?.nombprov ?? null,
      distrito: distritoProps?.nombdist ?? null,
      sectorEstadistico: sectorProps?.nom_se ?? null,
    };

    return new Response(JSON.stringify(resultado), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
