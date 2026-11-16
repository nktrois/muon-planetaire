# Muon Planétaire — Simulateur d’imagerie planétaire

*[English](README.md) · Français*

**[▶ Ouvrir l'appli](https://nktrois.github.io/muon-planetaire/)**, rien à installer.

**Muon Planétaire** affiche la **taille réelle d’une planète, de la Lune ou du Soleil sur ton capteur**, avec calcul du tirage d’une Barlow, de la fenêtre ROI, de l’échantillonnage et des mosaïques. Sans installation, sans serveur, sans compte : il marche dans n’importe quel navigateur récent, sous Windows, macOS et Linux.

## Fonctionnalités

- Cibles du Système solaire (Mercure à Neptune, anneaux de Saturne, Lune, Soleil, cratères lunaires) et taille personnalisée.
- Diamètre apparent, distance, phase et inclinaison des anneaux de Saturne calculés pour une date donnée (éléments JPL Standish 1800–2050), ou présets Opposition / Moyenne / Conjonction.
- Modèles de télescopes (Newton, Dobson, SCT, Maksutov, lunettes) ou diamètre/focale libres ; bande spectrale (Visible 550 nm, Bleu, Rouge, IR 685/850 nm, CH4 889 nm) et critère de seeing.
- Réducteurs (`0,5×` à `0,8×`), Barlows classiques (`1,3×` à `5×`) avec calcul du tirage (corps Barlow, bagues allonges, ADC, roue à filtres, backfocus caméra), télécentriques (`2×` à `5×`) ou facteur fixe libre.
- Présets caméras ZWO planétaires et grands capteurs (ASI120MC-S, ASI224MC, ASI662MC, ASI678MC, ASI462MC, ASI585MC, ASI715MC, ASI290MM, ASI178MC, ASI174MM, ASI533MC, ASI294MC, ASI183MC, ASI2600MC…) ou capteur libre, binning `1×1` / `2×2`, fenêtre **ROI**, orientation et **mosaïques 2×2 à 4×4**.
- Échantillonnage (`″/px`), `F/D` effectif, tache d’Airy comparée à la grille de pixels, lien partageable encodé dans l’URL et export JSON.
- **HTML/CSS/JavaScript** simples, rien à installer ni à compiler.

## Lancer

**En ligne :** [https://nktrois.github.io/muon-planetaire/](https://nktrois.github.io/muon-planetaire/), sur ordinateur comme sur téléphone.

**Copie locale :** télécharger le dépôt (*Code → Download ZIP*), le dézipper et double-cliquer sur `index.html`.

## Tester le moteur de calcul

Node.js 18+ :

```bash
node --test tests/optics.test.js
```

Aucune dépendance npm nécessaire pour les tests.

## Limites importantes

- Modèle géométrique et de diffraction idéale (Rayleigh / Airy à $\lambda$) : la turbulence réelle, la collimation, le vignettage, l’aberration sphérique loin du tirage nominal d’une Barlow et la variation de focale des SCT/Maksutov selon le tirage ne sont pas modélisés.
- Les éphémérides utilisent les éléments képlériens approchés JPL Standish (1800–2050) et une formule lunaire simplifiée : suffisants pour le cadrage et la taille apparente, pas pour de l’astrométrie.
- L’aspect des disques (bandes de Jupiter, mers lunaires) est schématique ; seules les dimensions angulaires, l’aplatissement, la phase et l’inclinaison des anneaux sont calculés.

## Licence

Code : **MIT**, voir `LICENSE`.
