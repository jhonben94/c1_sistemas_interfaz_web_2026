import { APP_BASE_HREF } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../environments/environment';
import {
  nodeView,
  type TreeDocument,
  type TreeNodeView
} from './chat-tree-static';

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

function toDto(v: TreeNodeView): TreeNodeDto {
  return {
    nodeId: v.nodeId,
    message: v.message,
    options: v.options,
    isLeaf: v.isLeaf,
    allowFreeText: v.allowFreeText
  };
}

@Injectable({ providedIn: 'root' })
export class ChatTreeService {
  private readonly http = inject(HttpClient);
  private readonly baseHref = inject(APP_BASE_HREF, { optional: true }) ?? '/';
  private readonly base = environment.apiUrl;

  private staticTree$?: Observable<TreeDocument>;

  /** Solo `githubPages`: árbol cacheado para el texto demo del chat. */
  getStaticTreeDocument(): Observable<TreeDocument> {
    return this.loadStaticTree();
  }

  private resolveTreeJsonUrl(): string {
    const base = this.baseHref || '/';
    if (base === '/') {
      return 'tree.json';
    }
    const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${trimmed}/tree.json`;
  }

  private loadStaticTree(): Observable<TreeDocument> {
    if (!this.staticTree$) {
      const url = this.resolveTreeJsonUrl();
      this.staticTree$ = this.http.get<TreeDocument>(url).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.staticTree$;
  }

  /** Sin `nodeId` se asume el nodo raíz del árbol en el servidor. */
  getNode(nodeId?: string): Observable<TreeNodeDto> {
    if (environment.githubPages) {
      return this.loadStaticTree().pipe(
        map((doc) => {
          const id = nodeId ?? doc.rootId;
          const view = nodeView(doc, id);
          if (!view) {
            throw new Error('Nodo no encontrado');
          }
          return toDto(view);
        })
      );
    }
    const options = nodeId ? { params: new HttpParams().set('node', nodeId) } : {};
    return this.http.get<TreeNodeDto>(`${this.base}/api/chat/tree`, options);
  }

  step(fromNodeId: string, optionId: string): Observable<TreeStepResponse> {
    if (environment.githubPages) {
      return this.loadStaticTree().pipe(
        map((doc) => {
          const fromNode = doc.nodes[fromNodeId];
          if (!fromNode?.options) {
            throw new Error('Nodo inválido');
          }
          const option = fromNode.options.find((o) => o.id === optionId);
          if (!option) {
            throw new Error('Opción no válida');
          }
          const view = nodeView(doc, option.nextNodeId);
          if (!view) {
            throw new Error('Siguiente nodo no encontrado');
          }
          return { ...toDto(view), chosenLabel: option.label };
        })
      );
    }
    return this.http.post<TreeStepResponse>(`${this.base}/api/chat/tree/step`, {
      fromNodeId,
      optionId
    });
  }
}
