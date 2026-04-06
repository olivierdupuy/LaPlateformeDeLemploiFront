import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ResumeService } from '../../services/resume.service';
import { SeoService } from '../../services/seo.service';
import { ResumeDto, ResumeSave, ResumeExperience, ResumeEducation, ResumeSkill, ResumeLanguage } from '../../models/resume.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-resume-builder',
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-builder.html',
  styleUrl: './resume-builder.css'
})
export class ResumeBuilder implements OnInit {
  resume: ResumeDto | null = null;
  loading = true;
  saving = false;
  parsing = false;
  activeTab: 'edit' | 'preview' = 'edit';

  // Form data
  title = '';
  summary = '';
  experiences: ResumeExperience[] = [];
  educations: ResumeEducation[] = [];
  skills: ResumeSkill[] = [];
  languages: ResumeLanguage[] = [];

  skillLevels = [
    { value: 1, label: 'Debutant' }, { value: 2, label: 'Junior' },
    { value: 3, label: 'Intermediaire' }, { value: 4, label: 'Avance' },
    { value: 5, label: 'Expert' }
  ];

  langLevels = ['Debutant', 'Intermediaire', 'Avance', 'Bilingue', 'Natif'];

  constructor(
    public auth: AuthService,
    private resumeService: ResumeService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Mon CV', 'Creez et gerez votre CV en ligne avec notre editeur interactif.');
    this.resumeService.getMyResume().subscribe({
      next: r => {
        this.loading = false;
        if (r) {
          this.resume = r;
          this.title = r.title;
          this.summary = r.summary || '';
          this.experiences = r.experiences.map(e => this.fixEntryDates(e));
          this.educations = r.educations.map(e => this.fixEntryDates(e));
          this.skills = r.skills;
          this.languages = r.languages;
        } else {
          this.title = `CV de ${this.auth.currentUser?.firstName} ${this.auth.currentUser?.lastName}`;
        }
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  // === Experiences ===
  addExperience(): void {
    this.experiences.push({
      jobTitle: '', company: '', location: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: null, isCurrent: false, description: '',
      order: this.experiences.length
    });
    this.cdr.detectChanges();
  }

  removeExperience(i: number): void { this.experiences.splice(i, 1); this.cdr.detectChanges(); }

  // === Educations ===
  addEducation(): void {
    this.educations.push({
      degree: '', school: '', location: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: null, isCurrent: false, description: '',
      order: this.educations.length
    });
    this.cdr.detectChanges();
  }

  removeEducation(i: number): void { this.educations.splice(i, 1); this.cdr.detectChanges(); }

  // === Skills ===
  addSkill(): void {
    this.skills.push({ name: '', level: 3, order: this.skills.length });
    this.cdr.detectChanges();
  }

  removeSkill(i: number): void { this.skills.splice(i, 1); this.cdr.detectChanges(); }

  // === Languages ===
  addLanguage(): void {
    this.languages.push({ name: '', level: 'Intermediaire', order: this.languages.length });
    this.cdr.detectChanges();
  }

  removeLanguage(i: number): void { this.languages.splice(i, 1); this.cdr.detectChanges(); }

  // === Import fichier ===
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const maxSize = 10 * 1024 * 1024; // 10 Mo
    if (file.size > maxSize) {
      this.toastr.warning('Le fichier ne doit pas depasser 10 Mo');
      return;
    }

    const allowedExts = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      this.toastr.warning('Format non supporte. Utilisez PDF, DOCX ou TXT.');
      return;
    }

    Swal.fire({
      title: 'Importer votre CV',
      html: `<p style="font-size:.9rem;color:var(--sand-500);">Le fichier <strong>${file.name}</strong> va etre analyse par notre IA pour remplir automatiquement votre CV.</p>
             <p style="font-size:.82rem;color:var(--sand-400);">Cela peut prendre quelques secondes...</p>`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-magic me-1"></i> Analyser avec l\'IA',
      cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.parsing = true;
        this.cdr.detectChanges();

        this.resumeService.parseFile(file).subscribe({
          next: (parsed) => {
            this.title = parsed.title || this.title;
            this.summary = parsed.summary || '';
            this.experiences = (parsed.experiences || []).map(e => this.fixEntryDates(e));
            this.educations = (parsed.educations || []).map(e => this.fixEntryDates(e));
            this.skills = parsed.skills || [];
            this.languages = parsed.languages || [];
            this.parsing = false;
            this.toastr.success('CV importe et analyse avec succes ! Verifiez et ajustez les informations.');
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.parsing = false;
            this.toastr.error(err.error?.message || 'Erreur lors de l\'analyse. Reessayez ou remplissez manuellement.');
            this.cdr.detectChanges();
          }
        });
      }
    });

    // Reset input pour permettre de re-selectionner le meme fichier
    input.value = '';
  }

  // === Save ===
  save(): void {
    if (!this.title) { this.toastr.warning('Donnez un titre a votre CV'); return; }

    this.saving = true;
    const data: ResumeSave = {
      title: this.title,
      summary: this.summary || null,
      experiences: this.experiences,
      educations: this.educations,
      skills: this.skills,
      languages: this.languages
    };

    this.resumeService.save(data).subscribe({
      next: r => {
        this.resume = r;
        this.saving = false;
        this.toastr.success('CV enregistre avec succes !');
        this.cdr.detectChanges();
      },
      error: () => { this.saving = false; this.toastr.error('Erreur lors de l\'enregistrement'); this.cdr.detectChanges(); }
    });
  }

  deleteResume(): void {
    Swal.fire({
      title: 'Supprimer votre CV ?', text: 'Cette action est irreversible.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#e11d48',
      confirmButtonText: '<i class="bi bi-trash me-1"></i> Supprimer', cancelButtonText: 'Annuler'
    }).then(r => {
      if (r.isConfirmed) {
        this.resumeService.delete().subscribe({
          next: () => {
            this.resume = null;
            this.title = `CV de ${this.auth.currentUser?.firstName} ${this.auth.currentUser?.lastName}`;
            this.summary = ''; this.experiences = []; this.educations = [];
            this.skills = []; this.languages = [];
            this.toastr.success('CV supprime');
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  // Convertit n'importe quel format de date en yyyy-MM-dd pour les <input type="date">
  private toDateInput(value: any): string {
    if (!value) return '';
    const s = String(value);

    // Deja au bon format yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // ISO datetime : 2021-03-01T00:00:00 ou 2021-03-01T00:00:00Z
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.substring(0, 10);

    // Format dd/MM/yyyy
    const dmyMatch = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;

    // Format MM/yyyy
    const myMatch = s.match(/^(\d{1,2})[\/\-.](\d{4})$/);
    if (myMatch) return `${myMatch[2]}-${myMatch[1].padStart(2, '0')}-01`;

    // Annee seule : 2021
    if (/^\d{4}$/.test(s)) return `${s}-01-01`;

    // Tenter un Date.parse en dernier recours
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().substring(0, 10);
    }

    return '';
  }

  // Normalise les dates d'une experience ou formation
  private fixEntryDates<T extends { startDate: string; endDate?: string | null; isCurrent: boolean }>(entry: T): T {
    return {
      ...entry,
      startDate: this.toDateInput(entry.startDate),
      endDate: entry.isCurrent ? null : this.toDateInput(entry.endDate)
    };
  }

  exportPdf(): void {
    const printContent = document.querySelector('.cv-preview') as HTMLElement;
    if (!printContent) {
      this.toastr.warning('Passez en mode Apercu avant d\'exporter');
      this.activeTab = 'preview';
      this.cdr.detectChanges();
      setTimeout(() => this.exportPdf(), 300);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.toastr.error('Veuillez autoriser les pop-ups pour exporter en PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>${this.title || 'Mon CV'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Plus Jakarta Sans', sans-serif; color: #292524; padding: 2rem 2.5rem; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cv-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 3px solid #065f46; }
          .cv-avatar { width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #059669, #065f46); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.3rem; font-weight: 800; flex-shrink: 0; }
          .cv-name { font-size: 1.5rem; font-weight: 800; color: #1c1917; margin-bottom: .1rem; }
          .cv-title-text { font-size: 1rem; color: #065f46; font-weight: 600; margin-bottom: .3rem; }
          .cv-contact { font-size: .85rem; color: #78716c; display: flex; gap: 1rem; flex-wrap: wrap; }
          .cv-contact i { color: #059669; margin-right: .3rem; }
          .cv-section { margin-bottom: 1.5rem; }
          .cv-section-title { font-size: 1rem; font-weight: 700; color: #065f46; border-bottom: 2px solid #dcfce7; padding-bottom: .4rem; margin-bottom: .8rem; display: flex; align-items: center; gap: .5rem; }
          .cv-section-title i { font-size: .9rem; }
          .cv-entry { margin-bottom: .8rem; padding-left: 1rem; border-left: 3px solid #bbf7d0; }
          .cv-entry-title { font-weight: 700; font-size: .95rem; color: #1c1917; }
          .cv-entry-sub { font-size: .85rem; color: #065f46; font-weight: 600; }
          .cv-entry-date { font-size: .8rem; color: #a8a29e; margin-bottom: .3rem; }
          .cv-entry-desc { font-size: .85rem; color: #57534e; line-height: 1.6; margin-top: .2rem; }
          .cv-skills { display: flex; flex-wrap: wrap; gap: .5rem; }
          .cv-skill-badge { padding: .3rem .7rem; border-radius: 8px; font-size: .82rem; font-weight: 600; background: #f0fdf4; color: #065f46; border: 1px solid #bbf7d0; }
          .cv-skill-level { font-size: .72rem; color: #a8a29e; margin-left: .3rem; }
          .cv-langs { display: flex; flex-wrap: wrap; gap: .5rem; }
          .cv-lang { padding: .4rem .8rem; border-radius: 10px; font-size: .85rem; background: #ecfeff; border: 1px solid #a5f3fc; }
          .cv-lang strong { color: #0891b2; }
          .cv-lang span { color: #78716c; margin-left: .3rem; font-size: .8rem; }
          .cv-profile { font-size: .9rem; color: #57534e; line-height: 1.7; margin-bottom: 0; }
          @media print { body { padding: 1rem 1.5rem; } }
        </style>
      </head>
      <body>
        <div class="cv-header">
          <div class="cv-avatar">${this.auth.currentUser?.firstName?.charAt(0) || ''}${this.auth.currentUser?.lastName?.charAt(0) || ''}</div>
          <div>
            <div class="cv-name">${this.auth.currentUser?.firstName || ''} ${this.auth.currentUser?.lastName || ''}</div>
            <div class="cv-title-text">${this.title}</div>
            <div class="cv-contact">
              <span><i class="bi bi-envelope"></i>${this.auth.currentUser?.email || ''}</span>
              ${this.auth.currentUser?.phone ? `<span><i class="bi bi-telephone"></i>${this.auth.currentUser.phone}</span>` : ''}
            </div>
          </div>
        </div>

        ${this.summary ? `<div class="cv-section"><h3 class="cv-section-title"><i class="bi bi-person-lines-fill"></i>Profil</h3><p class="cv-profile">${this.escapeHtml(this.summary)}</p></div>` : ''}

        ${this.experiences.length > 0 ? `<div class="cv-section"><h3 class="cv-section-title"><i class="bi bi-briefcase"></i>Experiences professionnelles</h3>${this.experiences.map(exp => `
          <div class="cv-entry">
            <div class="cv-entry-title">${this.escapeHtml(exp.jobTitle)}</div>
            <div class="cv-entry-sub">${this.escapeHtml(exp.company)}${exp.location ? ' — ' + this.escapeHtml(exp.location) : ''}</div>
            <div class="cv-entry-date">${this.formatDate(exp.startDate)} — ${exp.isCurrent ? "Aujourd'hui" : (exp.endDate ? this.formatDate(exp.endDate) : '')}</div>
            ${exp.description ? `<p class="cv-entry-desc">${this.escapeHtml(exp.description)}</p>` : ''}
          </div>`).join('')}</div>` : ''}

        ${this.educations.length > 0 ? `<div class="cv-section"><h3 class="cv-section-title"><i class="bi bi-mortarboard"></i>Formation</h3>${this.educations.map(edu => `
          <div class="cv-entry">
            <div class="cv-entry-title">${this.escapeHtml(edu.degree)}</div>
            <div class="cv-entry-sub">${this.escapeHtml(edu.school)}${edu.location ? ' — ' + this.escapeHtml(edu.location) : ''}</div>
            <div class="cv-entry-date">${this.formatDate(edu.startDate)} — ${edu.isCurrent ? "Aujourd'hui" : (edu.endDate ? this.formatDate(edu.endDate) : '')}</div>
            ${edu.description ? `<p class="cv-entry-desc">${this.escapeHtml(edu.description)}</p>` : ''}
          </div>`).join('')}</div>` : ''}

        ${this.skills.length > 0 ? `<div class="cv-section"><h3 class="cv-section-title"><i class="bi bi-tools"></i>Competences</h3><div class="cv-skills">${this.skills.map(s => `<span class="cv-skill-badge">${this.escapeHtml(s.name)}<span class="cv-skill-level">${this.getSkillLabel(s.level)}</span></span>`).join('')}</div></div>` : ''}

        ${this.languages.length > 0 ? `<div class="cv-section"><h3 class="cv-section-title"><i class="bi bi-translate"></i>Langues</h3><div class="cv-langs">${this.languages.map(l => `<div class="cv-lang"><strong>${this.escapeHtml(l.name)}</strong><span>${this.escapeHtml(l.level)}</span></div>`).join('')}</div></div>` : ''}
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(d: string): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  }

  getSkillLabel(level: number): string {
    return this.skillLevels.find(s => s.value === level)?.label || '';
  }
}
