export interface Company {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  location: string | null;
  createdAt: string;
  jobOffersCount: number;
}

export interface CompanyCreate {
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  location: string | null;
}
