# fotos-gps-geo-lookup

Worker de Cloudflare que resuelve `lat/lon` → `departamento/provincia/distrito/sector_estadistico`
para la versión web de Fotos Georreferenciadas. Hace lo mismo que
`geo_lookup_service.dart` en la app Flutter, pero corriendo en el servidor
(Cloudflare) en vez de offline en el celular — ver CLAUDE.md de `APP FOTO`,
sección de arquitectura, y la decisión tomada con el usuario: el cruce de
capas se calcula en el Worker, no en el navegador.

## Por qué no se usa el `.gpkg` tal cual

El GeoPackage fuente (`APP FOTO/assets/geodata/geodata.gpkg`) pesa **90 MB**
(1,890 distritos + 7,279 sectores estadísticos, sin simplificar) — muy pesado
para subirlo a un Worker (límite de 3 MB comprimido en el plan gratis) o para
descargarlo a un celular. Las capas en `data/` son una versión **simplificada**
de las mismas capas (mismo origen, menos vértices por polígono), generada así:

1. `scripts/exportar_full.py` — lee las capas del `.gpkg` con geopandas y las
   exporta a GeoJSON de precisión completa, quedándose solo con las columnas
   que realmente se usan (`nombdep/nombprov/nombdist` para distrito, `nom_se`
   para sector) — el resto de columnas del `.gpkg` no se necesita acá.
2. `mapshaper` (simplificación topológica, no simplifica cada polígono por
   separado como `shapely.simplify` — eso dejaba micro-huecos entre distritos
   vecinos):
   ```
   npx mapshaper data/distrito_full.geojson -simplify 8% keep-shapes -clean -o precision=0.0001 data/distrito.json
   npx mapshaper data/sector_estadistico_full.geojson -simplify 6% keep-shapes -clean -o precision=0.0001 data/sector_estadistico.json
   ```
3. `scripts/validar_lookup.mjs` — valida el resultado contra un punto
   representativo de **cada uno** de los 9,169 polígonos originales (fixture
   generado con Python/geopandas, no incluido en el repo por tamaño — se
   regenera, ver abajo). Con los porcentajes de arriba: **0 errores** en los
   1,890 distritos y **0 errores** en los 7,279 sectores (los ~105 sectores
   sin `NOM_SE` no son un bug de la simplificación — esos polígonos ya vienen
   sin ese atributo en el `.gpkg` original; la app Flutter tiene el mismo
   hueco de datos ahí).

Tamaño final: `distrito.json` ~3.2MB (824KB comprimido), `sector_estadistico.json`
~5.5MB (1.2MB comprimido). Combinado, el Worker sube ~2MB comprimidos — dentro
del límite gratis de 3MB.

### Para regenerar (si cambia el `.gpkg` fuente)

```
cd scripts
python3 exportar_full.py                     # -> data/*_full.geojson
cd ..
npx mapshaper data/distrito_full.geojson -simplify 8% keep-shapes -clean -o precision=0.0001 data/distrito.json
npx mapshaper data/sector_estadistico_full.geojson -simplify 6% keep-shapes -clean -o precision=0.0001 data/sector_estadistico.json
rm data/*_full.geojson

# Validar (requiere regenerar primero el fixture con Python + geopandas,
# ver el bloque de "puntos representativos" en el historial/README — exporta
# {lat, lon, nombdep, nombprov, nombdist} por distrito y {lat, lon, nom_se}
# por sector a scripts/fixture_validacion.json, con NaN convertidos a null)
node scripts/test_lookup.mjs
node scripts/validar_lookup.mjs
```

## Endpoint

`GET /?lat=<lat>&lon=<lon>` → `200` con
`{"departamento":string|null,"provincia":string|null,"distrito":string|null,"sectorEstadistico":string|null}`
(todo `null` si el punto cae fuera de las capas, p.ej. en el océano o fuera
del Perú). `400` si falta o es inválido `lat`/`lon`.

Sin secretos ni autenticación — es solo lectura de datos públicos
(división administrativa), no hay nada que proteger. CORS abierto
(`Access-Control-Allow-Origin: *`) porque lo llama directamente el navegador
desde el dominio de la web pública.

## Desplegar

```
npm install
npx wrangler login
npm run deploy
```

Desplegado en: `https://fotos-gps-geo-lookup.intismartsac.workers.dev`
