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

export const SECTION_CONFIG: Record<SectionType, { label: string; icon: string; color: string }> = {
  Experience: { label: 'Experiences professionnelles', icon: 'bi-briefcase-fill', color: 'var(--teal)' },
  Formation: { label: 'Formations', icon: 'bi-mortarboard-fill', color: 'var(--blue)' },
  Langue: { label: 'Langues', icon: 'bi-translate', color: 'var(--amber)' },
  Competence: { label: 'Competences', icon: 'bi-gear-fill', color: 'var(--green)' },
  CentreInteret: { label: "Centres d'interet", icon: 'bi-heart-fill', color: '#ec4899' },
  Projet: { label: 'Projets', icon: 'bi-rocket-takeoff-fill', color: '#8b5cf6' },
};
