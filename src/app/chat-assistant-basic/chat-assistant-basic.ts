import { Component, signal } from '@angular/core';

type ChatRole = 'user' | 'bot';

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
}

@Component({
  selector: 'app-chat-assistant-basic',
  templateUrl: './chat-assistant-basic.html',
  styleUrl: './chat-assistant-basic.scss'
})
export class ChatAssistantBasic {
  protected readonly panelId = 'chat-basic-panel';
  protected readonly isOpen = signal(false);
  protected readonly draft = signal('');
  protected readonly isTyping = signal(false);
  protected readonly messages = signal<ChatMessage[]>([
    {
      id: 0,
      role: 'bot',
      text: 'Pregunta por precios, horario, envíos o contacto. Respuestas rápidas, sin servidor.'
    }
  ]);

  private nextId = 1;

  protected toggle(): void {
    this.isOpen.update((v) => !v);
  }

  protected onDraftInputEvent(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    this.draft.set(el.value);
  }

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.isTyping()) {
      return;
    }

    this.messages.update((list) => [...list, { id: this.nextId++, role: 'user', text }]);
    this.draft.set('');
    this.isTyping.set(true);

    const reply = this.replySimple(text);
    window.setTimeout(() => {
      this.messages.update((list) => [...list, { id: this.nextId++, role: 'bot', text: reply }]);
      this.isTyping.set(false);
    }, 450);
  }

  protected onKeydownEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  /** Respuestas fijas para demo de clase (precios, horario, envío, contacto). */
  private replySimple(raw: string): string {
    const t = raw.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

    if (/(precio|precios|cuanto|cuesta|catalogo|catálogo|producto|tablero|pieza|reloj|euro)/u.test(t)) {
      return 'Sets Staunton desde 89 €, tableros enrollables desde 24 €, relojes DGT desde 69 €. En tienda tenemos más opciones. Para mas opciones contactar al whatsapp 678 901 234';
    }
    if (/(horario|hora|abierto|abren|cierran|cuando)/u.test(t)) {
      return 'Lun–Vie 10:00–14:00 y 16:00–20:00 · Sáb 10:00–14:00. Calle del Alfil, 12, Madrid.';
    }
    if (/(envio|envío|peninsula|península|mandan|entrega|plazo)/u.test(t)) {
      return 'Envíos a toda la península. Para plazos según tu zona, llama o escribe al correo de contacto.';
    }
    if (/(contacto|telefono|teléfono|correo|email|mail|direccion|dirección|donde|dónde)/u.test(t)) {
      return '900 123 456 · hola@peonderey.example · Calle del Alfil, 12 · 28013 Madrid.';
    }
    if (/(hola|buenas|hey|gracias)/u.test(t)) {
      return '¡Hola! Dime si buscas precios, horario, envíos o datos de contacto.';
    }

    return 'Solo manejo temas sencillos: precios, horario, envíos y contacto. Reformula o mira las secciones de la página.';
  }
}
