import { Component, OnInit, OnDestroy, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from '../../services/message.service';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';
import { SignalRService } from '../../services/signalr.service';
import { Conversation, ChatMessage } from '../../models/auth.model';

@Component({
  selector: 'app-inbox',
  imports: [DatePipe, FormsModule],
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
