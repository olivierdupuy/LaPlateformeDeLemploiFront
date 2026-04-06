import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly siteName = 'La Plateforme de l\'Emploi';
  private readonly siteUrl = 'https://www.plateforme-emploi.fr';

  constructor(
    private title: Title,
    private meta: Meta,
    private router: Router,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  setPage(pageTitle: string, description: string, noIndex = false): void {
    this.title.setTitle(`${pageTitle} | ${this.siteName}`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: noIndex ? 'noindex, nofollow' : 'index, follow' });

    // Canonical
    this.setCanonical(`${this.siteUrl}${this.router.url.split('?')[0]}`);

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: `${pageTitle} | ${this.siteName}` });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: `${this.siteUrl}${this.router.url.split('?')[0]}` });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:locale', content: 'fr_FR' });

    // Twitter
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: `${pageTitle} | ${this.siteName}` });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    // Clean old structured data
    this.removeStructuredData();
  }

  setJobOffer(
    title: string,
    company: string,
    location: string,
    contractType: string,
    description?: string,
    salaryMin?: number | null,
    salaryMax?: number | null,
    publishedAt?: string,
    isRemote?: boolean
  ): void {
    const desc = `${title} chez ${company} a ${location} (${contractType}). Postulez sur La Plateforme de l'Emploi.`;
    this.setPage(`${title} - ${company}`, desc);
    this.meta.updateTag({ property: 'og:type', content: 'article' });

    // Schema.org JobPosting
    const jsonLd: any = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title,
      description: description || desc,
      datePosted: publishedAt || new Date().toISOString(),
      hiringOrganization: {
        '@type': 'Organization',
        name: company,
        sameAs: `${this.siteUrl}/entreprises`
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: location,
          addressCountry: 'FR'
        }
      },
      employmentType: this.mapContractType(contractType)
    };

    if (isRemote) {
      jsonLd.jobLocationType = 'TELECOMMUTE';
    }

    if (salaryMin || salaryMax) {
      jsonLd.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: 'EUR',
        value: {
          '@type': 'QuantitativeValue',
          minValue: salaryMin || undefined,
          maxValue: salaryMax || undefined,
          unitText: 'YEAR'
        }
      };
    }

    this.setStructuredData(jsonLd);
  }

  setCompany(name: string, description?: string): void {
    const desc = description
      ? `${name} — ${description.substring(0, 150)}`
      : `Decouvrez les offres d'emploi de ${name} sur La Plateforme de l'Emploi.`;
    this.setPage(name, desc);

    this.setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      description: description || desc,
      url: `${this.siteUrl}${this.router.url}`
    });
  }

  setNoIndex(pageTitle: string, description: string): void {
    this.setPage(pageTitle, description, true);
  }

  // === Private helpers ===

  private setCanonical(url: string): void {
    let link = this.doc.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (link) {
      link.href = url;
    } else {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.doc.head.appendChild(link);
    }
  }

  private setStructuredData(data: any): void {
    this.removeStructuredData();
    const script = this.doc.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('class', 'seo-structured-data');
    script.textContent = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }

  private removeStructuredData(): void {
    const existing = this.doc.querySelectorAll('script.seo-structured-data');
    existing.forEach(el => el.remove());
  }

  private mapContractType(type: string): string {
    const map: Record<string, string> = {
      'CDI': 'FULL_TIME',
      'CDD': 'CONTRACTOR',
      'Stage': 'INTERN',
      'Alternance': 'FULL_TIME',
      'Freelance': 'CONTRACTOR'
    };
    return map[type] || 'OTHER';
  }
}
