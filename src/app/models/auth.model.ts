export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company?: string;
  avatarUrl?: string;
  bio?: string;
  resumeUrl?: string;
  title?: string;
  skills?: string;
  experienceYears?: number;
  education?: string;
  city?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiration: string;
  user: UserDto;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  company?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  company?: string;
  bio?: string;
  title?: string;
  skills?: string;
  experienceYears?: number | null;
  education?: string;
  city?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AppNotification {
  id: number;
  userId: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  applicationId: number;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  jobTitle: string;
  company: string;
  otherUserName: string;
  otherUserId: string;
}

export interface ChatMessage {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string;
  isMine: boolean;
}

export interface CandidatePublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  bio?: string;
  title?: string;
  skills?: string;
  experienceYears?: number;
  education?: string;
  city?: string;
  createdAt: string;
  applicationCount: number;
}
