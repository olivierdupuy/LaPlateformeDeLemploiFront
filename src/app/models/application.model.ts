export interface ApplicationDto {
  id: number;
  coverLetter: string | null;
  status: string;
  appliedAt: string;
  updatedAt: string | null;
  userId: number;
  userFullName: string;
  userEmail: string;
  userPhone: string | null;
  userSkills: string | null;
  userBio: string | null;
  jobOfferId: number;
  jobOfferTitle: string;
  companyName: string;
  location: string;
  contractType: string;
  internalNotes: string | null;
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  totalFavorites: number;
  totalJobOffers: number;
  activeJobOffers: number;
  totalReceivedApplications: number;
  pendingReceivedApplications: number;
}

export interface FavoriteDto {
  id: number;
  createdAt: string;
  jobOffer: import('./job-offer.model').JobOffer;
}
