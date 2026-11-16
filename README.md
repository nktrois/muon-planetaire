# Muon Planétaire — planetary imaging simulator

*English · [Français](README.fr.md)*

**[▶ Open the app](https://nktrois.github.io/muon-planetaire/)**, nothing to install.

**Muon Planétaire** shows the **apparent size of a planet, the Moon, or the Sun on your sensor**, along with Barlow spacing, ROI framing, sampling, and mosaics. No install, no server, no account: it runs in any recent browser on Windows, macOS and Linux. The interface is in French.

## Features

- Solar System targets (Mercury through Neptune, Saturn's rings, Moon, Sun, lunar craters) and custom diameters.
- Apparent angular diameter, distance, illuminated phase, and Saturn ring tilt computed for a chosen date (JPL Standish elements 1800–2050), or Opposition / Mean / Conjunction presets.
- Telescope presets (Newton, Dobson, SCT, Maksutov, refractors) or custom aperture and focal length; spectral band (Visible 550 nm, Blue, Red, IR 685/850 nm, CH4 889 nm) and seeing sampling rule.
- Focal reducers (`0.5×`–`0.8×`), classical diverging Barlows (`1.3×`–`5×`) with spacing calculation (barrel, spacers, ADC, filter wheel, camera backfocus), telecentric amplifiers (`2×`–`5×`), or any fixed factor.
- ZWO planetary and large-sensor presets (ASI120MC-S, ASI224MC, ASI662MC, ASI678MC, ASI462MC, ASI585MC, ASI715MC, ASI290MM, ASI178MC, ASI174MM, ASI533MC, ASI294MC, ASI183MC, ASI2600MC…) or custom sensor, binning `1×1` / `2×2`, ROI framing, rotation, and `2×2`–`4×4` mosaics.
- Pixel scale (`″/px`), effective `f/` ratio, Rayleigh/Airy diameter vs pixel grid inset, shareable URL link, and JSON export.
- Plain **HTML/CSS/JavaScript**, no build step, nothing to install.

## Run it

**Online:** [https://nktrois.github.io/muon-planetaire/](https://nktrois.github.io/muon-planetaire/), works on computer and phone.

**Local copy:** download the repository (*Code → Download ZIP*), unzip it and double-click `index.html`.

## Tests

Node.js 18+, no npm dependencies:

```bash
node --test tests/optics.test.js
```

## Limitations

- Ideal geometric optics and diffraction model (Rayleigh / Airy disc at wavelength $\lambda$): seeing, collimation, vignetting, spherical aberration far from a Barlow's nominal spacing, and primary-mirror focal shift on SCT/Maksutov tubes are not modeled.
- Ephemerides use JPL Standish approximate Keplerian elements (1800–2050) and a simplified lunar distance formula: accurate enough for framing and apparent diameter, not for astrometry.
- Surface markings on planet and lunar discs are illustrative; only angular sizes, oblateness, phase, and Saturn ring tilt are computed.

## License

Code: **MIT**, see `LICENSE`.
