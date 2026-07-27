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

## logo_lpde_mascotte.png

Ancienne mascotte, remplacee par le symbole `public/images/logo-lpde.svg`.
Conservee ici comme source : elle reste l'origine de la palette
(bleu roi de la casquette, rouge de l'epingle, ambre du dossier) et de
la forme d'epingle reprise dans le nouveau symbole.
