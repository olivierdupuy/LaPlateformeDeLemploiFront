import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { PlateformeProService, PreferencesCourriel } from '../../services/plateforme-pro.service';
import { SeoService } from '../../services/seo.service';

/**
 * Le centre de préférences.
 *
 * Il n'y avait qu'un interrupteur, celui de la lettre d'information.
 * Alertes d'offres, accusés de candidature, messages de recruteurs,
 * rappels d'entretien partaient sans qu'on puisse en retrancher une
 * catégorie. Qui recevait trop d'alertes n'avait qu'un geste à sa
 * disposition — le bouton « indésirable » — lequel emporte avec lui les
 * messages qu'il voulait vraiment, et abîme au passage la réputation
 * du domaine pour tout le monde.
 *
 * La page s'ouvre par jeton, sans connexion : le lien arrive au pied
 * d'un courriel, et exiger un mot de passe pour cesser de recevoir des
 * courriels est exactement ce qui pousse vers ce bouton.
 */
@Component({
  selector: 'app-email-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './email-preferences.html',
  styleUrl: './email-preferences.scss',
})
export class EmailPreferences implements OnInit {
  private service = inject(PlateformeProService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastrService);
  private seo = inject(SeoService);

  readonly prefs = signal<PreferencesCourriel | null>(null);
  readonly chargement = signal(true);
  readonly enregistrement = signal(false);
  readonly erreur = signal<string | null>(null);

  /** Nul quand un membre connecté vient depuis son profil. */
  private jeton?: string;

  /** L'ordre d'affichage, et le libellé de chacune. */
  readonly categories = [
    {
      cle: 'alertesOffres' as const,
      titre: "Alertes d'offres",
      detail: 'Les offres correspondant à vos recherches enregistrées.',
    },
    {
      cle: 'suiviCandidatures' as const,
      titre: 'Suivi de mes candidatures',
      detail: 'Accusé de réception, candidature consultée, réponse du recruteur.',
    },
    {
      cle: 'messages' as const,
      titre: 'Messages',
      detail: "Quand un recruteur ou un candidat vous écrit dans la messagerie.",
    },
    {
      cle: 'entretiens' as const,
      titre: 'Entretiens',
      detail: 'Invitations, confirmations et rappel la veille.',
    },
    {
      cle: 'lettreInformation' as const,
      titre: "Lettre d'information",
      detail: 'Le point sur le marché de l’emploi, une fois par semaine.',
    },
    {
      cle: 'actualites' as const,
      titre: 'Nouveautés et enquêtes',
      detail: 'Les évolutions du site. Rare, et jamais commercial.',
    },
  ];

  ngOnInit(): void {
    this.seo.privee('Préférences de courriel');

    this.jeton = this.route.snapshot.queryParamMap.get('jeton') ?? undefined;
    this.charger();
  }

  private charger(): void {
    this.service.preferences(this.jeton).subscribe({
      next: (p) => {
        this.prefs.set(p);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(
          e?.error?.message ??
            "Ce lien n'est plus valide. Connectez-vous pour gérer vos préférences.",
        );
        this.chargement.set(false);
      },
    });
  }

  basculer(cle: keyof PreferencesCourriel): void {
    const p = this.prefs();
    if (!p) return;

    const suivant = { ...p, [cle]: !p[cle] } as PreferencesCourriel;

    // Réactiver une catégorie annule le « ne plus rien recevoir » :
    // laisser les deux cohabiter donnerait une page qui se contredit,
    // et un envoi qui ne part pas sans qu'on comprenne pourquoi.
    if (cle !== 'toutRefuse' && suivant[cle]) suivant.toutRefuse = false;

    if (cle === 'toutRefuse' && suivant.toutRefuse) {
      suivant.alertesOffres = false;
      suivant.suiviCandidatures = false;
      suivant.messages = false;
      suivant.entretiens = false;
      suivant.lettreInformation = false;
      suivant.actualites = false;
    }

    this.prefs.set(suivant);
  }

  enregistrer(): void {
    const p = this.prefs();
    if (!p || this.enregistrement()) return;

    this.enregistrement.set(true);
    this.service.enregistrerPreferences(p, this.jeton).subscribe({
      next: (r) => {
        this.toast.success(r.message);
        this.enregistrement.set(false);
      },
      error: (e) => {
        this.toast.error(e?.error?.message ?? "L'enregistrement n'a pas abouti.");
        this.enregistrement.set(false);
      },
    });
  }
}
