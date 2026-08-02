import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { SeoService } from '../../services/seo.service';

interface Article {
  slug: string;
  title: string;
  category: string;
  icon: string;
  /** Photo d'illustration de l'article (Unsplash). */
  photo: string;
  excerpt: string;
  readMin: number;
  sections: { heading: string; body: string }[];
}

@Component({
  selector: 'app-careers-guide',
  imports: [RouterLink],
  templateUrl: './careers-guide.html',
  styleUrl: './careers-guide.scss',
})
export class CareersGuide {
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  private slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))), { initialValue: null });

  /**
   * Ce que la page déclare d'elle-même.
   *
   * La coquille de l'application posait un titre de section générique
   * — « Guide carrières » — identique pour les six articles. Aux yeux
   * d'un moteur, six pages au même titre et à la même description sont
   * six doublons, et c'est le contenu éditorial, le plus facile à
   * classer, qui en pâtissait le plus.
   *
   * Le fil d'Ariane accompagne : il donne au résultat de recherche sa
   * ligne de contexte sous le titre, et il coûte trois lignes.
   *
   * En `effect` plutôt qu'en `ngOnInit` : le composant sert la liste et
   * l'article depuis la même instance, et le routeur ne le recrée pas
   * quand on passe de l'un à l'autre.
   */
  private declarerSeo = effect(() => {
    const article = this.selected();

    if (!article) {
      this.seo.set({
        title: 'Guide carrières',
        description:
          "Rédiger son CV, préparer un entretien, négocier son salaire, se reconvertir : nos guides pratiques pour chaque étape d'une recherche d'emploi.",
        canonicalPath: '/guide',
        type: 'article',
      });
      this.seo.breadcrumb([{ nom: 'Guide carrières', chemin: '/guide' }]);
      return;
    }

    this.seo.set({
      title: article.title,
      description: article.excerpt,
      canonicalPath: `/guide/${article.slug}`,
      image: article.photo,
      type: 'article',
    });

    this.seo.breadcrumb([
      { nom: 'Guide carrières', chemin: '/guide' },
      { nom: article.title, chemin: `/guide/${article.slug}` },
    ]);

    // Les sections de l'article se prêtent au format « questions
    // fréquentes » : chaque intertitre est une question, chaque
    // paragraphe sa réponse. C'est ce que Google affiche en accordéon
    // sous le résultat, et c'est ce qui fait la différence entre une
    // ligne et six.
    this.seo.structuredData([
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: article.sections.map((s) => ({
          '@type': 'Question',
          name: s.heading,
          acceptedAnswer: { '@type': 'Answer', text: s.body },
        })),
      },
    ]);
  });

  articles: Article[] = [
    // ── Documentation de l'API publique ──
    //
    // Placée dans le guide et non dans une page à part : c'est l'adresse
    // que « GET /api/v1 » annonce de lui-même, et une API qui renvoie
    // vers une documentation inexistante inspire une confiance limitée.
    //
    // Elle s'adresse à un intégrateur, pas à un candidat. C'est assumé :
    // le guide est le seul endroit du site conçu pour du texte long, et
    // lui bâtir un gabarit dédié pour une page n'aurait rien apporté.
    {
      slug: 'api',
      photo: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=70&auto=format&fit=crop',
      title: 'Brancher votre logiciel de recrutement',
      category: 'Recruteurs',
      icon: 'bi-plug',
      readMin: 6,
      excerpt:
        "Publier vos offres et relever les candidatures depuis votre ATS, sans repasser par nos écrans. Clés d'API, points d'entrée, webhooks.",
      sections: [
        {
          heading: 'Obtenir une clé',
          body: "L'accès à l'API est inclus dans la formule Pro. Depuis Facturation → API et webhooks, créez une clé en lui donnant un nom : celui de l'outil qui s'en servira. La clé s'affiche une seule fois — nous n'en conservons qu'une empreinte, comme pour un mot de passe. Copiez-la immédiatement. Si vous la perdez, révoquez-la et créez-en une autre : c'est plus sûr que de pouvoir la relire.",
        },
        {
          heading: "S'authentifier",
          body: "Passez la clé dans l'en-tête Authorization : « Authorization: Bearer lpde_… ». Chaque clé porte des portées explicites (lire vos offres, les publier, lire les candidatures, changer leur statut) : une clé de lecture ne peut rien modifier, même par erreur. Le plafond est de 600 requêtes par minute et par clé — de quoi synchroniser, pas de quoi moissonner.",
        },
        {
          heading: 'Les points d’entrée',
          body: "GET /api/v1/offres liste vos offres (paginées). POST /api/v1/offres en publie une : titre, entreprise, lieu, description, typeContrat, et une « reference » libre qui vous appartient — elle vous revient telle quelle et vous évite de tenir une table de correspondance. PATCH /api/v1/offres/{id} modifie, DELETE ferme sans supprimer (les candidatures reçues doivent rester rattachées à quelque chose). GET /api/v1/candidatures relève les candidatures, PATCH /api/v1/candidatures/{id} change leur statut.",
        },
        {
          heading: 'Ce que l’API refuse, et pourquoi',
          body: "Un 402 signale que le quota d'offres de votre formule est atteint : l'API applique les mêmes règles que le site, elle n'est pas une porte de service. Un 403 signale que votre clé ne porte pas la portée demandée. Les offres publiées par API passent par la même analyse que les autres : une annonce qui déclenche les signaux de fraude part en modération avant d'être visible.",
        },
        {
          heading: 'Être prévenu plutôt qu’interroger',
          body: "Interroger l'API toutes les minutes coûte aux deux parties et arrive toujours en retard. Abonnez-vous plutôt aux événements : candidature.creee, candidature.statut, offre.publiee, offre.fermee, entretien.planifie, message.recu. Nous appelons votre URL HTTPS à chaque événement réel.",
        },
        {
          heading: 'Vérifier une livraison de webhook',
          body: "Chaque appel porte deux en-têtes : X-Lpde-Horodatage et X-Lpde-Signature, au format « t=<horodatage>,v1=<hmac> ». Recalculez HMAC-SHA256 de « <horodatage>.<corps brut> » avec le secret affiché à la création, et comparez à la partie v1. Sans cette vérification, quiconque connaît votre URL peut vous fabriquer de fausses notifications — « ce candidat a été embauché » — et vous agiriez dessus. Refusez aussi les horodatages trop anciens : c'est ce qui empêche le rejeu d'une livraison capturée. Après dix échecs consécutifs, l'abonnement se désactive de lui-même.",
        },
        {
          heading: 'Diffuser sans écrire une ligne',
          body: "Si vous voulez seulement que vos offres circulent, deux flux existent et ne demandent aucune clé : /api/flux/offres.xml au format que lisent les agrégateurs, et /api/flux/offres.jsonld pour Google for Jobs. Ils ne contiennent que les offres déposées chez nous.",
        },
      ],
    },
    {
      slug: 'reussir-son-cv',
      photo: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=70&auto=format&fit=crop',
      title: 'Réussir son CV en 2026',
      category: 'CV',
      icon: 'bi-file-earmark-person',
      readMin: 5,
      excerpt: 'Structure, mots-clés, mise en page : les règles pour un CV qui passe les filtres et retient l\'attention des recruteurs.',
      sections: [
        { heading: 'Allez à l\'essentiel', body: 'Un recruteur consacre en moyenne quelques secondes à un premier tri. Placez vos informations les plus fortes en haut : intitulé de poste ciblé, 2-3 réalisations chiffrées, compétences clés. Visez une page (deux au-delà de 10 ans d\'expérience).' },
        { heading: 'Parlez le langage de l\'offre', body: 'Reprenez les mots-clés de l\'annonce (compétences, outils, méthodes). Beaucoup de plateformes filtrent les candidatures sur ces termes : un CV aligné sur l\'offre a bien plus de chances d\'être vu.' },
        { heading: 'Chiffrez vos résultats', body: '« Augmentation du trafic de 40 % en 6 mois » vaut mieux que « en charge du trafic ». Les chiffres rendent vos réalisations concrètes et crédibles.' },
        { heading: 'Soignez la forme', body: 'Une mise en page claire, une police lisible, des sections nettes. Évitez les photos et couleurs criardes ; privilégiez la lisibilité et la cohérence.' },
      ],
    },
    {
      slug: 'preparer-entretien',
      photo: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=70&auto=format&fit=crop',
      title: 'Préparer son entretien d\'embauche',
      category: 'Entretien',
      icon: 'bi-chat-dots',
      readMin: 6,
      excerpt: 'Recherche, questions types, langage corporel : la méthode pour aborder un entretien avec confiance.',
      sections: [
        { heading: 'Renseignez-vous sur l\'entreprise', body: 'Consultez son site, ses actualités, ses avis (onglet Avis de la fiche entreprise). Comprenez son activité, sa culture et ses enjeux pour poser des questions pertinentes.' },
        { heading: 'Préparez vos réponses', body: 'Anticipez les grands classiques : parcours, forces/faiblesses, motivation pour ce poste. Utilisez la méthode STAR (Situation, Tâche, Action, Résultat) pour structurer vos exemples.' },
        { heading: 'Préparez vos questions', body: 'Un entretien est bilatéral. Interrogez sur l\'équipe, les objectifs du poste, les perspectives d\'évolution. Cela montre votre intérêt et vous aide à décider.' },
        { heading: 'Le jour J', body: 'Arrivez en avance, soignez votre présentation, restez à l\'écoute. Un langage corporel ouvert et un sourire comptent autant que le contenu.' },
      ],
    },
    {
      slug: 'negocier-salaire',
      photo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=70&auto=format&fit=crop',
      title: 'Négocier son salaire',
      category: 'Rémunération',
      icon: 'bi-cash-coin',
      readMin: 4,
      excerpt: 'Connaître le marché, argumenter, trouver le bon moment : négociez votre rémunération sereinement.',
      sections: [
        { heading: 'Connaissez votre valeur', body: 'Avant toute négociation, estimez la fourchette du marché pour votre métier et votre région (voir l\'espace Salaires). Vous saurez ainsi ce qui est réaliste.' },
        { heading: 'Attendez le bon moment', body: 'La négociation intervient généralement une fois l\'intérêt mutuel confirmé, idéalement quand une offre est sur la table. Évitez d\'aborder le sujet trop tôt.' },
        { heading: 'Argumentez avec des faits', body: 'Appuyez votre demande sur vos réalisations, vos compétences rares et les données du marché. Restez factuel et ouvert au dialogue (avantages, télétravail, formation…).' },
      ],
    },
    {
      slug: 'reconversion',
      photo: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=70&auto=format&fit=crop',
      title: 'Réussir sa reconversion professionnelle',
      category: 'Carrière',
      icon: 'bi-arrow-repeat',
      readMin: 5,
      excerpt: 'Faire le point, se former, valoriser ses acquis : les étapes clés d\'un changement de voie réussi.',
      sections: [
        { heading: 'Clarifiez votre projet', body: 'Identifiez ce qui vous motive, vos compétences transférables et le secteur visé. Un projet clair guide toutes les étapes suivantes.' },
        { heading: 'Montez en compétences', body: 'Formations, certifications, projets personnels : comblez l\'écart entre votre profil et le métier cible. Beaucoup de dispositifs financent la reconversion.' },
        { heading: 'Valorisez votre parcours', body: 'Votre expérience passée est un atout, pas un frein. Mettez en avant ce que vous apportez de différent et racontez votre transition avec cohérence.' },
      ],
    },
  ];

  categories = [...new Set(this.articles.map((a) => a.category))];
  selected = computed(() => this.articles.find((a) => a.slug === this.slug()) || null);

  /** Rubrique retenue sur la page de liste ('' = toutes). */
  filter = signal('');

  /**
   * Articles affiches par la liste. Quatre articles ne se filtrent pas
   * vraiment, mais la rubrique dit ce qu'on va trouver avant de cliquer —
   * et la liste grandira.
   */
  visible = computed(() => {
    const f = this.filter();
    return f ? this.articles.filter((a) => a.category === f) : this.articles;
  });

  /**
   * Les autres articles, pour le pied de l'article courant. Une lecture
   * qui se termine sur deux boutons se termine ; une lecture qui se
   * termine sur trois titres continue.
   */
  others = computed(() => {
    const cur = this.selected();
    return this.articles.filter((a) => a.slug !== cur?.slug);
  });

  /** Ancre d'un intertitre, pour le sommaire lateral. */
  anchor(heading: string): string {
    return heading
      .toLowerCase()
      .normalize('NFD')
      // Les diacritiques decomposees par NFD, retirees pour que « clarifiez »
      // et « clarifiez » (accentue) donnent la meme ancre.
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
