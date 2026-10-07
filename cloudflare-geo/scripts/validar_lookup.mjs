// Valida la logica de point-in-polygon de src/index.js contra puntos
// representativos de los 9,169 poligonos originales (ver
// scripts/fixture_validacion.json, generado desde el .gpkg con Python).
// Uso: node scripts/validar_lookup.mjs
import { readFileSync } from "node:fs";

const distrito = JSON.parse(readFileSync(new URL("../data/distrito.json", import.meta.url)));
const sectorEstadistico = JSON.parse(readFileSync(new URL("../data/sector_estadistico.json", import.meta.url)));
const fixture = JSON.parse(readFileSync(new URL("./fixture_validacion.json", import.meta.url)));

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

function normaliza(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toUpperCase();
  return s === "NAN" || s === "" ? null : s;
}

let sinMatch = 0, distinto = 0;
const inicioD = Date.now();
for (const p of fixture.distrito) {
  const props = buscarEnCapa(indiceDistrito, p.lon, p.lat);
  if (!props) { sinMatch++; continue; }
  if (normaliza(props.nombdist) !== normaliza(p.nombdist)) distinto++;
}
console.log(`distrito: total=${fixture.distrito.length} sin_match=${sinMatch} distinto=${distinto} (${Date.now() - inicioD}ms)`);

let sinMatchS = 0, distintoS = 0;
const inicioS = Date.now();
for (const p of fixture.sector) {
  const props = buscarEnCapa(indiceSector, p.lon, p.lat);
  if (!props) { sinMatchS++; continue; }
  if (normaliza(props.nom_se) !== normaliza(p.nom_se)) distintoS++;
}
console.log(`sector: total=${fixture.sector.length} sin_match=${sinMatchS} distinto=${distintoS} (${Date.now() - inicioS}ms)`);

process.exitCode = distinto === 0 && distintoS === 0 ? 0 : 1;
