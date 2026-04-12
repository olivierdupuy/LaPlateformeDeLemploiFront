import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { SiteBanner } from './components/site-banner/site-banner';
import { PlatformService } from './services/platform.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, SiteBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  platform = inject(PlatformService);
  private auth = inject(AuthService);

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  ngOnInit() {
    this.platform.load();
  }
}
