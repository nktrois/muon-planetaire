# Muon Planétaire — Simulateur d’imagerie & tirage planétaire

*[English](README.md) · Français*

**[▶ Ouvrir l'appli](https://nktrois.github.io/muon-planetaire/)**, rien à installer.

**Muon Planétaire** est l’équivalent planétaire de [Muon Ciel profond](https://github.com/nktrois/muon-ciel-profond) : un simulateur léger sans installation, sans serveur et sans dépendance pour préparer son train optique en astrophotographie planétaire, lunaire et solaire.

Il permet de visualiser **la taille réelle de la cible sur ton capteur et dans ton ROI**, tout en modélisant **le tirage réel d’une Barlow** (bagues allonges, ADC, roue à filtres, backfocus caméra) et **l’échantillonnage par rapport à la diffraction** ($F/D$ effectif et tache d’Airy).

## Fonctionnalités

- **Cibles du Système solaire** : Mercure, Vénus, Mars, Jupiter, Saturne (globe + anneaux inclinés), Uranus, Neptune, Lune (disque entier, Clavius, Copernic), Soleil et cible personnalisée.
- **Éphéméride locale intégrée (1800–2050)** : calcule hors ligne le diamètre apparent, la distance (UA / km), la phase illuminée et l’inclinaison des anneaux de Saturne à n’importe quelle date, avec présets *Opposition / Moyenne / Conjonction* et mode manuel.
- **Télescopes & spectre** : modèles courants (Newton, Dobson, SCT, Maksutov, lunettes) ou diamètre/focale libres, bande spectrale (Visible 550 nm, Bleu, Rouge, IR 685/850 nm, CH4 889 nm) et critère $F/D$ ajustable.
- **Barlow & chaîne de tirage réaliste** :
  - **Barlow classique divergente** ($M = 1 + d / |f_b|$) : calcul en direct à partir du corps Barlow, des bagues allonges, de l’ADC, du tiroir/roue à filtres et du tirage interne de la caméra.
  - **Barlow télécentrique** (type Powermate / Extender à facteur constant, plus le cas progressif 5×) et **facteur fixe / réducteur personnalisé**.
  - Aide au tirage : indique combien de millimètres ajouter ou retirer pour atteindre le $F/D$ cible.
- **Caméras planétaires & ROI** : ZWO ASI662MC, ASI224MC, ASI678MC, ASI462MC, ASI585MC, ASI715MC, ASI290MM, ASI178MC, ASI174MM, ASI533MC Pro ou capteur personnalisé, avec binning `1×1` / `2×2` et fenêtre **ROI** (`640×480`, `800×600`, etc.).
- **Rendu interactif à l’échelle** : aperçu plein capteur, zoom sur ROI ou zoom sur planète avec grille de pixels, barre d’échelle et médaillon **tache d’Airy vs pixels**.
- **100 % hors ligne** : ouvrir simplement `index.html` dans n’importe quel navigateur récent ; lien partageable encodé dans l’URL et export JSON complet.

## Lancer

**En ligne :** [https://nktrois.github.io/muon-planetaire/](https://nktrois.github.io/muon-planetaire/), sur ordinateur comme sur téléphone.

**Copie hors ligne :** télécharger le dépôt (*Code → Download ZIP*), le dézipper et double-cliquer sur `index.html`. Aucune installation ni connexion Internet requise.

## Tester le moteur de calcul

Node.js 18+ :

```bash
node --test tests/optics.test.js
```

## Limites importantes

- Modèle géométrique et de diffraction idéale (critère de Rayleigh / tache d’Airy à $\lambda$) ; la turbulence atmosphérique (*seeing*), la collimation, le vignettage mécanique, l’aberration sphérique hors tirage nominal de la Barlow et le décalage de focale par déplacement du miroir primaire (SCT/Maksutov) ne sont pas modélisés automatiquement.
- Les éphémérides utilisent les éléments képlériens approchés JPL Standish (1800–2050) et une approximation lunaire simplifiée : suffisants pour le cadrage et la taille apparente (~0,1″ près pour les planètes), pas pour de l’astrométrie de précision.
- Les aspects visuels des disques (bandes de Jupiter, mers lunaires) sont purement schématiques ; seules les dimensions angulaires, l’aplatissement, la phase et l’inclinaison des anneaux de Saturne suivent le modèle calculé.

## Licence

Code : **MIT**, voir `LICENSE`.
