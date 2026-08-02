# TODO — Espaces candidat et recruteur

Audit mené le **2026-07-27** sur Indeed en direct (compte connecté) :
`myjobs.indeed.com`, `profile.indeed.com`, `fr.indeed.com/recrutement`,
plus la documentation employeur.

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

- [ ] **« Votre candidature a été consultée »** — *à moitié fait.* L'étape
      « Consultée » du chemin de progression s'allume bien à partir de
      `reviewedAt`, mais **sans la date**. Or c'est la date qui informe :
      « consultée il y a deux jours » et « consultée il y a six semaines »
      ne se vivent pas de la même façon, et l'API renvoie déjà le champ.
- [ ] **« Cette offre n'est plus disponible »** sur une candidature dont
      l'offre a été fermée ou a expiré.
- [ ] **Invitations reçues** : quand un recruteur invite un profil du vivier à
      postuler, le candidat doit le voir (voir P2 recruteur).

### P1 — profil et pertinence

- [ ] **Préférences d'emploi** : salaire minimum, type de contrat, horaires,
      télétravail, mobilité. Rien de tel aujourd'hui.
- [ ] **Correspondance offre ↔ préférences** sur la fiche offre : Indeed
      marque chaque critère « préférence correspondante » ou « préférence
      manquante ». C'est ce qui rend les préférences utiles.
- [ ] **Exclure des types d'emplois** (filtres négatifs persistants).
- [ ] **« Disponible immédiatement »** : badge visible des recruteurs, alimente
      le tri du vivier.
- [ ] **« Cette offre ne m'intéresse pas »** : masquer une offre des résultats.

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
- [ ] **Pipeline à six statuts**. Nous en avons cinq — `Pending`, `Reviewed`,
      `Interview`, `Accepted`, `Rejected` — et non quatre comme l'annonçait
      ce document jusqu'au 2026-08-02. Manquent :
      - **Contactée** — entre « examinée » et « acceptée », l'état réel de la
        plupart des candidatures ;
      - **Embauchée** — ferme la boucle et alimente le délai d'embauche.
- [ ] **Statuts d'offre Ouverte / Suspendue / Fermée**. Nous n'avons que
      `isActive` : impossible de suspendre une offre le temps d'un arbitrage,
      il faut la supprimer ou la laisser tourner.

### P1 — volume et tri

- [ ] **Tri des offres** par date, titre, lieu.
- [ ] **Étiquettes personnalisées** sur les offres + filtrage par étiquette.
- [ ] **Changement de statut en masse** sur les offres (existe déjà sur les
      candidatures).
- [ ] **Filtres candidats** : lieu, qualifications, et surtout **réponses aux
      questions de présélection** — les questions existent déjà, on ne peut
      simplement pas filtrer dessus.

### P1 — équipe

- [ ] **Niveaux de permission**. Aujourd'hui le partage est binaire (bascule
      « Mes offres / Toute l'équipe » par entreprise). Indeed distingue les
      droits par membre.
- [ ] **Notes partagées** visibles de toute l'équipe sur une candidature.

### P2 — sourcing

- [ ] **Inviter un profil du vivier à postuler** (équivalent Smart Sourcing) :
      notification au candidat, suivi de l'invitation côté recruteur.
- [ ] **Analyses séparées du tableau de bord** : le tableau de bord répond à
      « où j'en suis aujourd'hui », les analyses à « qu'est-ce qui marche ».
      Tout est mélangé chez nous.

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
