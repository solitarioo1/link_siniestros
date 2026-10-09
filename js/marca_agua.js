// Equivalente web de watermark_overlay.dart: logo + bloque de texto en la
// esquina inferior derecha, tamaño y posición relativos al canvas (nunca
// pixeles absolutos - reglas de arquitectura de CLAUDE.md #2/#3). Mismo
// contenido que la app: coordenadas (6 decimales) + distrito/provincia/
// departamento, sector estadístico, fecha/hora. Sin nota (la web no pide
// nota por foto, a propósito).
const logoListo = new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('No se pudo cargar el logo'));
  img.src = 'assets/images/logo_positiva.png';
});

function formatoFechaHora(fecha) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

function lineaUbicacion(geo, lat, lon) {
  const coordenadas = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  const partes = [geo?.distrito, geo?.provincia, geo?.departamento].filter(Boolean);
  return partes.length ? `${coordenadas}\n${partes.join(', ')}` : coordenadas;
}

export async function quemarMarcaDeAgua(canvas, { lat, lon, geo, fechaHora }) {
  const ctx = canvas.getContext('2d');
  const ancho = canvas.width;
  const alto = canvas.height;

  const lineas = [{ texto: lineaUbicacion(geo, lat, lon), negrita: true, escala: 1 }];
  if (geo?.sectorEstadistico) {
    lineas.push({ texto: `Sector: ${geo.sectorEstadistico}`, escala: 0.82 });
  }
  lineas.push({ texto: formatoFechaHora(fechaHora), escala: 0.82 });

  const tamanoBase = Math.round(Math.min(ancho, alto) * 0.032);
  const relleno = tamanoBase * 0.9;
  const tamano = (l) => Math.round(tamanoBase * (l.escala || 1));
  const fuente = (l) => `${l.negrita ? '700' : '400'} ${tamano(l)}px sans-serif`;

  ctx.textBaseline = 'top';
  // Cada linea puede traer un "\n" (coordenadas + distrito/provincia/depto en
  // renglones separados, igual que en la app) - se desarma antes de medir.
  const renglones = [];
  for (const l of lineas) {
    for (const texto of l.texto.split('\n')) renglones.push({ ...l, texto });
  }

  const alturaRenglon = (l) => tamano(l) * 1.35;
  const anchoTexto = Math.max(
    ...renglones.map((l) => {
      ctx.font = fuente(l);
      return ctx.measureText(l.texto).width;
    }),
  );

  let logo = null;
  try {
    logo = await logoListo;
  } catch (e) {
    console.error('Logo no disponible para el watermark', e);
  }
  const altoTextoBloque = renglones.reduce((s, l) => s + alturaRenglon(l), 0) - 4;
  const altoCaja = Math.max(altoTextoBloque, logo ? tamanoBase * 2.6 : 0) + relleno * 2;
  const altoLogo = logo ? altoCaja - relleno * 2 : 0;
  const anchoLogo = logo ? (altoLogo * logo.width) / logo.height : 0;
  const espacioLogo = logo ? anchoLogo + relleno : 0;

  const margenDerecho = ancho * 0.06;
  const margenInferior = alto * 0.03;
  const anchoCaja = espacioLogo + anchoTexto + relleno * 2;
  const x = ancho - anchoCaja - margenDerecho;
  const y = alto - altoCaja - margenInferior;

  ctx.fillStyle = 'rgba(15,15,40,.72)';
  ctx.fillRect(x, y, anchoCaja, altoCaja);

  if (logo) {
    ctx.drawImage(logo, x + relleno, y + (altoCaja - altoLogo) / 2, anchoLogo, altoLogo);
  }

  let cursorY = y + relleno;
  renglones.forEach((l) => {
    ctx.font = fuente(l);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.fillText(l.texto, x + anchoCaja - relleno, cursorY);
    cursorY += alturaRenglon(l);
  });
  ctx.textAlign = 'left';
}
