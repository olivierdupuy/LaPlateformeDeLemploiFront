# TODO — Espaces candidat et recruteur

Audit mené le **2026-07-27** sur Indeed en direct (compte connecté) :
`myjobs.indeed.com`, `profile.indeed.com`, `fr.indeed.com/recrutement`,
plus la documentation employeur.

**Clos le 2026-08-03** : les vingt-trois points sont livrés. Ce qui reste
d'ouvert pour l'application vit dans `TODO-PROFESSIONNALISATION.md`, et
ne concerne plus les fonctionnalités.

Complète `TODO-INDEED.md`, qui couvrait la **parité fonctionnelle** (atteinte).
Ce document-ci porte sur **l'architecture des deux espaces** : ce qui existe
chez nous est souvent bon pris isolément, mais éparpillé.

---

## Ce qu'Indeed fait, structurellement

### Espace candidat — « Mes emplois »

**Une seule page, quatre onglets comptés :**

| Onglet | Contenu |
|---|---|
| Emplois enregistrés | offres mises de côté |
| Candidatures envoyées | suivi, avec « candidature consultée » |
| Entretiens | ceux qui ont avancé jusque-là |
| Archivées | ce qu'on ne suit plus, sorti de la vue |

À côté, en barre globale : **Messages**, **Notifications**, **Compte**.
Le profil (`profile.indeed.com`) est séparé : coordonnées, CV, visibilité
employeurs, **qualifications**, **préférences d'emploi**, **exclusions**,
**disponible maintenant**.

### Espace recruteur — tableau de bord employeur

**Onglets :** Emplois · Candidatures · Messages · Entretiens · Analyses

- Offres : statuts **Ouverte / Suspendue / Fermée**, étiquettes personnalisées,
  tri (date, titre, lieu), filtre par étiquette, changement de statut en masse.
- Candidatures : pipeline à **six** statuts — *Active, À examiner, Examinée,
  Contactée, Refusée, Embauchée* — filtres par lieu, qualifications et
  réponses aux questions de présélection.
- Équipe : « Gérer les accès » avec **niveaux de permission**, notes partagées.
- Smart Sourcing : profils correspondants proposés, **invitation à postuler**.

---

## Espace candidat

### Notre écart principal

Sept pages (`/mon-espace`, `/favoris`, `/suivi`, `/entretiens`,
`/recherches-sauvegardees`, `/mon-cv`, `/profil`) atteignables **uniquement
par le menu de l'avatar**. Le candidat ne voit jamais l'ensemble, et rien ne
lui dit où il en est. Le recruteur, lui, a désormais sa console.

### P0 — structure

- [x] ✅ **Console candidat** — sous-navigation persistante sur les sept pages
      de l'espace (tableau de bord, candidatures, favoris, entretiens,
      recherches, CV, profil, messagerie). `ConsoleShell` choisit l'espace
      selon le rôle : les pages partagées (Entretiens, Messagerie, Profil)
      n'ont rien à déclarer.
- [x] ✅ **Regrouper en une page « Mes candidatures »** à onglets comptés :
      *Enregistrées · Envoyées · Entretiens · Archivées*. `/favoris` et
      `/suivi` ouvrent la même page sur l'onglet voulu ; l'onglet actif vit
      dans `?onglet=`, pour qu'un lien soit partageable et que le retour
      arrière fonctionne. `/entretiens` garde sa page propre en plus de
      l'onglet — c'est la seule des trois qui a du contenu à elle.
- [x] ✅ **Onglet Archivées + action « Archiver »** — `PATCH
      /applications/{id}/archive`, ouvert au candidat sur ses seules
      candidatures (`ApplicationsController`), bouton sur chaque ligne.
- [x] ✅ **Compteurs dans les onglets** — `tabCounts`, recalculés à chaque
      archivage sans rechargement.

*Livré le 2026-08-01 (`40a7cd2`). Vérifié de bout en bout le 2026-08-02 :
archivage appelé sous l'identité d'un candidat, compteurs mis à jour.*

La page va plus loin que le point demandé : filtres par statut, recherche
par poste ou employeur, chemin de progression par candidature
(Envoyée → Consultée → Entretien → Réponse), signalement des candidatures
sans réponse depuis plus de deux semaines, et relance.

### P1 — signaux au candidat

- [x] ✅ **« Votre candidature a été consultée »** — « Consultée il y a
      trois jours · le 9 avr. », le temps écoulé devant la date comme sur
      la ligne « Postulé ». Une date seule oblige à compter, et six
      semaines ne se vivent pas comme deux jours. Une consultation de
      moins de trois jours se distingue : c'est le moment où relancer a
      du sens.
- [x] ✅ **« Cette offre n'est plus disponible »** — affiché dès que
      `isActive` est faux, ce que `/track` renvoyait déjà. *Existait
      avant ce lot ; vérifié le 2026-08-03.*
- [x] ✅ **Invitations reçues** — cinquième onglet de « Mes candidatures ».
      Sans lui, la proposition n'arrivait que par une notification, qui se
      perd dans la liste des autres. Le compteur ne porte que les
      invitations sans réponse.

### P1 — profil et pertinence

- [x] ✅ **Préférences d'emploi** — salaire annuel minimum, type de
      contrat, télétravail, rayon de déplacement. Section « Ce que je
      cherche » du profil. Jusqu'ici ces souhaits étaient **devinés** en
      lisant la dernière recherche enregistrée : muet pour qui n'en a
      jamais gardé, et faux pour qui en a fait une par curiosité. Les
      préférences déclarées font foi ; le repli sur la recherche
      subsiste, mais seulement quand rien n'est renseigné.

      *Quatre critères et non cinq : « horaires » est écarté à dessein.
      Le moteur note sept critères dont aucun ne regarde le rythme de
      travail, et l'ajouter obligerait à redistribuer des poids qui
      totalisent cent et que des tests figent. Un champ que rien ne lit
      serait exactement le reproche fait aux préférences inutiles.*
- [x] ✅ **Correspondance offre ↔ préférences** — les listes « Ce qui
      correspond » et « À savoir » portaient déjà ce rôle ; il leur
      manquait de vraies préférences en entrée, et de dire d'où elles
      venaient. Le panneau se termine désormais par « Calculé avec vos
      préférences · Les modifier », ou par l'aveu que rien n'est déclaré.

      Mesuré sur une offre réelle : souhaits déduits, score 76 % pour une
      **fiabilité de 63 %** ; préférences déclarées, score 62 % pour
      **93 %**. Le score baisse et devient honnête — la réserve « poste
      sur site, alors que vous cherchez du télétravail » n'apparaissait
      pas du tout auparavant.
- [x] ✅ **Exclure des types d'emplois** — seules les familles que le
      lexique connaît sont retenues : un mot libre ne filtrerait rien, et
      le candidat croirait avoir écarté quelque chose. Le rapprochement se
      fait sur la catégorie, pas sur le titre.
- [x] ✅ **« Disponible immédiatement »** — une **date**, pas une case.
      « Disponible immédiatement » se périme tout seul ; une case cochée il
      y a huit mois ment sans que personne ne s'en aperçoive. Qui n'a rien
      déclaré n'est pas indisponible : le filtre l'écarte sans le juger.
- [x] ✅ **« Cette offre ne m'intéresse pas »** — le filtre s'applique dans
      la requête de catalogue elle-même. Un bouton qui enregistre bien mais
      ne filtre pas est pire que pas de bouton : le candidat croit avoir
      agi, l'offre revient, et il en conclut que le site ne l'écoute pas.

### Déjà en place — ne pas refaire

Profil, CV en ligne, visibilité employeurs, favoris, suivi de candidature,
alertes, recherches enregistrées, entretiens, messagerie temps réel,
notifications, complétude du profil.

---

## Espace recruteur

La console est en place (Tableau de bord · Mes offres · Candidatures · Vivier ·
Entretiens). Restent des écarts de **profondeur**, pas de navigation.

### P0 — pipeline et statuts

- [x] ✅ **Messagerie dans la sous-navigation** du recruteur — onglet de
      premier rang, comme chez Indeed.
- [x] ✅ **Pipeline à six statuts** — `Pending`, `Reviewed`, **`Contacted`**,
      `Accepted`, **`Hired`**, `Rejected`. *Ce document a annoncé quatre
      états, puis cinq le 2026-08-02 en prenant « Interview » pour un
      statut — c'est le nom d'une entité du journal d'audit. Il y en avait
      bien quatre ; un test fige désormais le compte à six.*

      La liste des valeurs admises était recopiée dans quatre contrôleurs
      et deux attributs de validation, et huit tables de libellés au front.
      Elle est dite une fois de chaque côté.
- [x] ✅ **États d'offre Ouverte / Suspendue / Fermée** — le seul geste
      disponible était la suppression, qui emporte les candidatures reçues :
      un arbitrage d'une semaine coûtait les dossiers du mois. `IsActive`
      reste la seule condition des requêtes publiques et vaut vrai si et
      seulement si l'état est « ouverte » ; l'invariant s'écrit à un seul
      endroit, et les neuf sites qui posaient `IsActive` à la main y passent.

### P1 — volume et tri

- [x] ✅ **Tri des offres** par date, titre, lieu — `localeCompare` en
      français, sans quoi « Épinal » se range après « Zurich ».
- [x] ✅ **Étiquettes personnalisées** — dans une **table à part** et non
      une colonne : le point d'entrée public rend l'entité `JobOffer`
      entière, et « priorité direction » serait parti chez chaque visiteur
      du catalogue. Un test vérifie qu'elles ne fuient pas.
- [x] ✅ **Changement d'état en masse** sur les offres. Deux défauts de
      l'action groupée existante corrigés au passage : elle ignorait le
      partage d'équipe, et son compte rendu portait le nombre de
      candidatures **lues**, pas modifiées.
- [x] ✅ **Filtres candidats** : ville, qualification, et **réponses aux
      questions de présélection**. Tout était déjà dans la charge utile du
      recruteur — aucun appel de plus. La lecture du JSON écarte une
      question sans réponse et une réponse orpheline : mieux vaut ne rien
      montrer que de prêter à un candidat une réponse qu'il n'a pas donnée.

### P1 — équipe

- [x] ✅ **Niveaux de permission** — **par rôle**, décidé le 2026-08-03 :
      un *propriétaire* par entreprise, des *membres* qui gèrent leurs
      propres offres et **lisent** celles des autres. Un modèle par
      capacité se défend sur le papier et se paie à l'usage : il faut
      l'administrer, et personne ne le fait.

      La lecture ne change pas — c'est elle qui fait l'intérêt du travail
      à plusieurs. Trente appelants passent par `PeutGerer` : ce point
      unique a changé, et lui seul. Un test tombé a révélé une erreur au
      passage — les notes d'équipe passaient par le droit d'écriture, alors
      qu'une note partagée est de la collaboration : seul le propriétaire
      aurait pu en écrire.

      La reprise désigne, par entreprise, le compte le plus ancien. Sans
      elle, plus aucune équipe n'aurait eu de propriétaire et ses offres
      seraient devenues ingérables.
- [x] ✅ **Notes partagées** — `RecruiterNotes` est un champ unique : le
      second qui écrit efface le premier, et ni l'un ni l'autre ne s'en
      aperçoit. Le fil s'empile, porte ses auteurs, et le nom est figé à
      l'écriture — un départ d'équipe ne doit pas rendre anonymes des mois
      de notes. On retire sa note, jamais celle d'un collègue.

### P2 — sourcing

- [x] ✅ **Inviter un profil du vivier à postuler** — une **proposition**,
      pas une convocation : il n'existe pas d'état « ignorée », compter les
      silences reviendrait à noter les gens sur leur réactivité à des
      sollicitations qu'ils n'ont pas demandées. Quatre refus d'envoi : pas
      deux fois sur la même offre, pas un profil masqué, pas une annonce
      hors ligne, pas l'offre d'une autre maison. Postuler solde
      l'invitation automatiquement.
- [x] ✅ **Analyses séparées du tableau de bord** — `/recruteur/analyses`.
      Les mêmes yeux ne cherchent pas les deux en même temps, et les
      mélanger faisait que le second n'était jamais lu : on ouvrait le
      tableau de bord pour traiter, on repartait après avoir traité. Ce qui
      est là se regarde une fois par semaine ; ce qui reste se regarde tous
      les matins.

### Déjà en place — ne pas refaire

Publier / modifier / dupliquer une offre, modèles d'offre, kanban des
candidatures, actions groupées sur les candidatures, notes, vivier et fiche
candidat, questions de présélection, entretiens, messagerie, réponses
automatiques, statistiques par offre, offres sponsorisées (sans paiement),
page entreprise, partage d'offres entre coéquipiers.

---

## Ordre suggéré

1. **Console candidat + page « Mes candidatures » à onglets** — c'est le plus
   gros écart perçu, et le pendant de ce qui a été fait côté recruteur.
2. **Archivage** côté candidat, **statut Embauchée** côté recruteur — les deux
   ferment un cycle qui reste ouvert aujourd'hui.
3. **Statuts d'offre** (suspendre) et **statut Contactée**.
4. **Préférences d'emploi + correspondance** — la brique qui change la qualité
   perçue du moteur.
5. Le reste, par confort d'usage.

---

## Non vérifié

Le tableau de bord employeur complet demande la création d'un compte
entreprise, non faite. Sa structure vient donc de la documentation Indeed et de
la page produit, pas d'une observation directe. Les libellés exacts des
onglets français restent à confirmer si la parité de vocabulaire compte.
