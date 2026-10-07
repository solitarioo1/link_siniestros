// Equivalente web de gps_service.dart: encapsula el acceso a geolocalizacion
// del navegador, sin logica de UI.
export function observarPosicion(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError(new Error('Este navegador no soporta geolocalización.'));
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(onUpdate, onError, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 30000,
  });
  return () => navigator.geolocation.clearWatch(watchId);
}

// Pide una lectura puntual fresca al momento exacto de capturar (no
// depender solo del stream, igual que camera_screen.dart en la app - ver
// CLAUDE.md, bug real documentado sobre distanceFilter).
export function posicionFresca(ultimaConocida) {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(ultimaConocida),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
    );
  });
}
