import { Component, OnInit, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../services/auth.service';
import { Conversation, ChatMessage } from '../../models/auth.model';

@Component({
  selector: 'app-inbox',
  imports: [DatePipe, FormsModule],
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class Inbox implements OnInit {
  messageService = inject(MessageService);
  auth = inject(AuthService);

  conversations = signal<Conversation[]>([]);
  selectedAppId = signal<number | null>(null);
  messages = signal<ChatMessage[]>([]);
  newMessage = signal('');
  loadingMessages = signal(false);

  @ViewChild('chatBody') chatBody!: ElementRef;

  ngOnInit() {
    this.messageService.loadConversations();
    this.conversations = this.messageService.conversations;
  }

  selectConversation(appId: number) {
    this.selectedAppId.set(appId);
    this.loadingMessages.set(true);
    this.messageService.markAsRead(appId).subscribe();
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

  getSelectedConversation(): Conversation | undefined {
    return this.conversations().find((c) => c.applicationId === this.selectedAppId());
  }

  private scrollToBottom() {
    if (this.chatBody) {
      this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
    }
  }
}
