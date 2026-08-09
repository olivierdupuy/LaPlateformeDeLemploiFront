# Contribuer

## Avant de pousser

```bash
npm run lint    # doit rendre 0 erreur
npm test        # doit rendre 0 échec
npm run build   # doit rester sous 900 kB de paquet initial
```

Ces trois-là tournent en intégration continue avant le déploiement. Les
lancer avant de pousser évite d'apprendre l'échec dix minutes plus tard.

Côté API : `dotnet build` et `dotnet test lpdeBack.Tests`.

## Commits

Le dépôt suit une convention déjà tenue, en français, à l'impératif ou au
présent, décrivant **ce que l'utilisateur gagne** plutôt que ce que le
code fait :

```
feat(admin): l'état du service se lit dans les réglages
refactor(navigation): retrait du sélecteur de langue
feat(sécurité, rgpd): les CV passent par une route authentifiée
```

Portées courantes : `admin`, `recruteur`, `candidat`, `recherche`,
`sécurité`, `rgpd`, `seo`, `courriel`, `navigation`, `réglages`.

## Style

**Le code est en anglais, les commentaires et l'interface en français.**
C'est l'usage du dépôt, pas une règle esthétique : les messages d'erreur
sont lus par des francophones et les commentaires par vous.

**Les commentaires disent pourquoi, pas quoi.** Le dépôt est
abondamment commenté et ce n'est pas un accident : la plupart des
commentaires expliquent une décision et ce qu'elle a coûté d'apprendre.
Un commentaire qui paraphrase la ligne suivante n'apporte rien ; un
commentaire qui dit « on a essayé l'inverse, voici ce qui est arrivé »
évite qu'on le réessaie.

**Pas de valeur en dur pour les couleurs.** Les jetons sont dans
`src/styles.scss`. Un `#01489C` écrit dans un composant survivra au
prochain changement d'identité, et jurera.

**Les nouveaux écrans sont chargés à la demande.** `loadComponent` dans
`app.routes.ts`, jamais un `import` en tête de fichier.

## Ce qui casse la construction

| Contrôle | Seuil |
|---|---|
| Erreurs ESLint | 0 |
| Avertissements ESLint | 223 — cliquet, ne doit que descendre |
| Paquet initial | 900 kB (avertissement à 600 kB) |
| Styles d'un composant | 20 kB (avertissement à 12 kB) |
| Tests | 0 échec |

Le plafond d'avertissements se baisse dans `package.json` → `lint`, dès
qu'un passage en a résorbé. Ne jamais le remonter : c'est ce qui
transforme un cliquet en décoration.

## Accessibilité

Trois règles ESLint sont en avertissement le temps que l'existant
s'aligne — 15 étiquettes sans champ associé (sur 98 à l'audit initial),
17 éléments cliquables non focalisables (sur 44). Un écran neuf ne doit
en ajouter aucune. `alt-text` est en erreur et le restera.

**Toute boîte de dialogue passe par `appModale`** (`utils/modale.directive.ts`) :
elle apporte la fermeture par Échap, le piège de focus, la restitution du
focus au retour, et la fermeture au clic sur le fond — sans qu'aucun
gestionnaire de clic ne traîne sur un `div`.

**Lier une étiquette à son champ** : `<label for="x">` et `id="x"` sur le
contrôle. Le préfixe de l'identifiant reprend les initiales du
composant (`jf-` pour `job-form`), ce qui évite les collisions entre
écrans montés ensemble. Ne jamais poser un `for` « au jugé » : une
étiquette qui désigne le mauvais champ annonce un libellé faux avec
assurance, ce qui est pire que l'absence d'association.

Vérifier au clavier tout tunnel touché : candidature, dépôt d'offre,
connexion. Un piège au clavier ne se voit pas à la souris.

## Secrets

Aucun, jamais, dans le dépôt. Ils arrivent par les secrets GitHub au
déploiement et par `dotnet user-secrets` en local. Un secret poussé par
erreur est un secret à révoquer, pas à effacer de l'historique.
