import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CvService } from '../../services/cv.service';
import { UploadService } from '../../services/upload.service';
import { AuthService } from '../../services/auth.service';
import { CvSection, CvSectionCreate, SectionType, SECTION_TYPES, SECTION_CONFIG } from '../../models/cv.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cv-builder',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './cv-builder.html',
  styleUrl: './cv-builder.scss',
})
export class CvBuilder implements OnInit {
  private cvService = inject(CvService);
  private uploadService = inject(UploadService);
  auth = inject(AuthService);
  private toastr = inject(ToastrService);

  sections = signal<CvSection[]>([]);
  loading = signal(true);
  previewOpen = signal(false);

  // Edit modal
  editOpen = signal(false);
  isNew = true;
  editId = 0;
  editForm: CvSectionCreate = { sectionType: 'Experience', sortOrder: 0 };

  // AI modal
  aiOpen = signal(false);
  aiSections = signal<CvSectionCreate[]>([]);
  aiSelected = signal<boolean[]>([]);
  parsingFile = signal(false);
  aiModalTitle = signal('Sections generees par l\'IA');

  TYPES = SECTION_TYPES;
  CONFIG = SECTION_CONFIG;

  grouped = computed(() => {
    const g: Record<string, CvSection[]> = {};
    for (const t of this.TYPES) g[t] = this.sections().filter(s => s.sectionType === t).sort((a, b) => a.sortOrder - b.sortOrder);
    return g;
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.cvService.getAll().subscribe({ next: (s) => { this.sections.set(s); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openAdd(type: SectionType) {
    this.isNew = true;
    this.editId = 0;
    const count = this.sections().filter(s => s.sectionType === type).length;
    this.editForm = { sectionType: type, sortOrder: count, title: '', organization: '', location: '', description: '', level: '' };
    this.editOpen.set(true);
  }

  openEdit(s: CvSection) {
    this.isNew = false;
    this.editId = s.id;
    this.editForm = { sectionType: s.sectionType as SectionType, title: s.title, organization: s.organization, location: s.location, startDate: s.startDate?.substring(0, 10), endDate: s.endDate?.substring(0, 10), description: s.description, level: s.level, sortOrder: s.sortOrder };
    this.editOpen.set(true);
  }

  saveSection() {
    if (this.isNew) {
      this.cvService.create(this.editForm).subscribe({ next: () => { this.editOpen.set(false); this.load(); this.toastr.success('Section ajoutee'); }, error: () => this.toastr.error('Erreur') });
    } else {
      this.cvService.update(this.editId, this.editForm).subscribe({ next: () => { this.editOpen.set(false); this.load(); this.toastr.success('Section modifiee'); }, error: () => this.toastr.error('Erreur') });
    }
  }

  async deleteSection(id: number) {
    const res = await Swal.fire({ title: 'Supprimer cette section ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' });
    if (res.isConfirmed) {
      this.cvService.delete(id).subscribe({ next: () => { this.load(); this.toastr.success('Supprimee'); } });
    }
  }

  // IA parsing depuis un fichier PDF/DOCX
  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext || '')) {
      this.toastr.warning('Formats acceptes : PDF, DOCX, DOC');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toastr.warning('Le fichier ne doit pas depasser 10 Mo');
      return;
    }

    // Upload le fichier comme resume en parallele (si PDF)
    if (ext === 'pdf') {
      this.uploadService.uploadResume(file).subscribe({
        next: () => this.auth.getMe().subscribe(),
        error: () => {}
      });
    }

    this.parsingFile.set(true);
    this.aiModalTitle.set('Sections extraites du CV');
    this.cvService.parseFile(file).subscribe({
      next: (s) => {
        this.parsingFile.set(false);
        this.aiSections.set(s);
        this.aiSelected.set(s.map(() => true));
        this.aiOpen.set(true);
        this.toastr.success(`${s.length} sections extraites du fichier`);
      },
      error: (err) => {
        this.parsingFile.set(false);
        this.toastr.error(err.error?.message || 'Erreur lors de l\'analyse du fichier');
      },
    });

    // Reset input
    (event.target as HTMLInputElement).value = '';
  }

  toggleAi(i: number) {
    this.aiSelected.update(a => { const c = [...a]; c[i] = !c[i]; return c; });
  }

  acceptAi() {
    const selected = this.aiSections().filter((_, i) => this.aiSelected()[i]);
    if (selected.length === 0) { this.toastr.warning('Selectionnez au moins une section'); return; }

    // Vider les anciennes sections puis inserer les nouvelles
    this.cvService.deleteAll().subscribe({
      next: () => {
        this.cvService.createBatch(selected).subscribe({
          next: () => { this.aiOpen.set(false); this.load(); this.toastr.success(`CV mis a jour : ${selected.length} section(s)`); },
          error: (err) => {
            console.error('Batch error:', err);
            this.toastr.error(err.error?.message || err.error?.detail || 'Erreur lors de la sauvegarde');
          },
        });
      },
      error: () => this.toastr.error('Erreur lors de la suppression des anciennes sections'),
    });
  }

  sectionLabel(type: string): string { return SECTION_CONFIG[type as SectionType]?.label || type; }
  sectionIcon(type: string): string { return SECTION_CONFIG[type as SectionType]?.icon || 'bi-circle'; }
  sectionColor(type: string): string { return SECTION_CONFIG[type as SectionType]?.color || 'var(--teal)'; }

  needsDates(type: string): boolean { return ['Experience', 'Formation', 'Projet'].includes(type); }
  needsLevel(type: string): boolean { return ['Langue', 'Competence'].includes(type); }
  needsOrg(type: string): boolean { return ['Experience', 'Formation', 'Projet'].includes(type); }
}
