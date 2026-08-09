# Parcours et séquences

Diagrammes des fonctionnalités ajoutées lors de la professionnalisation.

Ils ne sont pas décoratifs : **les tracer a révélé dix ruptures** au fil
de trois passes, et c'est en les corrigeant que ce document a pris sa
forme actuelle. Chaque section signale, sous le diagramme, ce que le
tracé a fait apparaître.

La règle qui a servi de grille de lecture, et qui vaut pour les
prochaines fonctionnalités : **une flèche entrante sans écran pour la
recevoir est un trou ; un acteur sans chemin pour l'atteindre aussi.**

Les diagrammes sont en Mermaid : GitHub les rend directement.

---

## Carte de navigation

Où vivent les écrans ajoutés, et par où on y arrive. Deux d'entre eux
n'étaient **reliés à rien** avant ce travail.

```mermaid
graph TD
    Pied["Pied de page<br/>(toutes les pages)"]
    Pied --> Acc["/accessibilite<br/>Déclaration"]
    Pied --> Sig["/signalement<br/>Contenu illicite"]
    Pied --> Pref["/preferences-courriel<br/>Ce que je reçois"]

    Courriel["Pied de chaque courriel"] --> Pref

    Offre["/offres/:id"] -->|« contenu illicite ? »| Sig

    subgraph Rec["Console recruteur"]
        RTab["Tableau de bord"] --- ROff["Mes offres"] --- RCand["Candidatures"]
        RCand --- RViv["Vivier"] --- REnt["Entretiens"] --- RMsg["Messagerie"]
        RMsg --- RFac["Facturation ★"]
    end

    ROff -->|quota atteint| RFac
    ROff -->|mise en avant| RFac
    RFac --> API["Clés d'API<br/>et webhooks"]
    Doc["/guide/api"] --> API

    subgraph Adm["Barre latérale admin"]
        AMod["Modération"] --- AAct["Activité"] --- AExp["Exploitation ★"] --- APar["Paramètres"]
    end

    AExp --> AErr["Erreurs navigateur"]
    AExp --> ACat["Fraîcheur du catalogue"]
    ACat --> AMod

    AMod --> MOff["Offres en attente"]
    AMod --> MSig["Signalements d'offres"]
    AMod --> MAvi["Avis entreprises"]
    AMod --> MDsa["Contenus illicites ★"]
    AMod --> MRet["Adresses bloquées ★"]

    Sig -.->|dossier à instruire| MDsa
    Pref -.->|rejet d'envoi| MRet

    Profil["/profil → Mes données"] --> Pref
    RFac --> Doc

    style RFac fill:#01489C,color:#fff
    style AExp fill:#01489C,color:#fff
    style MDsa fill:#01489C,color:#fff
    style MRet fill:#01489C,color:#fff
```

★ **Ce que le tracé a corrigé, en deux passes.**

*Première passe* — `/recruteur/facturation` et `/admin/exploitation`
existaient sans qu'aucun lien n'y mène. Deux pages complètes,
atteignables seulement en tapant l'adresse de mémoire, autant dire
inexistantes. Ajoutées à la sous-navigation du recruteur et à la barre
latérale de l'administration, cette dernière avec ses alias de recherche
(`santé`, `erreurs`, `fraîcheur`).

*Seconde passe* — la règle appliquée cette fois : **tout ce qui se
dépose doit avoir quelqu'un pour le traiter.** Elle a révélé deux
impasses plus graves que des liens manquants :

- Les **signalements de contenu illicite** arrivaient, recevaient leur
  accusé de réception et leur référence de suivi… et s'accumulaient dans
  une table qu'aucun écran n'affichait. Le règlement impose une décision
  motivée ; aucune ne pouvait être rendue. Un mécanisme de signalement
  dont rien ne sort n'est pas un mécanisme de signalement.
- Les **adresses qui rebondissent** étaient enregistrées et bloquées
  correctement, mais invisibles. On ne pouvait pas répondre à « pourquoi
  cette personne ne reçoit-elle plus rien ? ».

Les deux sont désormais des onglets de la modération — même métier, même
personne. Deux liens ordinaires manquaient aussi : la documentation de
l'API depuis la facturation, et le centre de préférences depuis le
profil (il n'était atteignable que par le pied de page et les courriels,
c'est-à-dire pas là où on le cherche).

---

## 1. Publier une offre

```mermaid
sequenceDiagram
    autonumber
    actor R as Recruteur
    participant F as job-form
    participant API as JobOffersController
    participant Fact as FacturationService
    participant Q as QualiteCatalogue
    participant DB as Base

    R->>F: Remplit les 7 étapes
    F->>F: Enregistre le brouillon à chaque étape
    R->>F: « Publier »
    F->>API: POST /joboffers

    rect rgb(240, 236, 226)
        note over API,Fact: Quota de la formule
        API->>Fact: PeutPublier(recruteur)
        Fact->>DB: Compte les offres actives non-brouillon
        alt Quota atteint
            Fact-->>API: refus + motif
            API-->>F: 402 « Votre formule autorise N offres »
            F->>R: Dialogue : « Voir les formules » / « Mes offres »
            note right of R: Le brouillon est conservé.
        end
    end

    Fact-->>API: autorisé
    API->>Q: Empreinte(titre, entreprise, ville)
    API->>Q: Filtrer(offre)

    alt Score ≥ 60
        Q-->>API: motif de suspicion
        API->>DB: ModerationStatus = Pending
        API-->>F: Offre déposée, en attente de validation
    else
        API->>DB: Enregistre, active
        API-->>F: Offre publiée
        F->>R: Redirection vers la fiche
    end

    note over API,DB: L'offre est signalée à IndexNow<br/>au prochain entretien du catalogue.
```

**Ce que le tracé a corrigé.** Le 402 était traité comme une panne
quelconque : « Erreur lors de la creation », après sept écrans de
saisie, sans dire pourquoi ni où aller. Le recruteur recommençait et
échouait à nouveau. Il obtient maintenant le motif exact, le rappel que
son brouillon est conservé, et deux issues explicites.

---

## 2. Mettre une offre en avant

```mermaid
sequenceDiagram
    autonumber
    actor R as Recruteur
    participant M as my-offers
    participant API as FacturationController
    participant Fact as FacturationService
    participant P as PrestatairePaiement
    participant T as Tâche de fond

    R->>M: « Sponsoriser »
    M->>API: POST /facturation/mise-en-avant
    API->>Fact: MisesEnAvantRestantes()

    alt Quota de la formule le couvre
        Fact->>Fact: MettreEnAvant(origine « incluse », 15 jours)
        API-->>M: « Mise en avant pour 15 jours »
    else Quota épuisé — prestataire branché
        API->>P: CreerTunnel(motif « mise-en-avant:42 »)
        P-->>API: adresse du tunnel
        API-->>M: redirection
        M->>R: Navigation vers le paiement
        P->>API: POST /facturation/retour-paiement (signé)
        API->>P: LireRetour — vérifie la signature HMAC
        API->>Fact: MettreEnAvant(origine « payée »)
        API->>Fact: Emettre la facture (numéro sans trou, TVA)
    else Quota épuisé — aucun prestataire
        API-->>M: 503 + message explicite
        M->>R: Message, puis /recruteur/facturation
    end

    note over T: Toutes les 6 h
    T->>Fact: RetirerLesEchues()
    Fact->>Fact: isFeatured = false au-delà de 15 jours
```

**Ce que le tracé a corrigé — le plus grave des quatre.** Le bouton
« Sponsoriser » appelait encore `toggleFeature`, qui met en avant **sans
rien décompter et sans date de fin**. La mise en avant restait donc
gratuite, illimitée et éternelle : tout le circuit de facturation
existait en parallèle, sans que l'interface ne l'emprunte jamais. Le
bouton passe désormais par la facturation ; seul le *retrait* garde
l'ancien point d'entrée, parce que cesser une mise en avant qu'on a
payée est un droit, pas un achat.

---

## 3. Une candidature arrive

```mermaid
sequenceDiagram
    autonumber
    actor C as Candidat
    participant API as ApplicationsController
    participant DB as Base
    participant W as WebhookService
    participant ATS as Logiciel du recruteur
    participant Cons as ConsentementCourriel
    participant Mail as Expéditeur

    C->>API: POST /applications
    API->>DB: Enregistre la candidature
    API-->>C: 200 — confirmation immédiate

    par Notification des tiers (détachée)
        API->>W: Diffuser « candidature.creee »
        W->>W: Signe HMAC(horodatage + corps)
        W->>ATS: POST + X-Lpde-Signature
        alt Échec
            W->>DB: Consigne la livraison
            note right of W: 10 échecs consécutifs<br/>→ abonnement désactivé
        end
    and Courriels
        API->>Cons: Autorise(adresse, « candidatures »)
        alt Refusé ou adresse bloquée
            Cons-->>API: non
            note right of API: Journalisé, rien n'est envoyé.
        else
            Cons-->>API: oui
            API->>Mail: Accusé au candidat
            API->>Mail: Alerte au recruteur
        end
    end
```

**Ce que le tracé a corrigé.** Deux ruptures. Le `WebhookService` était
écrit, testé, exposé dans l'interface — et **personne ne l'appelait** :
un recruteur pouvait créer un abonnement qui ne recevait jamais rien.
Et `ConsentementCourriel` enregistrait un refus que l'expéditeur ne
lisait pas : on écrivait à qui avait décoché la case. Un refus sans
effet est pire que pas de réglage du tout — il fait croire au réglage,
puis au mensonge.

Noter la barre `par` : les deux branches sont **après** la réponse au
candidat. Un serveur d'ATS lent ne doit pas faire attendre quelqu'un qui
vient de postuler.

---

## 4. Une erreur casse chez un visiteur

```mermaid
sequenceDiagram
    autonumber
    actor V as Visiteur
    participant Ang as GestionnaireErreurs
    participant API as JournalController
    participant DB as Base
    actor A as Administrateur

    V->>Ang: Exception JavaScript
    Ang->>Ang: console.error (toujours)

    alt Développement, erreur HTTP, ou déjà vue
        note right of Ang: On s'arrête là.<br/>Les erreurs HTTP sont déjà<br/>connues du serveur.
    else
        Ang->>Ang: Empreinte = message + tête de pile
        Ang->>API: POST /journal/erreur-navigateur
        note right of Ang: Plafond : 20 par session.<br/>Aucune donnée personnelle.
        API->>DB: Regroupe par empreinte
        alt Déjà connue
            DB->>DB: occurrences++, rouvre si classée
        else
            DB->>DB: Nouvelle ligne
        end
        API-->>Ang: 204 (toujours)
    end

    A->>API: GET /journal/erreurs-navigateur
    API-->>A: Liste triée, avec compteurs
    A->>API: PATCH — classer
```

Le 204 systématique n'est pas une négligence : un échec de remontée qui
lèverait produirait une nouvelle exception, elle-même remontée. La
boucle saturerait l'API en quelques secondes.

---

## 5. Import et entretien du catalogue

```mermaid
sequenceDiagram
    autonumber
    participant T as Tâche de fond
    participant Imp as JobImportService
    participant FT as France Travail
    participant Q as QualiteCatalogue
    participant DB as Base
    participant IN as IndexNow

    note over T: Toutes les 6 h
    T->>Imp: ImportAllAsync
    Imp->>FT: Récupère les offres
    Imp->>DB: Charge les empreintes actives

    loop Chaque offre entrante
        Imp->>Q: Empreinte(titre, entreprise, ville)
        alt Déjà présente sous un autre identifiant
            Imp->>DB: Rafraîchit VueChezLaSourceLe
            note right of Imp: Écartée — c'est ce<br/>rafraîchissement qui la<br/>maintient en vie.
        else
            Imp->>Q: Filtrer — 7 signaux pondérés
            Imp->>DB: Insère
        end
    end

    T->>Q: ExpirerLesImportees()
    Q->>DB: isActive = false au-delà de 30 jours sans revue
    T->>IN: SignalerOffres(entrées des 7 dernières heures)
    IN->>IN: Bing, Yandex, Seznam, Naver
```

**Ce que le tracé a rendu visible.** L'ordre compte et n'était pas
évident : l'entretien tourne **après** l'import, jamais avant. Une offre
revue chez sa source à l'instant ne doit pas être retirée parce que le
nettoyage est passé cinq minutes plus tôt.

Le dédoublonnage ne se contente pas d'écarter : il **rafraîchit
l'ancienne**. Sans ce geste, l'offre conservée finirait par expirer
alors que sa source la republie à chaque cycle.

---

## 6. Signalement de contenu illicite (DSA)

```mermaid
sequenceDiagram
    autonumber
    actor D as Déclarant
    participant P as /signalement
    participant API as DsaController
    participant Mail as Expéditeur
    actor A as Administration

    D->>P: Depuis le pied de page, ou depuis une offre
    note right of P: Le lien depuis une offre porte<br/>le type et l'identifiant.
    P->>API: GET /signalements/motifs
    D->>P: Motif, exposé (30 car. min.), bonne foi
    P->>API: POST /signalements

    alt Bonne foi non déclarée
        API-->>P: 400 — le texte lui donne un effet juridique
    end

    API->>API: Référence SIG-2026-0001
    alt Adresse fournie
        API->>Mail: Accusé de réception (obligation, « sans retard »)
    else
        API-->>P: « Conservez cette référence »
    end

    rect rgb(240, 236, 226)
        note over A,API: Instruction — /admin/moderation, onglet « Contenus illicites »
        A->>API: GET /signalements?statut=Recu
        API-->>A: Dossiers, exposé compris
        note right of A: L'attente en jours s'affiche ;<br/>au-delà de 3 j, le dossier<br/>est marqué en rouge.
        A->>A: Rédige la motivation (20 car. min.)
        A->>API: PATCH /signalements/{id}
        alt Motivation trop courte
            API-->>A: 400 — « la décision doit être motivée »
        end
    end

    API->>Mail: Décision + voies de recours (art. 21, Arcom)
    D->>API: GET /signalements/{ref} — suivi sans compte
```

**Ce que le tracé a corrigé — deux fois.**

*D'abord l'entrée.* La fiche offre proposait un signalement qui alimente
la modération : rapide, mais sans accusé, sans délai, sans recours.
Quelqu'un qui signale une annonce frauduleuse a droit au mécanisme du
règlement, et n'avait aucun moyen de l'apprendre depuis la fiche. Une
passerelle a été ajoutée dans la modale, qui transporte l'offre : sans
elle, la personne recopie l'adresse à la main.

*Puis la sortie, plus grave.* Le diagramme s'arrêtait sur « A->>API:
PATCH — décision motivée » — un acteur, un appel, et **aucun écran pour
le faire**. Les endpoints d'administration existaient ; rien ne les
appelait. Les dossiers s'accumulaient, chacun avec son accusé de
réception promettant une décision qui ne pouvait pas venir. La rectangle
grisé ci-dessus est l'écran qui manquait : file filtrable par état,
exposé du déclarant, âge du dossier signalé en rouge au-delà de trois
jours, et une motivation exigée avant l'envoi.

Le vocabulaire de l'onglet est délibérément distinct de celui des
signalements ordinaires — « Contenus illicites » — pour que les deux ne
soient pas traités avec le même soin, c'est-à-dire le moindre des deux.

Les deux mécanismes coexistent volontairement — noyer le signalement
courant sous du vocabulaire juridique découragerait ceux qui relèvent
simplement de la modération.

---

## 7. Ce que je reçois, et ce qui rebondit

```mermaid
sequenceDiagram
    autonumber
    actor U as Personne
    participant P as /preferences-courriel
    participant API as PreferencesCourrielController
    participant Cons as ConsentementCourriel
    participant B as Brevo
    participant N as Lettre d'information
    actor A as Administration

    U->>P: Lien au pied d'un courriel (jeton, sans connexion)
    P->>API: GET /preferences-courriel/{jeton}
    API-->>P: 6 catégories + ce qui partira toujours
    U->>P: Décoche « Alertes d'offres »
    P->>API: PUT
    API->>API: Synchronise la table d'abonnés de la lettre
    note right of API: Deux registres qui se contredisent<br/>finissent par écrire à qui a dit non.

    B->>API: POST /preferences-courriel/retour (secret partagé)
    API->>Cons: NoterRetour(dur / doux / plainte)
    alt Plainte
        Cons->>Cons: ToutRefuse = true
    else 3 rejets doux, ou 1 dur
        Cons->>Cons: Bloque = true
    end

    N->>Cons: Autorise(adresse, « lettre ») avant chaque envoi
    Cons-->>N: non → livraison marquée, rien ne part

    A->>API: /admin/moderation, onglet « Adresses bloquées »
    API-->>A: Type, motif, nombre de rejets, état
```

**Ce que le tracé a corrigé.** Le blocage fonctionnait, la table se
remplissait — et rien ne l'affichait. À la question « pourquoi cette
personne ne reçoit-elle plus rien ? », personne ne pouvait répondre
autrement qu'en interrogeant la base à la main. L'onglet répond.

Trois envois échappent au réglage : réinitialisation de mot de passe,
confirmation d'adresse, alerte de connexion. Ils répondent à une action
de la personne ou protègent son compte ; les couper lui nuirait. La page
le dit explicitement plutôt que de le laisser deviner.

---

## 8. Brancher un logiciel de recrutement

```mermaid
sequenceDiagram
    autonumber
    actor R as Recruteur
    participant B as /recruteur/facturation
    participant API as IntegrationsController
    participant ATS as Logiciel
    participant V1 as /api/v1

    R->>B: Onglet « API et webhooks »
    alt Formule ≠ Pro
        B-->>R: L'accès est inclus dans la formule Pro
    end

    R->>API: POST /integrations/cles
    API->>API: Empreinte SHA-256 — la clé n'est pas stockée
    API-->>R: Clé en clair, une seule fois

    R->>ATS: Configure la clé
    ATS->>V1: Authorization: Bearer lpde_…
    V1->>V1: CleApiAttribute — empreinte, révocation, portée
    alt Portée absente
        V1-->>ATS: 403
    else Quota de formule atteint
        V1-->>ATS: 402
    end
    V1-->>ATS: Offres / candidatures

    R->>API: POST /integrations/webhooks (HTTPS exigé)
    API-->>R: Secret de signature, une seule fois
```

Le même quota s'applique à l'API qu'au site. Sans cela, elle serait la
porte de service qui contourne la facturation.

---

## 9. Un déploiement

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Développeur
    participant CI as GitHub Actions
    participant IIS as Serveur
    participant Site as Site en ligne

    Dev->>CI: push sur main
    CI->>CI: npm run lint (0 erreur, ≤ 333 avert.)
    CI->>CI: npm test
    CI->>CI: dotnet test
    note right of CI: Avant la construction.<br/>Ce qu'ils refusent ne part pas.
    CI->>CI: Build (paquet initial < 900 kB)
    CI->>CI: Secrets injectés — absence de JWT_KEY = arrêt
    CI->>IIS: msdeploy sync

    rect rgb(240, 236, 226)
        note over CI,Site: Test de fumée
        CI->>Site: GET / (3 essais)
        CI->>Site: Le HTML contient-il <app-root> ?
        CI->>Site: GET /api/sante (6 essais, migrations)
        CI->>Site: GET /joboffers — la base répond-elle ?
        alt Un seul échec
            CI-->>Dev: Workflow rouge
        end
    end
```

Le workflow passait au vert dès que `msdeploy` rendait la main : il ne
rendait compte que du transfert des fichiers, jamais de ce que le site
répondait ensuite.

---

## 10. Une lecture publique

```mermaid
sequenceDiagram
    autonumber
    actor V as Visiteur ou robot
    participant IIS as IIS
    participant API as API
    participant Cache as Cache de sortie
    participant DB as Base

    V->>IIS: GET /offres/42
    IIS-->>V: index.html (no-cache) + fichiers hachés (1 an, immuable)
    note right of IIS: HSTS, CSP, nosniff,<br/>Referrer-Policy, Permissions-Policy

    V->>API: GET /api/joboffers?...
    API->>Cache: Déjà calculé ? (anonyme seulement)
    alt Oui
        Cache-->>API: réponse
    else
        API->>DB: Requête
        note right of DB: > 500 ms → journalisée
        API->>Cache: Range (60 s / 10 min / 1 h)
    end
    API-->>V: Brotli — 5 à 10 fois plus léger

    V->>API: GET /api/seo/sitemap.xml (If-None-Match)
    alt Étiquette inchangée
        API-->>V: 304, sans corps
    end
```

---

## 11. Ce que voit l'administration

Le seul diagramme qui ne décrit pas un parcours mais une **couverture** :
pour chaque chose que la plateforme collecte, qui la traite et où.
Le tableau est la grille à remplir avant d'ajouter quoi que ce soit.

| Ce qui est collecté | Écran qui le traite | Action possible |
|---|---|---|
| Offres en attente | Modération → En attente | Approuver, rejeter avec note |
| Signalements d'offres | Modération → Signalements | Traiter, rejeter |
| Avis d'entreprises | Modération → Avis | Approuver, masquer |
| **Contenus illicites (DSA)** | Modération → Contenus illicites | Décision motivée + recours |
| **Adresses bloquées** | Modération → Adresses bloquées | Consultation |
| Erreurs navigateur | Exploitation | Classer, rouvrir |
| Fraîcheur du catalogue | Exploitation | Vers la fiche offre |
| Offres suspectes (score ≥ 60) | Exploitation → Modération | Approuver, rejeter |
| État des services | Exploitation | Consultation |
| Recettes et abonnements | Exploitation → Recettes | Consultation |
| Livraisons de webhook | Espace recruteur | Consultation par le porteur |
| **Modèles de courriel** | Réglages → Expédition | Aperçu, essai d'envoi |
| **Diffusions partenaires** | Espace recruteur → Offre | Diffuser, retirer |
| **Consentements par finalité** | Chez le visiteur (`/cookies`) | Donner, retirer |

**Plus aucune ligne sans écran.** La dernière — les recettes — est
désormais un panneau de l'exploitation, masqué tant qu'aucune facture
n'a été émise : il n'y a alors rien à montrer, et un bloc de zéros
n'apprend rien. Placé là plutôt que dans les statistiques parce que
celles-ci répondent à « qu'est-ce qui marche » et l'exploitation à
« est-ce que ça tourne » : un service commercial dont on ignore s'il
encaisse ne tourne qu'à moitié.

C'est cette colonne qu'il faut remplir avant d'ajouter quoi que ce soit
qui collecte.

---

## 12. Instruire un signalement, et exécuter la mesure

```mermaid
sequenceDiagram
    autonumber
    actor A as Modérateur
    participant M as admin-moderation
    participant API as DsaController
    participant App as Appliquer()
    participant DB as Base
    participant Mail as Expéditeur
    actor D as Déclarant

    A->>M: Onglet « Contenus illicites »
    M->>API: GET /signalements?statut=Recu
    API-->>M: Dossiers + exposé + âge
    note right of M: Au-delà de 3 jours d'attente,<br/>le dossier passe en rouge.

    A->>M: Décision, mesure, motivation
    M->>API: PATCH /signalements/{id}

    rect rgb(240, 236, 226)
        note over API,DB: La mesure s'exécute, ou n'est pas déclarée
        API->>App: Appliquer(dossier, mesure)

        alt Signalement non retenu
            App-->>API: « Aucune (signalement non retenu) »
        else Contenu introuvable
            App-->>API: « Aucune (offre déjà disparue) »
        else Offre — contenu retiré
            App->>DB: IsActive = false, ModerationStatus = Rejected
            App->>DB: Note = « Retirée sur signalement SIG-… »
            App-->>API: « ContenuRetire »
        else Avis — contenu retiré
            App->>DB: Status = Rejected
            App-->>API: « ContenuRetire »
        else Compte suspendu
            App->>DB: LockoutEnd sur l'auteur
            App-->>API: « CompteSuspendu »
        end
    end

    API->>DB: Enregistre la mesure RÉELLEMENT prise
    API->>Mail: Décision + mesure + voies de recours
    Mail->>D: Courriel
```

**Ce que le tracé a corrigé — le plus grave depuis le début.** La mesure
était **enregistrée et jamais appliquée**. Un modérateur choisissait
« Contenu retiré », le déclarant recevait un courriel le lui affirmant,
et l'annonce restait en ligne.

Ce n'est pas un oubli d'implémentation ordinaire : c'est le système qui
**ment dans un document juridique**. Le règlement impose une décision
motivée ; une décision qui se trompe sur la mesure prise est pire qu'une
absence de réponse, parce qu'elle clôt le dossier. Le déclarant n'a plus
de raison d'insister, et le contenu illicite reste.

Trois principes en découlent, visibles dans le diagramme :

- **`Appliquer` rend ce qui a été fait**, pas ce qui était demandé. Si le
  contenu a disparu entre-temps, ou si son type ne se traite pas
  automatiquement, la mesure redescend à « Aucune » **et le motif le
  dit**. C'est ce retour qui part dans le courriel.
- **Aucune mesure sur un signalement non retenu.** Retirer un contenu
  jugé licite serait exactement le sur-retrait par prudence que le
  règlement cherche à éviter.
- **Rien n'est supprimé, tout est masqué.** Une offre retirée garde ses
  candidatures, un compte suspendu est verrouillé et non effacé. Un
  signalement peut être jugé fondé à tort ; une suppression ne se défait
  pas.

---

## 13. Rouvrir une adresse bloquée

```mermaid
sequenceDiagram
    autonumber
    participant B as Brevo
    participant Cons as ConsentementCourriel
    participant DB as Base
    actor P as Titulaire de l'adresse
    actor A as Administration

    B->>Cons: Rejet « dur » — panne passagère du serveur destinataire
    Cons->>DB: Bloque = true
    note right of DB: L'adresse est coupée de tout,<br/>y compris de la réinitialisation<br/>de mot de passe.

    P->>P: N'arrive plus à se connecter
    P->>P: Demande une réinitialisation
    note right of P: Rien n'arrive.<br/>Le compte est perdu.

    A->>A: Modération → Adresses bloquées
    A->>Cons: Debloquer(adresse)
    Cons->>DB: Bloque = false, compteur remis à zéro
    Cons->>DB: ToutRefuse = false si une plainte l'avait posé
    note right of Cons: Sans remettre le compteur à zéro,<br/>un seul rejet ultérieur rebloquerait<br/>aussitôt l'adresse.
    Cons->>DB: Journal d'activité — qui a rouvert, et quand
```

**Ce que le tracé a corrigé.** La liste montrait le problème sans offrir
le remède. Le blocage se déclenche sur un signal du prestataire, et ce
signal se trompe : une panne passagère remonte parfois en rejet dur. Or
l'adresse est alors coupée de la réinitialisation de mot de passe — qui
est précisément ce qu'on utilise quand on n'arrive plus à entrer. Le
compte était perdu pour son titulaire, sans recours.

---

## 14. Ouvrir et fermer une boîte de dialogue

```mermaid
sequenceDiagram
    autonumber
    actor U as Personne au clavier
    participant Ec as Écran
    participant Dir as appModale
    participant LE as Lecteur d'écran

    U->>Ec: Active « Signaler »
    Ec->>Dir: ngOnInit
    Dir->>Dir: Mémorise l'élément qui avait le focus

    rect rgb(240, 236, 226)
        note over Dir,LE: Annoncer le dialogue
        Dir->>Dir: role="dialog", aria-modal="true" sur le panneau
        Dir->>Dir: aria-labelledby vers le titre (id posé au besoin)
        Dir->>LE: « Dialogue — Signaler cette offre »
    end

    Dir->>Ec: Focus sur le 1er élément utile
    note right of Dir: Pas sur « Fermer » :<br/>une modale qui s'annonce en<br/>proposant d'en sortir déroute.

    loop Tant que le dialogue est ouvert
        U->>Dir: Tab / Shift+Tab
        Dir->>Dir: Boucle à l'intérieur du panneau
    end

    alt Échap
        U->>Dir: Échap
        Dir->>Ec: fermeture
    else Clic sur le fond
        U->>Dir: clic
        Dir->>Dir: cible === élément courant ?
        Dir->>Ec: fermeture si oui
    else Bouton de fermeture
        U->>Ec: Activer « Fermer »
    end

    Ec->>Dir: ngOnDestroy
    Dir->>Ec: Rend le focus à l'élément mémorisé
```

**Ce que le tracé a corrigé, en deux temps.**

*D'abord le clavier.* Les modales se fermaient d'un clic sur le fond, et
c'était la seule sortie. Au clavier, on n'y entrait même pas : la
tabulation continuait tranquillement à parcourir la page cachée
derrière. L'analyse statique signalait ces fonds comme « éléments
cliquables non focalisables » — la correction évidente aurait été de
leur poser un `tabindex`, ce qui aurait ajouté sept arrêts de tabulation
ne menant nulle part tout en faisant taire l'avertissement. Le manque
était ailleurs.

*Puis l'annonce.* Le piège de focus retient la tabulation, mais un
lecteur d'écran ne navigue pas qu'à la tabulation : en mode exploration,
il parcourait le document et lisait la page derrière la modale sans
jamais annoncer qu'une fenêtre s'était ouverte. La personne entendait un
formulaire de recherche pendant qu'un dialogue attendait sa réponse.
`role="dialog"`, `aria-modal` et `aria-labelledby` sont désormais posés
par la directive — sept modales, sept oublis possibles évités.

Le clic sur le fond, lui, est devenu une comparaison de cible : ce qui a
permis de supprimer les huit `(click)="$event.stopPropagation()"` qui ne
servaient qu'à annuler le gestionnaire du voile. Moins de code, et
l'accessibilité en plus.

---

## Ce que ces tracés n'ont pas encore couvert

- **Alertes de recherche et rappels d'entretien** — les catégories
  existent dans le centre de préférences, mais aucun courriel ne part
  encore pour elles. Le jour où ils partiront, ils devront passer par
  `ConsentementCourriel.Autorise()`, comme les candidatures et la lettre.
- **Rendu serveur** — tous les diagrammes ci-dessus supposent un
  navigateur qui exécute le JavaScript. Pour un robot qui ne l'exécute
  pas, la première étape rend une coquille vide. Voir
  `TODO-PROFESSIONNALISATION.md`, §1.
- **Encaissement réel** — le diagramme 2 décrit le tunnel complet ;
  `PrestatairePaiement` attend deux secrets pour l'ouvrir.
- **Multidiffusion effective** — le dépôt et le retrait sont écrits et
  testés, mais aucune destination n'est ouverte : France Travail demande
  une habilitation « dépôt d'offres » distincte de celle qui sert à lire
  le catalogue. Le tracé du retrait mérite d'être fait le jour où elle
  sera obtenue, parce que c'est lui qui protège les candidats — une
  offre pourvue restée en ligne ailleurs continue d'en recevoir.
- **Mesure d'audience** — le consentement par finalité est en place et
  le service de mesure l'interroge à chaque page ; aucune instance
  Matomo ou Plausible n'est encore déclarée, donc rien ne part.
