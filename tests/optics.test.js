const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeBarlowSpacing,
  calculatePlanetaryOptics,
  computeSpacingGuidance,
  computePlanetaryMosaic,
  computeTargetFootprint,
  formatAngleArcsec
} = require('../optics.js');
const {
  dateToJulianDay,
  computeTargetGeometry
} = require('../ephemeris.js');
const {
  TARGETS,
  TELESCOPES,
  BARLOWS,
  CAMERAS
} = require('../catalog.js');

test('Diverging Barlow 2x matches nominal factor at 75mm spacing and increases with ADC', () => {
  const nominal = computeBarlowSpacing({
    barlowMode: 'diverging',
    nominalFactor: 2,
    barlowFocalMm: 75,
    barlowBarrelMm: 62.5,
    spacerMm: 0,
    useAdc: false,
    adcMm: 48,
    useFilterWheel: false,
    filterMm: 20,
    cameraBackfocusMm: 12.5
  });
  assert.equal(nominal.totalSpacingMm, 75);
  assert.ok(Math.abs(nominal.effectiveFactor - 2.0) < 1e-9);

  const withAdc = computeBarlowSpacing({
    barlowMode: 'diverging',
    nominalFactor: 2,
    barlowFocalMm: 75,
    barlowBarrelMm: 62.5,
    spacerMm: 0,
    useAdc: true,
    adcMm: 48,
    useFilterWheel: false,
    filterMm: 20,
    cameraBackfocusMm: 12.5
  });
  assert.equal(withAdc.totalSpacingMm, 123);
  assert.ok(Math.abs(withAdc.effectiveFactor - 2.64) < 1e-9);
});

test('Telecentric amplifier stays constant with spacing while Powermate 5x gains 1x per 35mm', () => {
  const tele = computeBarlowSpacing({
    barlowMode: 'telecentric',
    nominalFactor: 2.5,
    barlowBarrelMm: 0,
    spacerMm: 60,
    useAdc: true,
    adcMm: 48,
    cameraBackfocusMm: 12.5
  });
  assert.equal(tele.effectiveFactor, 2.5);

  const pm5 = computeBarlowSpacing({
    barlowMode: 'progressive',
    nominalFactor: 5,
    barlowBarrelMm: 0,
    spacerMm: 35,
    cameraBackfocusMm: 12.5,
    progressiveRefMm: 12.5,
    progressiveGainPerMm: 1 / 35
  });
  assert.ok(Math.abs(pm5.effectiveFactor - 6.0) < 1e-9);
});

test('Newton 200/1000 + Barlow 3x + ASI662MC reaches optimal sampling around f/15', () => {
  const opt = calculatePlanetaryOptics({
    apertureMm: 200,
    focalMm: 1000,
    factor: 3,
    pixelsX: 1920,
    pixelsY: 1080,
    pixelUm: 2.9,
    roiX: 640,
    roiY: 480,
    wavelengthNm: 550,
    samplingK: 5
  });
  assert.equal(opt.effectiveFocalMm, 3000);
  assert.equal(opt.effectiveFocalRatio, 15);
  assert.ok(Math.abs(opt.scaleArcsecPerPixel - 0.19939) < 0.001);
  assert.equal(opt.optimalFocalRatio, 14.5);
  assert.equal(opt.samplingStatus.code, 'optimal');
  assert.ok(Math.abs(opt.rayleighArcsec - 0.692) < 0.005);
  assert.ok(Math.abs(opt.airyDiameterPx - 6.94) < 0.05);
});

test('Infrared wavelength lowers optimal focal ratio and spacing guidance reports delta mm', () => {
  const ir = calculatePlanetaryOptics({
    apertureMm: 203,
    focalMm: 2032,
    factor: 2,
    pixelsX: 1920,
    pixelsY: 1080,
    pixelUm: 2.9,
    wavelengthNm: 850,
    samplingK: 5
  });
  assert.ok(ir.optimalFocalRatio < 10);
  assert.equal(ir.samplingStatus.code, 'over');

  const g = computeSpacingGuidance({
    barlowMode: 'diverging',
    barlowFocalMm: 75,
    totalSpacingMm: 75,
    idealFactor: 2.4
  });
  assert.equal(g.adjustable, true);
  assert.ok(Math.abs(g.idealSpacingMm - 105) < 1e-9);
  assert.ok(Math.abs(g.deltaMm - 30) < 1e-9);
});

test('Target footprint accurately checks ROI and full sensor fit', () => {
  const opt = calculatePlanetaryOptics({
    apertureMm: 200,
    focalMm: 1000,
    factor: 3,
    pixelsX: 1920,
    pixelsY: 1080,
    pixelUm: 2.9,
    roiX: 640,
    roiY: 480
  });
  const jupFit = computeTargetFootprint({
    optics: opt,
    targetGeom: { diameterArcsec: 45, polarArcsec: 42.1, ringArcsec: 0, ringTiltDeg: 0 }
  });
  assert.equal(jupFit.fitsRoi, true);
  assert.equal(jupFit.fitsSensor, true);
  assert.ok(jupFit.diameterPx > 220 && jupFit.diameterPx < 230);

  const moonFit = computeTargetFootprint({
    optics: opt,
    targetGeom: { diameterArcsec: 1865, polarArcsec: 1865, ringArcsec: 0, ringTiltDeg: 0 }
  });
  assert.equal(moonFit.fitsRoi, false);
  assert.equal(moonFit.fitsSensor, false);
});

test('Ephemeris reproduces key planetary oppositions, phases, and Saturn ring tilts', () => {
  const byId = (id) => TARGETS.find((t) => t.id === id);

  // Mars 2018 perihelic opposition (~24.3") vs 2025 opposition (~14.6")
  const mars2018 = computeTargetGeometry({ target: byId('mars'), sizeMode: 'ephemeris', dateStr: '2018-07-27' });
  assert.ok(mars2018.diameterArcsec > 23.5 && mars2018.diameterArcsec < 25.0, `Mars 2018: ${mars2018.diameterArcsec}`);
  const mars2025 = computeTargetGeometry({ target: byId('mars'), sizeMode: 'ephemeris', dateStr: '2025-01-16' });
  assert.ok(mars2025.diameterArcsec > 14.0 && mars2025.diameterArcsec < 15.2, `Mars 2025: ${mars2025.diameterArcsec}`);
  assert.ok(mars2025.illumination > 0.98);

  // Jupiter opposition Dec 2024 (~48.2")
  const jup2024 = computeTargetGeometry({ target: byId('jupiter'), sizeMode: 'ephemeris', dateStr: '2024-12-07' });
  assert.ok(jup2024.diameterArcsec > 46.5 && jup2024.diameterArcsec < 49.5, `Jupiter 2024: ${jup2024.diameterArcsec}`);

  // Saturn ring crossing March 2025 (near 0 deg) vs wide opening June 2017 (> 25 deg)
  const sat2025 = computeTargetGeometry({ target: byId('saturn'), sizeMode: 'ephemeris', dateStr: '2025-03-23' });
  assert.ok(Math.abs(sat2025.ringTiltDeg) < 1.8, `Saturn 2025 tilt: ${sat2025.ringTiltDeg}`);
  const sat2017 = computeTargetGeometry({ target: byId('saturn'), sizeMode: 'ephemeris', dateStr: '2017-06-15' });
  assert.ok(Math.abs(sat2017.ringTiltDeg) > 25, `Saturn 2017 tilt: ${sat2017.ringTiltDeg}`);

  // Venus near inferior conjunction March 2025 (thin crescent, > 55")
  const ven2025 = computeTargetGeometry({ target: byId('venus'), sizeMode: 'ephemeris', dateStr: '2025-03-23' });
  assert.ok(ven2025.diameterArcsec > 55, `Venus 2025: ${ven2025.diameterArcsec}`);
  assert.ok(ven2025.illumination < 0.05, `Venus 2025 phase: ${ven2025.illumination}`);

  // Sun perihelion > aphelion
  const sunJan = computeTargetGeometry({ target: byId('sun'), sizeMode: 'ephemeris', dateStr: '2026-01-03' });
  const sunJul = computeTargetGeometry({ target: byId('sun'), sizeMode: 'ephemeris', dateStr: '2026-07-06' });
  assert.ok(sunJan.diameterArcsec > sunJul.diameterArcsec);
});

test('Lunar mosaic and focal reducer accurately expand framing coverage', () => {
  const opt = calculatePlanetaryOptics({
    apertureMm: 203,
    focalMm: 2032,
    factor: 0.63,
    pixelsX: 3008,
    pixelsY: 3008,
    pixelUm: 3.76
  });
  const single = computePlanetaryMosaic({ optics: opt, mosaic: 1, overlapPercent: 15 });
  const mosaic2 = computePlanetaryMosaic({ optics: opt, mosaic: 2, overlapPercent: 15 });
  assert.equal(single.panelCount, 1);
  assert.equal(mosaic2.panelCount, 4);
  assert.ok(mosaic2.widthArcsec > opt.fovWidthArcsec);
  assert.ok(mosaic2.widthArcsec < 2 * opt.fovWidthArcsec);

  const moonFit = computeTargetFootprint({
    optics: opt,
    targetGeom: { diameterArcsec: 1865, polarArcsec: 1865, ringArcsec: 0, ringTiltDeg: 0 },
    mosaicMetrics: mosaic2
  });
  assert.equal(moonFit.fitsRoi, false);
  assert.equal(moonFit.fitsMosaic, true);
});

test('Barlow 5x diverging matches nominal 5x at default camera spacing', () => {
  const b5 = BARLOWS.find((b) => b.id === 'barlow5');
  const res = computeBarlowSpacing({
    barlowMode: b5.mode,
    nominalFactor: b5.nominalFactor,
    barlowFocalMm: b5.barlowFocalMm,
    barlowBarrelMm: b5.barlowBarrelMm,
    cameraBackfocusMm: 12.5
  });
  assert.ok(Math.abs(res.effectiveFactor - 5.0) < 1e-9);
});

test('Input validation and formatting edge cases', () => {
  assert.throws(() => dateToJulianDay('2026-02-30'), RangeError);
  assert.throws(() => computeBarlowSpacing({ barlowMode: 'diverging', barlowFocalMm: 0 }), RangeError);
  assert.throws(() => calculatePlanetaryOptics({ apertureMm: 0, focalMm: 1000, pixelsX: 640, pixelsY: 480, pixelUm: 2.9 }), RangeError);
  assert.equal(formatAngleArcsec(45), '45.0″');
  assert.equal(formatAngleArcsec(1860), '31.0′');
  assert.ok(TELESCOPES.length > 5 && BARLOWS.length > 5 && CAMERAS.length > 5);
});
