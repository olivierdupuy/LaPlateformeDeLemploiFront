# Sources média

Fichiers d'origine, **non servis** : ce dossier est hors de `public/`,
donc Angular ne le copie pas dans le build. Y placer les rushes et les
originaux haute définition, et ne committer dans `public/` que les
dérivés optimisés réellement utilisés par l'application.

## woman-circles-job-ads-in-newspaper-at-home…mov

Source du fond vidéo du hero d'accueil (1920×1080, H.264, 24 i/s, 11 s).

Dérivés dans `public/videos/` :

```bash
# Vidéo : réduite à 1600 px, CRF 28, moov atom en tête pour le streaming
ffmpeg -i media-source/woman-circles-job-ads-*.mov \
  -map 0:v:0 -an -vf "scale=1600:-2" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -crf 28 -preset slow -g 48 -movflags +faststart \
  public/videos/recherche-emploi.mp4

# Affiche de secours (poster), premier plan de la vidéo
ffmpeg -i public/videos/recherche-emploi.mp4 -frames:v 1 \
  -vf "scale=1280:-2" -q:v 5 public/videos/recherche-emploi-poster.jpg
```

4,0 Mo → 716 Ko sans perte visible.

## logo_lpde.png

Le logo, fourni empilé : le symbole (trois silhouettes, une loupe)
au-dessus du mot-symbole sur deux lignes, 1378×913, fond transparent.
C'est la source de toute l'identité — les trois teintes de la palette y
sont relevées au compte-gouttes (`#001C51` marine, `#01489C` bleu roi,
`#FD7A02` orange) et le lettrage est du **Fredoka SemiBold**, vérifié en
superposant « Plateforme » rendu dans cette fonte sur le fichier.

Empilé, le verrou ne tient pas dans une barre de 96 px. Les dérivés
recomposent les mêmes pièces à l'horizontale et déclinent les variantes
pour fond sombre :

```bash
python outils/logo-derives.py
```

Produit `public/images/logo-lpde{,-dark,-mark,-mark-dark}.webp`, les trois
icônes PWA et le favicon. Toutes les mesures (boîtes du symbole et du
texte, centre et rayon de la loupe) sont en tête du script : si le logo
change, ce sont elles qu'il faut reprendre.

## logo_lpde_mascotte.png

Toute premiere identite, remplacee par le symbole d'epingle
`logo-lpde.svg`, lui-meme remplace par `logo_lpde.png` ci-dessus.
Conservee comme source, mais elle n'alimente plus rien : ni la palette
(desormais relevee dans le logo) ni aucune forme du symbole actuel.

## mascotte-bureau.png

Ancienne illustration du hero d'accueil (anciennement `public/images/2.png`),
remplacee par le fond video. Conservee comme source.
