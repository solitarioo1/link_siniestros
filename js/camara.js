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

export function congelarCuadro(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas;
}
