import { JobOffer } from './job-offer.model';

export interface JobPreferences {
  desiredContractTypes: string[];
  desiredLocations: string[];
  desiredCategoryIds: number[];
  minSalary: number | null;
  preferRemote: boolean | null;
  keywords: string[];
}

export interface RecommendedJob {
  job: JobOffer;
  matchScore: number;
  matchReasons: string[];
}
