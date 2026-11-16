(function () {
  'use strict';

  const {
    todayIsoDate,
    computeTargetGeometry
  } = window.PlanetaryEphemeris;
  const {
    computeBarlowSpacing,
    calculatePlanetaryOptics,
    computeSpacingGuidance,
    computePlanetaryMosaic,
    computeTargetFootprint,
    formatAngleArcsec
  } = window.PlanetaryOptics;
  const {
    TARGETS,
    TELESCOPES,
    BARLOWS,
    CAMERAS,
    ROI_PRESETS,
    WAVELENGTHS,
    SEEING_PRESETS
  } = window.PlanetaryCatalog;

  const $ = (id) => document.getElementById(id);
  const intFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const dec = (n, d = 2) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

  function buildDefaultState() {
    return {
      targetId: 'jupiter',
      sizeMode: 'ephemeris',
      dateStr: todayIsoDate(),
      customDiameter: 45,
      customRing: 0,
      customRingTilt: 15,
      telescopeId: 'newton200',
      aperture: 200,
      focal: 1000,
      wavelengthId: '550',
      wavelengthNm: 550,
      seeingId: 'standard',
      samplingK: 5,
      barlowId: 'barlow3',
      barlowMode: 'diverging',
      barlowNominalFactor: 3,
      barlowFocalMm: 55,
      barlowBarrelMm: 97.5,
      spacerMm: 0,
      useAdc: false,
      adcMm: 48,
      useFilterWheel: false,
      filterMm: 20,
      cameraBackfocusMm: 12.5,
      progressiveRefMm: 12.5,
      progressiveGainPerMm: 1 / 35,
      fixedFactor: 1,
      cameraId: 'asi662mc',
      pixelsX: 1920,
      pixelsY: 1080,
      pixelUm: 2.9,
      binning: 1,
      roiId: '640x480',
      roiX: 640,
      roiY: 480,
      rotation: 0,
      mosaic: 1,
      overlap: 15,
      viewMode: 'roi',
      showGrid: true
    };
  }

  let state = buildDefaultState();
  let errorTimeout = null;
  let lastCalculated = null;
  let viewPanX = 0;
  let viewPanY = 0;
  let viewZoom = 1;
  let dragState = null;

  function report(message, persistent = false) {
    const box = $('error');
    box.textContent = message;
    box.hidden = !message;
    window.clearTimeout(errorTimeout);
    if (message && !persistent) errorTimeout = window.setTimeout(() => { box.hidden = true; }, 7000);
  }

  function populateSelect(selectId, entries, selected) {
    const select = $(selectId);
    select.innerHTML = '';
    const hasGroups = entries.some((item) => item.group);
    if (!hasGroups) {
      for (const item of entries) {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        select.append(option);
      }
      select.value = selected;
      return;
    }
    const groups = [];
    for (const item of entries) {
      const label = item.group || 'Autre';
      if (!groups.includes(label)) groups.push(label);
    }
    for (const groupName of groups) {
      const group = document.createElement('optgroup');
      group.label = groupName;
      entries.filter((item) => (item.group || 'Autre') === groupName).forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        group.append(opt);
      });
      select.append(group);
    }
    select.value = selected;
  }

  function getTarget() {
    return TARGETS.find((t) => t.id === state.targetId) || TARGETS[0];
  }

  function updateControls() {
    const target = getTarget();
    $('targetPreset').value = target.id;
    $('sizeMode').value = target.id === 'custom' ? 'custom' : state.sizeMode;
    $('sizeMode').disabled = target.id === 'custom';
    $('ephemerisDate').value = state.dateStr;
    $('dateFieldWrap').classList.toggle('hidden', state.sizeMode !== 'ephemeris' || target.id === 'custom');

    $('customDiameter').value = state.customDiameter;
    $('customRing').value = state.customRing;
    $('customRingTilt').value = state.customRingTilt;
    const hasRings = target.id === 'saturn' || target.id === 'custom';
    $('customRing').disabled = !hasRings;
    $('customRingTilt').disabled = !hasRings;

    $('telescope').value = state.telescopeId;
    $('aperture').value = state.aperture;
    $('focal').value = state.focal;
    $('seeingPreset').value = state.seeingId;
    $('customSeeingRow').classList.toggle('hidden', state.seeingId !== 'custom');
    $('samplingK').value = state.samplingK;
    $('wavelengthPreset').value = state.wavelengthId;
    $('customWavelengthRow').classList.toggle('hidden', state.wavelengthId !== 'custom');
    $('wavelengthNm').value = state.wavelengthNm;

    $('barlow').value = state.barlowId;
    $('barlowMode').value = state.barlowMode;
    $('barlowFocalMm').value = state.barlowFocalMm;
    $('barlowNominalFactor').value = state.barlowNominalFactor;
    $('barlowBarrelMm').value = state.barlowBarrelMm;
    $('spacerMm').value = Math.min(150, state.spacerMm);
    $('spacerInput').value = state.spacerMm;
    $('spacerValue').textContent = `${dec(state.spacerMm, 0)} mm`;
    $('useAdc').checked = state.useAdc;
    $('adcMm').value = state.adcMm;
    $('adcHint').textContent = `(+${dec(state.adcMm, 0)} mm)`;
    $('useFilterWheel').checked = state.useFilterWheel;
    $('filterMm').value = state.filterMm;
    $('filterHint').textContent = `(+${dec(state.filterMm, 0)} mm)`;
    $('cameraBackfocusMm').value = state.cameraBackfocusMm;
    $('fixedFactor').value = state.fixedFactor;

    const isNone = state.barlowMode === 'none';
    const isFixed = state.barlowMode === 'fixed';
    const isDiverging = state.barlowMode === 'diverging';
    $('spacingControls').classList.toggle('hidden', isNone || isFixed);
    $('fixedFactorRow').classList.toggle('hidden', state.barlowId !== 'custom_fixed');
    $('barlowFocalWrap').classList.toggle('hidden', !isDiverging);
    $('barlowNominalWrap').classList.toggle('hidden', isDiverging || isNone);
    $('barlowBarrelMm').disabled = isNone || isFixed;
    $('adcMm').disabled = isNone || isFixed;
    $('filterMm').disabled = isNone || isFixed;

    $('camera').value = state.cameraId;
    $('pixelsX').value = state.pixelsX;
    $('pixelsY').value = state.pixelsY;
    $('pixelUm').value = state.pixelUm;
    $('binning').value = String(state.binning);
    $('roiPreset').value = state.roiId;
    $('roiX').value = state.roiId === 'full' ? Math.max(1, Math.floor(state.pixelsX / state.binning)) : state.roiX;
    $('roiY').value = state.roiId === 'full' ? Math.max(1, Math.floor(state.pixelsY / state.binning)) : state.roiY;
    $('rotation').value = state.rotation;
    $('rotationValue').textContent = `${state.rotation}°`;
    $('mosaic').value = String(state.mosaic);
    $('overlap').value = state.overlap;
    $('overlap').disabled = Number(state.mosaic) === 1;

    $('viewMode').value = state.viewMode;
    $('toggleGrid').setAttribute('aria-pressed', String(state.showGrid));
  }

  function validateSettings() {
    const target = getTarget();
    const effectiveMode = target.id === 'custom' ? 'custom' : state.sizeMode;
    const targetGeom = computeTargetGeometry({
      target,
      sizeMode: effectiveMode,
      dateStr: state.dateStr,
      customDiameterArcsec: state.customDiameter,
      customRingArcsec: state.customRing,
      customRingTiltDeg: state.customRingTilt
    });

    const spacing = computeBarlowSpacing({
      barlowMode: state.barlowMode,
      nominalFactor: state.barlowMode === 'fixed' ? state.fixedFactor : state.barlowNominalFactor,
      barlowFocalMm: state.barlowFocalMm,
      barlowBarrelMm: state.barlowBarrelMm,
      spacerMm: state.spacerMm,
      useAdc: state.useAdc,
      adcMm: state.adcMm,
      useFilterWheel: state.useFilterWheel,
      filterMm: state.filterMm,
      cameraBackfocusMm: state.cameraBackfocusMm,
      progressiveRefMm: state.progressiveRefMm,
      progressiveGainPerMm: state.progressiveGainPerMm
    });

    const isFullRoi = state.roiId === 'full';
    const optics = calculatePlanetaryOptics({
      apertureMm: state.aperture,
      focalMm: state.focal,
      factor: spacing.effectiveFactor,
      pixelsX: state.pixelsX,
      pixelsY: state.pixelsY,
      pixelUm: state.pixelUm,
      binning: state.binning,
      roiX: isFullRoi ? null : state.roiX,
      roiY: isFullRoi ? null : state.roiY,
      wavelengthNm: state.wavelengthNm,
      samplingK: state.samplingK
    });

    const guidance = computeSpacingGuidance({
      barlowMode: state.barlowMode,
      barlowFocalMm: state.barlowFocalMm,
      totalSpacingMm: spacing.totalSpacingMm,
      idealFactor: optics.idealFactor,
      progressiveRefMm: state.progressiveRefMm,
      progressiveGainPerMm: state.progressiveGainPerMm,
      nominalFactor: state.barlowNominalFactor
    });

    const mosaicMetrics = computePlanetaryMosaic({
      optics,
      mosaic: state.mosaic,
      overlapPercent: state.overlap
    });

    const footprint = computeTargetFootprint({ optics, targetGeom, mosaicMetrics });
    return { target, targetGeom, spacing, optics, guidance, mosaicMetrics, footprint };
  }

  function syncMetrics(calc) {
    const { target, targetGeom, spacing, optics, guidance, mosaicMetrics, footprint } = calc;
    const isMosaic = mosaicMetrics.countPerAxis > 1;

    $('objectTitle').textContent = target.name;
    const sizeParts = [`Diamètre ${formatAngleArcsec(targetGeom.diameterArcsec)}`];
    if (targetGeom.ringArcsec > 0) {
      sizeParts.push(`Anneaux ${formatAngleArcsec(targetGeom.ringArcsec)} (incl. ${dec(targetGeom.ringTiltDeg, 1)}°)`);
    }
    if (targetGeom.distanceAu !== null) {
      if (targetGeom.distanceKm) sizeParts.push(`Dist. ${intFmt.format(Math.round(targetGeom.distanceKm))} km`);
      else sizeParts.push(`Dist. ${dec(targetGeom.distanceAu, 2)} UA`);
    }
    if (targetGeom.illumination < 0.995) {
      sizeParts.push(`Phase ${dec(targetGeom.illumination * 100, 0)} %`);
    }
    sizeParts.push(`Résolution Airy ${dec(optics.airyDiameterArcsec, 2)}″`);
    $('positionLabel').textContent = sizeParts.join(' · ');

    // Keep computed geometry visible inside target details when not in custom mode
    if (target.id !== 'custom' && state.sizeMode !== 'custom') {
      $('customDiameter').value = Number(targetGeom.diameterArcsec.toFixed(2));
      $('customRing').value = targetGeom.ringArcsec ? Number(targetGeom.ringArcsec.toFixed(2)) : 0;
      $('customRingTilt').value = targetGeom.ringTiltDeg ? Number(targetGeom.ringTiltDeg.toFixed(1)) : 0;
    }

    // Stat 1: Target size in pixels
    const primaryPx = targetGeom.ringArcsec > 0 ? footprint.ringWidthPx : footprint.diameterPx;
    const secondaryPx = targetGeom.ringArcsec > 0 ? footprint.diameterPx : footprint.polarPx;
    $('statTargetPx').innerHTML = targetGeom.ringArcsec > 0
      ? `${intFmt.format(Math.round(primaryPx))} <span>px (anneaux)</span>`
      : `${intFmt.format(Math.round(footprint.diameterPx))} <span>× ${intFmt.format(Math.round(secondaryPx))} px</span>`;

    const covEl = $('statTargetCoverage');
    if (isMosaic) {
      if (footprint.fitsMosaic) {
        covEl.textContent = `${dec(footprint.mosaicCoveragePct, 1)} % de la mosaïque · marge ${dec(footprint.mosaicMarginFactor, 1)}×`;
        covEl.className = 'muted status-ok';
      } else {
        covEl.textContent = `Dépasse la mosaïque (${dec(footprint.mosaicCoveragePct, 0)} %)`;
        covEl.className = 'muted status-bad';
      }
    } else if (!footprint.fitsSensor) {
      covEl.textContent = `Dépasse du capteur (${dec(footprint.sensorCoveragePct, 0)} %) — essaie une mosaïque`;
      covEl.className = 'muted status-bad';
    } else if (!footprint.fitsRoi) {
      covEl.textContent = `Dépasse du ROI (${dec(footprint.roiCoveragePct, 0)} %)`;
      covEl.className = 'muted status-warn';
    } else {
      covEl.textContent = `${dec(footprint.roiCoveragePct, 1)} % du ROI · marge ${dec(footprint.roiMarginFactor, 1)}×`;
      covEl.className = 'muted';
    }

    // Stat 2: Sampling
    $('statScale').innerHTML = `${dec(optics.scaleArcsecPerPixel, 3)} <span>″/px</span>`;
    const sampEl = $('statSampling');
    const st = optics.samplingStatus;
    const statusClass = st.code === 'optimal' ? 'status-ok' : (st.code === 'slightly_under' || st.code === 'slightly_over') ? 'status-warn' : 'status-bad';
    sampEl.innerHTML = `<span class="${statusClass}">${st.label}</span> · cible f/${dec(optics.optimalFocalRatio, 1)}`;

    // Stat 3: Effective focal length & Barlow
    $('statFocal').innerHTML = `${intFmt.format(Math.round(optics.effectiveFocalMm))} <span>mm</span> <span class="muted">(f/${dec(optics.effectiveFocalRatio, 1)})</span>`;
    if (state.barlowMode === 'none') {
      $('statFactor').textContent = `Au foyer (f/${dec(optics.nativeFocalRatio, 1)}) · idéal ~${dec(optics.idealFactor, 2)}×`;
    } else if (state.barlowMode === 'fixed' || state.barlowMode === 'telecentric') {
      $('statFactor').textContent = `${intFmt.format(state.focal)} mm × ${dec(optics.effectiveFactor, 2)} (fixe) · tirage ${dec(spacing.totalSpacingMm, 0)} mm`;
    } else {
      $('statFactor').textContent = `${intFmt.format(state.focal)} mm × ${dec(optics.effectiveFactor, 2)} · tirage ${dec(spacing.totalSpacingMm, 0)} mm`;
    }

    // Stat 4: Active FOV & sensor / mosaic
    const fovW = isMosaic ? mosaicMetrics.widthArcsec : optics.fovWidthArcsec;
    const fovH = isMosaic ? mosaicMetrics.heightArcsec : optics.fovHeightArcsec;
    $('statFov').innerHTML = `${formatAngleArcsec(fovW)} <span>×</span> ${formatAngleArcsec(fovH)}`;
    $('statSensor').textContent = isMosaic
      ? `Mosaïque ${mosaicMetrics.countPerAxis} × ${mosaicMetrics.countPerAxis} · ${mosaicMetrics.overlapPercent} % de recouvrement`
      : `ROI ${optics.activePxX} × ${optics.activePxY} px · capteur ${dec(optics.sensorWidthMm)} × ${dec(optics.sensorHeightMm)} mm`;

    // Spacing guidance summary inside Barlow details
    const summaryEl = $('spacingSummary');
    if (state.barlowMode === 'none') {
      summaryEl.textContent = `Sans Barlow : facteur idéal estimé ${dec(optics.idealFactor, 2)}× (pour f/${dec(optics.optimalFocalRatio, 1)}).`;
    } else if (guidance.adjustable) {
      const sign = guidance.deltaMm >= 0 ? '+' : '−';
      const absDelta = Math.abs(guidance.deltaMm);
      const advice = absDelta < 3
        ? 'tirage déjà au point optimal.'
        : guidance.deltaMm > 0
          ? `ajoute ~${dec(absDelta, 0)} mm de bague pour viser f/${dec(optics.optimalFocalRatio, 1)}.`
          : `retire ~${dec(absDelta, 0)} mm de tirage pour viser f/${dec(optics.optimalFocalRatio, 1)}.`;
      summaryEl.textContent = `Tirage total : ${dec(spacing.totalSpacingMm, 1)} mm → ${dec(optics.effectiveFactor, 2)}× (${sign}${dec(absDelta, 0)} mm : ${advice})`;
    } else {
      summaryEl.textContent = `Tirage mécanique : ${dec(spacing.totalSpacingMm, 1)} mm · facteur fixe ${dec(optics.effectiveFactor, 2)}× (cible idéale ~${dec(optics.idealFactor, 2)}×).`;
    }

    // Atlas bottom status
    const statusEl = $('atlasStatus');
    statusEl.innerHTML = `<span class="${statusClass}">${st.label}</span> · f/${dec(optics.effectiveFocalRatio, 1)} · Airy ${dec(optics.airyDiameterPx, 1)} px`;
    if (isMosaic) {
      $('legendLabel').textContent = `${mosaicMetrics.panelCount} champs mosaïque (${mosaicMetrics.overlapPercent} %)`;
    } else {
      $('legendLabel').textContent = state.roiId === 'full'
        ? `Plein capteur (${optics.sensorBinPxX}×${optics.sensorBinPxY})`
        : `ROI ${optics.activePxX}×${optics.activePxY} / ${optics.sensorBinPxX}×${optics.sensorBinPxY}`;
    }
  }

  function getBasePixelsPerSensorPx(width, height, calc) {
    const { optics, mosaicMetrics, footprint } = calc;
    const pad = 0.78;
    if (state.viewMode === 'sensor') {
      const spanX = Math.max(optics.sensorBinPxX, mosaicMetrics.widthPx);
      const spanY = Math.max(optics.sensorBinPxY, mosaicMetrics.heightPx);
      return Math.min((width * pad) / spanX, (height * pad) / spanY);
    }
    if (state.viewMode === 'planet') {
      const span = Math.max(footprint.maxSpanPx, optics.airyDiameterPx * 3, 24);
      return Math.min((width * 0.56) / span, (height * 0.56) / span);
    }
    // 'roi': frame active ROI or full mosaic (and include target if larger)
    const frameW = mosaicMetrics.countPerAxis > 1 ? mosaicMetrics.widthPx : optics.activePxX;
    const frameH = mosaicMetrics.countPerAxis > 1 ? mosaicMetrics.heightPx : optics.activePxY;
    const spanX = Math.max(frameW, footprint.maxSpanPx * 1.15);
    const spanY = Math.max(frameH, footprint.maxSpanPx * 1.15);
    return Math.min((width * pad) / spanX, (height * pad) / spanY);
  }

  function niceArcsecStep(pxPerArcsec) {
    const candidates = [0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200];
    for (const c of candidates) {
      const len = c * pxPerArcsec;
      if (len >= 55 && len <= 165) return c;
    }
    return candidates[candidates.length - 1];
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawGrid(ctx, width, height, cx, cy, pxPerSensorPx, optics) {
    if (!state.showGrid) return;

    // Individual pixel grid when zoomed far enough in (>= 5 screen px per sensor pixel)
    if (pxPerSensorPx >= 5) {
      ctx.save();
      ctx.strokeStyle = pxPerSensorPx >= 14 ? 'rgba(139, 145, 156, 0.22)' : 'rgba(139, 145, 156, 0.12)';
      ctx.lineWidth = 1;
      const ox = (optics.activePxX % 2) * 0.5;
      const oy = (optics.activePxY % 2) * 0.5;
      const minCol = Math.floor(-cx / pxPerSensorPx) - 1;
      const maxCol = Math.ceil((width - cx) / pxPerSensorPx) + 1;
      const minRow = Math.floor(-cy / pxPerSensorPx) - 1;
      const maxRow = Math.ceil((height - cy) / pxPerSensorPx) + 1;
      ctx.beginPath();
      for (let col = minCol; col <= maxCol; col++) {
        const x = cx + (col + ox) * pxPerSensorPx;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let row = minRow; row <= maxRow; row++) {
        const y = cy + (row + oy) * pxPerSensorPx;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Subtle arcsecond reticle crosshairs around center
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 145, 156, 0.16)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // Subtle reference rings if planet is tiny compared to sensor
    const pxPerArcsec = pxPerSensorPx / optics.scaleArcsecPerPixel;
    const stepArcsec = niceArcsecStep(pxPerArcsec);
    const r = stepArcsec * pxPerArcsec;
    if (r > 24 && r < Math.min(width, height) * 0.45) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPhasedDisc(ctx, rx, ry, color, illumination, phaseSign) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    // Dark side base
    ctx.fillStyle = '#181a20';
    ctx.fillRect(-rx - 2, -ry - 2, rx * 2 + 4, ry * 2 + 4);

    // Lit limb gradient
    const grad = ctx.createRadialGradient(-rx * 0.2 * phaseSign, -ry * 0.15, rx * 0.1, 0, 0, rx * 1.05);
    grad.addColorStop(0, color);
    grad.addColorStop(0.85, color);
    grad.addColorStop(1, '#7c7566');
    ctx.fillStyle = grad;

    const k = Math.max(0.02, Math.min(1, illumination));
    const termRx = rx * Math.abs(2 * k - 1);
    const sunlitRight = phaseSign >= 0;

    ctx.beginPath();
    if (sunlitRight) {
      ctx.ellipse(0, 0, rx, ry, 0, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(0, 0, termRx, ry, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
    } else {
      ctx.ellipse(0, 0, rx, ry, 0, Math.PI / 2, -Math.PI / 2, false);
      ctx.ellipse(0, 0, termRx, ry, 0, -Math.PI / 2, Math.PI / 2, k < 0.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawJupiter(ctx, rx, ry) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    const grad = ctx.createRadialGradient(-rx * 0.18, -ry * 0.18, rx * 0.1, 0, 0, rx);
    grad.addColorStop(0, '#f3dfc0');
    grad.addColorStop(0.75, '#d6b084');
    grad.addColorStop(1, '#7a593a');
    ctx.fillStyle = grad;
    ctx.fillRect(-rx, -ry, rx * 2, ry * 2);

    // Cloud belts (illustrative schematic)
    const bands = [
      { y: -0.58, h: 0.11, color: 'rgba(130, 88, 52, 0.35)' },
      { y: -0.26, h: 0.16, color: 'rgba(148, 86, 48, 0.58)' },
      { y: 0.18, h: 0.18, color: 'rgba(142, 82, 46, 0.55)' },
      { y: 0.52, h: 0.1, color: 'rgba(122, 84, 52, 0.32)' }
    ];
    for (const b of bands) {
      ctx.fillStyle = b.color;
      ctx.fillRect(-rx, b.y * ry - (b.h * ry) / 2, rx * 2, b.h * ry);
    }

    // Subtle GRS
    if (rx > 10) {
      ctx.fillStyle = 'rgba(188, 88, 56, 0.72)';
      ctx.beginPath();
      ctx.ellipse(rx * 0.25, ry * 0.23, rx * 0.13, ry * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSaturn(ctx, rx, ry, ringRx, ringRy, tiltDeg) {
    const clampedRingRy = Math.max(1.2, ringRy);
    const ringBand = Math.max(2, ringRx - rx * 1.25);
    const outerWidth = Math.max(1, ringBand * 0.32);
    const innerWidth = Math.max(1, ringBand * 0.38);
    const outerR = Math.max(0.5, 1 - (outerWidth / 2) / ringRx);
    const innerR = outerR - (outerWidth / 2 + innerWidth / 2) / ringRx - 0.045;
    const clipH = clampedRingRy * 1.5 + outerWidth + 10;

    const drawRingHalf = (isBottomHalf) => {
      ctx.save();
      ctx.beginPath();
      if (isBottomHalf) ctx.rect(-ringRx - outerWidth - 6, 0, (ringRx + outerWidth) * 2 + 12, clipH);
      else ctx.rect(-ringRx - outerWidth - 6, -clipH, (ringRx + outerWidth) * 2 + 12, clipH);
      ctx.clip();

      // Outer A ring + inner B ring separated by Cassini gap
      ctx.strokeStyle = 'rgba(220, 200, 162, 0.92)';
      ctx.lineWidth = outerWidth;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRx * outerR, clampedRingRy * outerR, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (innerR > 0.45) {
        ctx.strokeStyle = 'rgba(244, 224, 184, 0.96)';
        ctx.lineWidth = innerWidth;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRx * innerR, clampedRingRy * innerR, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    // For B >= 0 (northern face visible), northern half (top) is behind globe, southern half (bottom) is in front.
    const frontIsBottom = tiltDeg >= 0;
    drawRingHalf(!frontIsBottom);

    // Globe
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    const grad = ctx.createRadialGradient(-rx * 0.15, -ry * 0.18, rx * 0.1, 0, 0, rx);
    grad.addColorStop(0, '#f4e4bd');
    grad.addColorStop(0.75, '#ceb37d');
    grad.addColorStop(1, '#7e6844');
    ctx.fillStyle = grad;
    ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    ctx.fillStyle = 'rgba(130, 102, 62, 0.28)';
    ctx.fillRect(-rx, -ry * 0.2, rx * 2, ry * 0.25);
    ctx.restore();

    drawRingHalf(frontIsBottom);
  }

  function drawTargetDisc(ctx, cx, cy, pxPerSensorPx, calc) {
    const { target, targetGeom, footprint } = calc;
    const rx = Math.max(0.8, (footprint.diameterPx * pxPerSensorPx) / 2);
    const ry = Math.max(0.8, (footprint.polarPx * pxPerSensorPx) / 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((state.rotation * Math.PI) / 180);

    if (target.id === 'jupiter') {
      drawJupiter(ctx, rx, ry);
    } else if (target.id === 'saturn') {
      const ringRx = Math.max(rx * 1.2, (footprint.ringWidthPx * pxPerSensorPx) / 2);
      const ringRy = (footprint.ringHeightPx * pxPerSensorPx) / 2;
      drawSaturn(ctx, rx, ry, ringRx, ringRy, targetGeom.ringTiltDeg);
    } else if (target.id === 'mars') {
      drawPhasedDisc(ctx, rx, ry, '#db7a4b', targetGeom.illumination, targetGeom.phaseSign);
      if (rx > 8) {
        ctx.fillStyle = 'rgba(245, 245, 250, 0.8)';
        ctx.beginPath();
        ctx.ellipse(0, -ry * 0.86, rx * 0.22, ry * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (target.id === 'venus' || target.id === 'mercury') {
      drawPhasedDisc(ctx, rx, ry, target.color, targetGeom.illumination, targetGeom.phaseSign);
    } else if (target.kind === 'sun') {
      const grad = ctx.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx);
      grad.addColorStop(0, '#fff0ba');
      grad.addColorStop(0.72, '#ffbe4f');
      grad.addColorStop(1, '#d96f1f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
    } else if (target.kind === 'moon' || target.kind === 'lunar_feature') {
      const grad = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, rx * 0.1, 0, 0, rx);
      grad.addColorStop(0, '#e2e5eb');
      grad.addColorStop(0.8, '#aeb4bf');
      grad.addColorStop(1, '#686e7a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      if (target.kind === 'lunar_feature') {
        ctx.fillStyle = 'rgba(207, 211, 218, 0.16)';
        ctx.fill();
        ctx.strokeStyle = '#cfd3da';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
      } else {
        ctx.fill();
        if (rx > 18) {
          ctx.fillStyle = 'rgba(72, 77, 88, 0.35)';
          for (const [mx, my, mr] of [[-0.28, -0.22, 0.22], [0.18, -0.15, 0.24], [0.05, 0.25, 0.16], [-0.35, 0.18, 0.14]]) {
            ctx.beginPath();
            ctx.arc(mx * rx, my * ry, mr * rx, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else if (target.id === 'custom') {
      ctx.fillStyle = 'rgba(255, 179, 71, 0.22)';
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (footprint.ringWidthPx > footprint.diameterPx) {
        ctx.beginPath();
        ctx.ellipse(0, 0, (footprint.ringWidthPx * pxPerSensorPx) / 2, Math.max(1.5, (footprint.ringHeightPx * pxPerSensorPx) / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Uranus / Neptune
      const grad = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, rx * 0.1, 0, 0, rx);
      grad.addColorStop(0, target.color);
      grad.addColorStop(1, '#365878');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny halo marker if target disc is sub-3px on current zoom
    if (rx < 3) {
      ctx.strokeStyle = 'rgba(255, 179, 71, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFramingOverlay(ctx, cx, cy, pxPerSensorPx, optics, mosaicMetrics) {
    const sW = optics.sensorBinPxX * pxPerSensorPx;
    const sH = optics.sensorBinPxY * pxPerSensorPx;
    const rW = optics.activePxX * pxPerSensorPx;
    const rH = optics.activePxY * pxPerSensorPx;

    ctx.save();
    ctx.font = '11px system-ui, -apple-system, sans-serif';

    if (mosaicMetrics.countPerAxis > 1) {
      for (const p of mosaicMetrics.panels) {
        const px = cx + p.centerOffsetPxX * pxPerSensorPx - rW / 2;
        const py = cy + p.centerOffsetPxY * pxPerSensorPx - rH / 2;
        ctx.fillStyle = 'rgba(255, 179, 71, 0.04)';
        ctx.fillRect(px, py, rW, rH);
        ctx.strokeStyle = 'rgba(255, 179, 71, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(px, py, rW, rH);
        if (rW > 34 && rH > 24) {
          ctx.fillStyle = 'rgba(255, 179, 71, 0.72)';
          ctx.fillText(String(p.index), px + 6, py + 15);
        }
      }
      const mW = mosaicMetrics.widthPx * pxPerSensorPx;
      const mH = mosaicMetrics.heightPx * pxPerSensorPx;
      ctx.fillStyle = '#ffb347';
      ctx.fillText(
        `Mosaïque ${mosaicMetrics.countPerAxis} × ${mosaicMetrics.countPerAxis} · ${formatAngleArcsec(mosaicMetrics.widthArcsec)} × ${formatAngleArcsec(mosaicMetrics.heightArcsec)}`,
        cx - mW / 2 + 4,
        cy - mH / 2 - 7
      );
      ctx.restore();
      return;
    }

    // Full sensor outline
    ctx.strokeStyle = 'rgba(139, 145, 156, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(cx - sW / 2, cy - sH / 2, sW, sH);
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(139, 145, 156, 0.8)';
    if (sW > 90 && (optics.activePxX !== optics.sensorBinPxX || optics.activePxY !== optics.sensorBinPxY)) {
      ctx.fillText(`Capteur ${optics.sensorBinPxX} × ${optics.sensorBinPxY} px`, cx - sW / 2 + 6, cy - sH / 2 - 6);
    }

    // Active ROI frame in Muon amber
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - rW / 2, cy - rH / 2, rW, rH);

    // Subtle label on top of ROI
    ctx.fillStyle = '#ffb347';
    const roiText = state.roiId === 'full'
      ? `${optics.activePxX} × ${optics.activePxY} px (${formatAngleArcsec(optics.fovWidthArcsec)} × ${formatAngleArcsec(optics.fovHeightArcsec)})`
      : `ROI ${optics.activePxX} × ${optics.activePxY} px (${formatAngleArcsec(optics.fovWidthArcsec)} × ${formatAngleArcsec(optics.fovHeightArcsec)})`;
    ctx.fillText(roiText, cx - rW / 2 + 4, cy - rH / 2 - 7);
    ctx.restore();
  }

  function drawScaleBar(ctx, height, pxPerSensorPx, scaleArcsecPerPixel) {
    const pxPerArcsec = pxPerSensorPx / scaleArcsecPerPixel;
    const stepArcsec = niceArcsecStep(pxPerArcsec);
    const barPx = stepArcsec * pxPerArcsec;
    const eqSensorPx = stepArcsec / scaleArcsecPerPixel;
    const x = 16;
    const y = height - 22;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 17, 21, 0.78)';
    ctx.strokeStyle = 'rgba(38, 42, 51, 0.9)';
    ctx.lineWidth = 1;
    const boxW = Math.max(barPx + 20, 120);
    roundRectPath(ctx, x - 6, y - 22, boxW, 34, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#e6e8eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + barPx, y);
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + 3);
    ctx.moveTo(x + barPx, y - 4);
    ctx.lineTo(x + barPx, y + 3);
    ctx.stroke();

    ctx.fillStyle = '#e6e8eb';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${formatAngleArcsec(stepArcsec)} · ${dec(eqSensorPx, eqSensorPx >= 10 ? 0 : 1)} px`, x, y - 8);
    ctx.restore();
  }

  function drawAiryInset(ctx, width, optics) {
    const boxW = 148;
    const boxH = 122;
    const bx = width - boxW - 14;
    const by = 14;
    if (bx < 120) return;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 17, 21, 0.86)';
    ctx.strokeStyle = '#262a33';
    ctx.lineWidth = 1;
    roundRectPath(ctx, bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8b919c';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Tache d’Airy (${Math.round(state.wavelengthNm)} nm)`, bx + 10, by + 17);

    // Draw adaptive odd sensor pixel grid centered in inset so Airy diameter stays to true scale
    const gridSizePx = 66;
    const gridPx = [5, 9, 13, 19, 27].find((n) => optics.airyDiameterPx <= n * 0.85) || 27;
    const cell = gridSizePx / gridPx;
    const gx = bx + boxW / 2 - gridSizePx / 2;
    const gy = by + 24;
    const cx = bx + boxW / 2;
    const cy = gy + gridSizePx / 2;

    ctx.strokeStyle = 'rgba(139, 145, 156, 0.32)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridPx; i++) {
      ctx.beginPath();
      ctx.moveTo(gx + i * cell, gy);
      ctx.lineTo(gx + i * cell, gy + gridSizePx);
      ctx.moveTo(gx, gy + i * cell);
      ctx.lineTo(gx + gridSizePx, gy + i * cell);
      ctx.stroke();
    }

    // Airy first dark ring radius in pixels: airyDiameterPx / 2
    const displayR = Math.min(gridSizePx * 0.48, Math.max(1.8, (optics.airyDiameterPx / 2) * cell));

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, displayR);
    grad.addColorStop(0, 'rgba(255, 224, 155, 0.95)');
    grad.addColorStop(0.55, 'rgba(255, 179, 71, 0.45)');
    grad.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, displayR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, displayR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e6e8eb';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Airy ${dec(optics.airyDiameterArcsec, 2)}″ = ${dec(optics.airyDiameterPx, 1)} px`, bx + 10, by + boxH - 10);
    ctx.restore();
  }

  function drawCanvas(calc) {
    const canvas = $('skyCanvas');
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const baseScale = getBasePixelsPerSensorPx(rect.width, rect.height, calc);
    const pxPerSensorPx = baseScale * viewZoom;
    const cx = rect.width / 2 + viewPanX;
    const cy = rect.height / 2 + viewPanY;

    drawGrid(ctx, rect.width, rect.height, cx, cy, pxPerSensorPx, calc.optics);
    drawTargetDisc(ctx, cx, cy, pxPerSensorPx, calc);
    drawFramingOverlay(ctx, cx, cy, pxPerSensorPx, calc.optics, calc.mosaicMetrics);
    drawScaleBar(ctx, rect.height, pxPerSensorPx, calc.optics.scaleArcsecPerPixel);
    drawAiryInset(ctx, rect.width, calc.optics);
  }

  function render() {
    try {
      report('');
      const calc = validateSettings();
      lastCalculated = calc;
      syncMetrics(calc);
      drawCanvas(calc);
    } catch (err) {
      report(err.message, true);
    }
  }

  function fitFrame() {
    viewPanX = 0;
    viewPanY = 0;
    viewZoom = 1;
    if (lastCalculated) drawCanvas(lastCalculated);
  }

  function setNumeric(key, elementId, options = {}) {
    $(elementId).addEventListener('change', () => {
      const input = $(elementId);
      const v = Number(input.value);
      if (!input.value.trim() || !Number.isFinite(v) || (options.min !== undefined && v < options.min) || (options.max !== undefined && v > options.max)) {
        report(`Valeur invalide pour « ${options.label || key} ».`, true);
        updateControls();
        return;
      }
      state[key] = v;
      if (options.onValid) options.onValid(v);
      updateControls();
      render();
    });
  }

  function applyBarlowPreset(item) {
    state.barlowId = item.id;
    state.barlowMode = item.mode;
    state.barlowNominalFactor = item.nominalFactor;
    state.barlowFocalMm = item.barlowFocalMm;
    state.barlowBarrelMm = item.barlowBarrelMm;
    state.progressiveRefMm = item.progressiveRefMm ?? 12.5;
    state.progressiveGainPerMm = item.progressiveGainPerMm ?? (1 / 35);
    if (item.mode === 'fixed') state.fixedFactor = item.nominalFactor;
  }

  function setupEvents() {
    $('targetPreset').addEventListener('change', () => {
      const item = TARGETS.find((t) => t.id === $('targetPreset').value);
      if (!item) return;
      state.targetId = item.id;
      if (item.id === 'custom') state.sizeMode = 'custom';
      else if (state.sizeMode === 'custom') state.sizeMode = 'ephemeris';
      updateControls();
      fitFrame();
      render();
    });

    $('sizeMode').addEventListener('change', () => {
      const mode = $('sizeMode').value;
      if (mode === 'custom' && lastCalculated) {
        state.customDiameter = Number(lastCalculated.targetGeom.diameterArcsec.toFixed(2));
        state.customRing = lastCalculated.targetGeom.ringArcsec ? Number(lastCalculated.targetGeom.ringArcsec.toFixed(2)) : 0;
        state.customRingTilt = lastCalculated.targetGeom.ringTiltDeg ? Number(lastCalculated.targetGeom.ringTiltDeg.toFixed(1)) : 0;
      }
      state.sizeMode = mode;
      updateControls();
      render();
    });

    $('ephemerisDate').addEventListener('change', () => {
      if ($('ephemerisDate').value) {
        state.dateStr = $('ephemerisDate').value;
        state.sizeMode = 'ephemeris';
        updateControls();
        render();
      }
    });

    setNumeric('customDiameter', 'customDiameter', {
      label: 'diamètre apparent', min: 0.1, max: 20000,
      onValid: () => { state.sizeMode = 'custom'; }
    });
    setNumeric('customRing', 'customRing', {
      label: 'diamètre anneaux', min: 0, max: 20000,
      onValid: () => { state.sizeMode = 'custom'; }
    });
    setNumeric('customRingTilt', 'customRingTilt', {
      label: 'inclinaison anneaux', min: -30, max: 30,
      onValid: () => { state.sizeMode = 'custom'; }
    });

    $('telescope').addEventListener('change', () => {
      const item = TELESCOPES.find((t) => t.id === $('telescope').value);
      if (!item) return;
      state.telescopeId = item.id;
      if (item.id !== 'custom') {
        state.aperture = item.aperture;
        state.focal = item.focal;
      }
      updateControls();
      render();
    });

    setNumeric('aperture', 'aperture', {
      label: 'diamètre', min: 10, max: 10000,
      onValid: () => { state.telescopeId = 'custom'; }
    });
    setNumeric('focal', 'focal', {
      label: 'focale', min: 10, max: 100000,
      onValid: () => { state.telescopeId = 'custom'; }
    });

    $('seeingPreset').addEventListener('change', () => {
      const item = SEEING_PRESETS.find((s) => s.id === $('seeingPreset').value);
      if (!item) return;
      state.seeingId = item.id;
      if (item.id !== 'custom') state.samplingK = item.k;
      updateControls();
      render();
    });
    setNumeric('samplingK', 'samplingK', {
      label: 'critère F/D', min: 1, max: 15,
      onValid: () => { state.seeingId = 'custom'; }
    });

    $('wavelengthPreset').addEventListener('change', () => {
      const item = WAVELENGTHS.find((w) => w.id === $('wavelengthPreset').value);
      if (!item) return;
      state.wavelengthId = item.id;
      if (item.id !== 'custom') state.wavelengthNm = item.nm;
      updateControls();
      render();
    });
    setNumeric('wavelengthNm', 'wavelengthNm', {
      label: 'longueur d’onde', min: 250, max: 2000,
      onValid: () => { state.wavelengthId = 'custom'; }
    });

    $('barlow').addEventListener('change', () => {
      const item = BARLOWS.find((b) => b.id === $('barlow').value);
      if (!item) return;
      applyBarlowPreset(item);
      updateControls();
      render();
    });

    $('barlowMode').addEventListener('change', () => {
      state.barlowMode = $('barlowMode').value;
      state.barlowId = state.barlowMode === 'none' ? 'none' : state.barlowMode === 'fixed' ? 'custom_fixed' : 'custom_div';
      updateControls();
      render();
    });

    setNumeric('barlowFocalMm', 'barlowFocalMm', {
      label: 'focale Barlow', min: 5, max: 2000,
      onValid: () => { state.barlowId = 'custom_div'; }
    });
    setNumeric('barlowNominalFactor', 'barlowNominalFactor', {
      label: 'facteur nominal', min: 0.1, max: 20,
      onValid: () => { if (state.barlowMode === 'fixed') state.fixedFactor = state.barlowNominalFactor; }
    });
    setNumeric('barlowBarrelMm', 'barlowBarrelMm', { label: 'corps Barlow', min: 0, max: 300 });
    setNumeric('cameraBackfocusMm', 'cameraBackfocusMm', { label: 'backfocus caméra', min: 0, max: 150 });
    setNumeric('adcMm', 'adcMm', { label: 'longueur ADC', min: 0, max: 200 });
    setNumeric('filterMm', 'filterMm', { label: 'tirage filtres', min: 0, max: 150 });
    setNumeric('fixedFactor', 'fixedFactor', {
      label: 'facteur fixe', min: 0.1, max: 20,
      onValid: () => { state.barlowId = 'custom_fixed'; state.barlowNominalFactor = state.fixedFactor; }
    });

    $('spacerMm').addEventListener('input', () => {
      state.spacerMm = Number($('spacerMm').value);
      $('spacerInput').value = state.spacerMm;
      $('spacerValue').textContent = `${dec(state.spacerMm, 0)} mm`;
      render();
    });
    setNumeric('spacerMm', 'spacerInput', { label: 'bagues allonges', min: 0, max: 300 });

    $('useAdc').addEventListener('change', () => {
      state.useAdc = $('useAdc').checked;
      render();
    });
    $('useFilterWheel').addEventListener('change', () => {
      state.useFilterWheel = $('useFilterWheel').checked;
      render();
    });

    $('camera').addEventListener('change', () => {
      const item = CAMERAS.find((c) => c.id === $('camera').value);
      if (!item) return;
      state.cameraId = item.id;
      if (item.id !== 'custom') {
        state.pixelsX = item.pixelsX;
        state.pixelsY = item.pixelsY;
        state.pixelUm = item.pixelUm;
        state.cameraBackfocusMm = item.backfocusMm;
      }
      updateControls();
      render();
    });

    setNumeric('pixelsX', 'pixelsX', { label: 'largeur capteur', min: 1, max: 100000, onValid: () => { state.cameraId = 'custom'; } });
    setNumeric('pixelsY', 'pixelsY', { label: 'hauteur capteur', min: 1, max: 100000, onValid: () => { state.cameraId = 'custom'; } });
    setNumeric('pixelUm', 'pixelUm', { label: 'taille pixel', min: 0.01, max: 100, onValid: () => { state.cameraId = 'custom'; } });

    $('roiPreset').addEventListener('change', () => {
      const item = ROI_PRESETS.find((r) => r.id === $('roiPreset').value);
      if (!item) return;
      state.roiId = item.id;
      if (item.width && item.height) {
        state.roiX = item.width;
        state.roiY = item.height;
      } else if (item.id === 'full') {
        state.roiX = Math.floor(state.pixelsX / state.binning);
        state.roiY = Math.floor(state.pixelsY / state.binning);
      }
      updateControls();
      fitFrame();
      render();
    });

    setNumeric('roiX', 'roiX', { label: 'largeur ROI', min: 16, max: 100000, onValid: () => { state.roiId = 'custom'; } });
    setNumeric('roiY', 'roiY', { label: 'hauteur ROI', min: 16, max: 100000, onValid: () => { state.roiId = 'custom'; } });

    $('binning').addEventListener('change', () => {
      state.binning = Number($('binning').value);
      updateControls();
      render();
    });

    $('rotation').addEventListener('input', () => {
      state.rotation = Number($('rotation').value);
      $('rotationValue').textContent = `${state.rotation}°`;
      render();
    });

    $('mosaic').addEventListener('change', () => {
      state.mosaic = Number($('mosaic').value);
      updateControls();
      fitFrame();
      render();
    });
    setNumeric('overlap', 'overlap', { label: 'recouvrement', min: 0, max: 60 });

    $('viewMode').addEventListener('change', () => {
      state.viewMode = $('viewMode').value;
      fitFrame();
      render();
    });

    $('toggleGrid').addEventListener('click', () => {
      state.showGrid = !state.showGrid;
      $('toggleGrid').setAttribute('aria-pressed', String(state.showGrid));
      if (lastCalculated) drawCanvas(lastCalculated);
    });

    $('fitFrame').addEventListener('click', fitFrame);

    const canvas = $('skyCanvas');
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!lastCalculated) return;
      const rect = canvas.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const cx = rect.width / 2 + viewPanX;
      const cy = rect.height / 2 + viewPanY;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nextZoom = Math.max(0.25, Math.min(40, viewZoom * zoomFactor));
      const ratio = nextZoom / viewZoom;
      viewPanX = (pointerX - rect.width / 2) - (pointerX - cx) * ratio;
      viewPanY = (pointerY - rect.height / 2) - (pointerY - cy) * ratio;
      viewZoom = nextZoom;
      drawCanvas(lastCalculated);
    }, { passive: false });

    canvas.addEventListener('pointerdown', (e) => {
      dragState = { x: e.clientX, y: e.clientY, panX: viewPanX, panY: viewPanY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragState || !lastCalculated) return;
      viewPanX = dragState.panX + (e.clientX - dragState.x);
      viewPanY = dragState.panY + (e.clientY - dragState.y);
      drawCanvas(lastCalculated);
    });
    canvas.addEventListener('pointerup', () => { dragState = null; });
    canvas.addEventListener('pointercancel', () => { dragState = null; });
    canvas.addEventListener('dblclick', fitFrame);

    window.addEventListener('resize', () => {
      if (lastCalculated) drawCanvas(lastCalculated);
    });

    $('reset').addEventListener('click', () => {
      state = buildDefaultState();
      updateControls();
      fitFrame();
      render();
      report('');
    });

    $('copyLink').addEventListener('click', async () => {
      const link = makeShareLink();
      try {
        await navigator.clipboard.writeText(link);
        const btn = $('copyLink');
        const prev = btn.textContent;
        btn.textContent = 'Lien copié';
        setTimeout(() => { btn.textContent = prev; }, 2200);
      } catch {
        window.prompt('Copie ce lien :', link);
      }
    });

    $('downloadJson').addEventListener('click', downloadConfig);
  }

  function makeShareLink() {
    const keys = [
      'targetId', 'sizeMode', 'dateStr', 'customDiameter', 'customRing', 'customRingTilt',
      'telescopeId', 'aperture', 'focal', 'wavelengthId', 'wavelengthNm', 'seeingId', 'samplingK',
      'barlowId', 'barlowMode', 'barlowNominalFactor', 'barlowFocalMm', 'barlowBarrelMm',
      'spacerMm', 'useAdc', 'adcMm', 'useFilterWheel', 'filterMm', 'cameraBackfocusMm', 'fixedFactor',
      'cameraId', 'pixelsX', 'pixelsY', 'pixelUm', 'binning', 'roiId', 'roiX', 'roiY', 'rotation',
      'mosaic', 'overlap', 'viewMode'
    ];
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    for (const key of keys) url.searchParams.set(key, String(state[key]));
    return url.toString();
  }

  function restoreFromURL() {
    const params = new URLSearchParams(location.search);
    if (!params.has('targetId') && !params.has('focal')) return;
    try {
      const draft = { ...state };
      const numKeys = [
        'customDiameter', 'customRing', 'customRingTilt', 'aperture', 'focal', 'wavelengthNm', 'samplingK',
        'barlowNominalFactor', 'barlowFocalMm', 'barlowBarrelMm', 'spacerMm', 'adcMm', 'filterMm',
        'cameraBackfocusMm', 'fixedFactor', 'pixelsX', 'pixelsY', 'pixelUm', 'binning', 'roiX', 'roiY',
        'rotation', 'mosaic', 'overlap'
      ];
      const textKeys = ['targetId', 'sizeMode', 'dateStr', 'telescopeId', 'wavelengthId', 'seeingId', 'barlowId', 'barlowMode', 'cameraId', 'roiId', 'viewMode'];
      const boolKeys = ['useAdc', 'useFilterWheel'];

      for (const k of numKeys) {
        if (params.has(k)) {
          const raw = params.get(k);
          if (!raw) throw new Error('Paramètre vide');
          draft[k] = Number(raw);
        }
      }
      for (const k of textKeys) {
        if (params.has(k)) draft[k] = params.get(k).slice(0, 64);
      }
      for (const k of boolKeys) {
        if (params.has(k)) draft[k] = params.get(k) === 'true';
      }

      if (!TARGETS.some((t) => t.id === draft.targetId)) draft.targetId = 'jupiter';
      if (!TELESCOPES.some((t) => t.id === draft.telescopeId)) draft.telescopeId = 'custom';
      if (!BARLOWS.some((b) => b.id === draft.barlowId)) draft.barlowId = 'custom_div';
      if (!CAMERAS.some((c) => c.id === draft.cameraId)) draft.cameraId = 'custom';
      if (!ROI_PRESETS.some((r) => r.id === draft.roiId)) draft.roiId = 'custom';
      if (!WAVELENGTHS.some((w) => w.id === draft.wavelengthId)) draft.wavelengthId = 'custom';
      if (!SEEING_PRESETS.some((s) => s.id === draft.seeingId)) draft.seeingId = 'custom';

      state = draft;
      validateSettings();
    } catch {
      state = buildDefaultState();
      report('Lien partagé invalide : paramètres par défaut restaurés.', true);
    }
  }

  function downloadConfig() {
    try {
      const calc = validateSettings();
      const output = {
        app: 'Muon Planétaire',
        version: '0.1',
        note: 'Geometric planetary optics, Barlow spacing, and Airy diffraction model.',
        target: {
          id: calc.target.id,
          name: calc.target.name,
          mode: state.sizeMode,
          date: state.sizeMode === 'ephemeris' ? state.dateStr : null,
          ...calc.targetGeom
        },
        telescope: {
          preset: state.telescopeId,
          apertureMm: state.aperture,
          nativeFocalMm: state.focal,
          wavelengthNm: state.wavelengthNm,
          samplingRuleFactor: state.samplingK
        },
        barlowAndSpacing: {
          preset: state.barlowId,
          ...calc.spacing,
          breakdownMm: {
            barlowBarrelMm: state.barlowBarrelMm,
            spacerMm: state.spacerMm,
            adcMm: state.useAdc ? state.adcMm : 0,
            filterMm: state.useFilterWheel ? state.filterMm : 0,
            cameraBackfocusMm: state.cameraBackfocusMm
          }
        },
        camera: {
          preset: state.cameraId,
          pixelsX: state.pixelsX,
          pixelsY: state.pixelsY,
          pixelUm: state.pixelUm,
          binning: state.binning,
          roiPreset: state.roiId,
          rotationDeg: state.rotation
        },
        optics: calc.optics,
        mosaic: calc.mosaicMetrics,
        footprint: calc.footprint,
        spacingGuidance: calc.guidance
      };
      const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'muon-planetaire.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {
      report(e.message, true);
    }
  }

  populateSelect('targetPreset', TARGETS, state.targetId);
  populateSelect('telescope', TELESCOPES, state.telescopeId);
  populateSelect('seeingPreset', SEEING_PRESETS, state.seeingId);
  populateSelect('wavelengthPreset', WAVELENGTHS, state.wavelengthId);
  populateSelect('barlow', BARLOWS, state.barlowId);
  populateSelect('camera', CAMERAS, state.cameraId);
  populateSelect('roiPreset', ROI_PRESETS, state.roiId);

  restoreFromURL();
  updateControls();
  setupEvents();
  render();
})();
