(function (root) {
  'use strict';
  /** Pure planetary optics, Barlow spacing, diffraction, and ROI footprint functions. */
  const DEGREES = 180 / Math.PI;
  const ARCSEC_PER_RAD = 206264.806247;

  function requirePositive(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw new RangeError(`${label} doit être positif.`);
    return n;
  }

  function requireNonNegative(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new RangeError(`${label} doit être positif ou nul.`);
    return n;
  }

  /** Compute total optical spacing behind the Barlow lens and resulting magnification factor. */
  function computeBarlowSpacing({
    barlowMode = 'none',
    nominalFactor = 1,
    barlowFocalMm = 75,
    barlowBarrelMm = 0,
    spacerMm = 0,
    useAdc = false,
    adcMm = 48,
    useFilterWheel = false,
    filterMm = 20,
    cameraBackfocusMm = 12.5,
    progressiveRefMm = 12.5,
    progressiveGainPerMm = 1 / 35
  }) {
    const barrel = requireNonNegative(barlowBarrelMm, 'Le tirage du corps Barlow');
    const spacer = requireNonNegative(spacerMm, 'Les bagues allonges');
    const adc = useAdc ? requireNonNegative(adcMm, 'Le tirage de l’ADC') : 0;
    const filter = useFilterWheel ? requireNonNegative(filterMm, 'Le tirage de la roue à filtres') : 0;
    const camBf = requireNonNegative(cameraBackfocusMm, 'Le tirage interne caméra');

    if (barrel > 500 || spacer > 500 || adc > 300 || filter > 200 || camBf > 200) {
      throw new RangeError('Valeur de tirage hors plage de simulation.');
    }

    const totalSpacingMm = barrel + spacer + adc + filter + camBf;

    if (barlowMode === 'none') {
      return {
        barlowMode,
        totalSpacingMm: spacer + adc + filter + camBf,
        effectiveFactor: 1,
        nominalFactor: 1
      };
    }

    if (barlowMode === 'diverging') {
      const fb = requirePositive(barlowFocalMm, 'La focale de la Barlow');
      if (fb > 2000) throw new RangeError('La focale de la Barlow est hors plage.');
      const effectiveFactor = 1 + totalSpacingMm / fb;
      if (effectiveFactor > 25) throw new RangeError('Facteur résultant hors plage (> 25×).');
      return {
        barlowMode,
        barlowFocalMm: fb,
        totalSpacingMm,
        effectiveFactor,
        nominalFactor: requirePositive(nominalFactor, 'Le facteur nominal')
      };
    }

    const baseFactor = requirePositive(nominalFactor, 'Le facteur nominal');
    if (baseFactor > 20) throw new RangeError('Facteur hors plage de simulation.');

    if (barlowMode === 'progressive') {
      const ref = requireNonNegative(progressiveRefMm, 'Le tirage de référence');
      const gain = requireNonNegative(progressiveGainPerMm, 'Le gain par mm');
      const effectiveFactor = baseFactor + Math.max(0, totalSpacingMm - ref) * gain;
      if (effectiveFactor > 25) throw new RangeError('Facteur résultant hors plage (> 25×).');
      return { barlowMode, totalSpacingMm, effectiveFactor, nominalFactor: baseFactor };
    }

    // 'telecentric' or 'fixed'
    return { barlowMode, totalSpacingMm, effectiveFactor: baseFactor, nominalFactor: baseFactor };
  }

  function classifySampling(ratio) {
    if (ratio < 0.65) return { code: 'under', label: 'Sous-échantillonné' };
    if (ratio < 0.85) return { code: 'slightly_under', label: 'Légèrement sous-échantillonné' };
    if (ratio <= 1.25) return { code: 'optimal', label: 'Échantillonnage optimal' };
    if (ratio <= 1.6) return { code: 'slightly_over', label: 'Légèrement sur-échantillonné' };
    return { code: 'over', label: 'Sur-échantillonné' };
  }

  function calculatePlanetaryOptics({
    apertureMm,
    focalMm,
    factor = 1,
    pixelsX,
    pixelsY,
    pixelUm,
    binning = 1,
    roiX = null,
    roiY = null,
    wavelengthNm = 550,
    samplingK = 5
  }) {
    const aperture = requirePositive(apertureMm, 'Le diamètre');
    const focal = requirePositive(focalMm, 'La focale');
    const multiplier = requirePositive(factor, 'Le facteur optique');
    const nx = Math.round(requirePositive(pixelsX, 'La largeur en pixels'));
    const ny = Math.round(requirePositive(pixelsY, 'La hauteur en pixels'));
    const px = requirePositive(pixelUm, 'La taille des pixels');
    const bin = Number(binning);
    const lambda = requirePositive(wavelengthNm, 'La longueur d’onde');
    const kRule = requirePositive(samplingK, 'Le critère F/D cible');

    if (aperture > 10000 || focal > 100000 || nx > 100000 || ny > 100000 || px > 1000 || multiplier > 25) {
      throw new RangeError('Valeur hors plage de simulation.');
    }
    if (!Number.isInteger(bin) || bin < 1 || bin > 4) {
      throw new RangeError('Le binning doit être compris entre 1 et 4.');
    }
    if (lambda < 250 || lambda > 2000 || kRule < 1 || kRule > 15) {
      throw new RangeError('Paramètre spectral ou d’échantillonnage invalide.');
    }

    const sensorBinPxX = Math.max(1, Math.floor(nx / bin));
    const sensorBinPxY = Math.max(1, Math.floor(ny / bin));
    const activePxX = roiX ? Math.min(sensorBinPxX, Math.round(requirePositive(roiX, 'Largeur ROI'))) : sensorBinPxX;
    const activePxY = roiY ? Math.min(sensorBinPxY, Math.round(requirePositive(roiY, 'Hauteur ROI'))) : sensorBinPxY;

    const effectiveFocalMm = focal * multiplier;
    const nativeFocalRatio = focal / aperture;
    const effectiveFocalRatio = effectiveFocalMm / aperture;
    const effectivePixelUm = px * bin;

    const sensorWidthMm = sensorBinPxX * effectivePixelUm / 1000;
    const sensorHeightMm = sensorBinPxY * effectivePixelUm / 1000;
    const activeWidthMm = activePxX * effectivePixelUm / 1000;
    const activeHeightMm = activePxY * effectivePixelUm / 1000;

    const sensorFovWidthArcsec = 2 * Math.atan(sensorWidthMm / (2 * effectiveFocalMm)) * DEGREES * 3600;
    const sensorFovHeightArcsec = 2 * Math.atan(sensorHeightMm / (2 * effectiveFocalMm)) * DEGREES * 3600;
    const fovWidthArcsec = 2 * Math.atan(activeWidthMm / (2 * effectiveFocalMm)) * DEGREES * 3600;
    const fovHeightArcsec = 2 * Math.atan(activeHeightMm / (2 * effectiveFocalMm)) * DEGREES * 3600;
    const scaleArcsecPerPixel = ARCSEC_PER_RAD * (effectivePixelUm / 1000) / effectiveFocalMm;

    // Diffraction limits at chosen wavelength
    const rayleighArcsec = 1.22 * (lambda * 1e-6) / aperture * ARCSEC_PER_RAD;
    const dawesArcsec = 116 / aperture;
    const airyDiameterArcsec = 2 * rayleighArcsec;
    const airyDiameterPx = airyDiameterArcsec / scaleArcsecPerPixel;

    // Optimal planetary focal ratio scales with pixel size and wavelength:
    // N_opt = kRule * (550 / lambda_nm) * effectivePixelUm
    const optimalFocalRatio = kRule * (550 / lambda) * effectivePixelUm;
    const idealFactor = (optimalFocalRatio * aperture) / focal;
    const samplingRatio = effectiveFocalRatio / optimalFocalRatio;
    const samplingStatus = classifySampling(samplingRatio);

    return {
      apertureMm: aperture,
      nativeFocalMm: focal,
      effectiveFocalMm,
      effectiveFactor: multiplier,
      nativeFocalRatio,
      effectiveFocalRatio,
      effectivePixelUm,
      sensorBinPxX,
      sensorBinPxY,
      activePxX,
      activePxY,
      sensorWidthMm,
      sensorHeightMm,
      activeWidthMm,
      activeHeightMm,
      sensorFovWidthArcsec,
      sensorFovHeightArcsec,
      fovWidthArcsec,
      fovHeightArcsec,
      scaleArcsecPerPixel,
      rayleighArcsec,
      dawesArcsec,
      airyDiameterArcsec,
      airyDiameterPx,
      optimalFocalRatio,
      idealFactor,
      samplingRatio,
      samplingStatus
    };
  }

  /** Compute recommended spacing change (mm) to reach idealFactor for spacing-sensitive Barlows. */
  function computeSpacingGuidance({ barlowMode, barlowFocalMm, totalSpacingMm, idealFactor, progressiveRefMm = 12.5, progressiveGainPerMm = 1 / 35, nominalFactor = 5 }) {
    if (barlowMode === 'diverging' && barlowFocalMm > 0) {
      const idealSpacingMm = Math.max(0, (idealFactor - 1) * barlowFocalMm);
      return {
        adjustable: true,
        idealSpacingMm,
        deltaMm: idealSpacingMm - totalSpacingMm
      };
    }
    if (barlowMode === 'progressive' && progressiveGainPerMm > 0) {
      const idealSpacingMm = progressiveRefMm + Math.max(0, idealFactor - nominalFactor) / progressiveGainPerMm;
      return {
        adjustable: true,
        idealSpacingMm,
        deltaMm: idealSpacingMm - totalSpacingMm
      };
    }
    return { adjustable: false, idealSpacingMm: null, deltaMm: null };
  }

  /** Compute mosaic grid panels (1x1 to 4x4) in sensor pixel offsets and total angular span. */
  function computePlanetaryMosaic({ optics, mosaic = 1, overlapPercent = 15 }) {
    const n = Number(mosaic);
    const overlap = Number(overlapPercent);
    if (!Number.isInteger(n) || n < 1 || n > 4) throw new RangeError('Mosaïque invalide (1 à 4).');
    if (!Number.isFinite(overlap) || overlap < 0 || overlap >= 70) throw new RangeError('Recouvrement invalide (0 à 60 %).');

    const stepX = optics.activePxX * (1 - overlap / 100);
    const stepY = optics.activePxY * (1 - overlap / 100);
    const panels = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        panels.push({
          row,
          col,
          index: row * n + col + 1,
          centerOffsetPxX: (col - (n - 1) / 2) * stepX,
          centerOffsetPxY: (row - (n - 1) / 2) * stepY
        });
      }
    }

    const widthPx = optics.activePxX * (1 + (n - 1) * (1 - overlap / 100));
    const heightPx = optics.activePxY * (1 + (n - 1) * (1 - overlap / 100));
    const widthMm = widthPx * optics.effectivePixelUm / 1000;
    const heightMm = heightPx * optics.effectivePixelUm / 1000;

    return {
      countPerAxis: n,
      overlapPercent: overlap,
      panelCount: n * n,
      widthPx,
      heightPx,
      widthArcsec: 2 * Math.atan(widthMm / (2 * optics.effectiveFocalMm)) * DEGREES * 3600,
      heightArcsec: 2 * Math.atan(heightMm / (2 * optics.effectiveFocalMm)) * DEGREES * 3600,
      panels
    };
  }

  /** Compute target dimensions in pixels and fit margins inside active ROI, mosaic, and full sensor. */
  function computeTargetFootprint({ optics, targetGeom, mosaicMetrics = null }) {
    const scale = optics.scaleArcsecPerPixel;
    const diameterPx = targetGeom.diameterArcsec / scale;
    const polarPx = targetGeom.polarArcsec / scale;
    const ringWidthPx = (targetGeom.ringArcsec || 0) / scale;
    const ringHeightPx = ringWidthPx * Math.abs(Math.sin((targetGeom.ringTiltDeg || 0) * Math.PI / 180));
    const maxSpanPx = Math.max(diameterPx, ringWidthPx);
    const minRoiPx = Math.min(optics.activePxX, optics.activePxY);
    const minSensorPx = Math.min(optics.sensorBinPxX, optics.sensorBinPxY);
    const minMosaicPx = mosaicMetrics ? Math.min(mosaicMetrics.widthPx, mosaicMetrics.heightPx) : minRoiPx;

    return {
      diameterPx,
      polarPx,
      ringWidthPx,
      ringHeightPx,
      maxSpanPx,
      roiCoveragePct: (maxSpanPx / minRoiPx) * 100,
      mosaicCoveragePct: (maxSpanPx / minMosaicPx) * 100,
      sensorCoveragePct: (maxSpanPx / minSensorPx) * 100,
      fitsRoi: maxSpanPx <= minRoiPx,
      fitsMosaic: maxSpanPx <= minMosaicPx,
      fitsSensor: maxSpanPx <= minSensorPx,
      roiMarginFactor: minRoiPx / maxSpanPx,
      mosaicMarginFactor: minMosaicPx / maxSpanPx
    };
  }

  function formatAngleArcsec(arcsec) {
    const val = Math.abs(Number(arcsec));
    if (val >= 3600) return `${(val / 3600).toFixed(2)}°`;
    if (val >= 120) return `${(val / 60).toFixed(1)}′`;
    if (val >= 10) return `${val.toFixed(1)}″`;
    return `${val.toFixed(2)}″`;
  }

  const api = {
    requirePositive,
    requireNonNegative,
    computeBarlowSpacing,
    calculatePlanetaryOptics,
    computeSpacingGuidance,
    computePlanetaryMosaic,
    computeTargetFootprint,
    formatAngleArcsec
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlanetaryOptics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
