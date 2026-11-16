(function (root) {
  'use strict';
  /** Pure low-precision Solar System ephemeris (JPL Standish 1800-2050 AD) + Moon/Sun apparent size. */
  const RADIANS = Math.PI / 180;
  const DEGREES = 180 / Math.PI;
  const AU_KM = 149597870.7;
  const ARCSEC_PER_RAD = 206264.806247;
  const J2000_OBLIQUITY_RAD = 23.4392911 * RADIANS;

  // JPL Standish Keplerian elements (1800-2050 AD), J2000 mean ecliptic and equinox.
  // [a0, aDot, e0, eDot, i0, iDot, L0, LDot, wBar0, wBarDot, node0, nodeDot]
  const ORBITAL_ELEMENTS = {
    mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
    venus:   [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
    earth:   [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
    mars:    [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
    jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
    saturn:  [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
    uranus:  [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
    neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664]
  };

  function dateToJulianDay(dateStr) {
    const match = typeof dateStr === 'string' && dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new RangeError('Date invalide (format attendu AAAA-MM-JJ).');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const utcMs = Date.UTC(year, month - 1, day, 12, 0, 0);
    const probe = new Date(utcMs);
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
      throw new RangeError('Date calendaire invalide.');
    }
    return utcMs / 86400000 + 2440587.5;
  }

  function todayIsoDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function wrapDeg(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function solveEccentricAnomaly(meanAnomalyRad, eccentricity) {
    let E = meanAnomalyRad + eccentricity * Math.sin(meanAnomalyRad);
    for (let i = 0; i < 12; i++) {
      const f = E - eccentricity * Math.sin(E) - meanAnomalyRad;
      const fp = 1 - eccentricity * Math.cos(E);
      const step = f / fp;
      E -= step;
      if (Math.abs(step) < 1e-10) break;
    }
    return E;
  }

  /** Heliocentric J2000 ecliptic rectangular coordinates [x, y, z] in AU. */
  function heliocentricEcliptic(bodyId, jd) {
    const el = ORBITAL_ELEMENTS[bodyId];
    if (!el) throw new RangeError(`Corps orbital inconnu : ${bodyId}`);
    const T = (jd - 2451545.0) / 36525.0;
    const a = el[0] + el[1] * T;
    const e = el[2] + el[3] * T;
    const inc = (el[4] + el[5] * T) * RADIANS;
    const L = el[6] + el[7] * T;
    const wBar = el[8] + el[9] * T;
    const node = (el[10] + el[11] * T) * RADIANS;
    const argPeri = (wBar - (el[10] + el[11] * T)) * RADIANS;
    let M = wrapDeg(L - wBar);
    if (M > 180) M -= 360;
    const E = solveEccentricAnomaly(M * RADIANS, e);

    const xOrb = a * (Math.cos(E) - e);
    const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const cosW = Math.cos(argPeri), sinW = Math.sin(argPeri);
    const cosO = Math.cos(node), sinO = Math.sin(node);
    const cosI = Math.cos(inc), sinI = Math.sin(inc);

    const x = (cosW * cosO - sinW * sinO * cosI) * xOrb + (-sinW * cosO - cosW * sinO * cosI) * yOrb;
    const y = (cosW * sinO + sinW * cosO * cosI) * xOrb + (-sinW * sinO + cosW * cosO * cosI) * yOrb;
    const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;
    return [x, y, z];
  }

  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function norm(v) {
    return Math.hypot(v[0], v[1], v[2]);
  }

  function eclipticToEquatorial(vec) {
    const cosE = Math.cos(J2000_OBLIQUITY_RAD);
    const sinE = Math.sin(J2000_OBLIQUITY_RAD);
    return [vec[0], vec[1] * cosE - vec[2] * sinE, vec[1] * sinE + vec[2] * cosE];
  }

  /** Saturn ring tilt B (deg, positive = northern face) from Earth-to-Saturn J2000 vector. */
  function computeSaturnRingTiltDeg(geoVecEcliptic, jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const ra0 = (40.589 - 0.036 * T) * RADIANS;
    const dec0 = (83.537 - 0.004 * T) * RADIANS;
    const pole = [Math.cos(dec0) * Math.cos(ra0), Math.cos(dec0) * Math.sin(ra0), Math.sin(dec0)];
    const eq = eclipticToEquatorial(geoVecEcliptic);
    const d = norm(eq);
    // Vector from Saturn towards Earth is -eq / d; sin(B) = (-eq/d) . pole.
    const sinB = Math.max(-1, Math.min(1, -dot(eq, pole) / d));
    return Math.asin(sinB) * DEGREES;
  }

  function angularDiameterArcsec(radiusKm, distanceAu) {
    const distKm = distanceAu * AU_KM;
    return 2 * Math.atan(radiusKm / distKm) * ARCSEC_PER_RAD;
  }

  /** Approximate Moon center-to-center distance (km) from mean anomaly (Meeus leading terms). */
  function moonDistanceKm(jd) {
    const d = jd - 2451545.0;
    const M = (134.9633964 + 13.06499295 * d) * RADIANS;
    const D = (297.8501921 + 12.19074912 * d) * RADIANS;
    return 385000.56 - 20905.355 * Math.cos(M) - 3699.111 * Math.cos(2 * D - M) - 2955.968 * Math.cos(2 * D);
  }

  /** Compute apparent target geometry (angular sizes in arcsec, phase, ring tilt). */
  function computeTargetGeometry({ target, sizeMode = 'ephemeris', dateStr, customDiameterArcsec, customRingArcsec, customRingTiltDeg }) {
    if (!target) throw new RangeError('Cible inconnue.');
    const flattening = target.flattening || 0;

    if (sizeMode === 'custom' || target.id === 'custom') {
      const diam = Number(customDiameterArcsec);
      if (!Number.isFinite(diam) || diam <= 0 || diam > 20000) throw new RangeError('Diamètre apparent invalide.');
      const ring = Number(customRingArcsec || 0);
      const tilt = Number(customRingTiltDeg || 0);
      return {
        diameterArcsec: diam,
        polarArcsec: diam * (1 - flattening),
        ringArcsec: ring > diam ? ring : 0,
        ringTiltDeg: Math.max(-30, Math.min(30, Number.isFinite(tilt) ? tilt : 0)),
        distanceAu: null,
        illumination: 1,
        phaseSign: 1,
        source: 'personnalisé'
      };
    }

    if (sizeMode === 'min' || sizeMode === 'mean' || sizeMode === 'max') {
      const diam = sizeMode === 'min' ? target.diameterMin : sizeMode === 'max' ? target.diameterMax : target.diameterMean;
      const ringRatio = target.ringRadiusKm ? target.ringRadiusKm / target.radiusKm : 0;
      const tilt = target.id === 'saturn' ? (sizeMode === 'max' ? 24 : 14) : 0;
      return {
        diameterArcsec: diam,
        polarArcsec: diam * (1 - flattening),
        ringArcsec: ringRatio ? diam * ringRatio : 0,
        ringTiltDeg: tilt,
        distanceAu: null,
        illumination: target.id === 'venus' ? (sizeMode === 'max' ? 0.12 : sizeMode === 'mean' ? 0.55 : 0.99) : target.id === 'mercury' ? 0.55 : 1,
        phaseSign: 1,
        source: sizeMode
      };
    }

    const jd = dateToJulianDay(dateStr || todayIsoDate());

    if (target.kind === 'moon' || target.kind === 'lunar_feature') {
      const distKm = moonDistanceKm(jd);
      const fullMoonArcsec = 2 * Math.atan(1737.4 / distKm) * ARCSEC_PER_RAD;
      const diam = target.kind === 'moon' ? fullMoonArcsec : target.diameterMean * (fullMoonArcsec / 1865);
      return {
        diameterArcsec: diam,
        polarArcsec: diam,
        ringArcsec: 0,
        ringTiltDeg: 0,
        distanceAu: distKm / AU_KM,
        distanceKm: distKm,
        illumination: 1,
        phaseSign: 1,
        source: 'éphéméride'
      };
    }

    const earthVec = heliocentricEcliptic('earth', jd);
    if (target.kind === 'sun') {
      const distAu = norm(earthVec);
      const diam = angularDiameterArcsec(target.radiusKm, distAu);
      return {
        diameterArcsec: diam,
        polarArcsec: diam,
        ringArcsec: 0,
        ringTiltDeg: 0,
        distanceAu: distAu,
        illumination: 1,
        phaseSign: 1,
        source: 'éphéméride'
      };
    }

    const planetVec = heliocentricEcliptic(target.id, jd);
    const geoVec = [planetVec[0] - earthVec[0], planetVec[1] - earthVec[1], planetVec[2] - earthVec[2]];
    const delta = norm(geoVec);
    const r = norm(planetVec);
    const R = norm(earthVec);

    // Phase angle beta: cos(beta) = (r^2 + delta^2 - R^2) / (2 * r * delta)
    const cosBeta = Math.max(-1, Math.min(1, (r * r + delta * delta - R * R) / (2 * r * delta)));
    const illumination = (1 + cosBeta) / 2;
    const crossZ = earthVec[0] * planetVec[1] - earthVec[1] * planetVec[0];
    const phaseSign = crossZ >= 0 ? 1 : -1;

    const diam = angularDiameterArcsec(target.radiusKm, delta);
    const ringArcsec = target.ringRadiusKm ? angularDiameterArcsec(target.ringRadiusKm, delta) : 0;
    const ringTiltDeg = target.id === 'saturn' ? computeSaturnRingTiltDeg(geoVec, jd) : 0;

    return {
      diameterArcsec: diam,
      polarArcsec: diam * (1 - flattening),
      ringArcsec,
      ringTiltDeg,
      distanceAu: delta,
      illumination,
      phaseSign,
      source: 'éphéméride'
    };
  }

  const api = {
    dateToJulianDay,
    todayIsoDate,
    heliocentricEcliptic,
    computeTargetGeometry
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PlanetaryEphemeris = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
