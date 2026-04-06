export interface JobOffer {
  id: number;
  title: string;
  description: string;
  location: string;
  contractType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  isRemote: boolean;
  publishedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  companyId: number;
  companyName: string;
  companyLogoUrl: string | null;
  categoryId: number;
  categoryName: string;
  viewCount: number;
}

export interface JobOfferCreate {
  title: string;
  description: string;
  location: string;
  contractType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  isRemote: boolean;
  expiresAt: string | null;
  companyId: number;
  categoryId: number;
}
