import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

interface Article {
  slug: string;
  title: string;
  category: string;
  icon: string;
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
  private slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug'))), { initialValue: null });

  articles: Article[] = [
    {
      slug: 'reussir-son-cv',
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
}
