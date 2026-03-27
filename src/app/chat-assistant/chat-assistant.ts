import { Component, inject, signal } from '@angular/core';

import { ChatLlmService } from '../chat-llm.service';
import { ChatTreeService, TreeNodeDto, TreeOptionDto } from '../chat-tree.service';

export type ChatRole = 'user' | 'bot';

export interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
}

@Component({
  selector: 'app-chat-assistant',
  templateUrl: './chat-assistant.html',
  styleUrl: './chat-assistant.scss'
})
export class ChatAssistant {
  private readonly treeApi = inject(ChatTreeService);
  private readonly llmApi = inject(ChatLlmService);

  protected readonly panelId = 'chat-assistant-panel';
  protected readonly isOpen = signal(false);
  protected readonly draft = signal('');
  protected readonly isTyping = signal(false);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly branchPath = signal<string[]>([]);
  protected readonly currentNode = signal<TreeNodeDto | null>(null);
  protected readonly treeLoading = signal(false);

  private nextId = 0;
  private sessionStarted = false;

  private allocId(): number {
    return this.nextId++;
  }

  protected toggle(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.ensureSession();
    }
  }

  private ensureSession(): void {
    if (this.sessionStarted) {
      return;
    }
    this.loadRoot();
  }

  protected reiniciar(): void {
    this.sessionStarted = false;
    this.branchPath.set([]);
    this.currentNode.set(null);
    this.messages.set([]);
    this.draft.set('');
    this.nextId = 0;
    if (this.isOpen()) {
      this.loadRoot();
    }
  }

  private loadRoot(): void {
    this.treeLoading.set(true);
    this.treeApi.getNode().subscribe({
      next: (n) => {
        this.treeLoading.set(false);
        this.sessionStarted = true;
        this.branchPath.set([n.nodeId]);
        this.currentNode.set(n);
        this.messages.set([{ id: this.allocId(), role: 'bot', text: n.message }]);
      },
      error: () => {
        this.treeLoading.set(false);
        this.sessionStarted = true;
        const msg =
          'No se pudo cargar el menú. Arranca el API con npm run api (puerto 3000) y usa ng serve con proxy.';
        this.currentNode.set(null);
        this.branchPath.set([]);
        this.messages.set([{ id: this.allocId(), role: 'bot', text: msg }]);
      }
    });
  }

  protected chooseOption(opt: TreeOptionDto): void {
    const from = this.currentNode();
    if (!from || this.treeLoading() || this.isTyping() || from.isLeaf) {
      return;
    }
    this.treeLoading.set(true);
    this.treeApi.step(from.nodeId, opt.id).subscribe({
      next: (res) => {
        this.treeLoading.set(false);
        const label = res.chosenLabel ?? opt.label;
        this.messages.update((m) => [
          ...m,
          { id: this.allocId(), role: 'user', text: label },
          { id: this.allocId(), role: 'bot', text: res.message }
        ]);
        this.branchPath.update((p) => [...p, res.nodeId]);
        this.currentNode.set(res);
      },
      error: () => {
        this.treeLoading.set(false);
        this.messages.update((m) => [
          ...m,
          {
            id: this.allocId(),
            role: 'bot',
            text: 'No se pudo avanzar en el menú. Revisa la conexión con el servidor.'
          }
        ]);
      }
    });
  }

  protected showOptions(): boolean {
    const n = this.currentNode();
    return Boolean(n && !n.isLeaf && n.options.length > 0 && !this.treeLoading());
  }

  protected showFreeTextComposer(): boolean {
    const n = this.currentNode();
    return Boolean(n?.isLeaf && n.allowFreeText && !this.treeLoading());
  }

  protected showLeafNoInput(): boolean {
    const n = this.currentNode();
    return Boolean(n?.isLeaf && !n.allowFreeText && !this.treeLoading());
  }

  protected onDraftInputEvent(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    this.draft.set(el.value);
  }

  protected send(): void {
    const text = this.draft().trim();
    const n = this.currentNode();
    const path = this.branchPath();
    if (!text || !n?.isLeaf || !n.allowFreeText || this.isTyping()) {
      return;
    }
    const leafId = path[path.length - 1];
    if (leafId !== n.nodeId) {
      return;
    }

    this.messages.update((list) => [...list, { id: this.allocId(), role: 'user', text }]);
    this.draft.set('');
    this.isTyping.set(true);

    this.llmApi.chat({ message: text, branchPath: [...path], leafNodeId: leafId }).subscribe({
      next: (res) => {
        this.messages.update((list) => [
          ...list,
          { id: this.allocId(), role: 'bot', text: res.reply }
        ]);
        this.isTyping.set(false);
      },
      error: () => {
        this.messages.update((list) => [
          ...list,
          {
            id: this.allocId(),
            role: 'bot',
            text: 'No se obtuvo respuesta del servidor. ¿Está el API en marcha y la ruta del menú es válida?'
          }
        ]);
        this.isTyping.set(false);
      }
    });
  }

  protected onKeydownEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected showReiniciar(): boolean {
    return this.messages().length > 0 && !this.treeLoading();
  }
}
