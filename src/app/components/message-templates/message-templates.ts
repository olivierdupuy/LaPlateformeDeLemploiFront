import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';

export interface MessageTemplate {
  id: number;
  name: string;
  content: string;
  category: string;
}

/** Les rubriques proposees a la creation, dans l'ordre du processus. */
const CATEGORIES = ['Accusé de réception', 'Entretien', 'Relance', 'Refus', 'Offre', 'Général'];

/**
 * Modeles de messages du recruteur.
 *
 * Le serveur portait ces quatre routes — lecture, creation, modification,
 * suppression — depuis le debut, et rien dans l'interface ne les
 * appelait : la fonctionnalite existait sans exister. Un recruteur ecrit
 * pourtant vingt fois la meme phrase d'accuse de reception ou de refus.
 *
 * Le composant fait les deux metiers : choisir un modele a inserer dans
 * un message en cours, et gerer sa bibliotheque. Les separer aurait
 * oblige a quitter la conversation pour corriger une faute de frappe.
 *
 * Les jetons `{{candidat}}`, `{{poste}}` et `{{entreprise}}` sont
 * remplaces a l'insertion par le composant hote, qui seul connait le
 * contexte de la conversation.
 */
@Component({
  selector: 'app-message-templates',
  imports: [FormsModule],
  templateUrl: './message-templates.html',
  styleUrl: './message-templates.scss',
})
export class MessageTemplates implements OnInit {
  private svc = inject(RecruiterFeaturesService);
  private toastr = inject(ToastrService);

  /** Le contenu du modele choisi, jetons non substitues. */
  insert = output<string>();
  /** Fermeture demandee par le composant. */
  close = output<void>();

  templates = signal<MessageTemplate[]>([]);
  loading = signal(true);
  saving = signal(false);
  query = signal('');

  readonly categories = CATEGORIES;

  /** Formulaire d'ecriture ; `editId` a null vaut creation. */
  editId = signal<number | null>(null);
  formOpen = signal(false);
  form = { name: '', content: '', category: 'Général' };

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.templates();
    if (!q) return list;
    return list.filter((t) => `${t.name} ${t.content}`.toLowerCase().includes(q));
  });

  /** Regroupes par rubrique : une bibliotheque se parcourt par intention. */
  grouped = computed(() => {
    const map = new Map<string, MessageTemplate[]>();
    for (const t of this.filtered()) {
      const key = t.category || 'Général';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map].map(([category, items]) => ({ category, items }));
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getTemplates().subscribe({
      next: (t) => { this.templates.set(t as MessageTemplate[]); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toastr.error('Les modèles n\'ont pas pu être chargés'); },
    });
  }

  openCreate() {
    this.editId.set(null);
    this.form = { name: '', content: '', category: 'Général' };
    this.formOpen.set(true);
  }

  openEdit(t: MessageTemplate, event?: Event) {
    event?.stopPropagation();
    this.editId.set(t.id);
    this.form = { name: t.name, content: t.content, category: t.category || 'Général' };
    this.formOpen.set(true);
  }

  cancelForm() { this.formOpen.set(false); }

  save() {
    const name = this.form.name.trim();
    const content = this.form.content.trim();
    if (!name || !content) { this.toastr.warning('Un nom et un contenu sont nécessaires'); return; }

    this.saving.set(true);
    const payload = { name, content, category: this.form.category };
    const id = this.editId();

    const done = () => { this.saving.set(false); this.formOpen.set(false); this.load(); };

    if (id === null) {
      this.svc.createTemplate(payload).subscribe({
        next: () => { this.toastr.success('Modèle enregistré'); done(); },
        error: () => { this.saving.set(false); this.toastr.error('Échec de l\'enregistrement'); },
      });
    } else {
      this.svc.updateTemplate(id, payload).subscribe({
        next: () => { this.toastr.success('Modèle mis à jour'); done(); },
        error: () => { this.saving.set(false); this.toastr.error('Échec de la mise à jour'); },
      });
    }
  }

  remove(t: MessageTemplate, event?: Event) {
    event?.stopPropagation();
    if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    this.svc.deleteTemplate(t.id).subscribe({
      next: () => {
        this.templates.update((list) => list.filter((x) => x.id !== t.id));
        this.toastr.success('Modèle supprimé');
      },
      error: () => this.toastr.error('Échec de la suppression'),
    });
  }

  choose(t: MessageTemplate) { this.insert.emit(t.content); }

  /** Aperçu court dans la liste : deux lignes suffisent a reconnaitre un modele. */
  preview(content: string): string {
    return content.length > 130 ? content.slice(0, 130).trimEnd() + '…' : content;
  }
}
