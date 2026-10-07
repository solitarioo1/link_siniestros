# Instrucciones para Claude Code — Fotos Georreferenciadas (versión web)

Proyecto hermano de `APP FOTO` (la app Android en Play Store): la misma
evaluación de siniestro, pero accesible por **link web** en vez de APK
instalada — para cuando no se puede/quiere instalar la app. Leer también
`CLAUDE.md` de `APP FOTO` (comparten el Worker de envío de correo y la
paleta de marca).

## Estado

Primera versión funcional: flujo completo (consentimiento → grilla de 9
casillas → captura con watermark → confirmar → envío por correo) construido
y con la lógica de point-in-polygon validada por script contra los 9,169
polígonos originales (0 errores). **Falta probar en un celular real** (cámara
+ GPS + envío) — este entorno no tiene navegador para probarlo de punta a
punta, ver "Pendiente" abajo.

## Por qué existe un proyecto aparte (no es parte del APK)

Esto se **sube a un servidor propio** (no Cloudflare, no Firebase) como
archivos estáticos (`index.html` + `css/` + `js/`), pensado para vivir en el
dominio **`evaluar-siniestro.intismart.com`**. Por eso todo el código
vive en esta carpeta separada de `APP FOTO/lib/` — nada de Flutter, nada de
Dart, es HTML/CSS/JS plano sin build step (sin bundler, sin framework) para
que "subir la carpeta al servidor" sea literal.

## Diferencias deliberadas con la app Android

Decisiones ya tomadas con el usuario — no "arreglar" sin volver a preguntar:

1. **Sin "Foto suelta" ni "Galería".** La web solo hace una cosa: evaluar un
   siniestro. El botón de inicio dice **"Evaluar Siniestro"** (en la app es
   "Reportar Siniestro" — nombres distintos a propósito, misma función).
2. **Sin el diálogo de DNI/Evento climático/Nota antes de enviar.** La app
   los pide; la web los quitó a propósito — antes de enviar solo hay un
   confirm "¿Estás seguro que deseas enviar?" (Sí/No). El correo de esta vía
   simplemente no trae esas filas (el Worker ya las omite solas si llegan
   vacías — no hubo que tocar `cloudflare/` del lado del envío por esto).
3. **Sin nota por foto tampoco** (la app ya no la tenía en
   `SiniestroCapturaScreen`; el prototipo HTML viejo sí tenía un campo de
   nota por foto — se quitó al pasar a esta versión estructurada, mismo
   criterio que la app: "toma la foto y dale enviar", sin fricción).
4. **El cruce coordenada→departamento/provincia/distrito/sector corre en el
   servidor (Worker `cloudflare-geo/`), no en el navegador.** La app lo hace
   100% offline (GeoPackage embebido). En la web se decidió explícitamente
   con el usuario que corra en Cloudflare en vez de bajar las capas al
   celular — ver `cloudflare-geo/README.md` para el por qué y los números
   (el `.gpkg` pesa 90MB, muy pesado para un navegador o para cualquier
   plan gratis de Worker sin simplificarlo primero).
5. **Consentimiento en 3 partes** (ubicación, fotos, cámara) en vez del
   checkbox único que tenía el prototipo viejo — pedido explícito del
   usuario, cada autorización por separado.

## Estructura

```
APP FOTO WEB/
├── index.html          # las 5 pantallas (secciones <section id="sN">)
├── css/estilos.css      # paleta de marca igual que la app (ver app_colors.dart)
├── js/
│   ├── config.js        # URLs de los 2 Workers, categorias de la grilla
│   ├── gps.js            # geolocalizacion del navegador
│   ├── camara.js          # getUserMedia (trasera/frontal segun categoria)
│   ├── marca_agua.js       # quema el watermark en un canvas (mismo contenido que watermark_overlay.dart)
│   ├── geo.js              # llama a cloudflare-geo (lat/lon -> departamento/provincia/distrito/sector)
│   ├── envio.js            # llama al Worker de envio de correo (el mismo que usa la app)
│   └── app.js              # orquestador: estado de las 9 casillas, flujo de pantallas
└── cloudflare-geo/        # Worker NUEVO, solo para esta web (ver su propio README.md)
    ├── src/index.js
    ├── data/*.json         # capas simplificadas (ver README de esa carpeta)
    └── scripts/            # como se generaron/validaron esas capas
```

No hay carpeta `services/`/`screens/` separada como en Flutter porque es un
proyecto chico de un solo archivo HTML con pantallas como `<section>` — pero
la separación por responsabilidad sigue: `js/app.js` es la única capa que
toca el DOM, todo lo demás (`gps.js`, `camara.js`, `marca_agua.js`, `geo.js`,
`envio.js`) es lógica pura sin referencias a `document`/`getElementById`.

## Los dos Workers de Cloudflare involucrados

- **`APP FOTO/cloudflare/`** (`fotos-gps-enviar-correo`) — **compartido**
  con la app Android. Recibe el lote de fotos + metadata y manda el correo.
  Se le agregó manejo de `OPTIONS`/CORS específicamente para que esta web lo
  pueda llamar desde el navegador (la app Flutter no lo necesitaba, no hay
  navegador de por medio) — ver CLAUDE.md de `APP FOTO`, no quitar esos
  headers si se vuelve a tocar ese Worker.
- **`cloudflare-geo/`** (`fotos-gps-geo-lookup`) — **nuevo, solo de esta
  web**. Point-in-polygon contra capas simplificadas del mismo `.gpkg` que
  usa la app. Sin secretos (es solo lectura de división administrativa
  pública). Ver su propio README.md para el proceso de simplificación y la
  validación de precisión.

## Pendiente / siguiente paso

- **Probar en un celular real**: cámara (trasera y frontal para
  "Agricultor"), permisos de ubicación, y el envío completo. Este entorno no
  tiene navegador para hacer esa prueba de punta a punta — se revisó la
  lógica con Node y se validó el point-in-polygon contra los 9,169 polígonos
  originales, pero getUserMedia/geolocation en un navegador real es la
  prueba que falta.
- **Subir la carpeta al servidor propio** y apuntar el dominio
  `evaluar-siniestro.intismart.com`.
- **Texto legal de consentimiento**: el de `index.html` ahora mismo dice
  "Texto de prueba — no es el texto legal definitivo", igual que tenía el
  prototipo viejo.
- **Logo de marca en el watermark**: la app lo tiene (`logo_positiva.png`),
  esta primera versión web no — se dejó solo el texto para no asumir de más;
  avisar si se quiere agregar.
