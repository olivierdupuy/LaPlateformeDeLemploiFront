export interface CvSection {
  id: number;
  userId: string;
  sectionType: SectionType;
  title?: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  level?: string;
  sortOrder: number;
  createdAt: string;
}

export type SectionType = 'Experience' | 'Formation' | 'Langue' | 'Competence' | 'CentreInteret' | 'Projet';

export interface CvSectionCreate {
  sectionType: SectionType;
  title?: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  level?: string;
  sortOrder: number;
}

export const SECTION_TYPES: SectionType[] = ['Experience', 'Formation', 'Langue', 'Competence', 'CentreInteret', 'Projet'];

/**
 * Les six sections du CV.
 *
 * Les couleurs etaient un reste de l'ancienne identite : un rose #ec4899
 * et un violet #8b5cf6 ecrits en dur, qui n'appartiennent a aucune des
 * palettes du produit et sautaient aux yeux au milieu du bleu. Elles
 * suivent maintenant la rampe de marque — la section n'a pas besoin d'une
 * teinte propre, elle a besoin d'etre reperable dans la liste.
 *
 * Les libelles portent enfin leurs accents : ils s'affichent tels quels
 * en tete de chaque bloc.
 */
export const SECTION_CONFIG: Record<SectionType, { label: string; icon: string; color: string }> = {
  Experience: { label: 'Expériences professionnelles', icon: 'bi-briefcase-fill', color: 'var(--bleu-600)' },
  Formation: { label: 'Formations', icon: 'bi-mortarboard-fill', color: 'var(--bleu-500)' },
  Langue: { label: 'Langues', icon: 'bi-translate', color: 'var(--bleu-700)' },
  Competence: { label: 'Compétences', icon: 'bi-gear-fill', color: 'var(--bleu-800)' },
  CentreInteret: { label: "Centres d'intérêt", icon: 'bi-heart-fill', color: 'var(--bleu-400)' },
  Projet: { label: 'Projets', icon: 'bi-rocket-takeoff-fill', color: 'var(--bleu-900)' },
};
