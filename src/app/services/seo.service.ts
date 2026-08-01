import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { estEmployeurAnonyme } from '../pipes/employer-name.pipe';

/**
 * Référencement : titre, description, canonique, partage social et
 * données structurées.
 *
 * L'application servait un seul et même `<title>` — « La plateforme de
 * l'emploi » — pour ses cent vingt mille pages, sans description ni
 * canonique. Deux conséquences : aucun résultat de recherche n'était
 * cliquable, et les innombrables variantes d'une même liste (filtres,
 * pagination, tri) se présentaient aux moteurs comme autant de pages
 * distinctes au contenu identique.
 *
 * Ce service centralise ce que chaque page déclare d'elle-même. Il est
 * volontairement impératif plutôt que déclaratif : les données arrivent
 * après le rendu, et le titre d'une offre ne se connaît qu'une fois la
 * réponse de l'API reçue.
 *
 * ── Ce qu'il ne peut pas faire ──
 * Le site est une application monopage sans rendu serveur. Google exécute
 * le JavaScript et verra donc ces balises ; Bing le fait mal et beaucoup
 * d'autres pas du tout. Tant qu'un pré-rendu n'est pas en place, ce
 * service améliore surtout ce que Google comprend.
 */

export interface SeoPage {
  /** Sans le suffixe du site, ajouté ici. */
  title: string;
  description: string;
  /** Chemin canonique, sans domaine ni paramètres. Par défaut : l'URL courante nettoyée. */
  canonicalPath?: string;
  image?: string;
  /** `article` pour un contenu éditorial, `website` sinon. */
  type?: 'website' | 'article';
  /** Une page privée ou sans intérêt public se retire de l'index. */
  noindex?: boolean;
}

const SITE = 'La plateforme de l’emploi';
const HOST = 'https://www.laplateformedelemploi.com';
const IMAGE_DEFAUT = `${HOST}/images/logo-lpde.svg`;

/** Attribut posé sur les balises que ce service gère, pour les retirer ensuite. */
const MARQUEUR = 'data-seo';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  /**
   * Applique la déclaration d'une page.
   *
   * Appelé à chaque navigation : tout ce qui n'est pas redonné est remis
   * à sa valeur par défaut, sinon la description d'une offre resterait
   * affichée sur la page suivante.
   */
  set(page: SeoPage) {
    const titre = page.title ? `${page.title} | ${SITE}` : SITE;
    this.title.setTitle(titre);

    const canonique = this.canonique(page.canonicalPath);
    const image = page.image || IMAGE_DEFAUT;

    this.meta.updateTag({ name: 'description', content: page.description });

    // Une page privée ne doit pas seulement être absente du plan de site :
    // un lien depuis l'extérieur suffirait à la faire explorer.
    this.meta.updateTag({
      name: 'robots',
      content: page.noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    });

    this.lienCanonique(canonique);

    // Open Graph : ce que reprennent LinkedIn, Facebook, Slack, WhatsApp.
    // Une offre partagée sans ces balises s'affiche comme une URL nue.
    this.meta.updateTag({ property: 'og:title', content: titre });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: canonique });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:type', content: page.type ?? 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE });
    this.meta.updateTag({ property: 'og:locale', content: 'fr_FR' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: titre });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  /** Raccourci pour tout l'espace connecté : rien à y indexer. */
  privee(title: string) {
    this.set({ title, description: `${title} — espace personnel.`, noindex: true });
  }

  // ══ Canonique ══

  /**
   * Une liste filtrée n'est pas une page nouvelle.
   *
   * `/offres?contrat=CDI&page=3&tri=date` et `/offres` montrent le même
   * catalogue autrement découpé. Sans canonique, les moteurs explorent des
   * milliers de combinaisons et diluent la page qui compte. Les paramètres
   * sont donc retirés par défaut ; une page qui tient à en garder un le
   * passe explicitement dans `canonicalPath`.
   */
  private canonique(chemin?: string): string {
    if (chemin) return `${HOST}${chemin.startsWith('/') ? '' : '/'}${chemin}`;
    const url = this.doc.location?.pathname ?? '/';
    return `${HOST}${url === '/' ? '' : url}`;
  }

  private lienCanonique(href: string) {
    let lien = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!lien) {
      lien = this.doc.createElement('link');
      lien.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(lien);
    }
    lien.setAttribute('href', href);
  }

  // ══ Données structurées ══

  /**
   * Remplace les blocs JSON-LD de la page précédente par ceux-ci.
   *
   * Le nettoyage n'est pas optionnel : sans lui, l'offre consultée en
   * troisième garderait le balisage des deux premières, et Google
   * lirait trois annonces là où la page n'en montre qu'une.
   */
  structuredData(blocs: object[]) {
    this.doc.head.querySelectorAll(`script[${MARQUEUR}]`).forEach((n) => n.remove());
    for (const bloc of blocs) {
      const s = this.doc.createElement('script');
      s.setAttribute('type', 'application/ld+json');
      s.setAttribute(MARQUEUR, '');
      s.textContent = JSON.stringify(bloc);
      this.doc.head.appendChild(s);
    }
  }

  /** Fil d'Ariane : Google l'affiche à la place de l'URL dans ses résultats. */
  breadcrumb(elements: { nom: string; chemin: string }[]) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: elements.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: e.nom,
        item: `${HOST}${e.chemin}`,
      })),
    };
  }

  /**
   * Balisage d'une offre — le seul qui ouvre l'encart « Google for Jobs ».
   *
   * Trois exigences de Google méritent d'être signalées, parce que les
   * manquer ne produit pas un avertissement mais une exclusion :
   *
   * — `validThrough` est ce qui fait disparaître une annonce périmée. Une
   *   offre pourvue qui reste affichée est le premier motif de sanction.
   * — `directApply` doit dire la vérité : `true` seulement si la
   *   candidature se termine ici. Nos offres partenaires renvoient vers
   *   le site d'origine, elles valent `false`.
   * — une description trop courte disqualifie l'annonce ; on ne la balise
   *   pas plutôt que de la baliser mal.
   */
  jobPosting(o: {
    id: number; title: string; company: string; description: string;
    location?: string; createdAt: string; expiresAt?: string | null;
    contractType?: string; isRemote?: boolean; externalSource?: string | null;
    minSalary?: number | null; maxSalary?: number | null; salaryPeriod?: string | null;
    educationLevel?: string | null; experienceRequired?: string | null;
    address?: string | null; companyLogoUrl?: string | null;
  }): object | null {
    if (!o.description || o.description.trim().length < 120) return null;

    const unite = { an: 'YEAR', mois: 'MONTH', heure: 'HOUR' }[o.salaryPeriod || 'an'] ?? 'YEAR';
    const [ville, ...reste] = (o.location || '').split(/\s*[-–]\s*/).reverse();

    const bloc: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: o.title,
      description: o.description,
      datePosted: new Date(o.createdAt).toISOString().slice(0, 10),
      // Employeur non nommé : « Entreprise » n'est pas une organisation,
      // et l'annoncer comme telle salit le graphe de Google avec des
      // milliers d'offres attribuées à une société qui n'existe pas.
      // Pour une annonce confidentielle, la documentation prescrit de
      // déclarer le site qui la publie.
      hiringOrganization: estEmployeurAnonyme(o.company)
        ? { '@type': 'Organization', name: SITE, sameAs: HOST }
        : {
            '@type': 'Organization',
            name: o.company,
            ...(o.companyLogoUrl ? { logo: o.companyLogoUrl } : {}),
          },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'FR',
          ...(ville ? { addressLocality: ville.trim() } : {}),
          ...(reste.length ? { addressRegion: reste.reverse().join(' ').trim() } : {}),
          ...(o.address ? { streetAddress: o.address } : {}),
        },
      },
      // La candidature se termine ici pour nos offres, chez le partenaire
      // pour les autres. Le dire faux est une cause d'exclusion.
      directApply: !o.externalSource,
      identifier: { '@type': 'PropertyValue', name: SITE, value: String(o.id) },
    };

    // `validThrough` ne se devine pas.
    //
    // Une premiere version le calculait à soixante jours après la
    // publication quand la date manquait. Sur une annonce publiée en
    // mars, cela produisait une date de fin déjà passée : on déclarait
    // soi-même l'offre périmée tout en l'affichant. Une annonce périmée
    // laissée en ligne est le premier motif d'exclusion de Google for
    // Jobs — et l'exclusion frappe le domaine, pas la seule annonce.
    //
    // La date n'est donc écrite que si elle est connue et encore à venir.
    // Si elle est passée, l'annonce n'est pas balisée du tout : elle n'a
    // plus à figurer parmi les offres.
    if (o.expiresAt) {
      const fin = new Date(o.expiresAt);
      if (fin.getTime() < Date.now()) return null;
      bloc['validThrough'] = fin.toISOString().slice(0, 10);
    }

    if (o.contractType) {
      const type = {
        CDI: 'FULL_TIME', CDD: 'TEMPORARY', Stage: 'INTERN',
        Alternance: 'INTERN', Freelance: 'CONTRACTOR',
      }[o.contractType];
      if (type) bloc['employmentType'] = type;
    }

    if (o.isRemote) {
      bloc['jobLocationType'] = 'TELECOMMUTE';
      bloc['applicantLocationRequirements'] = { '@type': 'Country', name: 'France' };
    }

    if (o.minSalary || o.maxSalary) {
      bloc['baseSalary'] = {
        '@type': 'MonetaryAmount',
        currency: 'EUR',
        value: {
          '@type': 'QuantitativeValue',
          ...(o.minSalary ? { minValue: o.minSalary } : {}),
          ...(o.maxSalary ? { maxValue: o.maxSalary } : {}),
          unitText: unite,
        },
      };
    }

    if (o.educationLevel) {
      bloc['educationRequirements'] = {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: o.educationLevel,
      };
    }
    if (o.experienceRequired) {
      bloc['experienceRequirements'] = {
        '@type': 'OccupationalExperienceRequirements',
        monthsOfExperience: { Junior: 12, Intermediaire: 36, Senior: 60, Expert: 96 }[o.experienceRequired] ?? 0,
      };
    }

    return bloc;
  }
}
