import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

export type DocLegal = 'mentions-legales' | 'confidentialite' | 'cgu' | 'cookies';

interface Section {
  titre: string;
  /** Paragraphes ; une chaîne commençant par « - » devient une puce. */
  corps: string[];
  /** Signale une mention que seul l'exploitant peut fournir. */
  aCompleter?: boolean;
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
  '- `cookie_consent` : votre réponse à ce bandeau, pour ne plus vous la redemander.',
  '- `lang` et `country` : la langue et le pays choisis.',
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
        aCompleter: true,
        corps: [
          'Raison sociale, forme juridique et capital social',
          'Adresse du siège social',
          'Numéro SIRET et numéro de TVA intracommunautaire',
          'Numéro de téléphone',
        ],
      },
      {
        titre: 'Directeur de la publication',
        aCompleter: true,
        corps: ['Nom et qualité du directeur de la publication'],
      },
      {
        titre: 'Hébergement',
        aCompleter: true,
        corps: [
          'Nom de l’hébergeur, adresse et téléphone',
          'Le site et son interface d’administration sont servis par un serveur IIS ; l’identité de l’hébergeur reste à préciser.',
        ],
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
        aCompleter: true,
        corps: [
          'Identité et coordonnées du responsable du traitement',
          'Coordonnées du délégué à la protection des données, s’il en a été désigné un',
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
        aCompleter: true,
        corps: [
          'Durée de conservation d’un compte inactif',
          'Durée de conservation des candidatures et des messages',
          'Durée de conservation du journal d’administration',
          'À défaut de durée fixée, la suppression de votre compte efface immédiatement vos données (voir ci-dessous).',
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
        aCompleter: true,
        corps: [
          'Ce document est un squelette. Sa rédaction relève d’un conseil juridique et doit être revue avant toute mise en ligne : les paragraphes ci-dessous décrivent le fonctionnement réel du service mais n’ont pas valeur d’engagement contractuel en l’état.',
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
        aCompleter: true,
        corps: [
          'Clause de limitation de responsabilité à faire rédiger',
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
        titre: 'Aucun traceur',
        corps: [
          'Le site ne comporte **aucun outil de mesure d’audience**, aucun traceur publicitaire, aucun pixel de réseau social. Rien de ce qui est déposé dans votre navigateur ne sert à vous suivre d’un site à l’autre.',
          'Tout ce qui suit est enregistré en « stockage local », et non en cookies : ces données ne sont jamais envoyées automatiquement au serveur à chaque requête. Elles restent sur votre appareil et s’effacent avec les données de navigation.',
        ],
      },
      {
        titre: 'Ce qui est enregistré, et pourquoi',
        corps: STOCKAGE_LOCAL,
      },
      {
        titre: 'Le bandeau de consentement',
        corps: [
          'Le bandeau affiché à votre première visite enregistre votre réponse pour ne plus vous la poser.',
          'Aucun traceur n’étant en place, votre choix ne conditionne aujourd’hui le chargement d’aucun service tiers. Il sera respecté le jour où un outil de mesure serait ajouté.',
        ],
      },
      {
        titre: 'Comment les effacer',
        corps: [
          'Effacez les données de navigation de votre navigateur pour ce site. Vous serez déconnecté et vos favoris enregistrés localement seront perdus ; votre compte et vos candidatures, eux, sont conservés côté serveur et vous les retrouverez à la reconnexion.',
        ],
      },
    ],
  },
];

@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  templateUrl: './legal.html',
  styleUrl: './legal.scss',
})
export class Legal implements OnInit {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  platform = inject(PlatformService);

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

  /** Combien de mentions restent à fournir : le dire en tête évite d'en oublier. */
  aCompleter = computed(() => this.doc().sections.filter((s) => s.aCompleter).length);

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
