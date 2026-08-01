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
  isSearchable?: boolean;
  createdAt: string;
  isOnline?: boolean;

  /** L'adresse a-t-elle ete confirmee par un lien recu ? */
  emailConfirmed?: boolean;
  /** Un second facteur protege-t-il ce compte ? */
  twoFactorEnabled?: boolean;
}

export interface AuthResponse {
  token: string;
  expiration: string;
  user: UserDto;

  /**
   * Le mot de passe etait bon, mais il ne suffit pas : un code est
   * attendu. `token` est alors vide — c'est ce qui empeche le client de
   * croire qu'il est entre.
   */
  requiresTwoFactor?: boolean;

  /** Ne vaut que pour l'etape du code, et cinq minutes. */
  challengeToken?: string;

  /** « Totp » ou « Sms » : de quoi savoir quoi demander, et où chercher le code. */
  twoFactorMethod?: string;

  /** Le numéro masqué, quand le code part par SMS. */
  twoFactorTarget?: string;

  /** Ce qui vient de se passer — envoi réussi, ou raison de son échec. */
  twoFactorMessage?: string;
}

/** Une session ouverte, telle que la page Securite la montre. */
export interface SessionDto {
  id: number;
  device: string;
  ipAddress?: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  method: string;
  /** L'appareil depuis lequel on regarde : celui qu'on ne veut pas fermer par megarde. */
  courante: boolean;
}

/** Tout ce qui touche a la securite d'un compte, en une reponse. */
export interface EtatSecurite {
  email: string;
  emailConfirme: boolean;
  role: string;
  deuxFacteurs: boolean;
  /** « Totp » ou « Sms ». Nul tant que la double authentification est inactive. */
  methode?: string | null;
  /** Le numéro masqué du compte, ou « numero inconnu ». */
  telephone: string;
  telephoneConfirme: boolean;
  /** Faux quand le serveur n'a pas d'identifiants OVH : le SMS n'est alors pas proposé. */
  smsDisponible: boolean;
  deuxFacteursDepuis?: string | null;
  codesDeSecoursRestants: number;
  deuxFacteursObligatoire: boolean;
  motDePasseModifieLe?: string | null;
  aUnMotDePasse: boolean;
  connexionsExternes: { fournisseur: string; nom?: string }[];
  verrouilleJusquA?: string | null;
  echecsRecents: number;
  derniereConnexion?: string | null;
  sessions: SessionDto[];
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
  isSearchable?: boolean;
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
