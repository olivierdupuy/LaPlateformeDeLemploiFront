import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-apply-modal',
  imports: [FormsModule],
  templateUrl: './apply-modal.html',
  styleUrl: './apply-modal.scss',
})
export class ApplyModal implements OnInit {
  @Input({ required: true }) jobId!: number;
  @Input({ required: true }) jobTitle!: string;
  @Input() screeningQuestions?: string;
  @Output() close = new EventEmitter<void>();
  @Output() applied = new EventEmitter<void>();

  questions: string[] = [];
  answers: string[] = [];

  private appService = inject(ApplicationService);
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);

  userName = '';
  userEmail = '';
  form = {
    phone: '',
    coverLetter: '',
  };

  submitting = false;

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u) {
      this.userName = `${u.firstName} ${u.lastName}`;
      this.userEmail = u.email;
    }
    if (this.screeningQuestions) {
      try { this.questions = JSON.parse(this.screeningQuestions) || []; } catch { this.questions = []; }
      this.answers = this.questions.map(() => '');
    }
  }

  get answersComplete(): boolean {
    return this.questions.every((_, i) => (this.answers[i] || '').trim().length > 0);
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  submit() {
    this.submitting = true;
    const screeningAnswers = this.questions.length
      ? JSON.stringify(this.questions.map((q, i) => ({ question: q, answer: (this.answers[i] || '').trim() })))
      : undefined;
    this.appService.create({
      jobOfferId: this.jobId,
      fullName: this.userName,
      email: this.userEmail,
      phone: this.form.phone || undefined,
      coverLetter: this.form.coverLetter || undefined,
      screeningAnswers,
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.applied.emit();
      },
      error: (err) => {
        this.submitting = false;
        this.toastr.error(err.error?.message || err.error || 'Erreur lors de l\'envoi');
      },
    });
  }
}
