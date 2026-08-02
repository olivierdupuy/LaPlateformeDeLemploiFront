# Journal des changements

Ce qui change pour les personnes qui utilisent le site. L'historique Git
raconte le code ; celui-ci raconte le service.

---

## 2026-08-02 (suite)

### Nouveau

- **Vos choix de cookies, finalité par finalité** — le bandeau ne pose
  plus une question mais trois : le strict nécessaire, la mesure
  d'audience et le confort de navigation se décident séparément.
  Refuser coûte un clic, exactement comme accepter, et aucune case n'est
  cochée d'avance. Vous pouvez revenir sur vos choix à tout moment
  depuis la page « Cookies ».
- **Durées de conservation, en détail** — la politique de
  confidentialité dit désormais catégorie par catégorie combien de temps
  chaque donnée est gardée, et pourquoi : 24 mois pour un compte inactif
  avec un avertissement 60 jours avant, 24 mois pour les candidatures,
  12 mois pour le journal, 10 ans pour les factures parce que le code de
  commerce l'impose. Ce sont les durées réellement appliquées, pas des
  intentions.
- **Registre des traitements** — qui intervient sur vos données, et ce
  que chacun voit exactement. Le point qui méritait d'être écrit noir sur
  blanc : le modèle de langage qui analyse les annonces suspectes reçoit
  le texte des offres, jamais un CV, jamais une candidature.
- **Multidiffusion des offres** (recruteurs) — publier une offre chez
  France Travail et les partenaires depuis la console, **et l'en
  retirer**. C'est le retrait qui compte : une offre pourvue restée en
  ligne ailleurs continue de recevoir des candidatures que personne ne
  lira. Les accès aux partenaires ne sont pas encore ouverts ; chaque
  destination indique ce qui lui manque plutôt que d'échouer en silence.
- **Relecture des messages automatiques** (administration) — les 14
  courriels que la plateforme envoie se relisent et s'essaient depuis les
  réglages, sans avoir à provoquer la situation qui les déclenche.

### Amélioré

- **Accessibilité** — tous les manques que l'analyse automatique
  signalait sont corrigés : plus aucun élément cliquable hors d'atteinte
  au clavier, plus aucune étiquette de formulaire orpheline. Les règles
  correspondantes bloquent désormais toute mise en production qui en
  réintroduirait une.
- Les cinq étoiles de notation d'une entreprise s'annoncent maintenant
  chacune par sa valeur au lecteur d'écran ; elles disaient toutes
  « Note », ce qui revenait à choisir au hasard.

### Corrigé

- **Candidature** — dans un formulaire à plusieurs questions de
  présélection, la réponse à la deuxième question et aux suivantes
  pouvait être enregistrée sous la mauvaise question. Rien ne le
  signalait, ni au candidat ni au recruteur.
- **Dépôt d'offre** — à partir de la deuxième question de présélection,
  cliquer sur le libellé « Réponse attendue » ou « Type de réponse »
  déplaçait le curseur dans la question précédente.
- **Bandeau de cookies** — le choix enregistré était oublié au
  rechargement de la page, et le bandeau revenait à chaque visite.

---

## 2026-08-02

### Nouveau

- **Centre de préférences de courriel** (`/preferences-courriel`) —
  choisir ce que l'on reçoit, catégorie par catégorie : alertes d'offres,
  suivi de candidatures, messages, entretiens, lettre d'information,
  nouveautés. Accessible sans se connecter, depuis le lien au pied de
  chaque message. Ce qui protège le compte — mot de passe oublié,
  confirmation d'adresse, alerte de connexion — continue de partir.
- **Signalement de contenu illicite** (`/signalement`) — le mécanisme
  prévu par le règlement européen sur les services numériques : dépôt
  sans compte, accusé de réception, référence de suivi, décision motivée
  et voies de recours. Remplace le simple lien vers une adresse de
  courriel.
- **Facturation recruteur** (`/recruteur/facturation`) — formules et
  quotas, mises en avant incluses ou achetées, factures téléchargeables,
  clés d'API et webhooks pour les comptes Pro.
- **API publique** (`/api/v1`) — publier des offres et relever les
  candidatures depuis un logiciel de recrutement, sans piloter un
  navigateur. Clés à portées explicites, révocables.
- **Flux sortants** — `/api/flux/offres.xml` pour les agrégateurs,
  `/api/flux/offres.jsonld` pour Google for Jobs.
- **Page d'erreur 404** — une adresse inconnue renvoyait silencieusement
  vers l'accueil. Elle affiche désormais ce qui s'est passé et propose
  des offres récentes.
- **Console d'exploitation** (`/admin/exploitation`) — l'état des
  services et les erreurs rencontrées par les navigateurs des visiteurs,
  regroupées et comptées.

### Amélioré

- **Le site se charge deux fois plus vite au premier écran.** Le paquet
  initial passe de 1,8 Mo à 840 kB (197 kB transférés) : chaque écran est
  désormais chargé au moment où l'on s'y rend, et les écrans du parcours
  courant sont ramenés en tâche de fond une fois la page affichée.
- **Les réponses de l'API sont compressées** et les listes publiques
  mises en cache : une recherche d'offres transfère cinq à dix fois moins.
- **Le catalogue se nettoie tout seul.** Une même annonce publiée sur
  plusieurs agrégateurs n'apparaît plus qu'une fois ; une offre qu'on ne
  revoit plus chez sa source pendant trente jours est retirée.
- **Les annonces douteuses passent en modération** avant publication —
  demande d'argent au candidat, contact sur une messagerie privée,
  demande de pièce d'identité, promesse de gain disproportionnée.
- **Le retour arrière retrouve la position de lecture.** On revenait
  d'une fiche offre en haut d'une liste de cinquante résultats.
- **Sécurité du transport** — HSTS, politique de sécurité du contenu (en
  observation), et fin des requêtes en clair.

### Interne

Journalisation structurée conservée trente jours · remontée des
exceptions du navigateur · signalement des requêtes SQL au-delà de
500 ms · analyse statique et tests unitaires en intégration continue ·
vérification automatique après chaque déploiement.
