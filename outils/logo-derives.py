#!/usr/bin/env python3
"""Derives servis du logo, tires de media-source/logo_lpde.png.

L'original est un verrou EMPILE : le symbole (trois silhouettes et une
loupe) au-dessus du mot-symbole sur deux lignes. Empile, il ne rentre pas
dans une barre de navigation de 96 px — a cette taille chaque ligne de
texte tomberait sous 12 px. Ce script recompose donc les memes pieces a
l'HORIZONTALE (symbole a gauche, les deux lignes a droite), qui est la
forme que porte l'application, et decline ce qu'il faut :

    public/images/logo-lpde.webp       verrou horizontal, fonds clairs
    public/images/logo-lpde-dark.webp  idem, fonds bleu profond
    public/images/logo-lpde-mark.webp  la loupe seule (barre etroite)
    public/images/logo-lpde-mark-dark.webp  idem, fonds bleu profond
    public/icon-192.png                icone PWA
    public/icon-512.png                icone PWA
    public/icon-maskable-512.png       icone PWA, zone sure a 60 %
    public/favicon.ico                 16 -> 256

Le mot-symbole est encre en #001C51 : sur le bleu profond du pied de page
il disparait. La variante « dark » ne repeint pas a plat — elle garde le
degrade interne en projetant la famille bleue sur un axe blanc -> bleu
pale, et laisse l'orange tel quel, qui tient deja 5,4:1 sur ce fond.

Les verrous sortent en WebP, pas en PNG : le degrade des silhouettes et la
couche alpha coutent 90 Ko en PNG optimise contre 30 en WebP, pour une
image que toutes les pages chargent. Quantifier le PNG tomberait a 16 Ko
mais fait apparaitre des bandes dans l'orange. Les icones restent en PNG,
c'est ce que le manifeste et le favicon exigent.

La hauteur de sortie est 192 px pour un affichage maximal de 48 px : quatre
fois, ce qui couvre les ecrans a forte densite sans payer davantage.

    python outils/logo-derives.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / 'media-source' / 'logo_lpde.png'
IMAGES = RACINE / 'public' / 'images'
PUBLIC = RACINE / 'public'

# Mesures relevees sur l'original (1378x913), en pixels.
SYMBOLE = (302, 7, 1071, 459)      # les trois silhouettes et la loupe
TEXTE = (7, 458, 1370, 902)        # « La Plateforme / de l'Emploi »
LOUPE_CENTRE = (686.5, 207.0)      # centre du cercle exterieur de l'anneau
LOUPE_RAYON = 202.0
LOUPE_MANCHE = 362.0               # longueur de l'axe du manche depuis le centre
LOUPE_MANCHE_DEMI = 50.0           # demi-largeur du manche

HAUTEUR_VERROU = 192               # 4x l'affichage maximal (48 px)
QUALITE_WEBP = 86

# Repeinte du bleu pour fonds sombres : les deux bouts de l'axe.
CLAIR_SOMBRE = (255, 255, 255)
CLAIR_PALE = (168, 194, 232)


def charger() -> Image.Image:
    return Image.open(SOURCE).convert('RGBA')


def rogner(img: Image.Image) -> Image.Image:
    """Retire la marge transparente."""
    boite = img.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop(boite) if boite else img


def hauteur(img: Image.Image, h: int) -> Image.Image:
    return img.resize((max(1, round(img.width * h / img.height)), h), Image.LANCZOS)


def verrou_horizontal(src: Image.Image, h_symbole: int = HAUTEUR_VERROU) -> Image.Image:
    """Symbole a gauche, mot-symbole a droite, centres l'un sur l'autre.

    Le rapport 0,83 entre la hauteur du texte et celle du symbole est celui
    qui aligne l'oeil du « P » sur le haut des epaules : plus grand, le mot
    ecrase le symbole ; plus petit, il flotte.
    """
    symbole = hauteur(rogner(src.crop(SYMBOLE)), h_symbole)
    texte = hauteur(rogner(src.crop(TEXTE)), round(h_symbole * 0.83))
    ecart = round(h_symbole * 0.155)

    out = Image.new('RGBA', (symbole.width + ecart + texte.width, h_symbole), (0, 0, 0, 0))
    out.paste(symbole, (0, 0), symbole)
    out.paste(texte, (symbole.width + ecart, (h_symbole - texte.height) // 2), texte)
    return out


def pour_fond_sombre(img: Image.Image) -> Image.Image:
    """Projette la famille bleue sur un axe blanc -> bleu pale, garde l'orange."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0 or b <= r + 12:      # transparent ou famille orange
                continue
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            t = min(1.0, max(0.0, (lum - 22) / 70))
            px[x, y] = tuple(
                round(CLAIR_SOMBRE[i] + (CLAIR_PALE[i] - CLAIR_SOMBRE[i]) * t) for i in range(3)
            ) + (a,)
    return out


def loupe(src: Image.Image) -> Image.Image:
    """La loupe seule, degagee des silhouettes que l'anneau recouvre.

    Un rognage rectangulaire ramenerait les voisines : on masque donc par
    la forme meme de l'objet — le disque de l'anneau, plus la capsule du
    manche a 45 degres.
    """
    cx, cy = LOUPE_CENTRE
    masque = Image.new('L', src.size, 0)
    d = ImageDraw.Draw(masque)
    d.ellipse((cx - LOUPE_RAYON, cy - LOUPE_RAYON, cx + LOUPE_RAYON, cy + LOUPE_RAYON), fill=255)
    axe = 0.70710678  # cos(45 deg) = sin(45 deg)
    d.line(
        (cx, cy, cx + LOUPE_MANCHE * axe, cy + LOUPE_MANCHE * axe),
        fill=255, width=round(LOUPE_MANCHE_DEMI * 2), joint='curve',
    )
    bout = (cx + LOUPE_MANCHE * axe, cy + LOUPE_MANCHE * axe)
    d.ellipse(
        (bout[0] - LOUPE_MANCHE_DEMI, bout[1] - LOUPE_MANCHE_DEMI,
         bout[0] + LOUPE_MANCHE_DEMI, bout[1] + LOUPE_MANCHE_DEMI),
        fill=255,
    )

    out = src.copy()
    out.putalpha(Image.composite(src.split()[3], Image.new('L', src.size, 0), masque))

    # Le manche est plus etroit que la capsule par endroits : l'epaule de la
    # silhouette de droite passait dans l'ecart. Hors du disque, tout ce qui
    # est orange appartient aux voisines — le manche, lui, est bleu.
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and r > b + 40 and (x - cx) ** 2 + (y - cy) ** 2 > LOUPE_RAYON ** 2:
                px[x, y] = (r, g, b, 0)
    return rogner(out)


def icone(marque: Image.Image, taille: int, part: float, rayon: float | None) -> Image.Image:
    """La loupe posee sur un carre blanc — le fond sur lequel elle est dessinee.

    `part` est la fraction du cote qu'occupe le symbole ; `rayon` arrondit
    les coins (None pour l'icone maskable, que le systeme decoupe lui-meme).
    """
    fond = Image.new('RGBA', (taille, taille), (255, 255, 255, 255))
    if rayon is not None:
        coins = Image.new('L', (taille, taille), 0)
        ImageDraw.Draw(coins).rounded_rectangle((0, 0, taille - 1, taille - 1),
                                                radius=round(taille * rayon), fill=255)
        fond.putalpha(coins)

    cote = round(taille * part)
    m = marque.copy()
    m.thumbnail((cote, cote), Image.LANCZOS)
    fond.paste(m, ((taille - m.width) // 2, (taille - m.height) // 2), m)
    return fond


def webp(img: Image.Image, nom: str) -> None:
    img.save(IMAGES / nom, quality=QUALITE_WEBP, method=6)


def main() -> None:
    src = charger()
    IMAGES.mkdir(parents=True, exist_ok=True)

    verrou = verrou_horizontal(src)
    webp(verrou, 'logo-lpde.webp')
    webp(pour_fond_sombre(verrou), 'logo-lpde-dark.webp')

    marque = hauteur(loupe(src), HAUTEUR_VERROU)
    webp(marque, 'logo-lpde-mark.webp')
    webp(pour_fond_sombre(marque), 'logo-lpde-mark-dark.webp')

    icone(marque, 192, 0.74, 0.22).save(PUBLIC / 'icon-192.png', optimize=True)
    icone(marque, 512, 0.74, 0.22).save(PUBLIC / 'icon-512.png', optimize=True)
    icone(marque, 512, 0.56, None).save(PUBLIC / 'icon-maskable-512.png', optimize=True)
    icone(marque, 256, 0.80, 0.22).save(
        PUBLIC / 'favicon.ico',
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    for f in ('images/logo-lpde.webp', 'images/logo-lpde-dark.webp', 'images/logo-lpde-mark.webp',
              'images/logo-lpde-mark-dark.webp', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon.ico'):
        chemin = PUBLIC / f
        print(f'{f:33s} {Image.open(chemin).size!s:12s} {chemin.stat().st_size / 1024:6.1f} Ko')


if __name__ == '__main__':
    main()
