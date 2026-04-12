import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  year = new Date().getFullYear();
  newsletterEmail = '';

  constructor(private toastr: ToastrService) {}

  subscribeNewsletter(input: HTMLInputElement) {
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      this.toastr.warning('Veuillez entrer un email valide');
      return;
    }
    this.toastr.success('Merci ! Vous recevrez nos alertes emploi.');
    input.value = '';
  }
}
