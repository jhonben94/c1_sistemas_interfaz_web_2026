import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, take } from 'rxjs';

import { environment } from '../environments/environment';
import { ChatTreeService } from './chat-tree.service';
import { buildBranchContext, validateBranchPath, type TreeDocument } from './chat-tree-static';

export interface ChatLlmRequest {
  message: string;
  branchPath: string[];
  leafNodeId: string;
}

export interface ChatLlmResponse {
  reply: string;
}

function staticDemoReply(doc: TreeDocument, body: ChatLlmRequest): ChatLlmResponse {
  if (!validateBranchPath(doc, body.branchPath, body.leafNodeId)) {
    throw new Error('Ruta de menú no válida para texto libre');
  }
  const branchContext = buildBranchContext(doc, body.branchPath);
  return {
    reply: `[Modo estático en GitHub Pages] Recorrido en menú: ${branchContext}. Consulta: «${body.message}». Con un backend (p. ej. Docker) y OPENAI_API_KEY el modelo respondería aquí; también puedes poner en environment.github.ts una apiUrl absoluta hacia tu API con CORS.`
  };
}

@Injectable({ providedIn: 'root' })
export class ChatLlmService {
  private readonly http = inject(HttpClient);
  private readonly chatTree = inject(ChatTreeService);

  chat(body: ChatLlmRequest): Observable<ChatLlmResponse> {
    const raw = environment.apiUrl?.trim() ?? '';
    if (environment.githubPages && !raw) {
      return this.chatTree.getStaticTreeDocument().pipe(
        take(1),
        map((doc) => staticDemoReply(doc, body)),
        delay(400)
      );
    }
    const base = raw.replace(/\/$/, '');
    const url = base ? `${base}/api/chat` : '/api/chat';
    return this.http.post<ChatLlmResponse>(url, body);
  }
}
