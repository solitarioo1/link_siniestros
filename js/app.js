import { CATEGORIAS, MIN_FOTOS, LIMITE_PRECISION_M, LECTURA_FRESCA_MS } from './config.js';
import { observarPosicion, posicionFresca } from './gps.js';
import { abrirCamara, cerrarCamara, congelarCuadro } from './camara.js';
import { quemarMarcaDeAgua } from './marca_agua.js';
import { buscarUbicacion } from './geo.js';
import { enviarReporteSiniestro } from './envio.js';

const $ = (id) => document.getElementById(id);

// --- Código de enlace (viene de ?c=XXXX o se genera uno de prueba) ---
function rnd(n) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alfabeto[b % alfabeto.length]).join('');
}
const linkCode = new URLSearchParams(location.search).get('c') || `T-${rnd(8)}`;
$('linkCode').textContent = linkCode;

// --- Estado ---
const casillas = new Array(CATEGORIAS.length).fill(null);
let indiceActual = null;
let stream = null;
let ultimaPosicion = null;
let detenerWatch = () => {};
let capturaPendiente = null; // { canvas, lat, lon, geo }

function mostrarPantalla(id) {
  ['s0', 's1', 's2', 's3', 's4'].forEach((s) => $(s).classList.toggle('hide', s !== id));
}

// --- Pantalla 0 -> 1 ---
$('btnContinuar').onclick = () => mostrarPantalla('s1');

// --- Pantalla 1: consentimiento ---
function actualizarBotonAceptar() {
  $('btnAceptar').disabled = !($('chkUbicacion').checked && $('chkFotos').checked && $('chkCamara').checked);
}
['chkUbicacion', 'chkFotos', 'chkCamara'].forEach((id) => { $(id).onchange = actualizarBotonAceptar; });

$('btnAceptar').onclick = () => {
  mostrarPantalla('s2');
  renderGrid();
  iniciarGps();
};

// --- GPS (badge compartido, corre durante toda la sesión) ---
function iniciarGps() {
  detenerWatch = observarPosicion(
    (p) => { ultimaPosicion = p; pintarGps(); },
    (e) => { $('gpsMsg').textContent = `Error de ubicación: ${e.message}`; },
  );
  setInterval(pintarGps, 1000);
}

function pintarGps() {
  if (!$('s3') || $('s3').classList.contains('hide') || !ultimaPosicion) return;
  const p = ultimaPosicion;
  const acc = p.coords.accuracy;
  const edadMs = Date.now() - p.timestamp;
  $('ll').textContent = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`;
  $('acc').textContent = `±${Math.round(acc)} m`;
  $('gpsAge').textContent = ` · hace ${Math.round(edadMs / 1000)} s`;
  const ok = acc <= LIMITE_PRECISION_M && edadMs <= LECTURA_FRESCA_MS;
  const badge = $('gpsBadge');
  badge.textContent = ok ? 'OK' : acc > LIMITE_PRECISION_M ? 'precisión baja' : 'lectura vieja';
  badge.style.background = ok ? 'var(--ok)' : 'var(--warn)';
  $('btnShot').disabled = !stream;
}

// --- Pantalla 2: grilla ---
function renderGrid() {
  const grid = $('grid9');
  grid.innerHTML = '';
  CATEGORIAS.forEach((cat, i) => {
    const foto = casillas[i];
    const div = document.createElement('div');
    div.className = 'casilla' + (i < MIN_FOTOS ? ' obligatoria' : '');
    if (foto) {
      div.innerHTML = `<img src="${foto.url}"><div class="check">✓</div>`;
    } else {
      div.innerHTML = `<div class="icono-casilla">${cat.icono}</div><div class="etiqueta">${cat.grupo}</div>`;
    }
    div.onclick = () => abrirCaptura(i);
    grid.appendChild(div);
  });
  const completas = casillas.filter(Boolean).length;
  $('cntFotos').textContent = completas;
  $('btnEnviar').disabled = completas < MIN_FOTOS;
}

$('btnEnviar').onclick = () => $('modalConfirmar').classList.remove('hide');
$('btnNoEnviar').onclick = () => $('modalConfirmar').classList.add('hide');
$('btnSiEnviar').onclick = async () => {
  $('modalConfirmar').classList.add('hide');
  await enviarTodo();
};

// --- Pantalla 3: captura de una foto ---
async function abrirCaptura(indice) {
  indiceActual = indice;
  mostrarPantalla('s3');
  $('camBox').classList.remove('hide');
  $('prevBox').classList.add('hide');
  $('camMsg').textContent = '';
  capturaPendiente = null;

  try {
    stream = await abrirCamara(CATEGORIAS[indice].frontal);
    $('vid').srcObject = stream;
    pintarGps();
  } catch (e) {
    $('camMsg').textContent = `No se pudo abrir la cámara: ${e.message}`;
  }
}

function cerrarPantallaCaptura() {
  cerrarCamara(stream);
  stream = null;
  mostrarPantalla('s2');
  renderGrid();
}
$('btnCancelarCaptura').onclick = cerrarPantallaCaptura;

$('btnShot').onclick = async () => {
  const video = $('vid');
  const base = congelarCuadro(video);
  $('btnShot').disabled = true;
  $('btnShot').textContent = 'Leyendo GPS...';
  const p = (await posicionFresca(ultimaPosicion)) || ultimaPosicion;
  $('btnShot').textContent = 'Capturar';
  if (!p) {
    $('camMsg').textContent = 'Sin ubicación: no se puede capturar.';
    $('btnShot').disabled = false;
    return;
  }

  const lat = p.coords.latitude;
  const lon = p.coords.longitude;
  let geo = null;
  try {
    geo = await buscarUbicacion(lat, lon);
  } catch (e) {
    console.error('Geo lookup falló', e);
    $('camMsg').textContent = 'No se pudo resolver distrito/sector (sin conexión?). Se guarda igual con las coordenadas.';
  }

  cerrarCamara(stream);
  stream = null;

  capturaPendiente = { canvas: base, lat, lon, geo };
  // Esperar a que el watermark (async: carga el logo) termine de quemarse
  // ANTES de mostrar el preview - si no, "Usar esta foto" podría capturar
  // el canvas a medio quemar (o sin watermark) por la carrera entre el
  // usuario tocando el botón y el dibujo async todavía en curso.
  await pintarPreview();
  $('camBox').classList.add('hide');
  $('prevBox').classList.remove('hide');
};

async function pintarPreview() {
  const { canvas, lat, lon, geo } = capturaPendiente;
  const prev = $('prev');
  prev.width = canvas.width;
  prev.height = canvas.height;
  prev.getContext('2d').drawImage(canvas, 0, 0);
  await quemarMarcaDeAgua(prev, { lat, lon, geo, fechaHora: new Date() });
}

$('btnRetake').onclick = () => {
  capturaPendiente = null;
  abrirCaptura(indiceActual);
};

$('btnUsarFoto').onclick = async () => {
  const prev = $('prev');
  const blob = await new Promise((resolve) => prev.toBlob(resolve, 'image/jpeg', 0.92));
  const url = URL.createObjectURL(blob);
  casillas[indiceActual] = {
    blob,
    url,
    lat: capturaPendiente.lat,
    lon: capturaPendiente.lon,
    geo: capturaPendiente.geo,
    grupo: CATEGORIAS[indiceActual].grupo,
  };
  capturaPendiente = null;
  mostrarPantalla('s2');
  renderGrid();
};

// --- Pantalla 4: enviando / resultado ---
async function enviarTodo() {
  mostrarPantalla('s4');
  $('boxEnviando').classList.remove('hide');
  $('boxExito').classList.add('hide');
  $('boxError').classList.add('hide');

  try {
    await enviarReporteSiniestro(casillas.filter(Boolean));
    $('boxEnviando').classList.add('hide');
    $('boxExito').classList.remove('hide');
  } catch (e) {
    console.error('Envío falló', e);
    $('boxEnviando').classList.add('hide');
    $('boxError').classList.remove('hide');
  }
}

$('btnReintentar').onclick = enviarTodo;
$('btnVolverGrilla').onclick = () => { mostrarPantalla('s2'); renderGrid(); };
