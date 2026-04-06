import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MessageService, ConversationDto, MessageDto } from '../../services/message.service';
import { SeoService } from '../../services/seo.service';
import { SignalRService } from '../../services/signalr.service';

@Component({
  selector: 'app-messaging',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './messaging.html',
  styleUrl: './messaging.css'
})
export class Messaging implements OnInit, OnDestroy {
  conversations: ConversationDto[] = [];
  selectedConv: ConversationDto | null = null;
  messages: MessageDto[] = [];
  newMessage = '';
  loading = true;
  loadingMessages = false;
  sending = false;
  pollInterval: any;
  otherUserTyping = false;
  private typingTimeout: any;
  private subs: Subscription[] = [];

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  constructor(
    public auth: AuthService,
    private msgService: MessageService,
    private signalr: SignalRService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Messagerie', 'Echangez avec les recruteurs et candidats en temps reel.');
    this.loadConversations();

    // Start SignalR connection
    const token = localStorage.getItem('token');
    if (token) {
      this.signalr.start(token);

      this.subs.push(
        this.signalr.messageReceived$.subscribe(msg => {
          if (this.selectedConv && msg.conversationId === this.selectedConv.id) {
            // Add message to current conversation if not already there
            if (msg.senderId !== this.auth.currentUser?.id) {
              this.messages.push({
                id: Date.now(),
                senderId: msg.senderId,
                senderName: '',
                content: msg.content,
                sentAt: msg.sentAt,
                isRead: true,
                isMine: false
              });
              this.cdr.detectChanges();
              setTimeout(() => this.scrollToBottom(), 50);
            }
          }
          // Update conversation list
          const conv = this.conversations.find(c => c.id === msg.conversationId);
          if (conv) {
            conv.lastMessage = msg.content;
            conv.lastMessageAt = msg.sentAt;
            if (!this.selectedConv || msg.conversationId !== this.selectedConv.id) {
              conv.unreadCount++;
            }
            this.cdr.detectChanges();
          }
        }),
        this.signalr.userTyping$.subscribe(data => {
          if (this.selectedConv && data.conversationId === this.selectedConv.id) {
            this.otherUserTyping = true;
            this.cdr.detectChanges();
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
              this.otherUserTyping = false;
              this.cdr.detectChanges();
            }, 3000);
          }
        }),
        this.signalr.userStoppedTyping$.subscribe(data => {
          if (this.selectedConv && data.conversationId === this.selectedConv.id) {
            this.otherUserTyping = false;
            this.cdr.detectChanges();
          }
        })
      );
    }

    // Fallback polling (less frequent since SignalR handles real-time)
    this.pollInterval = setInterval(() => this.pollMessages(), 30000);
  }

  ngOnDestroy(): void {
    clearInterval(this.pollInterval);
    clearTimeout(this.typingTimeout);
    if (this.selectedConv) this.signalr.leaveConversation(this.selectedConv.id);
    this.subs.forEach(s => s.unsubscribe());
    this.signalr.stop();
  }

  loadConversations(): void {
    this.msgService.getConversations().subscribe({
      next: convs => { this.conversations = convs; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  selectConversation(conv: ConversationDto): void {
    // Leave previous conversation SignalR group
    if (this.selectedConv) {
      this.signalr.leaveConversation(this.selectedConv.id);
    }

    this.selectedConv = conv;
    this.loadingMessages = true;
    this.otherUserTyping = false;

    // Join new conversation SignalR group
    this.signalr.joinConversation(conv.id);

    this.msgService.getMessages(conv.id).subscribe({
      next: msgs => {
        this.messages = msgs;
        this.loadingMessages = false;
        conv.unreadCount = 0;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: () => { this.loadingMessages = false; this.cdr.detectChanges(); }
    });
  }

  send(): void {
    if (!this.newMessage.trim() || !this.selectedConv) return;
    this.sending = true;
    const content = this.newMessage.trim();
    this.msgService.sendMessage(this.selectedConv.otherUserId, content).subscribe({
      next: msg => {
        this.messages.push(msg);
        this.newMessage = '';
        this.sending = false;
        this.selectedConv!.lastMessage = msg.content;
        this.selectedConv!.lastMessageAt = msg.sentAt;
        // Also broadcast via SignalR
        this.signalr.sendMessage(this.selectedConv!.id, content);
        this.signalr.stopTyping(this.selectedConv!.id);
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: () => { this.sending = false; this.cdr.detectChanges(); }
    });
  }

  private typingEmitted = false;
  onInput(): void {
    if (!this.selectedConv) return;
    if (!this.typingEmitted) {
      this.signalr.startTyping(this.selectedConv.id);
      this.typingEmitted = true;
      setTimeout(() => { this.typingEmitted = false; }, 2000);
    }
  }

  pollMessages(): void {
    if (!this.selectedConv) return;
    this.msgService.getMessages(this.selectedConv.id).subscribe(msgs => {
      if (msgs.length !== this.messages.length) {
        this.messages = msgs;
        this.selectedConv!.unreadCount = 0;
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
    // Refresh conversation list
    this.msgService.getConversations().subscribe(convs => this.conversations = convs);
  }

  scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }

  formatTime(date: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'A l\'instant';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2);
  }

  get totalUnread(): number {
    return this.conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
}
