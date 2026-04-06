export interface ResumeDto {
  id: number;
  title: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  userFullName: string;
  userEmail: string;
  userPhone: string | null;
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  skills: ResumeSkill[];
  languages: ResumeLanguage[];
}

export interface ResumeSave {
  title: string;
  summary: string | null;
  experiences: ResumeExperience[];
  educations: ResumeEducation[];
  skills: ResumeSkill[];
  languages: ResumeLanguage[];
}

export interface ResumeExperience {
  id?: number;
  jobTitle: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string;
  order: number;
}

export interface ResumeEducation {
  id?: number;
  degree: string;
  school: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string;
  order: number;
}

export interface ResumeSkill {
  id?: number;
  name: string;
  level: number;
  order: number;
}

export interface ResumeLanguage {
  id?: number;
  name: string;
  level: string;
  order: number;
}
