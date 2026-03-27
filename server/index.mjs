import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TREE_PATH = path.join(__dirname, 'tree.json');

function loadTree() {
  const raw = fs.readFileSync(TREE_PATH, 'utf8');
  return JSON.parse(raw);
}

let treeData = loadTree();

function nodeView(nodeId) {
  const node = treeData.nodes[nodeId];
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

function validateBranchPath(branchPath, leafNodeId) {
  if (!Array.isArray(branchPath) || branchPath.length < 1) return false;
  if (branchPath[0] !== treeData.rootId) return false;
  if (branchPath[branchPath.length - 1] !== leafNodeId) return false;
  const { nodes } = treeData;
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

function buildBranchContext(branchPath) {
  const parts = [];
  const { nodes } = treeData;
  for (let i = 0; i < branchPath.length - 1; i++) {
    const fromNode = nodes[branchPath[i]];
    const toId = branchPath[i + 1];
    const opt = fromNode.options.find((o) => o.nextNodeId === toId);
    if (opt) parts.push(opt.label);
  }
  return parts.join(' → ');
}

/** RAG stub: fragmentos estáticos inyectables en el prompt (sustituir por búsqueda vectorial). */
const KNOWLEDGE_SNIPPETS = [
  'Política de devolución: 30 días si el producto no ha sido usado.',
  'Formas de pago: tarjeta, transferencia y presencial en tienda.'
].join('\n');

const SYSTEM_PROMPT = `Eres el asistente de la tienda "Peón de Rey" (ajedrez). Responde en español, breve y cordial.
No inventes precios concretos que no hayan aparecido en el contexto del menú o en el bloque de conocimiento.
Si no tienes datos suficientes, indica que pueden llamar al 900 123 456 o escribir a hola@peonderey.example.
Conocimiento de referencia (puede ser útil):
${KNOWLEDGE_SNIPPETS}`;

async function replyWithLlm(userMessage, branchContext) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    return `[Modo demo sin OPENAI_API_KEY] Recorrido en menú: ${branchContext}. Consulta: "${userMessage}". En producción aquí respondería el modelo con ese contexto.`;
  }

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `El usuario llegó aquí tras elegir en el menú: ${branchContext}\n\nSu mensaje libre: ${userMessage}`
      }
    ],
    max_tokens: 400,
    temperature: 0.4
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Respuesta vacía del modelo');
  return text;
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/chat/tree', (req, res) => {
  const nodeId = req.query.node || treeData.rootId;
  const view = nodeView(nodeId);
  if (!view) {
    res.status(404).json({ error: 'Nodo no encontrado' });
    return;
  }
  res.json(view);
});

app.post('/api/chat/tree/step', (req, res) => {
  const { fromNodeId, optionId } = req.body ?? {};
  if (!fromNodeId || !optionId) {
    res.status(400).json({ error: 'fromNodeId y optionId son obligatorios' });
    return;
  }
  const fromNode = treeData.nodes[fromNodeId];
  if (!fromNode?.options) {
    res.status(400).json({ error: 'Nodo inválido' });
    return;
  }
  const option = fromNode.options.find((o) => o.id === optionId);
  if (!option) {
    res.status(400).json({ error: 'Opción no válida' });
    return;
  }
  const view = nodeView(option.nextNodeId);
  if (!view) {
    res.status(404).json({ error: 'Siguiente nodo no encontrado' });
    return;
  }
  res.json({ ...view, chosenLabel: option.label });
});

app.post('/api/chat', async (req, res) => {
  const { message, branchPath, leafNodeId } = req.body ?? {};
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message es obligatorio' });
    return;
  }
  if (!leafNodeId || !Array.isArray(branchPath)) {
    res.status(400).json({ error: 'branchPath y leafNodeId son obligatorios' });
    return;
  }
  if (!validateBranchPath(branchPath, leafNodeId)) {
    res.status(403).json({ error: 'Ruta de menú no válida para texto libre' });
    return;
  }
  const trimmed = message.trim();
  if (!trimmed) {
    res.status(400).json({ error: 'Mensaje vacío' });
    return;
  }

  const branchContext = buildBranchContext(branchPath);

  try {
    const reply = await replyWithLlm(trimmed, branchContext);
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'No se pudo generar la respuesta', detail: String(e.message) });
  }
});

app.post('/api/admin/reload-tree', (req, res) => {
  const token = process.env.RELOAD_TREE_TOKEN;
  if (!token || req.headers['x-admin-token'] !== token) {
    res.status(404).end();
    return;
  }
  try {
    treeData = loadTree();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Chat API en http://localhost:${port}`);
});
