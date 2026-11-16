# Muon Planétaire — planetary imaging & Barlow spacing simulator

*English · [Français](README.fr.md)*

**[▶ Open the app](https://nktrois.github.io/muon-planetaire/)**, nothing to install.

**Muon Planétaire** is the planetary sister app to [Muon Ciel profond](https://github.com/nktrois/muon-ciel-profond): a zero-dependency, static HTML/CSS/JavaScript simulator for planetary, lunar, and solar astrophotography. No install, no server, no account: it runs in any recent browser on Windows, macOS, and Linux. The interface is in French.

## Features

- **Solar System targets**: Mercury, Venus, Mars, Jupiter, Saturn (globe + tilted rings), Uranus, Neptune, Moon (full disc, Clavius, Copernicus), Sun, and custom targets.
- **Built-in offline ephemeris (1800–2050)**: computes apparent angular diameter, distance (AU / km), illuminated phase, and Saturn's ring tilt angle for any date, plus *Opposition / Mean / Conjunction* presets and manual dimensions.
- **Telescopes & spectral band**: common presets (Newton, Dobson, SCT, Maksutov, refractors) or custom aperture and focal length; selectable wavelength (Visible 550 nm, Blue, Red, IR 685/850 nm, CH4 889 nm) and adjustable sampling F/D rule.
- **Barlow & full spacing chain (tirage)**:
  - **Classical diverging Barlow** ($M = 1 + d / |f_b|$): combines Barlow barrel length, extension spacers, ADC, filter drawer/wheel, and camera flange focal distance.
  - **Telecentric amplifiers** (constant factor + progressive Powermate 5× model) and **custom fixed factor / focal reducer**.
  - Live spacing guidance indicating how many millimeters to add or remove to hit the target focal ratio.
- **Planetary cameras & ROI**: ZWO ASI662MC, ASI224MC, ASI678MC, ASI462MC, ASI585MC, ASI715MC, ASI290MM, ASI178MC, ASI174MM, ASI533MC Pro, or custom sensor; `1×1` / `2×2` binning and selectable ROI window (`640×480`, `800×600`, full sensor, or custom).
- **Scaled interactive preview**: full sensor, ROI zoom, or target zoom with pixel grid, scale bar, and live **Airy disc vs pixel grid** inset.
- **100% offline**: shareable URL-encoded parameters and full JSON export.

## Run it

**Online:** [https://nktrois.github.io/muon-planetaire/](https://nktrois.github.io/muon-planetaire/), works on computer and phone.

**Offline copy:** download the repository (*Code → Download ZIP*), unzip it, and double-click `index.html`. Everything runs offline without any network call.

## Tests

Node.js 18+, no npm dependencies:

```bash
node --test tests/optics.test.js
```

## Limitations

- Ideal geometric optics and diffraction model (Rayleigh / Airy disc at wavelength $\lambda$); atmospheric seeing, collimation, mechanical vignetting, spherical aberration far outside a Barlow's design spacing, and SCT/Maksutov primary-mirror focal shift with backfocus are not modeled automatically.
- Ephemerides use JPL Standish approximate Keplerian elements (1800–2050) and a simplified lunar distance formula: accurate enough for framing and apparent diameter, not for precision astrometry.
- Planet surface markings (Jupiter cloud belts, lunar maria) are schematic; angular diameters, oblateness, phase illumination, and Saturn ring tilt follow the computed geometry.

## License

Code: **MIT**, see `LICENSE`.
