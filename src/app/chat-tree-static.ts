/** Modelo y reglas del árbol de menú (alineadas con `server/index.mjs` y `server/tree.json`). */

export interface TreeOptionRaw {
  id: string;
  label: string;
  nextNodeId: string;
}

export interface TreeNodeRaw {
  message: string;
  options?: TreeOptionRaw[];
  isLeaf?: boolean;
  allowFreeText?: boolean;
}

export interface TreeDocument {
  rootId: string;
  nodes: Record<string, TreeNodeRaw>;
}

export interface TreeNodeView {
  nodeId: string;
  message: string;
  options: TreeOptionRaw[];
  isLeaf: boolean;
  allowFreeText: boolean;
}

export function nodeView(doc: TreeDocument, nodeId: string): TreeNodeView | null {
  const node = doc.nodes[nodeId];
  if (!node) return null;
  const isLeaf = Boolean(node.isLeaf);
  const allowFreeText = node.allowFreeText !== false;
  return {
    nodeId,
    message: node.message,
    options: node.options ?? [],
    isLeaf,
    allowFreeText: isLeaf ? allowFreeText : false
  };
}

export function validateBranchPath(
  doc: TreeDocument,
  branchPath: string[],
  leafNodeId: string
): boolean {
  if (!Array.isArray(branchPath) || branchPath.length < 1) return false;
  if (branchPath[0] !== doc.rootId) return false;
  if (branchPath[branchPath.length - 1] !== leafNodeId) return false;
  const { nodes } = doc;
  for (let i = 0; i < branchPath.length - 1; i++) {
    const fromId = branchPath[i];
    const toId = branchPath[i + 1];
    const fromNode = nodes[fromId];
    if (!fromNode?.options?.length) return false;
    const ok = fromNode.options.some((o) => o.nextNodeId === toId);
    if (!ok) return false;
  }
  const leaf = nodes[leafNodeId];
  if (!leaf?.isLeaf) return false;
  if (leaf.allowFreeText === false) return false;
  return true;
}

export function buildBranchContext(doc: TreeDocument, branchPath: string[]): string {
  const parts: string[] = [];
  const { nodes } = doc;
  for (let i = 0; i < branchPath.length - 1; i++) {
    const fromNode = nodes[branchPath[i]];
    const toId = branchPath[i + 1];
    const opt = fromNode.options?.find((o) => o.nextNodeId === toId);
    if (opt) parts.push(opt.label);
  }
  return parts.join(' → ');
}
