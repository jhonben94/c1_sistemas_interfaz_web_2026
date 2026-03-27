import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';

export interface ChatLlmRequest {
  message: string;
  branchPath: string[];
  leafNodeId: string;
}

export interface ChatLlmResponse {
  reply: string;
}

@Injectable({ providedIn: 'root' })
export class ChatLlmService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  chat(body: ChatLlmRequest): Observable<ChatLlmResponse> {
    return this.http.post<ChatLlmResponse>(`${this.base}/api/chat`, body);
  }
}
