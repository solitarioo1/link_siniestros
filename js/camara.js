// Equivalente web de image_capture_service.dart: abre la camara (trasera o
// frontal segun la categoria, ver CategoriaFoto.usaCamaraFrontal en la app)
// y congela un cuadro de video en un canvas.
export async function abrirCamara(frontal) {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: frontal ? 'user' : 'environment' },
    audio: false,
  });
}

export function cerrarCamara(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

const RATIO_VERTICAL = 9 / 16;
const RATIO_HORIZONTAL = 16 / 9;

// Fuerza el mismo aspect ratio fijo que la app (9:16 vertical / 16:9
// horizontal, recorte centrado) en vez de dejar el ratio nativo del sensor
// - ver image_aspect_ratio_service.dart y CLAUDE.md, regla de arquitectura
// #4. Sin esto, el visor se ve bien por el CSS pero la foto capturada
// seguía con el ratio crudo de la cámara, descuadrada.
export function congelarCuadro(video) {
  const anchoNativo = video.videoWidth;
  const altoNativo = video.videoHeight;
  const esVertical = altoNativo >= anchoNativo;
  const ratioObjetivo = esVertical ? RATIO_VERTICAL : RATIO_HORIZONTAL;
  const ratioActual = anchoNativo / altoNativo;

  let anchoRecorte = anchoNativo;
  let altoRecorte = altoNativo;
  if (ratioActual > ratioObjetivo) {
    anchoRecorte = Math.round(altoNativo * ratioObjetivo);
  } else {
    altoRecorte = Math.round(anchoNativo / ratioObjetivo);
  }
  const x = Math.round((anchoNativo - anchoRecorte) / 2);
  const y = Math.round((altoNativo - altoRecorte) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = anchoRecorte;
  canvas.height = altoRecorte;
  canvas
    .getContext('2d')
    .drawImage(video, x, y, anchoRecorte, altoRecorte, 0, 0, anchoRecorte, altoRecorte);
  return canvas;
}
