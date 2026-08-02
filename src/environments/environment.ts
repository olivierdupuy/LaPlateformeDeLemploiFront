export const environment = {
  production: false,
  apiUrl: 'http://localhost:5013/api',
  googleClientId: '', // À renseigner pour activer la connexion Google (SSO)
  // Application LinkedIn Developers, produit « Sign In with LinkedIn using
  // OpenID Connect ». L'URL de redirection à déclarer est <origine>/login.
  linkedInClientId: '',

  // ── Mesure d'audience ──
  //
  // Vide : rien n'est compté et aucune requête ne part du navigateur.
  // Renseigner l'URL d'une instance auto-hébergée l'active — Matomo avec
  // « mesureSiteId », Plausible avec « mesureDomaine ». Le consentement
  // du visiteur reste requis dans les deux cas : une instance déclarée
  // n'autorise rien par elle-même.
  mesureUrl: '',
  mesureSiteId: '',
  mesureDomaine: ''
};
