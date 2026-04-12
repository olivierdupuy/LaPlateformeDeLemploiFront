export interface JobOffer {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  contractType: string;
  salary?: string;
  category: string;
  isRemote: boolean;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  companyLogoUrl?: string;
  tags?: string;
  minSalary?: number;
  maxSalary?: number;
  experienceRequired?: string;
  educationLevel?: string;
  benefits?: string;
  companyDescription?: string;
  isUrgent?: boolean;
  viewCount?: number;
  createdByUserId?: string;
  applications?: Application[];
}

export interface Application {
  id: number;
  jobOfferId: number;
  fullName: string;
  email: string;
  phone?: string;
  coverLetter?: string;
  resumeUrl?: string;
  status: string;
  recruiterNotes?: string;
  availableFrom?: string;
  salaryExpectation?: string;
  source?: string;
  appliedAt: string;
  jobOffer?: JobOffer;
}

export interface JobStats {
  totalOffers: number;
  totalApplications: number;
  totalCompanies: number;
  remoteOffers: number;
}

export interface CompanyInfo {
  company: string;
  jobCount: number;
  locations: string[];
}

export interface ChartItem {
  label: string;
  value: number;
}

export interface DetailedStats {
  offersByCategory: ChartItem[];
  offersByContract: ChartItem[];
  appsByStatus: ChartItem[];
  topCompanies: ChartItem[];
  recentApps: ChartItem[];
}

export interface SavedSearch {
  id: number;
  label?: string;
  query?: string;
  category?: string;
  contractType?: string;
  isRemote?: boolean;
  location?: string;
  createdAt: string;
  resultCount: number;
}

export interface InterviewItem {
  id: number;
  applicationId: number;
  proposedAt: string;
  location?: string;
  notes?: string;
  status: string;
  createdAt: string;
  duration?: number;
  type?: string;
  interviewerName?: string;
  candidateName: string;
  candidateId?: string;
  jobTitle: string;
  company: string;
}
