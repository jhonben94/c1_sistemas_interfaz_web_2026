import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatAssistantBasic } from './chat-assistant-basic/chat-assistant-basic';
import { ChatAssistant } from './chat-assistant/chat-assistant';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatAssistantBasic, ChatAssistant],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Peón de Rey');
  protected readonly year = new Date().getFullYear();
}
