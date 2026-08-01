import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../../services/message.service';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';
import { SignalRService } from '../../services/signalr.service';
import { Conversation, ChatMessage } from '../../models/auth.model';
import { ConsoleShell } from '../console-shell/console-shell';
import { MessageTemplates } from '../message-templates/message-templates';

@Component({
  selector: 'app-inbox',
  imports: [DatePipe, FormsModule, ConsoleShell, MessageTemplates],
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class Inbox implements OnInit, OnDestroy {
  messageService = inject(MessageService);
  private appService = inject(ApplicationService);
  auth = inject(AuthService);
  private signalR = inject(SignalRService);

  availableApps = signal<any[]>([]);
  showNewConv = signal(false);

  conversations = signal<Conversation[]>([]);
  selectedAppId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  newMessage = signal('');
  loadingMessages = signal(false);
  isTyping = signal(false);

  /**
   * Modeles de messages, ouverts au-dessus du champ de saisie.
   *
   * Reserves au recruteur : c'est lui qui ecrit vingt fois le meme accuse
   * de reception. Un candidat n'a qu'une candidature a la fois en tete.
   */
  templatesOpen = signal(false);
  get canUseTemplates(): boolean { return this.auth.isRecruiter(); }

  /**
   * Insere un modele dans le message en cours, jetons substitues.
   *
   * Le composant des modeles ne connait pas la conversation ; c'est ici
   * qu'on sait de quel candidat et de quelle offre il s'agit. Un modele
   * garde donc `{{candidat}}` en bibliotheque et devient nominatif a
   * l'insertion.
   */
  applyTemplate(content: string) {
    const id = this.selectedAppId();
    const conv = this.conversations().find((c) => c.applicationId === id);
    // Une conversation qui n'a pas encore de message n'est pas dans la
    // liste : elle vient d'etre ouverte depuis une candidature. Les noms
    // se lisent alors sur la candidature elle-meme, faute de quoi le
    // premier message — celui ou le modele sert le plus — sortait avec
    // « Bonjour , » et un poste vide.
    const app = conv ? null : this.availableApps().find((a: any) => a.id === id);

    const candidat = conv?.otherUserName ?? app?.fullName ?? app?.candidateName ?? '';
    const poste = conv?.jobTitle ?? app?.jobTitle ?? app?.jobOffer?.title ?? '';

    const filled = content
      .replace(/\{\{\s*candidat\s*\}\}/gi, candidat)
      .replace(/\{\{\s*poste\s*\}\}/gi, poste)
      .replace(/\{\{\s*entreprise\s*\}\}/gi, this.auth.currentUser()?.company ?? '');

    // On complete plutot qu'on remplace : un message a moitie ecrit ne
    // doit pas disparaitre parce qu'on va chercher une formule.
    const current = this.newMessage().trimEnd();
    this.newMessage.set(current ? `${current}\n\n${filled}` : filled);
    this.templatesOpen.set(false);
  }

  @ViewChild('chatBody') chatBody!: ElementRef;

  private subs: Subscription[] = [];
  private typingTimeout: any;
  private currentAppId: number | null = null;

  ngOnInit() {
    this.messageService.loadConversations();
    this.conversations = this.messageService.conversations;

    // Real-time: new message
    this.subs.push(
      this.signalR.newMessage$.subscribe((msg) => {
        const appId = this.selectedAppId();
        if (msg.applicationId === appId) {
          const currentUser = this.auth.currentUser();
          if (msg.senderId !== currentUser?.id) {
            this.messages.update(msgs => [...msgs, msg]);
            this.isTyping.set(false);
            setTimeout(() => this.scrollToBottom(), 50);
            this.messageService.markAsRead(appId!).subscribe();
          }
        }
        // Refresh conversation list
        this.messageService.loadConversations();
      }),

      // Typing indicators
      this.signalR.userTyping$.subscribe((data) => {
        if (data.applicationId === this.selectedAppId()) {
          this.isTyping.set(true);
        }
      }),
      this.signalR.userStoppedTyping$.subscribe((data) => {
        if (data.applicationId === this.selectedAppId()) {
          this.isTyping.set(false);
        }
      })
    );
  }

  ngOnDestroy() {
    if (this.currentAppId) this.signalR.leaveConversation(this.currentAppId);
    this.subs.forEach(s => s.unsubscribe());
  }

  selectConversation(appId: number) {
    // Leave previous group
    if (this.currentAppId) this.signalR.leaveConversation(this.currentAppId);

    this.selectedAppId.set(appId);
    this.currentAppId = appId;
    this.isTyping.set(false);
    this.loadingMessages.set(true);
    this.messageService.markAsRead(appId).subscribe();

    // Join new group
    this.signalR.joinConversation(appId);

    this.messageService.getMessages(appId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.loadingMessages.set(false);
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: () => this.loadingMessages.set(false),
    });
  }

  sendMessage() {
    const content = this.newMessage().trim();
    const appId = this.selectedAppId();
    if (!content || !appId) return;
    this.signalR.stopTyping(appId);
    this.messageService.send(appId, content).subscribe({
      next: () => {
        this.newMessage.set('');
        this.messageService.getMessages(appId).subscribe({
          next: (msgs) => {
            this.messages.set(msgs);
            setTimeout(() => this.scrollToBottom(), 50);
          },
        });
      },
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInput() {
    const appId = this.selectedAppId();
    if (!appId) return;
    this.signalR.sendTyping(appId);
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.signalR.stopTyping(appId);
    }, 2000);
  }

  openNewConversation() {
    const user = this.auth.currentUser();
    const isRecruiter = user?.role === 'Recruiter' || user?.role === 'Admin';
    const obs = isRecruiter ? this.appService.getAll() : this.appService.trackMy();

    obs.subscribe({
      next: (apps) => {
        const existingAppIds = new Set(this.conversations().map(c => c.applicationId));
        this.availableApps.set(apps.filter((a: any) => !existingAppIds.has(a.id)));
        this.showNewConv.set(true);
      }
    });
  }

  pickApp(app: any) {
    this.showNewConv.set(false);
    this.selectConversation(app.id);
  }

  getSelectedConversation(): Conversation | undefined {
    return this.conversations().find((c) => c.applicationId === this.selectedAppId());
  }

  private scrollToBottom() {
    if (this.chatBody) {
      this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
    }
  }
}
