// Prueba standalone (fuera de Workers) de la logica de point-in-polygon de
// src/index.js, contra la coordenada conocida que usa el test de la app
// Flutter (ver APP FOTO/test/geo_lookup_service_test.dart).
import { readFileSync } from "node:fs";

const distrito = JSON.parse(readFileSync(new URL("../data/distrito.json", import.meta.url)));
const sectorEstadistico = JSON.parse(readFileSync(new URL("../data/sector_estadistico.json", import.meta.url)));

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
  for (const poligono of poligonos) for (const anillo of poligono) visitarAnillo(anillo);
  return [minX, minY, maxX, maxY];
}

function indexar(fc) {
  return fc.features.map((feature) => {
    const [minX, minY, maxX, maxY] = calcularBbox(feature.geometry);
    return { feature, minX, minY, maxX, maxY };
  });
}

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
  for (let i = 1; i < anillos.length; i++) if (puntoEnAnillo(x, y, anillos[i])) return false;
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

const indiceDistrito = indexar(distrito);
const indiceSector = indexar(sectorEstadistico);

function buscar(lat, lon) {
  const d = buscarEnCapa(indiceDistrito, lon, lat);
  const s = buscarEnCapa(indiceSector, lon, lat);
  return {
    departamento: d?.nombdep ?? null,
    provincia: d?.nombprov ?? null,
    distrito: d?.nombdist ?? null,
    sectorEstadistico: s?.nom_se ?? null,
  };
}

const huaraz = buscar(-9.527, -77.532);
console.log("Huaraz ->", huaraz);
const esperado = { departamento: "ANCASH", provincia: "HUARAZ", distrito: "HUARAZ" };
const ok =
  huaraz.departamento === esperado.departamento &&
  huaraz.provincia === esperado.provincia &&
  huaraz.distrito === esperado.distrito &&
  huaraz.sectorEstadistico != null;
console.log(ok ? "OK: coincide con el test de la app Flutter" : "FALLO: no coincide");

const oceano = buscar(-10.0, -85.0);
console.log("Oceano ->", oceano);
console.log(
  oceano.departamento === null && oceano.distrito === null
    ? "OK: fuera de Peru no resuelve nada"
    : "FALLO",
);

process.exitCode = ok ? 0 : 1;
