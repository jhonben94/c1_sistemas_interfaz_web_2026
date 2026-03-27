import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';

export interface TreeOptionDto {
  id: string;
  label: string;
  nextNodeId: string;
}

export interface TreeNodeDto {
  nodeId: string;
  message: string;
  options: TreeOptionDto[];
  isLeaf: boolean;
  allowFreeText: boolean;
}

export interface TreeStepResponse extends TreeNodeDto {
  chosenLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatTreeService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Sin `nodeId` se asume el nodo raíz del árbol en el servidor. */
  getNode(nodeId?: string): Observable<TreeNodeDto> {
    const options = nodeId ? { params: new HttpParams().set('node', nodeId) } : {};
    return this.http.get<TreeNodeDto>(`${this.base}/api/chat/tree`, options);
  }

  step(fromNodeId: string, optionId: string): Observable<TreeStepResponse> {
    return this.http.post<TreeStepResponse>(`${this.base}/api/chat/tree/step`, {
      fromNodeId,
      optionId
    });
  }
}
