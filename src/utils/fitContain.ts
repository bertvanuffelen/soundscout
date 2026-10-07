/**
 * fitContain — de grootste maat met verhouding `ratio` (breedte/hoogte) die
 * binnen een kader van `containerW` × `containerH` past (CSS object-fit:
 * contain, maar dan als echte elementmaat). Zo kan een overlay met
 * procent-posities (praatplaat-spots) precies over het zichtbare beeld liggen,
 * ook als het kader staand is en het beeld liggend (telefoon, PRAATPLAAT-MOBIEL).
 */
export function fitContain(
  containerW: number,
  containerH: number,
  ratio: number
): { width: number; height: number } {
  if (!(containerW > 0) || !(containerH > 0) || !(ratio > 0) || !Number.isFinite(ratio)) {
    return { width: 0, height: 0 };
  }
  const widthAtFullHeight = containerH * ratio;
  if (widthAtFullHeight <= containerW) {
    return { width: widthAtFullHeight, height: containerH };
  }
  return { width: containerW, height: containerW / ratio };
}
