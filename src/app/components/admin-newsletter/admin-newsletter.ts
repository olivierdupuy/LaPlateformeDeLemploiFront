import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import {
  NewsletterService, Abonne, Campagne, EtatNewsletter, BrouillonCampagne,
} from '../../services/newsletter.service';

/**
 * La lettre d'information, côté console.
 *
 * Trois sections plutôt qu'une : ce qu'on sait de l'expédition, à qui l'on
 * écrit, et ce qu'on écrit. Elles répondent à des questions différentes et
 * ne se consultent pas au même moment.
 *
 * Le point qui a décidé de la mise en forme : une campagne partie ne se
 * rattrape pas. Tout ce qui précède l'envoi — le décompte des
 * destinataires, l'aperçu sur un abonné réel, l'essai à soi-même, les
 * champs de fusion vides — existe pour qu'on découvre les erreurs avant,
 * et non dans le rapport d'échec.
 */
type Onglet = 'campagnes' | 'abonnes' | 'redaction';

const ROLES = [
  { cle: 'Candidate', libelle: 'Candidats' },
  { cle: 'Recruiter', libelle: 'Recruteurs' },
  { cle: 'Guest', libelle: 'Abonnés sans compte' },
];

const ACTIVITES = [
  { cle: '', libelle: 'Tous', aide: 'Sans condition d’ancienneté' },
  { cle: 'Recents', libelle: 'Inscrits récents', aide: 'Abonnés depuis moins de 30 jours' },
  { cle: 'Dormants', libelle: 'Comptes dormants', aide: 'Sans connexion depuis 90 jours' },
];

const CATEGORIES = [
  'Tech', 'Santé', 'Commerce', 'Bâtiment', 'Industrie', 'Transport',
  'Hôtellerie-restauration', 'Éducation', 'Finance', 'Design',
];

const STATUTS: Record<string, { libelle: string; classe: string }> = {
  Confirmed: { libelle: 'Confirmé', classe: 'badge-green' },
  Pending: { libelle: 'En attente', classe: 'badge-yellow' },
  Unsubscribed: { libelle: 'Désabonné', classe: '' },
  Bounced: { libelle: 'Injoignable', classe: 'badge-red' },
};

@Component({
  selector: 'app-admin-newsletter',
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-newsletter.html',
  styleUrl: './admin-newsletter.scss',
})
export class AdminNewsletter implements OnInit, OnDestroy {
  private api = inject(NewsletterService);
  private toastr = inject(ToastrService);
  private sanitizer = inject(DomSanitizer);

  readonly roles = ROLES;
  readonly activites = ACTIVITES;
  readonly categories = CATEGORIES;

  onglet = signal<Onglet>('campagnes');
  chargement = signal(true);
  occupe = signal(false);

  etat = signal<EtatNewsletter | null>(null);
  campagnes = signal<Campagne[]>([]);
  abonnes = signal<Abonne[]>([]);
  facettes = signal<any>(null);
  totalAbonnes = signal(0);

  // ── Filtres de la liste d'abonnés ──
  recherche = '';
  filtreStatut = '';

  // ── Rédaction ──
  brouillonId = signal<number | null>(null);
  sujet = '';
  apercuTexte = '';
  corps = '';
  rolesChoisis = signal<string[]>([]);
  catsChoisies = signal<string[]>([]);
  villes = '';
  departements = '';
  activite = '';

  destinataires = signal<number | null>(null);
  messageCiblage = signal('');
  apercuHtml = signal<string | null>(null);

  /**
   * Le message tel qu'il partira, sans desinfection.
   *
   * Angular nettoie « srcdoc » comme n'importe quel HTML injecte : il en
   * retirait le tableau de mise en page, les styles et l'en-tete sombre.
   * L'apercu montrait alors du texte brut — c'est-a-dire tout sauf ce
   * qu'une messagerie affichera, ce qui lui otait sa raison d'etre.
   *
   * Le contournement est sur ici, a deux conditions reunies : le contenu
   * vient de l'administrateur qui le redige — il pourrait aussi bien
   * l'ecrire directement dans le courriel —, et le cadre porte un
   * « sandbox » vide qui interdit scripts, formulaires et acces a la page
   * qui l'englobe.
   */
  apercuSur = computed<SafeHtml | null>(() => {
    const h = this.apercuHtml();
    return h ? this.sanitizer.bypassSecurityTrustHtml(h) : null;
  });
  apercuRendu = signal('');
  lacunes = signal<{ champ: string; manquant: number; total: number }[]>([]);

  /** Le rafraîchissement des campagnes en cours d'envoi. */
  private minuteur?: ReturnType<typeof setInterval>;
  private differeCiblage?: ReturnType<typeof setTimeout>;

  /**
   * Le nom d'un champ de fusion, accolades comprises.
   *
   * Il se compose ici et non dans le gabarit : Angular decode les entites
   * HTML avant d'analyser le modele, si bien que « &#123;&#123; » y
   * redevient une ouverture d'interpolation et casse la compilation.
   */
  champ = (cle: string) => `{{${cle}}}`;

  statutLibelle = (s: string) => STATUTS[s]?.libelle ?? s;
  statutClasse = (s: string) => STATUTS[s]?.classe ?? '';

  /**
   * Neutralise ce qui vient d'ailleurs avant de le coudre dans du HTML.
   *
   * Les gabarits Angular echappent tout seuls ; les boites de dialogue,
   * non — leur contenu est pose tel quel dans le document. Or ce qu'on y
   * affiche vient d'un formulaire public : l'adresse qu'un inconnu a
   * saisie pour s'abonner. Une adresse portant « <img onerror=…> »
   * s'executerait donc dans la console d'administration, avec la session
   * de l'administrateur — le pire endroit ou cela puisse arriver.
   *
   * Le serveur refuse desormais ces adresses, mais un filtre d'entree se
   * contourne toujours un jour : ce qui protege ici, c'est d'echapper a
   * la sortie, au moment precis ou le texte devient du balisage.
   */
  private static echapper(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Un envoi en cours mérite qu'on rafraîchisse : sinon on croit qu'il est figé. */
  envoiEnCours = computed(() => this.campagnes().some((c) => c.status === 'Sending'));

  ngOnInit() {
    this.charger();
    // Toutes les cinq secondes tant qu'une campagne part, jamais sinon :
    // une console qui interroge le serveur en boucle pour rien est une
    // console qui chauffe le serveur pour rien.
    this.minuteur = setInterval(() => {
      if (this.envoiEnCours()) this.chargerCampagnes();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.minuteur) clearInterval(this.minuteur);
    if (this.differeCiblage) clearTimeout(this.differeCiblage);
  }

  private charger() {
    this.chargement.set(true);
    this.api.etat().subscribe({
      next: (e) => this.etat.set(e),
      error: () => this.etat.set(null),
    });
    this.chargerCampagnes();
    this.chargerAbonnes();
  }

  private chargerCampagnes() {
    this.api.campagnes().subscribe({
      next: (c) => { this.campagnes.set(c); this.chargement.set(false); },
      error: () => this.chargement.set(false),
    });
  }

  chargerAbonnes() {
    const p: Record<string, string> = { pageSize: '100' };
    if (this.recherche.trim()) p['q'] = this.recherche.trim();
    if (this.filtreStatut) p['statut'] = this.filtreStatut;

    this.api.abonnes(p).subscribe({
      next: (r) => {
        this.abonnes.set(r.items);
        this.facettes.set(r.facettes);
        this.totalAbonnes.set(r.total);
      },
      error: () => this.toastr.error('La liste des abonnés n’a pas pu être chargée.'),
    });
  }

  // ══════════════════════════════
  //  Abonnés
  // ══════════════════════════════

  filtrer(statut: string) {
    this.filtreStatut = this.filtreStatut === statut ? '' : statut;
    this.chargerAbonnes();
  }

  exporter() {
    this.api.exporter().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `abonnes-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toastr.error('L’export a échoué.'),
    });
  }

  async retirer(a: Abonne) {
    const r = await Swal.fire({
      title: 'Retirer cette adresse ?',
      html: `<p style="font-size:.92rem;line-height:1.6">
               <b>${AdminNewsletter.echapper(a.email)}</b> ne recevra plus la lettre d'information.
               Son compte et ses candidatures ne sont pas affectés.
             </p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Retirer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.api.desabonnerDepuisLaConsole(a.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.chargerAbonnes(); },
      error: () => this.toastr.error('Le retrait a échoué.'),
    });
  }

  // ══════════════════════════════
  //  Rédaction
  // ══════════════════════════════

  nouvelle() {
    this.brouillonId.set(null);
    this.sujet = '';
    this.apercuTexte = '';
    this.corps = '';
    this.rolesChoisis.set([]);
    this.catsChoisies.set([]);
    this.villes = '';
    this.departements = '';
    this.activite = '';
    this.destinataires.set(null);
    this.apercuHtml.set(null);
    this.lacunes.set([]);
    this.onglet.set('redaction');
    this.compter();
  }

  ouvrir(c: Campagne) {
    if (c.status !== 'Draft') { this.voirResultats(c); return; }
    this.api.campagne(c.id).subscribe({
      next: (x) => {
        this.brouillonId.set(x.id);
        this.sujet = x.subject;
        this.apercuTexte = x.previewText ?? '';
        this.corps = x.bodyHtml ?? '';
        this.rolesChoisis.set(this.decouper(x.segmentRoles));
        this.catsChoisies.set(this.decouper(x.segmentCategories));
        this.villes = x.segmentCities ?? '';
        this.departements = x.segmentDepartments ?? '';
        this.activite = x.segmentActivity ?? '';
        this.apercuHtml.set(null);
        this.onglet.set('redaction');
        this.compter();
      },
      error: () => this.toastr.error('Cette campagne n’a pas pu être ouverte.'),
    });
  }

  private decouper = (v?: string) =>
    (v ?? '').split(',').map((x) => x.trim()).filter(Boolean);

  private get brouillon(): BrouillonCampagne {
    return {
      subject: this.sujet,
      previewText: this.apercuTexte || undefined,
      bodyHtml: this.corps,
      roles: this.rolesChoisis(),
      categories: this.catsChoisies(),
      cities: this.decouper(this.villes),
      departments: this.decouper(this.departements),
      activity: this.activite || undefined,
    };
  }

  basculerRole(r: string) {
    this.rolesChoisis.update((l) => (l.includes(r) ? l.filter((x) => x !== r) : [...l, r]));
    this.compter();
  }

  basculerCat(c: string) {
    this.catsChoisies.update((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
    this.compter();
  }

  /**
   * Le décompte, différé d'un instant.
   *
   * Il se déclenche à chaque frappe dans les villes ou les départements :
   * sans ce délai, saisir « Montpellier » lancerait onze requêtes.
   */
  compterDiffere() {
    if (this.differeCiblage) clearTimeout(this.differeCiblage);
    this.differeCiblage = setTimeout(() => this.compter(), 400);
  }

  compter() {
    this.api.compter(this.brouillon).subscribe({
      next: (r) => {
        this.destinataires.set(r.destinataires);
        this.messageCiblage.set(r.message);
      },
      error: () => this.destinataires.set(null),
    });
  }

  enregistrer(silencieux = false) {
    if (!this.sujet.trim()) { this.toastr.warning('Un objet est nécessaire.'); return; }
    this.occupe.set(true);

    const id = this.brouillonId();
    const suite = (nouvelId: number) => {
      this.brouillonId.set(nouvelId);
      this.occupe.set(false);
      if (!silencieux) this.toastr.success('Brouillon enregistré.');
      this.chargerCampagnes();
    };

    if (id) {
      this.api.enregistrer(id, this.brouillon).subscribe({
        next: () => suite(id),
        error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.'); },
      });
    } else {
      this.api.creer(this.brouillon).subscribe({
        next: (r) => suite(r.id),
        error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.'); },
      });
    }
  }

  voirApercu() {
    if (!this.corps.trim()) { this.toastr.warning('Écrivez d’abord le message.'); return; }
    this.occupe.set(true);
    this.api.apercu(this.brouillon).subscribe({
      next: (r) => {
        this.occupe.set(false);
        this.apercuHtml.set(r.html);
        this.apercuRendu.set(r.rendu);
        this.lacunes.set(r.lacunes ?? []);
      },
      error: () => { this.occupe.set(false); this.toastr.error('L’aperçu a échoué.'); },
    });
  }

  fermerApercu() { this.apercuHtml.set(null); }

  async essai() {
    if (!this.brouillonId()) {
      this.toastr.info('Enregistrez d’abord le brouillon.');
      return;
    }
    const r = await Swal.fire({
      title: 'S’envoyer un essai',
      input: 'email',
      inputLabel: 'Laissez vide pour recevoir sur votre propre adresse',
      inputPlaceholder: 'vous@exemple.fr',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Envoyer',
      cancelButtonText: 'Annuler',
      inputValidator: () => null,
    });
    if (!r.isConfirmed) return;

    this.occupe.set(true);
    this.api.essai(this.brouillonId()!, r.value || undefined).subscribe({
      next: (x) => {
        this.occupe.set(false);
        if (x.parti) this.toastr.success(x.message);
        else this.toastr.warning(x.message, 'L’essai n’est pas parti');
      },
      error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.'); },
    });
  }

  /**
   * L'envoi.
   *
   * La confirmation récite ce qui va se produire — combien de personnes,
   * et que rien ne se rattrape — plutôt que de demander « êtes-vous sûr ».
   */
  async envoyer() {
    if (!this.brouillonId()) { this.toastr.info('Enregistrez d’abord le brouillon.'); return; }
    const n = this.destinataires() ?? 0;
    if (n === 0) { this.toastr.warning('Aucun abonné ne correspond à ce ciblage.'); return; }

    const r = await Swal.fire({
      title: 'Envoyer maintenant ?',
      html: `<p style="font-size:.93rem;line-height:1.65;text-align:left">
               <b>${n} personne${n > 1 ? 's' : ''}</b> ${n > 1 ? 'recevront' : 'recevra'} ce message.
             </p>
             <p style="font-size:.9rem;line-height:1.6;text-align:left;color:#577177;margin-top:.7rem">
               Un message parti ne se rattrape pas. Si vous n'avez pas encore envoyé
               d'essai à vous-même, c'est le moment.
             </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: `Envoyer aux ${n}`,
      cancelButtonText: 'Pas encore',
    });
    if (!r.isConfirmed) return;

    this.occupe.set(true);
    this.api.envoyer(this.brouillonId()!).subscribe({
      next: (x) => {
        this.occupe.set(false);
        this.toastr.success(x.message, 'Envoi lancé', { timeOut: 9000 });
        this.onglet.set('campagnes');
        this.chargerCampagnes();
      },
      error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Erreur.', '', { timeOut: 12000 }); },
    });
  }

  // ══════════════════════════════
  //  Campagnes
  // ══════════════════════════════

  async arreter(c: Campagne) {
    const r = await Swal.fire({
      title: 'Arrêter l’envoi ?',
      html: `<p style="font-size:.92rem;line-height:1.6">
               Les messages déjà partis le restent. Seuls ceux qui attendent
               encore seront annulés.
             </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Arrêter',
      cancelButtonText: 'Laisser finir',
    });
    if (!r.isConfirmed) return;

    this.api.arreter(c.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.chargerCampagnes(); },
      error: (e) => this.toastr.error(e?.error?.message ?? 'Erreur.'),
    });
  }

  async supprimer(c: Campagne) {
    const r = await Swal.fire({
      title: 'Supprimer cette campagne ?',
      text: c.status === 'Draft'
        ? 'Ce brouillon sera perdu.'
        : 'Les statistiques de cet envoi seront perdues avec elle.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.api.supprimer(c.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.chargerCampagnes(); },
      error: (e) => this.toastr.error(e?.error?.message ?? 'Erreur.'),
    });
  }

  async voirResultats(c: Campagne) {
    this.api.campagne(c.id).subscribe({
      next: (x) => {
        const echecs = (x.echecs ?? []).slice(0, 12);
        const liste = echecs.length
          ? '<div style="margin-top:.9rem;text-align:left"><b style="font-size:.85rem">Échecs</b>'
            + '<ul style="margin:.3rem 0 0;padding-left:1.1rem;font-size:.8rem;line-height:1.6;color:#577177">'
            + echecs.map((e) => `<li>${AdminNewsletter.echapper(e.email)} — `
                                + `${AdminNewsletter.echapper(e.error ?? 'raison inconnue')}</li>`).join('')
            + '</ul></div>'
          : '';
        Swal.fire({
          // Le titre d'une boite de dialogue est lui aussi du HTML : un
          // objet de campagne y vaut balisage s'il n'est pas echappe.
          title: AdminNewsletter.echapper(x.subject),
          html: `<div style="text-align:left;font-size:.92rem;line-height:1.7">
                   <div><b>${+x.delivered || 0}</b> message${x.delivered > 1 ? 's' : ''} remis</div>
                   ${x.failed ? `<div style="color:#c6364b"><b>${+x.failed || 0}</b> en échec</div>` : ''}
                   ${x.restants ? `<div><b>${+x.restants || 0}</b> encore en attente</div>` : ''}
                   <div style="color:#577177;margin-top:.5rem">
                     Ciblage : ${AdminNewsletter.echapper(this.decrireSegment(x)) || 'tous les abonnés'}
                   </div>
                 </div>${liste}`,
          confirmButtonColor: '#15616d',
          confirmButtonText: 'Fermer',
          width: 560,
        });
      },
      error: () => this.toastr.error('Les résultats n’ont pas pu être lus.'),
    });
  }

  /** Le ciblage en toutes lettres : « Recruteurs · Tech · 34 ». */
  decrireSegment(c: Campagne): string {
    const bouts: string[] = [];
    const r = this.decouper(c.segmentRoles).map(
      (x) => ROLES.find((y) => y.cle === x)?.libelle ?? x);
    if (r.length) bouts.push(r.join(', '));
    if (c.segmentCategories) bouts.push(c.segmentCategories);
    if (c.segmentCities) bouts.push(c.segmentCities);
    if (c.segmentDepartments) bouts.push('dép. ' + c.segmentDepartments);
    const a = ACTIVITES.find((x) => x.cle === c.segmentActivity);
    if (a && a.cle) bouts.push(a.libelle.toLowerCase());
    return bouts.join(' · ');
  }
}
