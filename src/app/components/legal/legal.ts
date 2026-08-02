import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Consentement } from '../../services/consentement.service';
import { PlatformService } from '../../services/platform.service';
import { SeoService } from '../../services/seo.service';

/**
 * Pages légales.
 *
 * Le pied de page affichait quatre liens — mentions légales,
 * confidentialité, CGU, cookies — qui pointaient tous vers « # ». Un site
 * français qui traite des CV et des candidatures doit légalement publier
 * les deux premières ; les annoncer sans les servir était le pire des
 * deux mondes.
 *
 * Ce qui est écrit ici a été relevé dans le code, pas recopié d'un
 * modèle : les clés réellement déposées dans le navigateur, les données
 * réellement conservées, les droits réellement implémentés. Ce qui ne
 * peut pas se déduire du code — raison sociale, hébergeur, durées de
 * conservation — est marqué comme restant à compléter, visiblement, pour
 * qu'aucune mention fausse ne passe pour vraie.
 */

export type DocLegal =
  | 'mentions-legales'
  | 'confidentialite'
  | 'cgu'
  | 'cookies'
  | 'accessibilite';

interface Section {
  titre: string;
  /** Paragraphes ; une chaîne commençant par « - » devient une puce. */
  corps?: string[];
  /**
   * Mentions tirées des paramètres de la plateforme : l'éditeur les
   * saisit depuis la console, elles ne vivent pas dans le code. Chaque
   * entrée porte la clé du paramètre et son libellé.
   */
  mentions?: { cle: string; libelle: string }[];
  /**
   * Pose le bouton qui rouvre le bandeau de consentement.
   *
   * « Il doit être aussi simple de retirer son consentement que de le
   * donner » : la phrase est dans le RGPD, et un lien renvoyant aux
   * réglages du navigateur ne la satisfait pas.
   */
  rouvrirConsentement?: boolean;
}

interface Document {
  cle: DocLegal;
  titre: string;
  chapeau: string;
  sections: Section[];
}

const MARQUE = 'La plateforme de l’emploi';

/** Ce que l'application dépose réellement dans le navigateur. */
const STOCKAGE_LOCAL: string[] = [
  '- `lpde_token` et `lpde_user` : votre session et votre profil affiché. Sans eux, vous seriez déconnecté à chaque page.',
  '- `lpde_bookmarks` : les offres que vous mettez en favori. Elles ne quittent jamais votre navigateur — nous ne savons pas ce que vous enregistrez.',
  '- `lpde_recent_searches` : vos dernières recherches, pour vous les reproposer.',
  '- `lpde.candidature.*` : le brouillon d’une candidature interrompue, pour la reprendre où vous l’aviez laissée.',
  '- `consentement_finalites` : vos réponses au bandeau, finalité par finalité, avec la date. Enregistré même si vous refusez tout — c’est ce qui évite qu’on vous repose la question à chaque page.',
  '- `lpde_token_admin`, `lpde_user_admin`, `lpde_emprunt` : réservés à l’administration, pendant une prise en main de compte à des fins d’assistance.',
];

const DOCUMENTS: Document[] = [
  {
    cle: 'mentions-legales',
    titre: 'Mentions légales',
    chapeau: "Identité de l'éditeur du site et de son hébergeur, conformément à la loi pour la confiance dans l'économie numérique.",
    sections: [
      {
        titre: 'Éditeur du site',
        mentions: [
          { cle: 'raison_sociale', libelle: 'Raison sociale, forme juridique et capital' },
          { cle: 'adresse', libelle: 'Siège social' },
          { cle: 'siret', libelle: 'SIRET' },
          { cle: 'tva', libelle: 'TVA intracommunautaire' },
          { cle: 'telephone', libelle: 'Téléphone' },
        ],
      },
      {
        titre: 'Directeur de la publication',
        mentions: [{ cle: 'directeur_publication', libelle: 'Directeur de la publication' }],
      },
      {
        titre: 'Hébergement',
        mentions: [{ cle: 'hebergeur', libelle: 'Hébergeur' }],
      },
      {
        titre: 'Contact',
        corps: [
          `Pour toute question relative au site, vous pouvez écrire à l’adresse de contact indiquée en pied de page.`,
        ],
      },
      {
        titre: 'Propriété intellectuelle',
        corps: [
          `La structure du site, ses textes propres et son identité visuelle sont la propriété de ${MARQUE}.`,
          'Les offres d’emploi reprises chez France Travail restent la propriété de leurs auteurs respectifs. Elles sont affichées telles qu’elles ont été publiées, sans modification de leur contenu, et renvoient vers l’annonce d’origine.',
        ],
      },
    ],
  },

  {
    cle: 'confidentialite',
    titre: 'Politique de confidentialité',
    chapeau: 'Les données que nous traitons, pourquoi, combien de temps, et ce que vous pouvez en faire.',
    sections: [
      {
        titre: 'Responsable du traitement',
        mentions: [
          { cle: 'raison_sociale', libelle: 'Responsable du traitement' },
          { cle: 'adresse', libelle: 'Adresse' },
          { cle: 'dpo', libelle: 'Délégué à la protection des données' },
        ],
      },
      {
        titre: 'Données que vous nous confiez',
        corps: [
          'Un compte n’est nécessaire que pour postuler, enregistrer des offres ou publier une annonce. La consultation du catalogue ne demande rien.',
          '- **Compte** : prénom, nom, adresse email, et si vous les renseignez : téléphone, ville, intitulé de poste, années d’expérience, formation, compétences, présentation, liens LinkedIn et portfolio, photo.',
          '- **CV** : le fichier PDF que vous téléversez, et les sections de votre CV en ligne si vous en créez un.',
          '- **Candidatures** : les offres auxquelles vous postulez, votre lettre de motivation, vos réponses aux questions du recruteur, vos prétentions et votre disponibilité si vous les indiquez.',
          '- **Échanges** : les messages envoyés aux recruteurs et les entretiens planifiés.',
          '- **Alertes** : les recherches que vous enregistrez et les notes que vous prenez sur une offre.',
          '- **Journal d’administration** : vos connexions et les actions d’administration sont horodatées, avec l’adresse IP d’origine, pour retrouver l’auteur d’une action sur les comptes et les annonces.',
        ],
      },
      {
        titre: 'À quoi elles servent',
        corps: [
          '- Vous permettre de postuler et de suivre vos candidatures.',
          '- Transmettre votre dossier au recruteur de l’offre visée — c’est l’objet même de la candidature.',
          '- Vous rendre visible des recruteurs dans le vivier de candidats, **si et seulement si** vous l’avez autorisé. Ce réglage se retire à tout moment depuis votre profil.',
          '- Vous prévenir d’une nouvelle offre correspondant à une alerte que vous avez créée.',
          '- Assurer la sécurité du service et retrouver l’auteur d’une action sensible.',
        ],
      },
      {
        titre: 'Qui y a accès',
        corps: [
          '- **Le recruteur de l’offre** à laquelle vous postulez : votre dossier de candidature.',
          '- **Les recruteurs inscrits**, si vous avez rendu votre profil visible dans le vivier.',
          '- **L’administration du site**, pour la modération et l’assistance. Toute prise en main d’un compte est enregistrée au journal sous le nom de l’administrateur, et un bandeau la signale en permanence.',
          'Vos données ne sont ni vendues, ni louées, ni transmises à des fins publicitaires.',
        ],
      },
      {
        titre: 'Combien de temps',
        mentions: [
          { cle: 'conservation_compte', libelle: 'Compte inactif' },
          { cle: 'conservation_candidatures', libelle: 'Candidatures et messages' },
          { cle: 'conservation_journal', libelle: 'Journal d’administration' },
        ],
        corps: [
          // Ces durées ne sont pas des intentions : ce sont celles que
          // `PurgeService` applique réellement, une fois par jour. Elles
          // sont réglables dans la console — d'où les valeurs affichées
          // ci-dessus, lues à la source plutôt que recopiées ici. Le
          // détail par catégorie suit, parce qu'une promesse de
          // conservation qui ne dit pas *quoi* ne promet rien.
          'Le détail, par catégorie de donnée :',
          '- **Compte et profil** — 24 mois après la dernière connexion. Un message d’avertissement part **60 jours avant** l’échéance ; une seule connexion remet le compteur à zéro.',
          '- **CV, sections de CV et fichiers téléversés** — effacés avec le compte, fichier compris sur le disque du serveur.',
          '- **Candidatures, lettres et réponses aux questions** — 24 mois après le dernier échange sur le dossier.',
          '- **Messages et entretiens** — même durée que la candidature à laquelle ils se rattachent.',
          '- **Alertes, favoris, notes sur une offre, jetons de notification** — effacés avec le compte.',
          '- **Sessions ouvertes** — effacées avec le compte ; une session inutilisée expire de toute façon au bout de 7 jours.',
          '- **Journal d’administration** — 12 mois. C’est la seule catégorie conservée indépendamment du compte : elle sert à retrouver l’auteur d’une action sur les annonces ou les comptes, y compris après le départ de cet auteur.',
          '- **Abonnement à la lettre d’information** — jusqu’au désabonnement, ou effacé avec le compte lorsque l’adresse est la même.',
          '- **Factures et pièces comptables** — 10 ans, durée imposée par le code de commerce. Elles survivent donc à la suppression du compte, réduites à ce que la comptabilité exige : numéro, date, montant, raison sociale.',
          '- **Signalements (DSA)** — 12 mois après la décision, pour pouvoir en justifier auprès du déclarant et du régulateur.',
          'Vous pouvez à tout moment supprimer votre compte : l’effacement est alors immédiat, sans attendre ces échéances — à la seule exception des pièces comptables ci-dessus.',
        ],
      },
      {
        titre: 'Registre des traitements',
        corps: [
          'Les sous-traitants qui interviennent, et ce qu’ils voient exactement :',
          '- **OVH** (France) — hébergement du site, de l’API et de la base. Voit tout ce qui est stocké, comme tout hébergeur.',
          '- **Brevo** (France) — expédition des courriels. Reçoit l’adresse du destinataire et le contenu du message envoyé, rien d’autre.',
          '- **OVH SMS** (France) — envoi des codes de double authentification. Reçoit le numéro de téléphone et le code.',
          '- **Anthropic** (États-Unis) — analyse des annonces suspectes et aide à la rédaction. Reçoit le **texte de l’offre**, jamais un CV, jamais une candidature, jamais une donnée de compte.',
          '- **Firebase Cloud Messaging** (Google, États-Unis) — notifications poussées, si vous les activez. Reçoit un jeton d’appareil et le texte de la notification.',
          '- **France Travail, Adzuna, Jooble, Arbeitnow, Remotive** — sources des offres importées. **Rien ne leur est transmis** : la lecture est à sens unique.',
          'Les transferts hors de l’Union européenne (Anthropic, Firebase) reposent sur les clauses contractuelles types de la Commission. Aucun d’eux ne reçoit de donnée de candidature.',
        ],
      },
      {
        titre: 'Vos droits',
        corps: [
          'Deux d’entre eux s’exercent directement depuis votre profil, sans nous écrire, dans l’onglet « Mes données » :',
          '- **Accès et portabilité** : téléchargez l’ensemble de vos données au format JSON.',
          '- **Effacement** : supprimez votre compte. L’opération est immédiate et définitive — profil, CV, candidatures et alertes sont effacés.',
          'Les droits de rectification et d’opposition s’exercent en modifiant votre profil, ou en nous écrivant à l’adresse de contact. Vous pouvez enfin introduire une réclamation auprès de la CNIL.',
        ],
      },
      {
        titre: 'Services tiers',
        corps: [
          '- **France Travail** : les offres d’emploi affichées proviennent de son interface publique. Aucune donnée personnelle ne lui est transmise.',
          '- **Connexion Google** : si vous choisissez de vous connecter avec Google, le script `accounts.google.com` est chargé et Google nous transmet votre nom et votre adresse email. Ce bouton n’apparaît que si cette connexion est activée ; sinon rien n’est chargé.',
          'Le site ne comporte aucun outil de mesure d’audience, aucun traceur publicitaire et aucun réseau social embarqué.',
        ],
      },
    ],
  },

  {
    cle: 'cgu',
    titre: "Conditions générales d'utilisation",
    chapeau: 'Ce que le service propose, ce qu’il attend de vous, et les limites de sa responsabilité.',
    sections: [
      {
        titre: 'Avertissement',
        corps: [
          '**Ce document est un squelette et n’a pas valeur d’engagement contractuel en l’état.**',
          'Les paragraphes qui suivent décrivent fidèlement le fonctionnement du service, mais leur rédaction relève d’un conseil juridique et doit être revue avant d’être opposable.',
        ],
      },
      {
        titre: 'Objet du service',
        corps: [
          `${MARQUE} rassemble des offres d’emploi — celles reprises chez France Travail et celles publiées directement par des recruteurs inscrits — et permet aux candidats de postuler et de suivre leurs candidatures.`,
          'La consultation est libre. La candidature, l’enregistrement d’offres et la publication d’annonces demandent un compte.',
        ],
      },
      {
        titre: 'Votre compte',
        corps: [
          'Vous vous engagez à fournir des informations exactes et à ne pas usurper l’identité d’un tiers.',
          'Vous êtes responsable de la confidentialité de votre mot de passe.',
          'Un compte peut être suspendu en cas d’usage contraire aux présentes conditions.',
        ],
      },
      {
        titre: 'Contenus publiés',
        corps: [
          'Les annonces déposées par un recruteur sont soumises à modération avant publication.',
          'Sont notamment proscrits : les offres discriminatoires, les annonces frauduleuses, celles qui demandent un paiement au candidat, et toute annonce ne correspondant pas à un poste réel.',
          'Chaque annonce peut être signalée par un bouton présent sur sa fiche.',
        ],
      },
      {
        titre: 'Responsabilité',
        corps: [
          '_Clause de limitation de responsabilité à faire rédiger par un conseil._',
          'Le contenu des offres reprises chez France Travail relève de leurs auteurs : nous n’en garantissons ni l’exactitude, ni la disponibilité, ni la mise à jour. Les rémunérations affichées sont déduites du libellé publié par l’employeur et peuvent en différer.',
        ],
      },
    ],
  },

  {
    cle: 'cookies',
    titre: 'Cookies et stockage local',
    chapeau: 'Ce que le site dépose dans votre navigateur — et ce qu’il n’y dépose pas.',
    sections: [
      {
        titre: 'Aucun traceur publicitaire',
        corps: [
          'Le site ne comporte **aucun traceur publicitaire**, aucun pixel de réseau social, aucun outil qui vous suive d’un site à l’autre. Rien n’est vendu, loué ni recoupé avec quoi que ce soit.',
          'Tout ce qui suit est enregistré en « stockage local », et non en cookies : ces données ne sont jamais envoyées automatiquement au serveur à chaque requête. Elles restent sur votre appareil et s’effacent avec les données de navigation.',
        ],
      },
      {
        titre: 'Ce qui est enregistré, et pourquoi',
        corps: STOCKAGE_LOCAL,
      },
      {
        titre: 'Trois finalités, trois choix',
        corps: [
          'Le bandeau ne pose pas une question mais trois, parce que ce n’est pas la technique qui se consent — c’est l’usage qu’on en fait.',
          '- **Strict nécessaire** — votre session, le jeton anti-falsification des formulaires, et le choix que vous faites ici. Ne se refuse pas : sans lui, il n’y a pas de site.',
          '- **Mesure d’audience** — le comptage des pages vues. Refusée par défaut, et refusée veut dire **rien** : aucune requête ne part.',
          '- **Confort de navigation** — vos recherches récentes, vos favoris, l’état de vos filtres entre deux visites.',
          'Refuser coûte un clic, exactement comme accepter : les deux boutons ont le même poids, et aucune case n’est cochée d’avance.',
        ],
      },
      {
        titre: 'La mesure d’audience, si elle est activée',
        corps: [
          'Elle ne l’est pas aujourd’hui, et le site le dit plutôt que de laisser croire le contraire. Le jour où elle le sera, ce sera **Matomo ou Plausible, hébergés sur nos propres serveurs** — jamais Google Analytics, qui transfère les données hors de l’Union et alimente un profil publicitaire.',
          'Ce qui serait compté : l’adresse de la page, **débarrassée de ses paramètres de recherche**. Cette précision n’est pas cosmétique — les filtres passent par ces paramètres, et une recherche en dit souvent plus sur quelqu’un que tout le reste de sa visite.',
          'Ce qui ne serait jamais compté : votre identité, votre compte, vos candidatures, ni aucun identifiant permettant de vous reconnaître d’une visite à l’autre.',
        ],
      },
      {
        titre: 'Revenir sur votre choix',
        corps: [
          'Retirer un consentement doit être aussi simple que de le donner. Le bouton ci-dessous rouvre le bandeau, avec vos réponses précédentes déjà en place.',
        ],
        rouvrirConsentement: true,
      },
      {
        titre: 'Comment les effacer',
        corps: [
          'Effacez les données de navigation de votre navigateur pour ce site. Vous serez déconnecté et vos favoris enregistrés localement seront perdus ; votre compte et vos candidatures, eux, sont conservés côté serveur et vous les retrouverez à la reconnexion.',
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════
  //  Déclaration d'accessibilité
  //
  //  Une déclaration n'a de valeur que si elle est exacte. Celle-ci
  //  annonce donc un état partiel et nomme ce qui ne va pas, plutôt que
  //  de cocher « totalement conforme » comme le font la plupart des
  //  sites qui n'ont jamais audité quoi que ce soit.
  //
  //  Les chiffres viennent de l'analyse statique du dépôt (règles
  //  d'accessibilité d'ESLint), pas d'une estimation. Ils bougeront :
  //  les mettre à jour fait partie du travail de correction.
  // ══════════════════════════════════════════════
  {
    cle: 'accessibilite',
    titre: 'Déclaration d’accessibilité',
    chapeau:
      'Où en est ce site en matière d’accessibilité, ce qui reste non conforme, et comment nous le signaler.',
    sections: [
      {
        titre: 'État de conformité',
        corps: [
          `**${MARQUE} est partiellement conforme** au référentiel général d’amélioration de l’accessibilité (RGAA 4.1). « Partiellement conforme » signifie que certains critères ne sont pas respectés : ils sont énumérés plus bas.`,
          'Cette déclaration porte sur l’ensemble du site public et des espaces candidat et recruteur.',
        ],
      },
      {
        titre: 'Ce qui a été fait',
        corps: [
          '- **Contrastes** : chaque couleur de texte du système graphique est mesurée sur ses deux fonds — blanc et crème — et le rapport est noté à côté de sa définition. Aucune couleur en dessous de 4,5:1 n’est utilisée pour du texte à lire.',
          '- **Navigation au clavier** : le focus reste visible partout, y compris sur les éléments interactifs personnalisés. Les tunnels de candidature et de dépôt d’offre se parcourent entièrement au clavier.',
          '- **Animations** : le réglage système « réduire les animations » est respecté sur l’ensemble du site, graphiques compris.',
          '- **Images** : une alternative textuelle est exigée par l’analyse statique, qui refuse la construction sans elle.',
          '- **Zoom et adaptation** : la mise en page tient jusqu’à 200 % d’agrandissement ; aucun contenu large ne fait défiler la page horizontalement.',
          '- **Structure** : titres hiérarchisés, points de repère, libellés de formulaire liés à leur champ sur les écrans les plus récents.',
        ],
      },
      {
        titre: 'Ce qui n’est pas conforme',
        corps: [
          'Un audit automatisé du code, mené le 2 août 2026, relevait 120 manques. **Ils sont tous corrigés.** Les règles correspondantes bloquent désormais la mise en production, ce qui est le seul moyen de tenir ce zéro : une règle qui se contente d’avertir finit par être ignorée.',
          'Ce que l’outil ne voit pas reste, et c’est l’essentiel de ce qui suit. Un audit automatisé vérifie la présence d’attributs ; il ne dit pas si une page est utilisable.',
          '- **Absence de rendu serveur** : la page est construite par du JavaScript. Une technologie d’assistance qui ne l’exécute pas ne voit rien. C’est aujourd’hui le manque le plus lourd de cette liste.',
          '- **Graphiques** : les données sont rendues dans un canevas, non parcourable au clavier. Une vue tableau existe sur les cartes qui en proposent une, pas sur toutes.',
          '- **Cartes** : le composant cartographique n’expose pas d’alternative textuelle à la localisation. L’adresse figure toutefois en clair à côté.',
          '- **Aucun audit au moteur de rendu** : les contrastes calculés, l’ordre réel de parcours au clavier et ce qu’annonce effectivement un lecteur d’écran ne sont vérifiés qu’à la main, par sondage. Aucun de ces trois points n’est visible d’une analyse du code source.',
        ],
      },
      {
        titre: 'Établissement de cette déclaration',
        corps: [
          'Déclaration établie le **2 août 2026**.',
          'Elle s’appuie sur un audit automatisé du code (règles d’accessibilité appliquées à l’ensemble des gabarits) et sur des vérifications manuelles au clavier des parcours de candidature, de dépôt d’offre et de connexion. **Aucun audit RGAA complet par un tiers n’a été réalisé à ce jour** : le taux de conformité exact n’est donc pas connu, et cette déclaration ne l’annonce pas.',
          'Technologies utilisées : HTML, CSS, JavaScript (Angular). Outils d’évaluation : analyse statique des gabarits, navigation au clavier, vérification des contrastes.',
        ],
      },
      {
        titre: 'Signaler un problème',
        corps: [
          'Si vous rencontrez un contenu inaccessible, écrivez-nous : nous répondons et nous corrigeons. Précisez la page et ce que vous n’avez pas pu faire.',
        ],
        mentions: [{ cle: 'email_contact', libelle: 'Adresse de contact' }],
      },
      {
        titre: 'Défense de vos droits',
        corps: [
          'Si vous constatez un défaut d’accessibilité vous empêchant d’accéder à un contenu et que vous n’obtenez pas de réponse satisfaisante de notre part, vous pouvez :',
          '- écrire au **Défenseur des droits** ;',
          '- contacter le **délégué du Défenseur des droits** de votre département ;',
          '- adresser un courrier, sans affranchissement, à : Défenseur des droits — Libre réponse 71120 — 75342 Paris CEDEX 07.',
        ],
      },
    ],
  },
];

@Component({
  selector: 'app-legal',
  imports: [RouterLink, DatePipe],
  templateUrl: './legal.html',
  styleUrl: './legal.scss',
})
export class Legal implements OnInit {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  platform = inject(PlatformService);
  readonly consentement = inject(Consentement);

  /**
   * Rouvre le bandeau, avec les réponses précédentes déjà en place.
   *
   * « Il doit être aussi simple de retirer son consentement que de le
   * donner » : la phrase est dans le RGPD, et renvoyer quelqu'un vers
   * les réglages de son navigateur ne la satisfait pas.
   */
  rouvrirLeChoix() {
    this.consentement.dernierEtat.set({
      mesure: this.consentement.mesureAutorisee(),
      confort: this.consentement.confortAutorise(),
    });
    this.consentement.revenirSurLeChoix();
  }

  readonly documents = DOCUMENTS;
  doc = signal<Document>(DOCUMENTS[0]);

  /** Un « - » en tête fait une puce ; le reste est un paragraphe. */
  estPuce = (ligne: string) => ligne.trimStart().startsWith('- ');
  sansTiret = (ligne: string) => ligne.trimStart().replace(/^-\s*/, '');

  /**
   * Le gras en `**…**` et le code en `` `…` `` sont rendus tels quels :
   * écrire ces textes en HTML les rendrait pénibles à relire, et c'est
   * un document destiné à être relu.
   */
  enrichir(ligne: string): string {
    return this.sansTiret(ligne)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  /**
   * Combien de mentions restent vides. Le compteur porte sur la valeur
   * réelle du paramètre : dès que l'éditeur la saisit depuis la console,
   * l'avertissement disparaît de lui-même.
   */
  aCompleter = computed(() =>
    this.doc().sections
      .flatMap((s) => s.mentions ?? [])
      .filter((m) => !this.platform.legal(m.cle)).length,
  );

  valeur = (cle: string) => this.platform.legal(cle);

  ngOnInit() {
    this.route.data.subscribe((d) => {
      const cle = d['doc'] as DocLegal;
      const trouve = DOCUMENTS.find((x) => x.cle === cle) ?? DOCUMENTS[0];
      this.doc.set(trouve);
      this.seo.set({
        title: trouve.titre,
        description: trouve.chapeau,
        canonicalPath: `/${trouve.cle}`,
        // Une page légale n'a pas vocation à capter de la recherche, mais
        // elle doit être atteignable et indexée : Google vérifie leur
        // présence pour juger du sérieux d'un site.
        type: 'article',
      });
    });
  }
}
