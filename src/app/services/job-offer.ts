import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JobOffer, JobStats, CompanyInfo, DetailedStats, JobReport } from '../models/job-offer.model';
import { environment } from '../../environments/environment';

export type BrowseSection = 'categories' | 'locations' | 'contractTypes';
export interface BrowseFacet { label: string; count: number; }
export interface BrowsePage { items: BrowseFacet[]; total: number; page: number; pageSize: number; }

/**
 * Ce que le serveur a tiré d'une recherche écrite en clair.
 *
 * `compris` est la version lisible, faite pour l'affichage ; les champs
 * qui suivent sont la même chose sous forme exploitable, pour que
 * l'interface puisse relancer la recherche sans une étiquette.
 *
 * `assiste` distingue une phrase relue par le modèle d'un filtre tiré
 * d'une règle : les deux n'engagent pas de la même façon, et le candidat
 * a le droit de savoir lequel il regarde.
 */
export interface RequeteComprise {
  compris: string[];
  metier: string | null;
  contrat: string | null;
  lieu: string | null;
  rayonKm: number | null;
  distanciel: boolean | null;
  salaireAnnuelMinimum: number | null;
  motsClefs: string[];
  assiste: boolean;
}

@Injectable({ providedIn: 'root' })
export class JobOfferService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/joboffers`;

  private buildParams(filters?: JobFilters): HttpParams {
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.contractType) params = params.set('contractType', filters.contractType);
      if (filters.isRemote !== undefined) params = params.set('isRemote', filters.isRemote.toString());
      if (filters.location) params = params.set('location', filters.location);
      if (filters.salaryMin) params = params.set('salaryMin', filters.salaryMin.toString());
      if (filters.salaryMax) params = params.set('salaryMax', filters.salaryMax.toString());
      if (filters.experience) params = params.set('experience', filters.experience);
      if (filters.education) params = params.set('education', filters.education);
      if (filters.workSchedule) params = params.set('workSchedule', filters.workSchedule);
      if (filters.languages) params = params.set('languages', filters.languages);
      if (filters.benefits) params = params.set('benefits', filters.benefits);
      if (filters.datePosted) params = params.set('datePosted', filters.datePosted.toString());
      if (filters.radius) params = params.set('radius', filters.radius.toString());
      if (filters.sort) params = params.set('sort', filters.sort);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());
    }
    return params;
  }

  getAll(filters?: JobFilters): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(this.apiUrl, { params: this.buildParams(filters) });
  }

  /** Comme getAll, mais expose le nombre total d'offres (en-tête X-Total-Count). */
  getAllPaged(filters?: JobFilters): Observable<{ items: JobOffer[]; total: number }> {
    return this.http
      .get<JobOffer[]>(this.apiUrl, { params: this.buildParams(filters), observe: 'response' })
      .pipe(map((resp) => ({
        items: resp.body ?? [],
        total: Number(resp.headers.get('X-Total-Count')) || (resp.body?.length ?? 0),
      })));
  }

  /**
   * Ce que le serveur a compris de la recherche.
   *
   * La liste d'offres reste un tableau : y glisser un objet
   * d'explication aurait cassé toutes les pages déjà servies le temps
   * d'un déploiement. On interroge donc ce point d'entrée en parallèle,
   * pour afficher les étiquettes — « alternance », « à moins de 25 km de
   * Perpignan » — et laisser le candidat en retirer une. Un filtre
   * appliqué sans être montré est un filtre qu'on ne peut pas contester.
   */
  comprendre(q: string): Observable<RequeteComprise> {
    const params = new HttpParams().set('q', q);
    return this.http.get<RequeteComprise>(`${this.apiUrl}/comprendre`, { params });
  }

  /** Autocompletion : suggestions de mots-cles ou de lieux. */
  suggest(q: string, type: 'keyword' | 'location' = 'keyword'): Observable<string[]> {
    const params = new HttpParams().set('q', q).set('type', type);
    return this.http.get<string[]>(`${this.apiUrl}/suggest`, { params });
  }

  /** Signaler une offre d'emploi. */
  report(id: number, payload: { reason: string; details?: string; reporterEmail?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/report`, payload);
  }

  /** Admin : liste des signalements d'offres. */
  getReports(status?: string): Observable<JobReport[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<JobReport[]>(`${this.apiUrl}/reports`, { params });
  }

  /** Admin : mettre à jour le statut d'un signalement (Reviewed / Dismissed). */
  updateReport(reportId: number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/reports/${reportId}`, { reason: status });
  }

  getById(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  getFilterOptions(): Observable<{ experiences: string[]; educations: string[]; workSchedules: string[]; languages: string[] }> {
    return this.http.get<{ experiences: string[]; educations: string[]; workSchedules: string[]; languages: string[] }>(`${this.apiUrl}/filters`);
  }

  getStats(): Observable<JobStats> {
    return this.http.get<JobStats>(`${this.apiUrl}/stats`);
  }

  getDetailedStats(): Observable<DetailedStats> {
    return this.http.get<DetailedStats>(`${this.apiUrl}/stats/detailed`);
  }

  getAdminStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/admin`);
  }

  /**
   * Statistiques par section. La page d'administration ne demande que
   * l'onglet regarde : tout charger d'un coup faisait transiter deux
   * cents kilo-octets et cinq secondes d'agregation.
   */
  getAdminStatsSection(section: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/admin/${section}`);
  }

  isModerationRequired(): Observable<{ required: boolean }> {
    return this.http.get<{ required: boolean }>(`${this.apiUrl}/moderation-required`);
  }

  /**
   * Une seule section de la page « Parcourir ». Les metiers se comptent par
   * milliers : on ne les charge que par tranches, a la demande.
   */
  getBrowseSection(
    section: BrowseSection,
    opts?: { search?: string; page?: number; pageSize?: number }
  ): Observable<BrowsePage> {
    let params = new HttpParams();
    if (opts?.search) params = params.set('search', opts.search);
    if (opts?.page) params = params.set('page', opts.page);
    if (opts?.pageSize) params = params.set('pageSize', opts.pageSize);
    return this.http.get<BrowsePage>(`${this.apiUrl}/browse/${section}`, { params });
  }

  getCompanies(opts?: { search?: string; page?: number; pageSize?: number }): Observable<{ items: CompanyInfo[]; total: number }> {
    let params = new HttpParams();
    if (opts?.search) params = params.set('search', opts.search);
    if (opts?.page) params = params.set('page', opts.page.toString());
    if (opts?.pageSize) params = params.set('pageSize', opts.pageSize.toString());
    return this.http
      .get<CompanyInfo[]>(`${this.apiUrl}/companies`, { params, observe: 'response' })
      .pipe(map((resp) => ({
        items: resp.body ?? [],
        total: Number(resp.headers.get('X-Total-Count')) || (resp.body?.length ?? 0),
      })));
  }

  getByCompany(name: string): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.apiUrl}/company/${encodeURIComponent(name)}`);
  }

  getMyOffers(scope?: 'team'): Observable<JobOffer[]> {
    const params = scope ? new HttpParams().set('scope', scope) : undefined;
    return this.http.get<JobOffer[]>(`${this.apiUrl}/mine`, { params });
  }

  getTeamMembers(): Observable<{ company: string | null; members: { name: string; role: string; isMe: boolean; offerCount: number }[] }> {
    return this.http.get<any>(`${this.apiUrl}/team-members`);
  }

  /** Le même geste sur plusieurs offres : une campagne se suspend rarement une par une. */
  changerEtatEnMasse(ids: number[], etat: 'ouverte' | 'suspendue' | 'fermee') {
    return this.http.patch<{ updated: number; ignorees: number; demandees: number }>(
      `${environment.apiUrl}/recruiter/offers/bulk-etat`, { ids, etat });
  }

  /**
   * Ouvrir, suspendre ou fermer une offre.
   *
   * Distinct de la suppression, qui emporte les candidatures reçues : un
   * recruteur qui met une annonce en pause le temps d'un arbitrage ne
   * doit pas payer ce prix-là.
   */
  changerEtat(id: number, etat: 'ouverte' | 'suspendue' | 'fermee'): Observable<{ id: number; etatPublication: string; isActive: boolean }> {
    return this.http.patch<{ id: number; etatPublication: string; isActive: boolean }>(
      `${this.apiUrl}/${id}/etat`, { etat });
  }

  renewOffer(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.apiUrl}/${id}/renew`, {});
  }

  /** Recruteur : sponsoriser / retirer la mise en avant de sa propre offre. */
  toggleFeature(id: number): Observable<{ isFeatured: boolean }> {
    return this.http.patch<{ isFeatured: boolean }>(`${this.apiUrl}/${id}/feature`, {});
  }

  /** Recruteur : statistiques d'une offre (vues, candidatures, conversion, statuts). */
  getOfferStats(id: number): Observable<{ views: number; applications: number; isFeatured: boolean; conversion: number; byStatus: { label: string; value: number }[]; appsByDay: { label: string; value: number }[] }> {
    return this.http.get<any>(`${this.apiUrl}/${id}/stats`);
  }

  create(job: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.post<JobOffer>(this.apiUrl, job);
  }

  update(id: number, job: Partial<JobOffer>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, job);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

export interface JobFilters {
  search?: string;
  category?: string;
  contractType?: string;
  isRemote?: boolean;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  education?: string;
  workSchedule?: string;
  languages?: string;
  benefits?: string;
  datePosted?: number;
  radius?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
}
