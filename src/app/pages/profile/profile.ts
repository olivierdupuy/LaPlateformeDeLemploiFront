import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ApplicationService } from '../../services/application.service';
import { CompanyService } from '../../services/company.service';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  firstName = '';
  lastName = '';
  phone = '';
  bio = '';
  skills = '';
  saving = false;
  uploadingLogo = false;
  companyLogoUrl = '';
  // Company profile fields
  companyDescription = '';
  companyWebsite = '';
  companyLocation = '';
  companyId = 0;
  savingCompany = false;

  constructor(public auth: AuthService, private appService: ApplicationService, private toastr: ToastrService, private cdr: ChangeDetectorRef, private http: HttpClient, private companyService: CompanyService, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Mon profil', 'Gerez vos informations personnelles et votre profil professionnel.');
    const u = this.auth.currentUser;
    if (u) {
      this.firstName = u.firstName;
      this.lastName = u.lastName;
      this.phone = u.phone || '';
      this.bio = u.bio || '';
      this.skills = u.skills || '';
      if (this.auth.isCompany && u.companyId) {
        this.companyId = u.companyId;
        this.companyService.getById(u.companyId).subscribe(c => {
          this.companyLogoUrl = c.logoUrl || '';
          this.companyDescription = c.description || '';
          this.companyWebsite = c.website || '';
          this.companyLocation = c.location || '';
          this.cdr.detectChanges();
        });
      }
    }
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingLogo = true;
    const fd = new FormData();
    fd.append('file', file);
    this.http.post<{ logoUrl: string }>('/api/companies/upload-logo', fd).subscribe({
      next: res => {
        this.companyLogoUrl = res.logoUrl;
        this.toastr.success('Logo mis a jour');
        this.uploadingLogo = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur upload');
        this.uploadingLogo = false;
        this.cdr.detectChanges();
      }
    });
  }

  save(): void {
    this.saving = true;
    this.appService.updateProfile({
      firstName: this.firstName, lastName: this.lastName,
      phone: this.phone || undefined, bio: this.bio || undefined, skills: this.skills || undefined
    }).subscribe({
      next: (user: any) => {
        localStorage.setItem('auth_user', JSON.stringify(user));
        this.toastr.success('Profil mis a jour');
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: () => { this.toastr.error('Erreur'); this.saving = false; this.cdr.detectChanges(); }
    });
  }

  saveCompany(): void {
    this.savingCompany = true;
    this.companyService.update(this.companyId, {
      name: this.auth.currentUser?.companyName || '',
      description: this.companyDescription || null,
      logoUrl: this.companyLogoUrl || null,
      website: this.companyWebsite || null,
      location: this.companyLocation || null
    }).subscribe({
      next: () => { this.toastr.success('Profil entreprise mis a jour'); this.savingCompany = false; this.cdr.detectChanges(); },
      error: () => { this.toastr.error('Erreur'); this.savingCompany = false; this.cdr.detectChanges(); }
    });
  }
}
