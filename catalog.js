(function (root) {
  'use strict';

  const TARGETS = [
    { id: 'jupiter', name: 'Jupiter', group: 'Planètes', kind: 'planet', radiusKm: 71492, flattening: 0.06487, diameterMin: 29.8, diameterMean: 39.5, diameterMax: 50.1, color: '#e6c596' },
    { id: 'saturn', name: 'Saturne (globe + anneaux)', group: 'Planètes', kind: 'planet', radiusKm: 60268, flattening: 0.09796, ringRadiusKm: 136775, diameterMin: 14.5, diameterMean: 17.5, diameterMax: 20.7, color: '#ead5a6' },
    { id: 'mars', name: 'Mars', group: 'Planètes', kind: 'planet', radiusKm: 3396.2, flattening: 0.00589, diameterMin: 3.5, diameterMean: 10.5, diameterMax: 25.1, color: '#d97b4c' },
    { id: 'venus', name: 'Vénus', group: 'Planètes', kind: 'planet', radiusKm: 6051.8, flattening: 0, diameterMin: 9.7, diameterMean: 24.0, diameterMax: 66.0, color: '#f2ead3' },
    { id: 'mercury', name: 'Mercure', group: 'Planètes', kind: 'planet', radiusKm: 2439.7, flattening: 0, diameterMin: 4.5, diameterMean: 7.2, diameterMax: 13.0, color: '#b8b2a8' },
    { id: 'uranus', name: 'Uranus', group: 'Planètes', kind: 'planet', radiusKm: 25559, flattening: 0.0229, diameterMin: 3.3, diameterMean: 3.7, diameterMax: 4.1, color: '#8fd4de' },
    { id: 'neptune', name: 'Neptune', group: 'Planètes', kind: 'planet', radiusKm: 24764, flattening: 0.0171, diameterMin: 2.2, diameterMean: 2.3, diameterMax: 2.4, color: '#6b9be8' },
    { id: 'moon', name: 'Lune · Disque entier', group: 'Lune & Soleil', kind: 'moon', radiusKm: 1737.4, flattening: 0, diameterMin: 1764, diameterMean: 1865, diameterMax: 2010, color: '#cfd3da' },
    { id: 'moon_clavius', name: 'Lune · Cratère Clavius (~231 km)', group: 'Lune & Soleil', kind: 'lunar_feature', radiusKm: 115.5, flattening: 0, diameterMin: 118, diameterMean: 125, diameterMax: 134, color: '#bfc4cc' },
    { id: 'moon_copernicus', name: 'Lune · Cratère Copernic (~93 km)', group: 'Lune & Soleil', kind: 'lunar_feature', radiusKm: 46.5, flattening: 0, diameterMin: 47, diameterMean: 50, diameterMax: 54, color: '#bfc4cc' },
    { id: 'sun', name: 'Soleil · Disque entier (avec filtre)', group: 'Lune & Soleil', kind: 'sun', radiusKm: 695700, flattening: 0, diameterMin: 1887, diameterMean: 1919, diameterMax: 1952, color: '#ffcb6b' },
    { id: 'custom', name: 'Cible personnalisée', group: 'Autre', kind: 'custom', radiusKm: 0, flattening: 0, diameterMin: 10, diameterMean: 30, diameterMax: 60, color: '#ffb347' }
  ];

  const TELESCOPES = [
    { id: 'newton150', name: 'Newton 150/750 (f/5)', aperture: 150, focal: 750 },
    { id: 'newton200', name: 'Newton 200/1000 (f/5)', aperture: 200, focal: 1000 },
    { id: 'dobson254', name: 'Dobson / Newton 254/1200 (f/4,7)', aperture: 254, focal: 1200 },
    { id: 'dobson300', name: 'Dobson / Newton 300/1500 (f/5)', aperture: 300, focal: 1500 },
    { id: 'sct8', name: 'SCT C8 203/2032 (f/10)', aperture: 203, focal: 2032 },
    { id: 'sct925', name: 'SCT C9.25 235/2350 (f/10)', aperture: 235, focal: 2350 },
    { id: 'sct11', name: 'SCT C11 280/2800 (f/10)', aperture: 280, focal: 2800 },
    { id: 'sct14', name: 'SCT C14 356/3910 (f/11)', aperture: 356, focal: 3910 },
    { id: 'mak127', name: 'Maksutov 127/1500 (f/11,8)', aperture: 127, focal: 1500 },
    { id: 'mak150', name: 'Maksutov 150/1800 (f/12)', aperture: 150, focal: 1800 },
    { id: 'mak180', name: 'Maksutov 180/2700 (f/15)', aperture: 180, focal: 2700 },
    { id: 'ed80', name: 'Lunette 80/480 (f/6)', aperture: 80, focal: 480 },
    { id: 'ed102', name: 'Lunette 102/714 (f/7)', aperture: 102, focal: 714 },
    { id: 'custom', name: 'Personnalisé', aperture: 200, focal: 1000 }
  ];

  // With a 12.5 mm camera flange distance, barlowBarrelMm + 12.5 gives nominal factor at nominal spacing.
  const BARLOWS = [
    { id: 'none', name: 'Aucune (au foyer)', mode: 'none', nominalFactor: 1, barlowFocalMm: 75, barlowBarrelMm: 0 },
    { id: 'barlow15', name: 'Barlow 1,5× (courte)', mode: 'diverging', nominalFactor: 1.5, barlowFocalMm: 80, barlowBarrelMm: 27.5 },
    { id: 'barlow2', name: 'Barlow 2× (classique)', mode: 'diverging', nominalFactor: 2.0, barlowFocalMm: 75, barlowBarrelMm: 62.5 },
    { id: 'barlow225', name: 'Barlow 2,25× (type Q-Barlow)', mode: 'diverging', nominalFactor: 2.25, barlowFocalMm: 68, barlowBarrelMm: 72.5 },
    { id: 'barlow25', name: 'Barlow 2,5× (classique)', mode: 'diverging', nominalFactor: 2.5, barlowFocalMm: 65, barlowBarrelMm: 85.0 },
    { id: 'barlow3', name: 'Barlow 3× (classique)', mode: 'diverging', nominalFactor: 3.0, barlowFocalMm: 55, barlowBarrelMm: 97.5 },
    { id: 'tele2', name: 'Télécentrique 2× (Powermate / Extender)', mode: 'telecentric', nominalFactor: 2.0, barlowFocalMm: 75, barlowBarrelMm: 0 },
    { id: 'tele25', name: 'Télécentrique 2,5× (Powermate)', mode: 'telecentric', nominalFactor: 2.5, barlowFocalMm: 75, barlowBarrelMm: 0 },
    { id: 'tele3', name: 'Télécentrique 3× (Extender)', mode: 'telecentric', nominalFactor: 3.0, barlowFocalMm: 75, barlowBarrelMm: 0 },
    { id: 'tele4', name: 'Télécentrique 4× (Powermate)', mode: 'telecentric', nominalFactor: 4.0, barlowFocalMm: 75, barlowBarrelMm: 0 },
    { id: 'tele5', name: 'Télécentrique 5× (Powermate)*', mode: 'progressive', nominalFactor: 5.0, barlowFocalMm: 75, barlowBarrelMm: 0, progressiveRefMm: 12.5, progressiveGainPerMm: 1 / 35 },
    { id: 'custom_div', name: 'Barlow divergente personnalisée', mode: 'diverging', nominalFactor: 2.0, barlowFocalMm: 75, barlowBarrelMm: 62.5 },
    { id: 'custom_fixed', name: 'Facteur fixe / Réducteur personnalisé', mode: 'fixed', nominalFactor: 1.0, barlowFocalMm: 75, barlowBarrelMm: 0 }
  ];

  const CAMERAS = [
    { id: 'asi662mc', name: 'ZWO ASI662MC', pixelsX: 1920, pixelsY: 1080, pixelUm: 2.9, backfocusMm: 12.5 },
    { id: 'asi224mc', name: 'ZWO ASI224MC', pixelsX: 1304, pixelsY: 976, pixelUm: 3.75, backfocusMm: 12.5 },
    { id: 'asi678mc', name: 'ZWO ASI678MC', pixelsX: 3840, pixelsY: 2160, pixelUm: 2.0, backfocusMm: 12.5 },
    { id: 'asi462mc', name: 'ZWO ASI462MC', pixelsX: 1936, pixelsY: 1096, pixelUm: 2.9, backfocusMm: 12.5 },
    { id: 'asi585mc', name: 'ZWO ASI585MC (bague T2 11 mm)', pixelsX: 3840, pixelsY: 2160, pixelUm: 2.9, backfocusMm: 17.5 },
    { id: 'asi715mc', name: 'ZWO ASI715MC', pixelsX: 3864, pixelsY: 2192, pixelUm: 1.45, backfocusMm: 12.5 },
    { id: 'asi290mm', name: 'ZWO ASI290MM', pixelsX: 1936, pixelsY: 1096, pixelUm: 2.9, backfocusMm: 12.5 },
    { id: 'asi178mc', name: 'ZWO ASI178MC', pixelsX: 3096, pixelsY: 2080, pixelUm: 2.4, backfocusMm: 12.5 },
    { id: 'asi174mm', name: 'ZWO ASI174MM (solaire / lunaire)', pixelsX: 1936, pixelsY: 1216, pixelUm: 5.86, backfocusMm: 6.5 },
    { id: 'asi533mc', name: 'ZWO ASI533MC Pro (lunaire grand champ)', pixelsX: 3008, pixelsY: 3008, pixelUm: 3.76, backfocusMm: 17.5 },
    { id: 'custom', name: 'Personnalisée', pixelsX: 1920, pixelsY: 1080, pixelUm: 2.9, backfocusMm: 12.5 }
  ];

  const ROI_PRESETS = [
    { id: 'full', name: 'Plein capteur', width: null, height: null },
    { id: '1920x1080', name: '1920 × 1080', width: 1920, height: 1080 },
    { id: '1280x960', name: '1280 × 960', width: 1280, height: 960 },
    { id: '1024x768', name: '1024 × 768', width: 1024, height: 768 },
    { id: '800x600', name: '800 × 600', width: 800, height: 600 },
    { id: '640x480', name: '640 × 480', width: 640, height: 480 },
    { id: '480x480', name: '480 × 480 (carré)', width: 480, height: 480 },
    { id: '320x240', name: '320 × 240', width: 320, height: 240 },
    { id: 'custom', name: 'ROI personnalisé', width: 640, height: 480 }
  ];

  const WAVELENGTHS = [
    { id: '550', name: 'Visible / Vert (550 nm)', nm: 550 },
    { id: '450', name: 'Bleu / UV (450 nm)', nm: 450 },
    { id: '650', name: 'Rouge (650 nm)', nm: 650 },
    { id: '685', name: 'Infrarouge IR 685 nm', nm: 685 },
    { id: '850', name: 'Infrarouge IR 850 nm', nm: 850 },
    { id: '889', name: 'Méthane CH4 (889 nm)', nm: 889 },
    { id: 'custom', name: 'Personnalisée', nm: 550 }
  ];

  const api = { TARGETS, TELESCOPES, BARLOWS, CAMERAS, ROI_PRESETS, WAVELENGTHS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlanetaryCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
