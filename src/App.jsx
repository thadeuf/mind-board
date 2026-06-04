import { useEffect, useMemo, useRef, useState } from "react";
import {
  Focus,
  Palette,
  Image as ImageIcon,
  ImageOff,
  Link as LinkIcon,
  Unlink,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Workflow,
  X,
} from "lucide-react";

const STORAGE_KEY = "mind-board-react";
const NODE_COLORS = [
  "#4d7cff",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#facc15",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#111827",
  "#4b5563",
];
const EMPTY_ASSET_MODAL = {
  type: null,
  nodeId: null,
  url: "",
};
const TEMPLATE_OPTIONS = [
  {
    id: "blank",
    name: "Em branco",
    eyebrow: "Começo livre",
    description: "Abre um canvas limpo com apenas o card principal.",
    accent: "#111827",
  },
  {
    id: "study",
    name: "Plano de estudos",
    eyebrow: "Aprendizado",
    description: "Organiza tema, metas, cronograma, materiais e revisão.",
    accent: "#2563eb",
    mapTitle: "Plano de estudos",
    markdown: `# Plano de estudos
## Tema principal
- O que preciso aprender
- Objetivo final

## Metas
- Curto prazo
- Médio prazo
- Longo prazo

## Materiais
- Livros
- Cursos
- Links úteis

## Cronograma
- Rotina semanal
- Datas importantes

## Revisão
- Dúvidas
- Resumos
- Próximos passos`,
  },
  {
    id: "project",
    name: "Planejamento de projeto",
    eyebrow: "Execução",
    description: "Estrutura escopo, entregas, responsáveis, riscos e próximos passos.",
    accent: "#16a34a",
    mapTitle: "Planejamento de projeto",
    markdown: `# Planejamento de projeto
## Visão geral
- Objetivo
- Resultado esperado

## Escopo
- O que entra
- O que fica de fora

## Entregas
- Marco 1
- Marco 2
- Marco 3

## Equipe
- Responsáveis
- Dependências

## Riscos
- Bloqueios
- Mitigações

## Próximos passos
- Ações imediatas
- Decisões pendentes`,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    eyebrow: "Ideação",
    description: "Perfeito para explorar ideias, agrupamentos e oportunidades.",
    accent: "#7c3aed",
    mapTitle: "Brainstorm",
    markdown: `# Brainstorm
## Ideias centrais
- Possibilidade 1
- Possibilidade 2

## Oportunidades
- O que pode crescer
- O que pode melhorar

## Perguntas
- O que ainda não sabemos
- O que precisamos validar

## Experimentos
- Teste rápido
- Protótipo

## Decisões
- O que priorizar
- O que descartar`,
  },
  {
    id: "book",
    name: "Resumo de livro",
    eyebrow: "Leitura",
    description: "Cria uma espinha pronta para registrar ideias e aplicações.",
    accent: "#ea580c",
    mapTitle: "Resumo de livro",
    markdown: `# Resumo de livro
## Livro
- Título
- Autor

## Ideia central
- Tese principal
- Mensagem mais forte

## Capítulos
- Ponto 1
- Ponto 2
- Ponto 3

## Citações
- Trecho marcante
- Referência

## Insights
- O que aprendi
- O que mudou

## Aplicações
- Como usar na prática
- Próximos testes`,
  },
  {
    id: "content",
    name: "Plano de conteúdo",
    eyebrow: "Criação",
    description: "Ajuda a organizar pauta, formatos, distribuição e CTA.",
    accent: "#db2777",
    mapTitle: "Plano de conteúdo",
    markdown: `# Plano de conteúdo
## Tema central
- Mensagem principal
- Público

## Pautas
- Conteúdo 1
- Conteúdo 2
- Conteúdo 3

## Formatos
- Vídeo
- Carrossel
- Texto

## Distribuição
- Canal principal
- Canal secundário

## CTA
- Ação desejada
- Conversão esperada

## Métricas
- Alcance
- Engajamento
- Conversão`,
  },
];
const DEFAULT_FREE_EDGE_COLOR = "#475569";
const DEFAULT_FREE_EDGE_STYLE = "dashed";
const DEFAULT_FREE_EDGE_THICKNESS = 2.5;
const FREE_EDGE_STYLE_OPTIONS = [
  { id: "dashed", label: "Tracejada" },
  { id: "dotted", label: "Pontilhada" },
  { id: "solid", label: "Continua" },
];
const FREE_EDGE_ANCHOR_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "top", label: "Topo" },
  { id: "bottom", label: "Baixo" },
  { id: "left", label: "Esquerda" },
  { id: "right", label: "Direita" },
];
const FREE_EDGE_THICKNESS_OPTIONS = [2, 3, 4, 5];
const HISTORY_LIMIT = 100;

function normalizeFreeEdges(freeEdges) {
  if (!Array.isArray(freeEdges)) return [];
  return freeEdges
    .filter((edge) => edge?.fromId && edge?.toId)
    .map((edge) => ({
      id: edge.id || `${[edge.fromId, edge.toId].sort().join(":")}`,
      fromId: edge.fromId,
      toId: edge.toId,
      color: edge.color || DEFAULT_FREE_EDGE_COLOR,
      label: edge.label || "",
      style: edge.style || DEFAULT_FREE_EDGE_STYLE,
      thickness: edge.thickness || DEFAULT_FREE_EDGE_THICKNESS,
      arrow: Boolean(edge.arrow),
      fromAnchor: edge.fromAnchor || "auto",
      toAnchor: edge.toAnchor || "auto",
      bendX: Number.isFinite(edge.bendX) ? edge.bendX : null,
      bendY: Number.isFinite(edge.bendY) ? edge.bendY : null,
    }));
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function createInitialMap() {
  const rootId = makeId();

  return {
    title: "Novo mapa mental",
    rootId,
    freeEdges: [],
    nodes: {
      [rootId]: {
        id: rootId,
        parentId: null,
        children: [],
        title: "Meu novo mapa mental",
        note: "",
        color: "#111827",
        x: 0,
        y: 0,
        collapsed: false,
      },
    },
  };
}

function applyTemplateColors(map, accent) {
  const root = map.nodes[map.rootId];
  if (!root) return map;

  root.color = accent || "#111827";
  root.note = "";

  root.children.forEach((childId, index) => {
    const branchColor = NODE_COLORS[index % NODE_COLORS.length];

    const paintBranch = (nodeId) => {
      const node = map.nodes[nodeId];
      if (!node) return;
      node.color = branchColor;
      node.children.forEach(paintBranch);
    };

    paintBranch(childId);
  });

  return map;
}

function createTemplateMap(templateId) {
  const template = TEMPLATE_OPTIONS.find((item) => item.id === templateId);
  if (!template || template.id === "blank") return createInitialMap();

  const nextMap = parseMarkdownToMap(template.markdown);
  nextMap.title = template.mapTitle || template.name;
  nextMap.nodes[nextMap.rootId].title = template.mapTitle || template.name;
  return applyTemplateColors(nextMap, template.accent);
}

function layoutMap(current) {
  const nodes = structuredClone(current.nodes);
  const spanCache = new Map();
  const leafSpan = 96;

  const getSubtreeSpan = (nodeId, depth = 0) => {
    const cacheKey = `${nodeId}:${depth}`;
    if (spanCache.has(cacheKey)) return spanCache.get(cacheKey);

    const node = nodes[nodeId];
    if (!node) return leafSpan;

    const nodeHeight = getNodeHeight(node, current.rootId) + 18;
    if (node.children.length === 0) {
      const span = Math.max(nodeHeight, leafSpan - Math.min(depth * 4, 18));
      spanCache.set(cacheKey, span);
      return span;
    }

    const verticalGap = Math.max(40 - depth * 2, 26);
    const childrenSpan =
      node.children.reduce((total, childId) => total + getSubtreeSpan(childId, depth + 1), 0) +
      verticalGap * Math.max(node.children.length - 1, 0);
    const span = Math.max(nodeHeight, childrenSpan);
    spanCache.set(cacheKey, span);
    return span;
  };

  const layoutBranch = (parentId, direction, depth = 0) => {
    const parent = nodes[parentId];
    if (!parent || parent.children.length === 0) return;

    const horizontalGap = depth === 0 ? 320 : Math.max(250 - depth * 14, 180);
    const verticalGap = Math.max(40 - depth * 2, 26);
    const spans = parent.children.map((childId) => getSubtreeSpan(childId, depth + 1));
    const totalSpan = spans.reduce((sum, span) => sum + span, 0) + verticalGap * Math.max(spans.length - 1, 0);
    let cursorY = parent.y + getNodeHeight(parent, current.rootId) / 2 - totalSpan / 2;

    parent.children.forEach((childId, index) => {
      const child = nodes[childId];
      if (!child) return;

      const childSpan = spans[index];
      const childHeight = getNodeHeight(child, current.rootId);
      const childCenterY = cursorY + childSpan / 2;

      child.x = parent.x + direction * horizontalGap;
      child.y = childCenterY - childHeight / 2;

      layoutBranch(childId, direction, depth + 1);
      cursorY += childSpan + verticalGap;
    });
  };

  const root = nodes[current.rootId];
  root.x = 0;
  root.y = 0;
  const sortedChildren = [...root.children].sort((a, b) => {
    const spanDiff = getSubtreeSpan(b, 1) - getSubtreeSpan(a, 1);
    if (spanDiff !== 0) return spanDiff;
    return (nodes[a]?.y || 0) - (nodes[b]?.y || 0);
  });

  const leftIds = [];
  const rightIds = [];
  let leftSpan = 0;
  let rightSpan = 0;

  sortedChildren.forEach((childId) => {
    const span = getSubtreeSpan(childId, 1);
    if (leftSpan <= rightSpan) {
      leftIds.push(childId);
      leftSpan += span;
    } else {
      rightIds.push(childId);
      rightSpan += span;
    }
  });

  root.children = [...leftIds, ...rightIds];

  const placeRootSide = (childIds, direction) => {
    if (childIds.length === 0) return;
    const verticalGap = 48;
    const totalSpan =
      childIds.reduce((sum, childId) => sum + getSubtreeSpan(childId, 1), 0) +
      verticalGap * Math.max(childIds.length - 1, 0);
    let cursorY = root.y + getNodeHeight(root, current.rootId) / 2 - totalSpan / 2;

    childIds.forEach((childId) => {
      const child = nodes[childId];
      if (!child) return;

      const childSpan = getSubtreeSpan(childId, 1);
      const childHeight = getNodeHeight(child, current.rootId);
      const childCenterY = cursorY + childSpan / 2;

      child.x = root.x + direction * 320;
      child.y = childCenterY - childHeight / 2;
      layoutBranch(childId, direction, 1);
      cursorY += childSpan + verticalGap;
    });
  };

  placeRootSide(leftIds, -1);
  placeRootSide(rightIds, 1);

  return {
    ...current,
    nodes,
  };
}

function loadMap() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialMap();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.rootId || !parsed?.nodes) return createInitialMap();
    return {
      ...parsed,
      freeEdges: normalizeFreeEdges(parsed.freeEdges),
    };
  } catch {
    return createInitialMap();
  }
}

function parseMarkdownToMap(markdown) {
  const lines = markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\t/g, "  "));

  const rootId = makeId();
  const map = {
    title: "Mapa importado",
    rootId,
    freeEdges: [],
    nodes: {
      [rootId]: {
        id: rootId,
        parentId: null,
        children: [],
        title: "Mapa importado",
        note: "",
        color: "#111827",
        x: 0,
        y: 0,
        collapsed: false,
      },
    },
  };

  const headingStack = [{ level: 0, id: rootId }];
  const listStack = [];
  let lastNodeId = rootId;

  const addNode = (parentId, title, note = "") => {
    const id = makeId();
    const parent = map.nodes[parentId];
    const index = parent.children.length;
    const direction = parentId === rootId ? (index % 2 === 0 ? 1 : -1) : 1;
    const baseX = parent.x + (parentId === rootId ? 280 * direction : 220 * direction);
    const baseY = parent.y + index * 96 - ((Math.max(parent.children.length - 1, 0)) * 40);

    map.nodes[id] = {
      id,
      parentId,
      children: [],
      title: title.trim() || "Novo tópico",
      note: note.trim(),
      color: parent.color,
      x: baseX,
      y: baseY,
      collapsed: false,
    };
    parent.children.push(id);
    lastNodeId = id;
    return id;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();

      if (level === 1) {
        map.title = text;
        map.nodes[rootId].title = text;
        continue;
      }

      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }

      const parentId = headingStack[headingStack.length - 1]?.id ?? rootId;
      const id = addNode(parentId, text);
      headingStack.push({ level, id });
      listStack.length = 0;
      continue;
    }

    const listMatch = rawLine.match(/^(\s*)[-*+]\s+(.*)$/);
    if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2);
      const text = listMatch[2].trim();

      while (listStack.length > indent) {
        listStack.pop();
      }

      const parentId =
        listStack[listStack.length - 1]?.id ??
        headingStack[headingStack.length - 1]?.id ??
        rootId;
      const id = addNode(parentId, text);
      listStack[indent] = { id };
      continue;
    }

    if (lastNodeId && map.nodes[lastNodeId]) {
      const currentNote = map.nodes[lastNodeId].note;
      map.nodes[lastNodeId].note = currentNote ? `${currentNote}\n${line.trim()}` : line.trim();
    }
  }

  return map;
}

function loadImageElement(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const paragraphs = String(text || "").split("\n");
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      return;
    }

    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${current} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  });

  return lines;
}

function getNodeWidth(node, rootId) {
  return node.id === rootId ? 220 : 190;
}

function getNodeHeight(node, rootId) {
  let height = node.id === rootId ? 96 : 60;
  if (node.note) height += 26;
  if (node.imageUrl) height += 150;
  if (node.linkUrl) height += 32;
  return height;
}

function getEdgeAnchors(parent, child, rootId) {
  const parentWidth = getNodeWidth(parent, rootId);
  const parentHeight = getNodeHeight(parent, rootId);
  const childWidth = getNodeWidth(child, rootId);
  const childHeight = getNodeHeight(child, rootId);

  const parentCenterX = parent.x + parentWidth / 2;
  const parentCenterY = parent.y + parentHeight / 2;
  const childCenterX = child.x + childWidth / 2;
  const childCenterY = child.y + childHeight / 2;
  const horizontalDirection = childCenterX >= parentCenterX ? 1 : -1;

  return {
    startX: horizontalDirection === 1 ? parent.x + parentWidth : parent.x,
    startY: parentCenterY,
    endX: horizontalDirection === 1 ? child.x : child.x + childWidth,
    endY: childCenterY,
  };
}

function getNodeBounds(node, rootId) {
  const width = getNodeWidth(node, rootId);
  const height = getNodeHeight(node, rootId);
  return {
    minX: node.x,
    minY: node.y,
    maxX: node.x + width,
    maxY: node.y + height,
  };
}

function getVisibleMapBounds(nodes, rootId) {
  return nodes.reduce(
    (acc, node) => {
      const nodeBounds = getNodeBounds(node, rootId);
      return {
        minX: Math.min(acc.minX, nodeBounds.minX),
        minY: Math.min(acc.minY, nodeBounds.minY),
        maxX: Math.max(acc.maxX, nodeBounds.maxX),
        maxY: Math.max(acc.maxY, nodeBounds.maxY),
      };
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  );
}

function makeFreeEdge(fromId, toId) {
  const [a, b] = [fromId, toId].sort();
  return {
    id: `${a}:${b}`,
    fromId: a,
    toId: b,
    color: DEFAULT_FREE_EDGE_COLOR,
    label: "",
    style: DEFAULT_FREE_EDGE_STYLE,
    thickness: DEFAULT_FREE_EDGE_THICKNESS,
    arrow: false,
    fromAnchor: "auto",
    toAnchor: "auto",
    bendX: null,
    bendY: null,
  };
}

function getFreeEdgeDasharray(style) {
  if (style === "dotted") return "2 8";
  if (style === "solid") return "";
  return "10 8";
}

function getConnectionCurve(startX, startY, endX, endY, type = "tree") {
  const curve =
    type === "free"
      ? Math.max(Math.abs(endX - startX) * 0.28 + Math.abs(endY - startY) * 0.12, 44)
      : Math.max(Math.abs(endX - startX) * 0.36, 52);

  return {
    curve,
    c1x: startX + curve,
    c1y: startY,
    c2x: endX - curve,
    c2y: endY,
  };
}

function getArrowHeadPoints(x, y, angle, size) {
  const wing = size * 0.66;
  const backX = x - Math.cos(angle) * size;
  const backY = y - Math.sin(angle) * size;
  const leftX = backX + Math.cos(angle + Math.PI / 2) * wing;
  const leftY = backY + Math.sin(angle + Math.PI / 2) * wing;
  const rightX = backX + Math.cos(angle - Math.PI / 2) * wing;
  const rightY = backY + Math.sin(angle - Math.PI / 2) * wing;

  return `${x},${y} ${leftX},${leftY} ${rightX},${rightY}`;
}

function drawArrowHead(ctx, x, y, angle, size, color) {
  const wing = size * 0.66;
  const backX = x - Math.cos(angle) * size;
  const backY = y - Math.sin(angle) * size;
  const leftX = backX + Math.cos(angle + Math.PI / 2) * wing;
  const leftY = backY + Math.sin(angle + Math.PI / 2) * wing;
  const rightX = backX + Math.cos(angle - Math.PI / 2) * wing;
  const rightY = backY + Math.sin(angle - Math.PI / 2) * wing;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function getBezierEndAngle(c2x, c2y, endX, endY) {
  return Math.atan2(endY - c2y, endX - c2x);
}

function getOrthogonalRoutePoints(startX, startY, endX, endY, bendX, bendY) {
  return [
    { x: startX, y: startY },
    { x: bendX, y: startY },
    { x: bendX, y: bendY },
    { x: endX, y: bendY },
    { x: endX, y: endY },
  ].filter((point, index, points) => {
    if (index === 0) return true;
    const previous = points[index - 1];
    return previous.x !== point.x || previous.y !== point.y;
  });
}

function getPolylineAngle(points) {
  if (points.length < 2) return 0;
  const end = points[points.length - 1];
  for (let index = points.length - 2; index >= 0; index -= 1) {
    const point = points[index];
    if (point.x !== end.x || point.y !== end.y) {
      return Math.atan2(end.y - point.y, end.x - point.x);
    }
  }
  return 0;
}

function getFreeEdgeGeometry(edge, fromNode, toNode, rootId) {
  const { startX, startY, endX, endY } = getFreeEdgeAnchors(fromNode, toNode, rootId, edge);
  const bendX = Number.isFinite(edge?.bendX) ? edge.bendX : (startX + endX) / 2;
  const bendY = Number.isFinite(edge?.bendY) ? edge.bendY : (startY + endY) / 2;
  const points = getOrthogonalRoutePoints(startX, startY, endX, endY, bendX, bendY);
  const pathD = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const labelPoint = points[Math.max(1, Math.floor((points.length - 1) / 2))] || { x: bendX, y: bendY };

  return {
    startX,
    startY,
    endX,
    endY,
    bendX,
    bendY,
    points,
    pathD,
    arrowAngle: getPolylineAngle(points),
    labelX: labelPoint.x,
    labelY: labelPoint.y - 14,
    handleX: bendX,
    handleY: bendY,
  };
}

function getNodeCenter(node, rootId) {
  return {
    x: node.x + getNodeWidth(node, rootId) / 2,
    y: node.y + getNodeHeight(node, rootId) / 2,
  };
}

function getAnchoredPoint(node, rootId, anchor, fallbackTarget) {
  const width = getNodeWidth(node, rootId);
  const height = getNodeHeight(node, rootId);
  const center = getNodeCenter(node, rootId);

  if (anchor === "top") return { x: center.x, y: node.y };
  if (anchor === "bottom") return { x: center.x, y: node.y + height };
  if (anchor === "left") return { x: node.x, y: center.y };
  if (anchor === "right") return { x: node.x + width, y: center.y };

  if (fallbackTarget) {
    const deltaX = fallbackTarget.x - center.x;
    const deltaY = fallbackTarget.y - center.y;
    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      return {
        x: deltaX >= 0 ? node.x + width : node.x,
        y: center.y,
      };
    }
    return {
      x: center.x,
      y: deltaY >= 0 ? node.y + height : node.y,
    };
  }

  return center;
}

function getFreeEdgeAnchors(fromNode, toNode, rootId, edge = null) {
  const fromWidth = getNodeWidth(fromNode, rootId);
  const fromHeight = getNodeHeight(fromNode, rootId);
  const toWidth = getNodeWidth(toNode, rootId);
  const toHeight = getNodeHeight(toNode, rootId);
  const fromCenter = getNodeCenter(fromNode, rootId);
  const toCenter = getNodeCenter(toNode, rootId);

  const fromAnchor = edge?.fromAnchor || "auto";
  const toAnchor = edge?.toAnchor || "auto";

  if (fromAnchor !== "auto" || toAnchor !== "auto") {
    const fromPoint = getAnchoredPoint(fromNode, rootId, fromAnchor, toCenter);
    const toPoint = getAnchoredPoint(toNode, rootId, toAnchor, fromCenter);
    return {
      startX: fromPoint.x,
      startY: fromPoint.y,
      endX: toPoint.x,
      endY: toPoint.y,
    };
  }

  const deltaX = toCenter.x - fromCenter.x;
  const deltaY = toCenter.y - fromCenter.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      startX: deltaX >= 0 ? fromNode.x + fromWidth : fromNode.x,
      startY: fromCenter.y,
      endX: deltaX >= 0 ? toNode.x : toNode.x + toWidth,
      endY: toCenter.y,
    };
  }

  return {
    startX: fromCenter.x,
    startY: deltaY >= 0 ? fromNode.y + fromHeight : fromNode.y,
    endX: toCenter.x,
    endY: deltaY >= 0 ? toNode.y : toNode.y + toHeight,
  };
}

function trimCanvasWhitespace(sourceCanvas, padding = 24) {
  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext) return sourceCanvas;

  const { width, height } = sourceCanvas;
  const imageData = sourceContext.getImageData(0, 0, width, height).data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = imageData[index + 3];
      const red = imageData[index];
      const green = imageData[index + 1];
      const blue = imageData[index + 2];
      const isWhitePixel = red > 248 && green > 248 && blue > 248;

      if (alpha > 0 && !isWhitePixel) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX === -1 || maxY === -1) return sourceCanvas;

  const cropMinX = Math.max(0, minX - padding);
  const cropMinY = Math.max(0, minY - padding);
  const cropMaxX = Math.min(width, maxX + padding + 1);
  const cropMaxY = Math.min(height, maxY + padding + 1);
  const cropWidth = Math.max(1, cropMaxX - cropMinX);
  const cropHeight = Math.max(1, cropMaxY - cropMinY);

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = cropWidth;
  trimmedCanvas.height = cropHeight;

  const trimmedContext = trimmedCanvas.getContext("2d");
  if (!trimmedContext) return sourceCanvas;

  trimmedContext.fillStyle = "#ffffff";
  trimmedContext.fillRect(0, 0, cropWidth, cropHeight);
  trimmedContext.drawImage(
    sourceCanvas,
    cropMinX,
    cropMinY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return trimmedCanvas;
}

function getMeasureContext() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function App() {
  const [history, setHistory] = useState(() => {
    const initialMap = loadMap();
    return {
      past: [],
      present: initialMap,
      future: [],
      group: null,
    };
  });
  const map = history.present;
  const [selectedId, setSelectedId] = useState(() => loadMap().rootId);
  const [selectedIds, setSelectedIds] = useState(() => [loadMap().rootId]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [status, setStatus] = useState("Pronto");
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [activeContextPanel, setActiveContextPanel] = useState(null);
  const [assetModal, setAssetModal] = useState(EMPTY_ASSET_MODAL);
  const [pendingConnectionFromId, setPendingConnectionFromId] = useState(null);
  const [selectedFreeEdgeId, setSelectedFreeEdgeId] = useState(null);
  const [freeEdgeLabelDraft, setFreeEdgeLabelDraft] = useState("");
  const [isFreeEdgeLabelModalOpen, setIsFreeEdgeLabelModalOpen] = useState(false);
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const freeEdgeDragRef = useRef(null);
  const fileInputRef = useRef(null);
  const markdownInputRef = useRef(null);
  const assetFileInputRef = useRef(null);
  const measureContextRef = useRef(getMeasureContext());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, [map]);

  useEffect(() => {
    if (selectedId && !map.nodes[selectedId]) {
      setSelectedId(map.rootId);
    }
  }, [map, selectedId]);

  useEffect(() => {
    setSelectedIds((current) => {
      const filtered = current.filter((id) => map.nodes[id]);
      if (filtered.length > 0) return filtered;
      return map.rootId ? [map.rootId] : [];
    });
  }, [map]);

  useEffect(() => {
    if (selectedFreeEdgeId && !(map.freeEdges || []).some((edge) => edge.id === selectedFreeEdgeId)) {
      setSelectedFreeEdgeId(null);
    }
  }, [map, selectedFreeEdgeId]);

  useEffect(() => {
    centerOnNode(map.rootId);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const editingTag = document.activeElement?.tagName;
      const isEditing = ["INPUT", "TEXTAREA"].includes(editingTag);

      if (event.code === "Space" && !isEditing) {
        event.preventDefault();
        setIsSpacePressed(true);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoMap();
        } else {
          undoMap();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoMap();
        return;
      }

      if (isEditing) return;
      if (!selectedId) return;

      if (event.key === "Tab" && selectedIds.length === 1) {
        event.preventDefault();
        addChild(selectedId);
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeNodes(selectedIds);
      }
    };

    const onKeyUp = (event) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }

      if (event.key === "Escape") {
        setContextMenu(null);
        setActiveContextPanel(null);
        setAssetModal(EMPTY_ASSET_MODAL);
        setIsTemplateModalOpen(false);
        setPendingConnectionFromId(null);
        setSelectedFreeEdgeId(null);
        setIsFreeEdgeLabelModalOpen(false);
      }
    };

    const onWindowPointerDown = () => {
      setContextMenu(null);
      setActiveContextPanel(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", onWindowPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", onWindowPointerDown);
    };
  }, [selectedId, selectedIds, map]);

  const visibleNodes = useMemo(() => {
    const output = [];

    const visit = (id) => {
      const node = map.nodes[id];
      if (!node) return;
      output.push(node);
      if (node.collapsed) return;
      node.children.forEach(visit);
    };

    visit(map.rootId);
    return output;
  }, [map]);

  const selectedNode = selectedId ? map.nodes[selectedId] : null;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleFreeEdges = useMemo(
    () =>
      (map.freeEdges || []).filter(
        (edge) => visibleNodeIds.has(edge.fromId) && visibleNodeIds.has(edge.toId)
      ),
    [map.freeEdges, visibleNodeIds]
  );
  const selectedFreeEdge = selectedFreeEdgeId
    ? (map.freeEdges || []).find((edge) => edge.id === selectedFreeEdgeId) || null
    : null;
  const selectedFreeEdgeOverlay = useMemo(() => {
    if (!selectedFreeEdge) return null;
    const fromNode = map.nodes[selectedFreeEdge.fromId];
    const toNode = map.nodes[selectedFreeEdge.toId];
    if (!fromNode || !toNode) return null;
    const geometry = getFreeEdgeGeometry(selectedFreeEdge, fromNode, toNode, map.rootId);
    return {
      left: geometry.labelX * viewport.scale + viewport.x,
      top: geometry.labelY * viewport.scale + viewport.y,
      handleLeft: geometry.handleX * viewport.scale + viewport.x,
      handleTop: geometry.handleY * viewport.scale + viewport.y,
    };
  }, [selectedFreeEdge, map.nodes, map.rootId, viewport]);
  const selectedNodeMetrics = selectedNode && selectedIds.length === 1
    ? {
        width: getNodeWidth(selectedNode, map.rootId),
        height: getNodeHeight(selectedNode, map.rootId),
      }
    : null;
  const selectedNodeOverlay = selectedNode && selectedNodeMetrics && selectedIds.length === 1
    ? {
        left: selectedNode.x * viewport.scale + viewport.x,
        top: selectedNode.y * viewport.scale + viewport.y,
        width: selectedNodeMetrics.width * viewport.scale,
        height: selectedNodeMetrics.height * viewport.scale,
      }
    : null;
  const multiSelectedNodes = useMemo(
    () => visibleNodes.filter((node) => selectedIdSet.has(node.id)),
    [visibleNodes, selectedIdSet]
  );
  const multiSelectionOverlay = useMemo(() => {
    if (multiSelectedNodes.length <= 1) return null;
    const bounds = multiSelectedNodes.reduce(
      (acc, node) => {
        const nodeBounds = getNodeBounds(node, map.rootId);
        return {
          minX: Math.min(acc.minX, nodeBounds.minX),
          minY: Math.min(acc.minY, nodeBounds.minY),
          maxX: Math.max(acc.maxX, nodeBounds.maxX),
          maxY: Math.max(acc.maxY, nodeBounds.maxY),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    return {
      left: bounds.minX * viewport.scale + viewport.x,
      top: bounds.minY * viewport.scale + viewport.y,
      width: (bounds.maxX - bounds.minX) * viewport.scale,
      height: (bounds.maxY - bounds.minY) * viewport.scale,
    };
  }, [multiSelectedNodes, map.rootId, viewport]);

  const transformStyle = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  function getFloatingPosition(anchorX, anchorY, width, height, options = {}) {
    const frame = frameRef.current;
    const margin = options.margin ?? 16;
    const preferredTop = anchorY + (options.offsetY ?? 0);
    const preferredLeft = anchorX + (options.offsetX ?? 0);
    const rect = frame?.getBoundingClientRect();

    if (!rect) {
      return {
        left: preferredLeft,
        top: preferredTop,
      };
    }

    const left = Math.min(
      Math.max(preferredLeft, margin + width / 2),
      rect.width - margin - width / 2
    );

    let top = preferredTop;
    if (options.preferAbove && top + height > rect.height - margin) {
      top = anchorY - (options.aboveOffset ?? height + 12);
    }
    top = Math.min(Math.max(top, margin), rect.height - margin - height);

    return { left, top };
  }

  const freeEdgeToolbarPosition = useMemo(() => {
    if (!selectedFreeEdgeOverlay) return null;
    return getFloatingPosition(selectedFreeEdgeOverlay.left, selectedFreeEdgeOverlay.top, 200, 46, {
      offsetY: -48,
      preferAbove: true,
      aboveOffset: 48,
    });
  }, [selectedFreeEdgeOverlay, viewport, selectedFreeEdgeId]);

  const freeEdgeColorPopoverPosition = useMemo(() => {
    if (!selectedFreeEdgeOverlay) return null;
    return getFloatingPosition(selectedFreeEdgeOverlay.left, selectedFreeEdgeOverlay.top, 196, 84, {
      offsetY: 2,
      preferAbove: true,
      aboveOffset: 96,
    });
  }, [selectedFreeEdgeOverlay, viewport, selectedFreeEdgeId]);

  const freeEdgeStylePopoverPosition = useMemo(() => {
    if (!selectedFreeEdgeOverlay) return null;
    return getFloatingPosition(selectedFreeEdgeOverlay.left, selectedFreeEdgeOverlay.top, 292, 360, {
      offsetY: 2,
      preferAbove: true,
      aboveOffset: 372,
    });
  }, [selectedFreeEdgeOverlay, viewport, selectedFreeEdgeId]);

  const nodeColorPopoverPosition = useMemo(() => {
    if (!selectedNodeOverlay) return null;
    return getFloatingPosition(
      selectedNodeOverlay.left + selectedNodeOverlay.width / 2,
      selectedNodeOverlay.top,
      196,
      84,
      {
        offsetY: -6,
        preferAbove: true,
        aboveOffset: 96,
      }
    );
  }, [selectedNodeOverlay, viewport, selectedId]);
  const multiSelectionToolbarPosition = useMemo(() => {
    if (!multiSelectionOverlay) return null;
    return getFloatingPosition(
      multiSelectionOverlay.left + multiSelectionOverlay.width / 2,
      multiSelectionOverlay.top,
      220,
      46,
      {
        offsetY: -56,
        preferAbove: true,
        aboveOffset: 56,
      }
    );
  }, [multiSelectionOverlay, viewport, selectedIds]);
  const multiSelectionColorPopoverPosition = useMemo(() => {
    if (!multiSelectionOverlay) return null;
    return getFloatingPosition(
      multiSelectionOverlay.left + multiSelectionOverlay.width / 2,
      multiSelectionOverlay.top,
      196,
      84,
      {
        offsetY: -6,
        preferAbove: true,
        aboveOffset: 96,
      }
    );
  }, [multiSelectionOverlay, viewport, selectedIds]);

  function clearHistoryGroup() {
    setHistory((current) => (current.group ? { ...current, group: null } : current));
  }

  function selectOnly(nodeId) {
    setSelectedId(nodeId);
    setSelectedIds(nodeId ? [nodeId] : []);
  }

  function isModifierSelection(event) {
    return event.shiftKey || event.metaKey || event.ctrlKey;
  }

  function getTopLevelSelection(ids, nodes) {
    const set = new Set(ids);
    return ids.filter((id) => {
      let cursor = nodes[id]?.parentId;
      while (cursor) {
        if (set.has(cursor)) return false;
        cursor = nodes[cursor]?.parentId;
      }
      return true;
    });
  }

  function setNodesColor(ids, color) {
    updateMap((current) => {
      const nextNodes = { ...current.nodes };
      ids.forEach((id) => {
        const node = nextNodes[id];
        if (!node) return;
        nextNodes[id] = { ...node, color };
      });
      return { ...current, nodes: nextNodes };
    }, "Nós atualizados");
  }

  function updateMap(updater, nextStatus, options = {}) {
    const { group = null, skipHistory = false } = options;

    setHistory((current) => {
      const next = updater(current.present);
      if (next === current.present) return current;

      if (skipHistory) {
        return {
          ...current,
          present: next,
          group: null,
        };
      }

      if (group && current.group === group) {
        return {
          ...current,
          present: next,
          future: [],
        };
      }

      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
        group: group ?? null,
      };
    });
    if (nextStatus) setStatus(nextStatus);
  }

  function undoMap() {
    setHistory((current) => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
        group: null,
      };
    });
    setStatus("Desfeito");
    setPendingConnectionFromId(null);
    setActiveContextPanel(null);
  }

  function redoMap() {
    setHistory((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: current.future.slice(1),
        group: null,
      };
    });
    setStatus("Refeito");
    setPendingConnectionFromId(null);
    setActiveContextPanel(null);
  }

  function setNodeField(id, field, value, options) {
    updateMap((current) => {
      const node = current.nodes[id];
      if (!node) return current;

      const next = {
        ...current,
        title: id === current.rootId && field === "title" ? value || "Novo mapa mental" : current.title,
        nodes: {
          ...current.nodes,
          [id]: {
            ...node,
            [field]: value,
          },
        },
      };

      return next;
    }, "Mapa atualizado", options);
  }

  function setNodeFields(id, patch, options) {
    updateMap((current) => {
      const node = current.nodes[id];
      if (!node) return current;

      return {
        ...current,
        nodes: {
          ...current.nodes,
          [id]: {
            ...node,
            ...patch,
          },
        },
      };
    }, "Mapa atualizado", options);
  }

  function startFreeConnection(nodeId) {
    setPendingConnectionFromId(nodeId);
    setSelectedFreeEdgeId(null);
    setActiveContextPanel(null);
    setStatus("Selecione outro nó para criar a conexão livre");
    setContextMenu(null);
  }

  function clearFreeConnections(nodeId) {
    updateMap((current) => ({
      ...current,
      freeEdges: (current.freeEdges || []).filter(
        (edge) => edge.fromId !== nodeId && edge.toId !== nodeId
      ),
    }), "Conexões livres removidas");
    setPendingConnectionFromId(null);
  }

  function setFreeEdgeFields(edgeId, patch, options) {
    updateMap((current) => ({
      ...current,
      freeEdges: (current.freeEdges || []).map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              ...patch,
            }
          : edge
      ),
    }), "Conexão atualizada", options);
  }

  function removeFreeEdge(edgeId) {
    updateMap((current) => ({
      ...current,
      freeEdges: (current.freeEdges || []).filter((edge) => edge.id !== edgeId),
    }), "Conexão removida");
    setSelectedFreeEdgeId(null);
    setIsFreeEdgeLabelModalOpen(false);
  }

  function connectNodesFreely(fromId, toId) {
    if (!fromId || !toId || fromId === toId) {
      setPendingConnectionFromId(null);
      return;
    }

    const nextEdge = makeFreeEdge(fromId, toId);
    const alreadyExists = (map.freeEdges || []).some((edge) => edge.id === nextEdge.id);
    if (alreadyExists) {
      setPendingConnectionFromId(null);
      setSelectedFreeEdgeId(nextEdge.id);
      setSelectedId(null);
      setSelectedIds([]);
      setStatus("Conexão livre selecionada");
      return;
    }

    updateMap((current) => {
      const freeEdges = current.freeEdges || [];
      return {
        ...current,
        freeEdges: [...freeEdges, nextEdge],
      };
    }, "Conexão livre criada");
    setPendingConnectionFromId(null);
    setSelectedFreeEdgeId(nextEdge.id);
    setSelectedId(null);
    setSelectedIds([]);
  }

  function openAssetModal(type, nodeId) {
    setAssetModal({
      type,
      nodeId,
      url: type === "link" ? map.nodes[nodeId]?.linkUrl || "" : map.nodes[nodeId]?.imageUrl || "",
    });
  }

  function closeAssetModal() {
    setAssetModal(EMPTY_ASSET_MODAL);
  }

  async function handleAssetFileChange(event) {
    const [file] = event.target.files || [];
    if (!file || !assetModal.nodeId) return;

    const reader = new FileReader();
    reader.onload = () => {
      setNodeFields(assetModal.nodeId, { imageUrl: String(reader.result || "") });
      setStatus("Imagem adicionada ao nó");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
    closeAssetModal();
  }

  function saveAssetModal() {
    if (!assetModal.nodeId) return;
    const value = assetModal.url.trim();

    if (assetModal.type === "image") {
      setNodeFields(assetModal.nodeId, { imageUrl: value });
      setStatus("Imagem adicionada ao nó");
    }

    if (assetModal.type === "link") {
      setNodeFields(assetModal.nodeId, { linkUrl: value });
      setStatus("Link adicionado ao nó");
    }

    closeAssetModal();
  }

  function addChild(parentId, coords) {
    const childId = makeId();

    updateMap((current) => {
      const parent = current.nodes[parentId];
      if (!parent) return current;

      const childCount = parent.children.length;
      const nextX = coords?.x ?? parent.x + (parentId === current.rootId ? (childCount % 2 === 0 ? -280 : 280) : 230);
      const nextY = coords?.y ?? parent.y + childCount * 92 - Math.max((childCount - 1) * 46, 0);

      return {
        ...current,
        nodes: {
          ...current.nodes,
          [parentId]: {
            ...parent,
            collapsed: false,
            children: [...parent.children, childId],
          },
          [childId]: {
            id: childId,
            parentId,
            children: [],
            title: "Novo tópico",
            note: "",
            color: parent.color,
            x: nextX,
            y: nextY,
            collapsed: false,
          },
        },
      };
    }, "Novo tópico criado");
    selectOnly(childId);
  }

  function addSibling(nodeId) {
    const node = map.nodes[nodeId];
    if (!node?.parentId) return;
    addChild(node.parentId);
  }

  function removeNodes(nodeIds) {
    const topLevelIds = getTopLevelSelection(
      nodeIds.filter((id) => id !== map.rootId),
      map.nodes
    );
    if (topLevelIds.length === 0) return;

    updateMap((current) => {
      const toDelete = [];
      const visit = (id) => {
        const node = current.nodes[id];
        if (!node) return;
        toDelete.push(id);
        node.children.forEach(visit);
      };
      topLevelIds.forEach(visit);

      const nodes = { ...current.nodes };
      toDelete.forEach((id) => delete nodes[id]);

      const touchedParents = new Set(
        topLevelIds.map((id) => current.nodes[id]?.parentId).filter(Boolean)
      );
      touchedParents.forEach((parentId) => {
        const parent = current.nodes[parentId];
        if (!parent) return;
        nodes[parent.id] = {
          ...parent,
          children: parent.children.filter((childId) => !topLevelIds.includes(childId)),
        };
      });

      return {
        ...current,
        freeEdges: (current.freeEdges || []).filter(
          (edge) => !toDelete.includes(edge.fromId) && !toDelete.includes(edge.toId)
        ),
        nodes,
      };
    }, "Tópico removido");

    selectOnly(map.rootId);
  }

  function duplicateNodes(nodeIds) {
    const topLevelIds = getTopLevelSelection(nodeIds, map.nodes);
    const createdIds = [];
    updateMap((current) => {
      const nextNodes = { ...current.nodes };

      topLevelIds.forEach((nodeId, index) => {
        const node = current.nodes[nodeId];
        if (!node) return;
        const cloneId = makeId();
        const parentId = node.parentId ?? current.rootId;
        const parent = nextNodes[parentId];
        createdIds.push(cloneId);
        nextNodes[parentId] = {
          ...parent,
          children: [...parent.children, cloneId],
        };
        nextNodes[cloneId] = {
          ...node,
          id: cloneId,
          title: `${node.title} cópia`,
          x: node.x + 36 + index * 10,
          y: node.y + 36 + index * 10,
          children: [],
          parentId,
        };
      });

      return {
        ...current,
        nodes: nextNodes,
      };
    }, "Tópico duplicado");
    if (createdIds.length > 0) {
      setSelectedId(createdIds[createdIds.length - 1]);
      setSelectedIds(createdIds);
    }
  }

  function removeNode(nodeId) {
    removeNodes([nodeId]);
  }

  function duplicateNode(nodeId) {
    duplicateNodes([nodeId]);
  }

  function autoLayout() {
    updateMap((current) => layoutMap(current), "Layout reorganizado");
  }

  function centerOnNode(nodeId = map.rootId) {
    const frame = frameRef.current;
    const node = map.nodes[nodeId];
    if (!frame || !node) return;

    const rect = frame.getBoundingClientRect();
    const width = getNodeWidth(node, map.rootId);
    const height = getNodeHeight(node, map.rootId);

    setViewport((current) => ({
      ...current,
      x: rect.width / 2 - (node.x * current.scale + width / 2),
      y: rect.height / 2 - (node.y * current.scale + height / 2),
    }));
  }

  function centerVisibleMap() {
    centerMapFor(map);
  }

  function centerSelection(nodeIds) {
    const frame = frameRef.current;
    const nodes = nodeIds.map((id) => map.nodes[id]).filter(Boolean);
    if (!frame || nodes.length === 0) return;

    const rect = frame.getBoundingClientRect();
    const bounds = nodes.reduce(
      (acc, node) => {
        const nodeBounds = getNodeBounds(node, map.rootId);
        return {
          minX: Math.min(acc.minX, nodeBounds.minX),
          minY: Math.min(acc.minY, nodeBounds.minY),
          maxX: Math.max(acc.maxX, nodeBounds.maxX),
          maxY: Math.max(acc.maxY, nodeBounds.maxY),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const topOffset = 44;

    setViewport((current) => ({
      ...current,
      x: rect.width / 2 - centerX * current.scale,
      y: (rect.height + topOffset) / 2 - centerY * current.scale,
    }));
  }

  function centerMapFor(targetMap) {
    const frame = frameRef.current;
    if (!frame) return;

    const nodes = [];
    const visit = (id) => {
      const node = targetMap.nodes[id];
      if (!node) return;
      nodes.push(node);
      if (node.collapsed) return;
      node.children.forEach(visit);
    };
    visit(targetMap.rootId);

    if (nodes.length === 0) return;

    const rect = frame.getBoundingClientRect();
    const bounds = nodes.reduce(
      (acc, node) => {
        const nodeBounds = getNodeBounds(node, targetMap.rootId);
        return {
          minX: Math.min(acc.minX, nodeBounds.minX),
          minY: Math.min(acc.minY, nodeBounds.minY),
          maxX: Math.max(acc.maxX, nodeBounds.maxX),
          maxY: Math.max(acc.maxY, nodeBounds.maxY),
        };
      },
      {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      }
    );

    const mapCenterX = (bounds.minX + bounds.maxX) / 2;
    const mapCenterY = (bounds.minY + bounds.maxY) / 2;
    const topOffset = 44;

    setViewport({
      scale: 1,
      x: rect.width / 2 - mapCenterX,
      y: (rect.height + topOffset) / 2 - mapCenterY,
    });
  }

  function toggleCollapse(nodeId) {
    updateMap((current) => {
      const node = current.nodes[nodeId];
      if (!node || node.children.length === 0) return current;
      return {
        ...current,
        nodes: {
          ...current.nodes,
          [nodeId]: {
            ...node,
            collapsed: !node.collapsed,
          },
        },
      };
    }, "Estrutura atualizada");
  }

  function exportMap() {
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(map.title || "mapa").toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Mapa exportado");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getExportFilename(extension) {
    return `${(map.title || "mapa").toLowerCase().replace(/\s+/g, "-")}.${extension}`;
  }

  async function exportAsImage() {
    if (!frameRef.current) return;
    try {
      const canvas = await createExportCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = getExportFilename("png");
      a.click();
      setStatus("Mapa exportado como imagem");
    } catch {
      setStatus("Falha ao exportar imagem");
    }
  }

  async function exportAsPdf() {
    if (!frameRef.current) return;
    try {
      const canvas = await createExportCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");

      const image = new Image();
      image.src = dataUrl;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: image.width > image.height ? "landscape" : "portrait",
        unit: "px",
        format: [image.width, image.height],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, image.width, image.height);
      pdf.save(getExportFilename("pdf"));
      setStatus("Mapa exportado como PDF");
    } catch {
      setStatus("Falha ao exportar PDF");
    }
  }

  async function exportAsSvg() {
    try {
      const svg = await createExportSvg();
      if (!svg) return;
      downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), getExportFilename("svg"));
      setStatus("Mapa exportado como SVG");
    } catch {
      setStatus("Falha ao exportar SVG");
    }
  }

  function importMap(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed.rootId || !parsed.nodes) throw new Error();
        const normalizedMap = {
          ...parsed,
          freeEdges: normalizeFreeEdges(parsed.freeEdges),
        };
        updateMap(() => normalizedMap, "Mapa importado");
        selectOnly(normalizedMap.rootId);
        requestAnimationFrame(() => centerOnNode(normalizedMap.rootId));
      } catch {
        setStatus("JSON inválido");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function importMarkdownText(markdownText) {
    const parsedMap = layoutMap(parseMarkdownToMap(markdownText));
    updateMap(() => parsedMap, "Markdown convertido em mapa");
    selectOnly(parsedMap.rootId);
    requestAnimationFrame(() => centerMapFor(parsedMap));
  }

  function importMarkdownFile(event) {
    const [file] = event.target.files || [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      importMarkdownText(String(reader.result || ""));
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function getWorldPoint(event) {
    const frame = frameRef.current;
    const rect = frame.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - viewport.x) / viewport.scale,
      y: (event.clientY - rect.top - viewport.y) / viewport.scale,
    };
  }

  function handleCanvasPointerDown(event) {
    if (event.target.closest(".node-card")) return;

    if (isSpacePressed || event.button === 1) {
      panRef.current = {
        x: event.clientX - viewport.x,
        y: event.clientY - viewport.y,
      };
      return;
    }

    setSelectedId(null);
    setSelectedIds([]);
    setPendingConnectionFromId(null);
    setSelectedFreeEdgeId(null);
  }

  function handleCanvasPointerMove(event) {
    if (freeEdgeDragRef.current) {
      const world = getWorldPoint(event);
      const { edgeId } = freeEdgeDragRef.current;
      setFreeEdgeFields(
        edgeId,
        {
          bendX: world.x,
          bendY: world.y,
        },
        { group: `edge-bend:${edgeId}` }
      );
      return;
    }

    if (dragRef.current) {
      const world = getWorldPoint(event);
      const { ids, originById, startWorld } = dragRef.current;
      const deltaX = world.x - startWorld.x;
      const deltaY = world.y - startWorld.y;
      updateMap((current) => {
        const nextNodes = { ...current.nodes };
        let changed = false;
        ids.forEach((id) => {
          const node = current.nodes[id];
          const origin = originById[id];
          if (!node || !origin) return;
          nextNodes[id] = {
            ...node,
            x: origin.x + deltaX,
            y: origin.y + deltaY,
          };
          changed = true;
        });
        if (!changed) return current;
        return {
          ...current,
          nodes: nextNodes,
        };
      }, undefined, { group: `drag:${ids.join(",")}` });
      return;
    }

    if (panRef.current) {
      setViewport((current) => ({
        ...current,
        x: event.clientX - panRef.current.x,
        y: event.clientY - panRef.current.y,
      }));
    }
  }

  function handleCanvasPointerUp() {
    dragRef.current = null;
    panRef.current = null;
    freeEdgeDragRef.current = null;
    clearHistoryGroup();
  }

  function handleNodePointerDown(event, node) {
    if (event.target.closest("input, textarea, button")) {
      event.stopPropagation();
      return;
    }

    event.stopPropagation();

    if (pendingConnectionFromId && pendingConnectionFromId !== node.id) {
      connectNodesFreely(pendingConnectionFromId, node.id);
      return;
    }

    setSelectedFreeEdgeId(null);
    const modifierSelection = isModifierSelection(event);
    const alreadySelected = selectedIdSet.has(node.id);

    if (modifierSelection) {
      setSelectedIds((current) => {
        const exists = current.includes(node.id);
        const next = exists ? current.filter((id) => id !== node.id) : [...current, node.id];
        const fallbackId = next[next.length - 1] ?? null;
        setSelectedId(exists ? fallbackId : node.id);
        return next;
      });
      if (!alreadySelected) {
        return;
      }
    } else if (!alreadySelected || selectedIds.length <= 1) {
      selectOnly(node.id);
    } else {
      setSelectedId(node.id);
    }

    const world = getWorldPoint(event);
    const dragIds = modifierSelection
      ? selectedIdSet.has(node.id)
        ? selectedIds
        : []
      : alreadySelected && selectedIds.length > 1
        ? selectedIds
        : [node.id];

    if (dragIds.length === 0) return;
    dragRef.current = {
      ids: dragIds,
      startWorld: world,
      originById: Object.fromEntries(
        dragIds.map((id) => {
          const currentNode = map.nodes[id];
          return [id, { x: currentNode.x, y: currentNode.y }];
        })
      ),
    };
  }

  function handleFreeEdgePointerDown(event, edgeId) {
    event.stopPropagation();
    setSelectedId(null);
    setSelectedIds([]);
    setPendingConnectionFromId(null);
    setSelectedFreeEdgeId(edgeId);
    setActiveContextPanel(null);
  }

  function handleFreeEdgeHandlePointerDown(event, edgeId) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(null);
    setSelectedIds([]);
    setPendingConnectionFromId(null);
    setSelectedFreeEdgeId(edgeId);
    freeEdgeDragRef.current = { edgeId };
  }

  function handleWheel(event) {
    event.preventDefault();
    const rect = frameRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const worldX = (mouseX - viewport.x) / viewport.scale;
    const worldY = (mouseY - viewport.y) / viewport.scale;
    const nextScale = Math.min(Math.max(viewport.scale * (event.deltaY > 0 ? 0.92 : 1.08), 0.45), 1.8);

    setViewport({
      scale: nextScale,
      x: mouseX - worldX * nextScale,
      y: mouseY - worldY * nextScale,
    });
  }

  function createLooseNode() {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const centerX = (rect.width / 2 - viewport.x) / viewport.scale;
    const centerY = (rect.height / 2 - viewport.y) / viewport.scale;
    addChild(map.rootId, { x: centerX + 180, y: centerY - 40 });
  }

  function createNodeAtPoint(point, parentId = map.rootId) {
    addChild(parentId, {
      x: point.x - 95,
      y: point.y - 43,
    });
  }

  function resetMap(templateId = "blank") {
    const baseMap = createTemplateMap(templateId);
    const freshMap = templateId === "blank" ? baseMap : layoutMap(baseMap);
    updateMap(
      () => freshMap,
      templateId === "blank" ? "Novo mapa criado" : `Template "${freshMap.title}" aplicado`
    );
    selectOnly(freshMap.rootId);
    setViewport({ x: 0, y: 0, scale: 1 });
    setIsTemplateModalOpen(false);
    requestAnimationFrame(() => centerMapFor(freshMap));
  }

  function stopCanvasPropagation(event) {
    event.stopPropagation();
  }

  function stopCanvasWheel(event) {
    event.stopPropagation();
  }

  function stopCanvasPointerFlow(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function openContextMenu(event, options) {
    event.preventDefault();
    event.stopPropagation();

    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const menuWidth = 172;
    const menuHeight = 148;
    const left = Math.min(event.clientX - rect.left, rect.width - menuWidth - 12);
    const top = Math.min(event.clientY - rect.top, rect.height - menuHeight - 12);

    setContextMenu({
      left: Math.max(12, left),
      top: Math.max(12, top),
      ...options,
    });
  }

  function handleCanvasContextMenu(event) {
    const worldPoint = getWorldPoint(event);
    openContextMenu(event, {
      type: "canvas",
      worldPoint,
    });
  }

  function handleNodeContextMenu(event, node) {
    if (!selectedIdSet.has(node.id)) {
      selectOnly(node.id);
    }
    const worldPoint = getWorldPoint(event);
    openContextMenu(event, {
      type: "node",
      nodeId: node.id,
      worldPoint,
    });
  }

  function runContextAction(action) {
    if (!contextMenu) return;

    if (action === "create") {
      if (contextMenu.type === "node" && contextMenu.nodeId) {
        createNodeAtPoint(contextMenu.worldPoint, contextMenu.nodeId);
      } else {
        createNodeAtPoint(contextMenu.worldPoint, map.rootId);
      }
    }

    if (action === "duplicate" && contextMenu.nodeId) {
      duplicateNode(contextMenu.nodeId);
    }

    if (action === "connect" && contextMenu.nodeId) {
      startFreeConnection(contextMenu.nodeId);
    }

    if (action === "clear-links" && contextMenu.nodeId) {
      clearFreeConnections(contextMenu.nodeId);
    }

    if (action === "image" && contextMenu.nodeId) {
      openAssetModal("image", contextMenu.nodeId);
    }

    if (action === "link" && contextMenu.nodeId) {
      openAssetModal("link", contextMenu.nodeId);
    }

    if (action === "delete" && contextMenu.nodeId) {
      removeNode(contextMenu.nodeId);
    }

    setContextMenu(null);
  }

  const bounds = useMemo(() => {
    if (visibleNodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    }

    return visibleNodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxX: Math.max(acc.maxX, node.x + 200),
        maxY: Math.max(acc.maxY, node.y + 120),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
  }, [visibleNodes]);

  const miniScale = Math.min(148 / (bounds.maxX - bounds.minX || 1), 88 / (bounds.maxY - bounds.minY || 1));

  async function createExportCanvas() {
    if (visibleNodes.length === 0) return null;

    const padding = 48;
    const exportBounds = getVisibleMapBounds(visibleNodes, map.rootId);
    const width = Math.max(320, Math.ceil(exportBounds.maxX - exportBounds.minX + padding * 2));
    const height = Math.max(240, Math.ceil(exportBounds.maxY - exportBounds.minY + padding * 2));
    const pixelRatio = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const imageCache = new Map();
    await Promise.all(
      visibleNodes
        .filter((node) => node.imageUrl)
        .map(async (node) => {
          const image = await loadImageElement(node.imageUrl);
          imageCache.set(node.id, image);
        })
    );

    visibleNodes.forEach((node) => {
      if (!node.parentId) return;
      const parent = map.nodes[node.parentId];
      if (!parent) return;

      const { startX, startY, endX, endY } = getEdgeAnchors(parent, node, map.rootId);
      const { c1x, c1y, c2x, c2y } = getConnectionCurve(startX, startY, endX, endY, "tree");

      ctx.beginPath();
      ctx.moveTo(startX - exportBounds.minX + padding, startY - exportBounds.minY + padding);
      ctx.bezierCurveTo(
        c1x - exportBounds.minX + padding,
        c1y - exportBounds.minY + padding,
        c2x - exportBounds.minX + padding,
        c2y - exportBounds.minY + padding,
        endX - exportBounds.minX + padding,
        endY - exportBounds.minY + padding
      );
      ctx.strokeStyle = node.color || "#4d7cff";
      ctx.globalAlpha = 0.82;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    visibleFreeEdges.forEach((edge) => {
      const fromNode = map.nodes[edge.fromId];
      const toNode = map.nodes[edge.toId];
      if (!fromNode || !toNode) return;

      const geometry = getFreeEdgeGeometry(edge, fromNode, toNode, map.rootId);
      const edgeColor = edge.color || DEFAULT_FREE_EDGE_COLOR;
      const edgeThickness = edge.thickness || DEFAULT_FREE_EDGE_THICKNESS;

      ctx.beginPath();
      geometry.points.forEach((point, index) => {
        const x = point.x - exportBounds.minX + padding;
        const y = point.y - exportBounds.minY + padding;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = edgeThickness;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash(
        getFreeEdgeDasharray(edge.style)
          .split(" ")
          .filter(Boolean)
          .map((value) => Number(value))
      );
      ctx.stroke();
      ctx.setLineDash([]);

      if (edge.arrow) {
        const endPoint = geometry.points[geometry.points.length - 1];
        drawArrowHead(
          ctx,
          endPoint.x - exportBounds.minX + padding,
          endPoint.y - exportBounds.minY + padding,
          geometry.arrowAngle,
          8 + edgeThickness * 1.6,
          edgeColor
        );
      }

      if (edge.label) {
        const labelX = geometry.labelX - exportBounds.minX + padding;
        const labelY = geometry.labelY - exportBounds.minY + padding;
        ctx.font = "600 12px Manrope";
        const labelWidth = ctx.measureText(edge.label).width + 18;
        roundRectPath(ctx, labelX - labelWidth / 2, labelY - 14, labelWidth, 24, 12);
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.fill();
        ctx.strokeStyle = "rgba(148,163,184,0.24)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#334155";
        ctx.textAlign = "center";
        ctx.fillText(edge.label, labelX, labelY + 3);
        ctx.textAlign = "start";
      }
    });

    visibleNodes.forEach((node) => {
      const isRoot = node.id === map.rootId;
      const nodeWidth = getNodeWidth(node, map.rootId);
      const nodeHeight = getNodeHeight(node, map.rootId);
      const x = node.x - exportBounds.minX + padding;
      const y = node.y - exportBounds.minY + padding;
      const bg = isRoot ? node.color || "#111827" : "#ffffff";
      const textColor = isRoot ? "#ffffff" : "#0f172a";
      const noteColor = isRoot ? "rgba(255,255,255,0.78)" : "#64748b";

      roundRectPath(ctx, x, y, nodeWidth, nodeHeight, isRoot ? 20 : 18);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = isRoot ? "rgba(17,24,39,0.24)" : "rgba(15,23,42,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      let cursorY = y + (isRoot ? 26 : 24);
      const contentX = x + (isRoot ? 16 : 14);
      const contentWidth = nodeWidth - (isRoot ? 32 : 28);

      ctx.fillStyle = textColor;
      ctx.font = "700 16px Manrope";
      const titleLines = wrapCanvasText(ctx, node.title || "Novo tópico", contentWidth);
      titleLines.forEach((line, index) => {
        ctx.fillText(line, contentX, cursorY + index * 18);
      });
      cursorY += titleLines.length * 18;

      if (node.note) {
        cursorY += 8;
        ctx.fillStyle = noteColor;
        ctx.font = "13px Manrope";
        const noteLines = wrapCanvasText(ctx, node.note, contentWidth);
        noteLines.forEach((line, index) => {
          ctx.fillText(line, contentX, cursorY + index * 16);
        });
        cursorY += noteLines.length * 16;
      }

      const image = imageCache.get(node.id);
      if (image) {
        cursorY += 10;
        const imageHeight = Math.min(140, image.height * (contentWidth / image.width));
        ctx.save();
        roundRectPath(ctx, contentX, cursorY, contentWidth, imageHeight, 12);
        ctx.clip();
        ctx.drawImage(image, contentX, cursorY, contentWidth, imageHeight);
        ctx.restore();
        ctx.strokeStyle = "rgba(15,23,42,0.08)";
        roundRectPath(ctx, contentX, cursorY, contentWidth, imageHeight, 12);
        ctx.stroke();
        cursorY += imageHeight;
      }

      if (node.linkUrl) {
        cursorY += 10;
        ctx.fillStyle = isRoot ? "#dbeafe" : "#4d7cff";
        ctx.font = "12px Manrope";
        const linkLines = wrapCanvasText(ctx, node.linkUrl, contentWidth);
        linkLines.forEach((line, index) => {
          ctx.fillText(line, contentX, cursorY + index * 14);
        });
      }
    });

    return trimCanvasWhitespace(canvas, 36);
  }

  async function createExportSvg() {
    if (visibleNodes.length === 0) return null;

    const padding = 48;
    const exportBounds = getVisibleMapBounds(visibleNodes, map.rootId);
    const width = Math.max(320, Math.ceil(exportBounds.maxX - exportBounds.minX + padding * 2));
    const height = Math.max(240, Math.ceil(exportBounds.maxY - exportBounds.minY + padding * 2));
    const imageCache = new Map();

    await Promise.all(
      visibleNodes
        .filter((node) => node.imageUrl)
        .map(async (node) => {
          if (String(node.imageUrl).startsWith("data:")) {
            imageCache.set(node.id, node.imageUrl);
            return;
          }
          imageCache.set(node.id, node.imageUrl);
        })
    );

    const measureContext = measureContextRef.current;
    const svgParts = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<rect width="${width}" height="${height}" fill="#ffffff" />`,
    ];

    visibleNodes.forEach((node) => {
      if (!node.parentId) return;
      const parent = map.nodes[node.parentId];
      if (!parent) return;

      const { startX, startY, endX, endY } = getEdgeAnchors(parent, node, map.rootId);
      const curve = Math.max(Math.abs(endX - startX) * 0.36, 52);
      svgParts.push(
        `<path d="M ${startX - exportBounds.minX + padding} ${startY - exportBounds.minY + padding} C ${
          startX + curve - exportBounds.minX + padding
        } ${startY - exportBounds.minY + padding}, ${
          endX - curve - exportBounds.minX + padding
        } ${endY - exportBounds.minY + padding}, ${
          endX - exportBounds.minX + padding
        } ${endY - exportBounds.minY + padding}" fill="none" stroke="${escapeXml(
          node.color || "#4d7cff"
        )}" stroke-opacity="0.82" stroke-width="3" stroke-linecap="round" />`
      );
    });

    visibleFreeEdges.forEach((edge) => {
      const fromNode = map.nodes[edge.fromId];
      const toNode = map.nodes[edge.toId];
      if (!fromNode || !toNode) return;

      const geometry = getFreeEdgeGeometry(edge, fromNode, toNode, map.rootId);
      const edgeColor = edge.color || DEFAULT_FREE_EDGE_COLOR;
      const edgeThickness = edge.thickness || DEFAULT_FREE_EDGE_THICKNESS;
      const dashArray = getFreeEdgeDasharray(edge.style);
      const shiftedPath = geometry.points
        .map((point, index) => {
          const x = point.x - exportBounds.minX + padding;
          const y = point.y - exportBounds.minY + padding;
          return `${index === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");

      svgParts.push(
        `<path d="${shiftedPath}" fill="none" stroke="${escapeXml(edgeColor)}" stroke-width="${edgeThickness}" stroke-linecap="round" stroke-linejoin="round"${
          dashArray ? ` stroke-dasharray="${dashArray}"` : ""
        } />`
      );

      if (edge.arrow) {
        const arrowPoints = getArrowHeadPoints(
          geometry.endX - exportBounds.minX + padding,
          geometry.endY - exportBounds.minY + padding,
          geometry.arrowAngle,
          8 + edgeThickness * 1.6
        );
        svgParts.push(`<polygon points="${arrowPoints}" fill="${escapeXml(edgeColor)}" />`);
      }

      if (edge.label) {
        const labelX = geometry.labelX - exportBounds.minX + padding;
        const labelY = geometry.labelY - exportBounds.minY + padding;
        const labelWidth = Math.max(56, edge.label.length * 7 + 18);
        svgParts.push(
          `<rect x="${labelX - labelWidth / 2}" y="${labelY - 14}" width="${labelWidth}" height="24" rx="12" fill="rgba(255,255,255,0.96)" stroke="rgba(148,163,184,0.24)" />`
        );
        svgParts.push(
          `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" font-family="Manrope, sans-serif" font-size="12" font-weight="600" fill="#334155">${escapeXml(
            edge.label
          )}</text>`
        );
      }
    });

    visibleNodes.forEach((node) => {
      const isRoot = node.id === map.rootId;
      const nodeWidth = getNodeWidth(node, map.rootId);
      const nodeHeight = getNodeHeight(node, map.rootId);
      const x = node.x - exportBounds.minX + padding;
      const y = node.y - exportBounds.minY + padding;
      const bg = isRoot ? node.color || "#111827" : "#ffffff";
      const textColor = isRoot ? "#ffffff" : "#0f172a";
      const noteColor = isRoot ? "rgba(255,255,255,0.78)" : "#64748b";
      const radius = isRoot ? 20 : 18;
      const contentX = x + (isRoot ? 16 : 14);
      const contentWidth = nodeWidth - (isRoot ? 32 : 28);
      let cursorY = y + (isRoot ? 26 : 24);

      svgParts.push(
        `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="${radius}" fill="${escapeXml(bg)}" stroke="${
          isRoot ? "rgba(17,24,39,0.24)" : "rgba(15,23,42,0.08)"
        }" />`
      );

      if (measureContext) {
        measureContext.font = "700 16px Manrope";
      }
      const titleLines = measureContext
        ? wrapCanvasText(measureContext, node.title || "Novo tópico", contentWidth)
        : [node.title || "Novo tópico"];
      titleLines.forEach((line, index) => {
        svgParts.push(
          `<text x="${contentX}" y="${cursorY + index * 18}" font-family="Manrope, sans-serif" font-size="16" font-weight="700" fill="${escapeXml(
            textColor
          )}">${escapeXml(line)}</text>`
        );
      });
      cursorY += titleLines.length * 18;

      if (node.note) {
        cursorY += 8;
        if (measureContext) {
          measureContext.font = "13px Manrope";
        }
        const noteLines = measureContext ? wrapCanvasText(measureContext, node.note, contentWidth) : [node.note];
        noteLines.forEach((line, index) => {
          svgParts.push(
            `<text x="${contentX}" y="${cursorY + index * 16}" font-family="Manrope, sans-serif" font-size="13" fill="${escapeXml(
              noteColor
            )}">${escapeXml(line)}</text>`
          );
        });
        cursorY += noteLines.length * 16;
      }

      const imageUrl = imageCache.get(node.id);
      if (imageUrl) {
        cursorY += 10;
        const imageHeight = 140;
        svgParts.push(
          `<clipPath id="clip-${node.id}"><rect x="${contentX}" y="${cursorY}" width="${contentWidth}" height="${imageHeight}" rx="12" /></clipPath>`
        );
        svgParts.push(
          `<image href="${escapeXml(imageUrl)}" x="${contentX}" y="${cursorY}" width="${contentWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${node.id})" />`
        );
        svgParts.push(
          `<rect x="${contentX}" y="${cursorY}" width="${contentWidth}" height="${imageHeight}" rx="12" fill="none" stroke="rgba(15,23,42,0.08)" />`
        );
        cursorY += imageHeight;
      }

      if (node.linkUrl) {
        cursorY += 10;
        if (measureContext) {
          measureContext.font = "12px Manrope";
        }
        const linkLines = measureContext ? wrapCanvasText(measureContext, node.linkUrl, contentWidth) : [node.linkUrl];
        linkLines.forEach((line, index) => {
          svgParts.push(
            `<text x="${contentX}" y="${cursorY + index * 14}" font-family="Manrope, sans-serif" font-size="12" fill="${
              isRoot ? "#dbeafe" : "#4d7cff"
            }">${escapeXml(line)}</text>`
          );
        });
      }
    });

    svgParts.push(`</svg>`);
    return svgParts.join("");
  }

  return (
    <main className="app app-canvas-only">
      <section
        ref={frameRef}
        className={`canvas ${isSpacePressed ? "grabbing" : ""}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
        onWheel={handleWheel}
        onContextMenu={handleCanvasContextMenu}
      >
        <div className="canvas-grid" />

        <div
          className="floating-topbar"
          onPointerDown={stopCanvasPropagation}
          onClick={stopCanvasPropagation}
        >
          <div className="floating-title">
            <p className="label">Mind board</p>
            <input
              className="map-title-input"
              value={map.title}
              onChange={(event) =>
                updateMap((current) => ({
                  ...current,
                  title: event.target.value,
                  nodes: {
                    ...current.nodes,
                    [current.rootId]: {
                      ...current.nodes[current.rootId],
                      title: event.target.value || "Meu novo mapa mental",
                    },
                  },
                }), "Mapa atualizado", { group: "map-title" })
              }
              onBlur={clearHistoryGroup}
              placeholder="Nome do mapa mental"
            />
          </div>
          <div className="toolbar">
            <button onClick={undoMap} disabled={!canUndo} title="Desfazer (Cmd/Ctrl+Z)">
              <Undo2 size={16} strokeWidth={2.2} />
            </button>
            <button onClick={redoMap} disabled={!canRedo} title="Refazer (Shift+Cmd/Ctrl+Z)">
              <Redo2 size={16} strokeWidth={2.2} />
            </button>
            <button onClick={() => setIsTemplateModalOpen(true)}>Novo</button>
            <button onClick={centerVisibleMap}>Centralizar</button>
            <button onClick={autoLayout}>Auto layout</button>
            <button onClick={() => setIsExportModalOpen(true)}>Exportar</button>
            <button onClick={() => fileInputRef.current?.click()}>Importar</button>
            <button onClick={() => markdownInputRef.current?.click()}>MD</button>
            <button onClick={() => setIsMarkdownModalOpen(true)}>Colar MD</button>
            <input ref={fileInputRef} hidden type="file" accept="application/json" onChange={importMap} />
            <input ref={markdownInputRef} hidden type="file" accept=".md,text/markdown,text/plain" onChange={importMarkdownFile} />
          </div>
        </div>

        <svg className="edge-layer" style={transformStyle}>
          {visibleFreeEdges.map((edge) => {
            const fromNode = map.nodes[edge.fromId];
            const toNode = map.nodes[edge.toId];
            if (!fromNode || !toNode) return null;
            const geometry = getFreeEdgeGeometry(edge, fromNode, toNode, map.rootId);
            const labelWidth = Math.max(56, edge.label.length * 7 + 18);
            const edgeThickness = edge.thickness || DEFAULT_FREE_EDGE_THICKNESS;

            return (
              <g key={edge.id}>
                <path
                  className={`free-edge ${selectedFreeEdgeId === edge.id ? "selected" : ""}`}
                  d={geometry.pathD}
                  stroke={edge.color || DEFAULT_FREE_EDGE_COLOR}
                  strokeDasharray={getFreeEdgeDasharray(edge.style) || undefined}
                  strokeWidth={selectedFreeEdgeId === edge.id ? edgeThickness + 1 : edgeThickness}
                  onPointerDown={(event) => handleFreeEdgePointerDown(event, edge.id)}
                />
                {edge.arrow ? (
                  <polygon
                    className="free-edge-arrow"
                    points={getArrowHeadPoints(
                      geometry.endX,
                      geometry.endY,
                      geometry.arrowAngle,
                      8 + edgeThickness * 1.6
                    )}
                    fill={edge.color || DEFAULT_FREE_EDGE_COLOR}
                    onPointerDown={(event) => handleFreeEdgePointerDown(event, edge.id)}
                  />
                ) : null}
                {edge.label ? (
                  <g className="free-edge-label" onPointerDown={(event) => handleFreeEdgePointerDown(event, edge.id)}>
                    <rect
                      x={geometry.labelX - labelWidth / 2}
                      y={geometry.labelY - 14}
                      width={labelWidth}
                      height="24"
                      rx="12"
                    />
                    <text x={geometry.labelX} y={geometry.labelY + 2}>{edge.label}</text>
                  </g>
                ) : null}
              </g>
            );
          })}
          {visibleNodes.map((node) => {
            if (!node.parentId) return null;
            const parent = map.nodes[node.parentId];
            if (!parent) return null;
            const { startX, startY, endX, endY } = getEdgeAnchors(parent, node, map.rootId);
            const curve = Math.max(Math.abs(endX - startX) * 0.36, 52);

            return (
              <path
                key={`${parent.id}-${node.id}`}
                className="tree-edge"
                d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke={selectedIdSet.has(node.id) || selectedIdSet.has(parent.id) ? "#4d7cff" : node.color}
                strokeOpacity={selectedIdSet.has(node.id) || selectedIdSet.has(parent.id) ? "0.95" : "0.68"}
                strokeWidth={selectedIdSet.has(node.id) ? 4 : 3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="node-layer" style={transformStyle}>
          {visibleNodes.map((node) => (
            <article
              key={node.id}
              className={`node-card ${selectedIdSet.has(node.id) ? "selected" : ""} ${node.id === map.rootId ? "root" : ""}`}
              data-pending-connection={pendingConnectionFromId === node.id ? "true" : undefined}
              style={{
                left: node.x,
                top: node.y,
                "--node-color": node.color,
                ...(node.id === map.rootId
                  ? {
                      "--root-bg": node.color,
                    }
                  : {}),
              }}
              onPointerDown={(event) => handleNodePointerDown(event, node)}
              onContextMenu={(event) => handleNodeContextMenu(event, node)}
              onClick={(event) => {
                event.stopPropagation();
                if (!isModifierSelection(event)) {
                  selectOnly(node.id);
                }
              }}
            >
              <div className="node-head">
                <div className="node-title-row">
                  {selectedId === node.id && selectedIds.length === 1 ? (
                    <input
                      className="node-title-input"
                      value={node.title}
                      onChange={(event) =>
                        setNodeField(node.id, "title", event.target.value, { group: `title:${node.id}` })
                      }
                      onBlur={clearHistoryGroup}
                      placeholder="Titulo do topico"
                    />
                  ) : (
                    <h3>{node.title}</h3>
                  )}
                </div>
                <div className="node-actions">
                  {node.children.length > 0 ? (
                    <button
                      className={`ghost-icon ${node.id === map.rootId ? "root-toggle" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCollapse(node.id);
                      }}
                    >
                      {node.collapsed ? "+" : "−"}
                    </button>
                  ) : null}
                </div>
              </div>
              {selectedId === node.id && selectedIds.length === 1 ? (
                <div className="node-editor" onPointerDown={stopCanvasPropagation} onClick={stopCanvasPropagation}>
                  <textarea
                    className="node-note-input"
                    rows="2"
                    value={node.note}
                    onChange={(event) =>
                      setNodeField(node.id, "note", event.target.value, { group: `note:${node.id}` })
                    }
                    onBlur={clearHistoryGroup}
                    placeholder="Adicione uma nota"
                  />
                </div>
              ) : (
                <>
                  {node.note ? <p>{node.note}</p> : null}
                </>
              )}
              {node.imageUrl ? <img className="node-image" src={node.imageUrl} alt="" /> : null}
              {node.imageUrl ? (
                <button
                  className="node-image-remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    setNodeFields(node.id, { imageUrl: "" });
                    setStatus("Imagem removida do nó");
                  }}
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              ) : null}
              {node.linkUrl ? (
                <a
                  className="node-link"
                  href={node.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  {node.linkUrl}
                </a>
              ) : null}
            </article>
          ))}
        </div>

        <div className="status-bar">{status}</div>

        {selectedFreeEdge && selectedFreeEdgeOverlay ? (
          <>
            <button
              className="free-edge-handle"
              style={{
                left: selectedFreeEdgeOverlay.handleLeft,
                top: selectedFreeEdgeOverlay.handleTop,
              }}
              onPointerDown={(event) => handleFreeEdgeHandlePointerDown(event, selectedFreeEdge.id)}
              title="Arraste para dobrar a linha"
            />
            <div
              className="selection-toolbar free-edge-toolbar"
              style={{
                left: freeEdgeToolbarPosition?.left ?? selectedFreeEdgeOverlay.left,
                top: freeEdgeToolbarPosition?.top ?? selectedFreeEdgeOverlay.top - 48,
              }}
              onPointerDown={stopCanvasPointerFlow}
              onClick={stopCanvasPropagation}
              onWheel={stopCanvasWheel}
            >
              <button
                className={`toolbar-color-button ${activeContextPanel === "free-edge-color" ? "active" : ""}`}
                title="Cor da conexão"
                onClick={() =>
                  setActiveContextPanel((current) => (current === "free-edge-color" ? null : "free-edge-color"))
                }
              >
                <Palette size={14} strokeWidth={2.2} />
              </button>
              <button
                className={activeContextPanel === "free-edge-style" ? "active-connection" : ""}
                title="Estilo da conexão"
                onClick={() =>
                  setActiveContextPanel((current) => (current === "free-edge-style" ? null : "free-edge-style"))
                }
              >
                ≈
              </button>
              <button
                title="Rotulo da conexão"
                onClick={() => {
                  setFreeEdgeLabelDraft(selectedFreeEdge.label || "");
                  setIsFreeEdgeLabelModalOpen(true);
                }}
              >
                T
              </button>
              <button
                title="Excluir conexão"
                className="danger"
                onClick={() => removeFreeEdge(selectedFreeEdge.id)}
              >
                <Trash2 size={16} strokeWidth={2.2} />
              </button>
            </div>

            {activeContextPanel === "free-edge-color" ? (
              <div
                className="context-popover color-popover"
                style={{
                  left: freeEdgeColorPopoverPosition?.left ?? selectedFreeEdgeOverlay.left,
                  top: freeEdgeColorPopoverPosition?.top ?? selectedFreeEdgeOverlay.top + 2,
                }}
                onPointerDown={stopCanvasPointerFlow}
                onClick={stopCanvasPropagation}
                onWheel={stopCanvasWheel}
              >
                <div className="color-swatch-grid">
                  {[DEFAULT_FREE_EDGE_COLOR, ...NODE_COLORS].map((color) => (
                    <button
                      key={`edge-color-${color}`}
                      className={`color-swatch ${selectedFreeEdge.color === color ? "active" : ""}`}
                      style={{ "--swatch-color": color }}
                      onClick={() => {
                        setFreeEdgeFields(selectedFreeEdge.id, { color });
                        setActiveContextPanel(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {activeContextPanel === "free-edge-style" ? (
              <div
                className="context-popover free-edge-style-popover"
                style={{
                  left: freeEdgeStylePopoverPosition?.left ?? selectedFreeEdgeOverlay.left,
                  top: freeEdgeStylePopoverPosition?.top ?? selectedFreeEdgeOverlay.top + 2,
                }}
                onPointerDown={stopCanvasPointerFlow}
                onClick={stopCanvasPropagation}
                onWheel={stopCanvasWheel}
              >
                <div className="popover-group">
                  <p className="popover-label">Estilo</p>
                  <div className="chip-row">
                    {FREE_EDGE_STYLE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        className={`option-chip ${selectedFreeEdge.style === option.id ? "active" : ""}`}
                        onClick={() => setFreeEdgeFields(selectedFreeEdge.id, { style: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="popover-group">
                  <p className="popover-label">Espessura</p>
                  <div className="chip-row">
                    {FREE_EDGE_THICKNESS_OPTIONS.map((value) => (
                      <button
                        key={`thickness-${value}`}
                        className={`option-chip ${selectedFreeEdge.thickness === value ? "active" : ""}`}
                        onClick={() => setFreeEdgeFields(selectedFreeEdge.id, { thickness: value })}
                      >
                        {value}px
                      </button>
                    ))}
                  </div>
                </div>

                <div className="popover-group">
                  <p className="popover-label">Finalização</p>
                  <div className="chip-row">
                    <button
                      className={`option-chip ${!selectedFreeEdge.arrow ? "active" : ""}`}
                      onClick={() => setFreeEdgeFields(selectedFreeEdge.id, { arrow: false })}
                    >
                      Sem seta
                    </button>
                    <button
                      className={`option-chip ${selectedFreeEdge.arrow ? "active" : ""}`}
                      onClick={() => setFreeEdgeFields(selectedFreeEdge.id, { arrow: true })}
                    >
                      Com seta
                    </button>
                  </div>
                </div>

                <div className="popover-group">
                  <p className="popover-label">Origem da linha</p>
                  <div className="chip-row">
                    {FREE_EDGE_ANCHOR_OPTIONS.map((option) => (
                      <button
                        key={`from-anchor-${option.id}`}
                        className={`option-chip ${selectedFreeEdge.fromAnchor === option.id ? "active" : ""}`}
                        onClick={() => setFreeEdgeFields(selectedFreeEdge.id, { fromAnchor: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="popover-group">
                  <p className="popover-label">Destino da linha</p>
                  <div className="chip-row">
                    {FREE_EDGE_ANCHOR_OPTIONS.map((option) => (
                      <button
                        key={`to-anchor-${option.id}`}
                        className={`option-chip ${selectedFreeEdge.toAnchor === option.id ? "active" : ""}`}
                        onClick={() => setFreeEdgeFields(selectedFreeEdge.id, { toAnchor: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {selectedNode && selectedNodeOverlay ? (
          <>
            <div
              className="selection-toolbar"
              style={{
                left: selectedNodeOverlay.left + selectedNodeOverlay.width / 2,
                top: selectedNodeOverlay.top - 58,
              }}
              onPointerDown={stopCanvasPointerFlow}
              onClick={stopCanvasPropagation}
              onWheel={stopCanvasWheel}
            >
              <button title="Focar" onClick={() => centerOnNode(selectedNode.id)}>
                <Focus size={16} strokeWidth={2.2} />
              </button>
              <button
                className={`toolbar-color-button ${activeContextPanel === "color" ? "active" : ""}`}
                title="Cor"
                onClick={() =>
                  setActiveContextPanel((current) => (current === "color" ? null : "color"))
                }
              >
                <Palette size={14} strokeWidth={2.2} />
              </button>
              <button
                title="Conectar livremente"
                className={pendingConnectionFromId === selectedNode.id ? "active-connection" : ""}
                onClick={() => {
                  if (pendingConnectionFromId === selectedNode.id) {
                    setPendingConnectionFromId(null);
                    setStatus("Conexão livre cancelada");
                    return;
                  }
                  startFreeConnection(selectedNode.id);
                }}
              >
                <Workflow size={16} strokeWidth={2.2} />
              </button>
              <button
                title="Imagem"
                onClick={() => openAssetModal("image", selectedNode.id)}
              >
                <ImageIcon size={16} strokeWidth={2.2} />
              </button>
              <button
                title="Remover imagem"
                onClick={() => {
                  setNodeFields(selectedNode.id, { imageUrl: "" });
                  setStatus("Imagem removida do nó");
                }}
                disabled={!selectedNode.imageUrl}
              >
                <ImageOff size={16} strokeWidth={2.2} />
              </button>
              <button
                title="Link"
                onClick={() => openAssetModal("link", selectedNode.id)}
              >
                <LinkIcon size={16} strokeWidth={2.2} />
              </button>
              <button
                title="Remover link"
                onClick={() => {
                  setNodeFields(selectedNode.id, { linkUrl: "" });
                  setStatus("Link removido do nó");
                }}
                disabled={!selectedNode.linkUrl}
              >
                <Unlink size={16} strokeWidth={2.2} />
              </button>
              <button title="Duplicar" onClick={() => duplicateNode(selectedNode.id)}>
                <Copy size={16} strokeWidth={2.2} />
              </button>
              <button
                title="Excluir"
                className="danger"
                onClick={() => removeNode(selectedNode.id)}
                disabled={selectedNode.id === map.rootId}
              >
                <Trash2 size={16} strokeWidth={2.2} />
              </button>
            </div>

            {activeContextPanel === "color" ? (
              <div
                className="context-popover color-popover"
                style={{
                  left: nodeColorPopoverPosition?.left ?? selectedNodeOverlay.left + selectedNodeOverlay.width / 2,
                  top: nodeColorPopoverPosition?.top ?? selectedNodeOverlay.top - 6,
                }}
                onPointerDown={stopCanvasPointerFlow}
                onClick={stopCanvasPropagation}
                onWheel={stopCanvasWheel}
              >
                <div className="color-swatch-grid">
                  {NODE_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`color-swatch ${selectedNode.color === color ? "active" : ""}`}
                      style={{ "--swatch-color": color }}
                      onClick={() => {
                        setNodeField(selectedNode.id, "color", color);
                        setActiveContextPanel(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <button
              className="quick-add quick-add-child"
              style={{
                left: selectedNodeOverlay.left + selectedNodeOverlay.width + 12,
                top: selectedNodeOverlay.top + selectedNodeOverlay.height / 2 - 16,
              }}
              onPointerDown={stopCanvasPointerFlow}
              onClick={(event) => {
                stopCanvasPropagation(event);
                addChild(selectedNode.id);
              }}
            >
              +
            </button>

            <button
              className="quick-add quick-add-sibling"
              style={{
                left: selectedNodeOverlay.left + selectedNodeOverlay.width / 2 - 16,
                top: selectedNodeOverlay.top + selectedNodeOverlay.height + 12,
              }}
              onPointerDown={stopCanvasPointerFlow}
              onClick={(event) => {
                stopCanvasPropagation(event);
                if (selectedNode.id === map.rootId) {
                  addChild(selectedNode.id);
                } else {
                  addSibling(selectedNode.id);
                }
              }}
            >
              +
            </button>

            <div
              className="shortcut-hint"
              style={{
                left: selectedNodeOverlay.left + selectedNodeOverlay.width + 54,
                top: selectedNodeOverlay.top + 6,
              }}
            >
              <div><kbd>Tab</kbd><span>criar tópico filho</span></div>
            </div>
          </>
        ) : null}

        {multiSelectionOverlay ? (
          <>
            <div
              className="multi-selection-outline"
              style={{
                left: multiSelectionOverlay.left - 10,
                top: multiSelectionOverlay.top - 10,
                width: multiSelectionOverlay.width + 20,
                height: multiSelectionOverlay.height + 20,
              }}
            />
            <div
              className="selection-toolbar multi-selection-toolbar"
              style={{
                left: multiSelectionToolbarPosition?.left ?? multiSelectionOverlay.left + multiSelectionOverlay.width / 2,
                top: multiSelectionToolbarPosition?.top ?? multiSelectionOverlay.top - 56,
              }}
              onPointerDown={stopCanvasPointerFlow}
              onClick={stopCanvasPropagation}
              onWheel={stopCanvasWheel}
            >
              <button title="Focar seleção" onClick={() => centerSelection(selectedIds)}>
                <Focus size={16} strokeWidth={2.2} />
              </button>
              <button
                className={`toolbar-color-button ${activeContextPanel === "multi-color" ? "active" : ""}`}
                title="Cor em lote"
                onClick={() =>
                  setActiveContextPanel((current) => (current === "multi-color" ? null : "multi-color"))
                }
              >
                <Palette size={14} strokeWidth={2.2} />
              </button>
              <button title="Duplicar seleção" onClick={() => duplicateNodes(selectedIds)}>
                <Copy size={16} strokeWidth={2.2} />
              </button>
              <button title="Excluir seleção" className="danger" onClick={() => removeNodes(selectedIds)}>
                <Trash2 size={16} strokeWidth={2.2} />
              </button>
            </div>

            {activeContextPanel === "multi-color" ? (
              <div
                className="context-popover color-popover"
                style={{
                  left:
                    multiSelectionColorPopoverPosition?.left ??
                    multiSelectionOverlay.left + multiSelectionOverlay.width / 2,
                  top: multiSelectionColorPopoverPosition?.top ?? multiSelectionOverlay.top - 6,
                }}
                onPointerDown={stopCanvasPointerFlow}
                onClick={stopCanvasPropagation}
                onWheel={stopCanvasWheel}
              >
                <div className="color-swatch-grid">
                  {NODE_COLORS.map((color) => (
                    <button
                      key={`multi-${color}`}
                      className="color-swatch"
                      style={{ "--swatch-color": color }}
                      onClick={() => {
                        setNodesColor(selectedIds, color);
                        setActiveContextPanel(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {contextMenu ? (
          <div
            className="context-menu"
            style={{ left: contextMenu.left, top: contextMenu.top }}
            onPointerDown={stopCanvasPropagation}
            onClick={stopCanvasPropagation}
            onWheel={stopCanvasWheel}
          >
            <button onClick={() => runContextAction("create")}>Criar</button>
            <button onClick={() => runContextAction("duplicate")} disabled={contextMenu.type !== "node"}>
              Duplicar
            </button>
            <button onClick={() => runContextAction("connect")} disabled={contextMenu.type !== "node"}>
              Conectar
            </button>
            <button onClick={() => runContextAction("clear-links")} disabled={contextMenu.type !== "node"}>
              Remover conexões
            </button>
            <button onClick={() => runContextAction("image")} disabled={contextMenu.type !== "node"}>
              Imagem
            </button>
            <button onClick={() => runContextAction("link")} disabled={contextMenu.type !== "node"}>
              Link
            </button>
            <button
              className="danger"
              onClick={() => runContextAction("delete")}
              disabled={contextMenu.type !== "node" || contextMenu.nodeId === map.rootId}
            >
              Excluir
            </button>
          </div>
        ) : null}

        {isMarkdownModalOpen ? (
          <div className="modal-backdrop" onPointerDown={() => setIsMarkdownModalOpen(false)}>
            <div
              className="markdown-modal"
              onPointerDown={stopCanvasPropagation}
              onClick={stopCanvasPropagation}
            >
              <div className="markdown-modal-head">
                <div>
                  <p className="label">Markdown</p>
                  <h3>Colar texto para virar mapa mental</h3>
                </div>
                <button onClick={() => setIsMarkdownModalOpen(false)}>×</button>
              </div>
              <textarea
                value={markdownDraft}
                onChange={(event) => setMarkdownDraft(event.target.value)}
                placeholder={"Cole aqui seu Markdown...\n\n# Título\n## Seção\n- Item\n- Outro item"}
              />
              <div className="markdown-modal-actions">
                <button onClick={() => setIsMarkdownModalOpen(false)}>Cancelar</button>
                <button
                  onClick={() => {
                    importMarkdownText(markdownDraft);
                    setIsMarkdownModalOpen(false);
                    setMarkdownDraft("");
                  }}
                  disabled={!markdownDraft.trim()}
                >
                  Gerar mapa
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isTemplateModalOpen ? (
          <div className="modal-backdrop" onPointerDown={() => setIsTemplateModalOpen(false)}>
            <div
              className="markdown-modal template-modal"
              onPointerDown={stopCanvasPropagation}
              onClick={stopCanvasPropagation}
            >
              <div className="markdown-modal-head">
                <div>
                  <p className="label">Templates</p>
                  <h3>Como você quer começar este mapa?</h3>
                </div>
                <button onClick={() => setIsTemplateModalOpen(false)}>×</button>
              </div>

              <div className="template-grid">
                {TEMPLATE_OPTIONS.map((template) => (
                  <button
                    key={template.id}
                    className={`template-card ${template.id === "blank" ? "template-card-blank" : ""}`}
                    style={{ "--template-accent": template.accent }}
                    onClick={() => resetMap(template.id)}
                  >
                    <div className="template-card-top">
                      <span className="template-chip">{template.eyebrow}</span>
                      <span className="template-dot" />
                    </div>
                    <div className="template-card-body">
                      <h4>{template.name}</h4>
                      <p>{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="markdown-modal-actions">
                <button onClick={() => setIsTemplateModalOpen(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        ) : null}

        {assetModal.type ? (
          <div className="modal-backdrop" onPointerDown={closeAssetModal}>
            <div
              className="markdown-modal asset-modal"
              onPointerDown={stopCanvasPropagation}
              onClick={stopCanvasPropagation}
            >
              <div className="markdown-modal-head">
                <div>
                  <p className="label">{assetModal.type === "image" ? "Imagem" : "Link"}</p>
                  <h3>
                    {assetModal.type === "image"
                      ? "Adicionar imagem ao nó"
                      : "Adicionar link ao nó"}
                  </h3>
                </div>
                <button onClick={closeAssetModal}>×</button>
              </div>

              {assetModal.type === "image" ? (
                <div className="asset-section">
                  <button
                    className="asset-upload-button"
                    onClick={() => assetFileInputRef.current?.click()}
                  >
                    Upload do computador
                  </button>
                  <input
                    ref={assetFileInputRef}
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={handleAssetFileChange}
                  />
                  <label className="asset-field">
                    <span>Ou use uma URL de imagem</span>
                    <input
                      value={assetModal.url}
                      onChange={(event) =>
                        setAssetModal((current) => ({ ...current, url: event.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </label>
                </div>
              ) : (
                <label className="asset-field">
                  <span>URL do link</span>
                  <input
                    value={assetModal.url}
                    onChange={(event) =>
                      setAssetModal((current) => ({ ...current, url: event.target.value }))
                    }
                    placeholder="https://..."
                  />
                </label>
              )}

              <div className="markdown-modal-actions">
                {assetModal.type === "image" ? (
                  <button
                    onClick={() => {
                      if (assetModal.nodeId) {
                        setNodeFields(assetModal.nodeId, { imageUrl: "" });
                        setStatus("Imagem removida do nó");
                      }
                      closeAssetModal();
                    }}
                    disabled={!map.nodes[assetModal.nodeId]?.imageUrl}
                  >
                    Remover imagem
                  </button>
                ) : null}
                {assetModal.type === "link" ? (
                  <button
                    onClick={() => {
                      if (assetModal.nodeId) {
                        setNodeFields(assetModal.nodeId, { linkUrl: "" });
                        setStatus("Link removido do nó");
                      }
                      closeAssetModal();
                    }}
                    disabled={!map.nodes[assetModal.nodeId]?.linkUrl}
                  >
                    Remover link
                  </button>
                ) : null}
                <button onClick={closeAssetModal}>Cancelar</button>
                <button onClick={saveAssetModal} disabled={!assetModal.url.trim() && assetModal.type !== "image"}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isFreeEdgeLabelModalOpen && selectedFreeEdge ? (
          <div
            className="modal-backdrop"
            onPointerDown={() => {
              setIsFreeEdgeLabelModalOpen(false);
            }}
          >
            <div
              className="markdown-modal asset-modal"
              onPointerDown={stopCanvasPropagation}
              onClick={stopCanvasPropagation}
            >
              <div className="markdown-modal-head">
                <div>
                  <p className="label">Conexão</p>
                  <h3>Editar rótulo da conexão</h3>
                </div>
                <button onClick={() => setIsFreeEdgeLabelModalOpen(false)}>×</button>
              </div>

              <label className="asset-field">
                <span>Texto do rótulo</span>
                <input
                  value={freeEdgeLabelDraft}
                  onChange={(event) => setFreeEdgeLabelDraft(event.target.value)}
                  placeholder="Ex.: depende de, relacionado a, referência"
                />
              </label>

              <div className="markdown-modal-actions">
                <button
                  onClick={() => {
                    setFreeEdgeFields(selectedFreeEdge.id, { label: "" });
                    setIsFreeEdgeLabelModalOpen(false);
                  }}
                  disabled={!selectedFreeEdge.label}
                >
                  Remover rótulo
                </button>
                <button onClick={() => setIsFreeEdgeLabelModalOpen(false)}>Cancelar</button>
                <button
                  onClick={() => {
                    setFreeEdgeFields(selectedFreeEdge.id, { label: freeEdgeLabelDraft.trim() });
                    setIsFreeEdgeLabelModalOpen(false);
                  }}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isExportModalOpen ? (
          <div className="modal-backdrop" onPointerDown={() => setIsExportModalOpen(false)}>
            <div
              className="markdown-modal export-modal"
              onPointerDown={stopCanvasPropagation}
              onClick={stopCanvasPropagation}
            >
              <div className="markdown-modal-head">
                <div>
                  <p className="label">Exportar</p>
                  <h3>Escolha o formato do mapa</h3>
                </div>
                <button onClick={() => setIsExportModalOpen(false)}>×</button>
              </div>

              <div className="export-options">
                <button
                  onClick={() => {
                    exportMap();
                    setIsExportModalOpen(false);
                  }}
                >
                  JSON
                </button>
                <button
                  onClick={async () => {
                    setIsExportModalOpen(false);
                    await exportAsSvg();
                  }}
                >
                  SVG
                </button>
                <button
                  onClick={async () => {
                    setIsExportModalOpen(false);
                    await exportAsPdf();
                  }}
                >
                  PDF
                </button>
                <button
                  onClick={async () => {
                    setIsExportModalOpen(false);
                    await exportAsImage();
                  }}
                >
                  Imagem
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="minimap">
          {visibleNodes.map((node) => {
            if (!node.parentId) return null;
            const parent = map.nodes[node.parentId];
            const x1 = (parent.x - bounds.minX) * miniScale + 8;
            const y1 = (parent.y - bounds.minY) * miniScale + 8;
            const x2 = (node.x - bounds.minX) * miniScale + 8;
            const y2 = (node.y - bounds.minY) * miniScale + 8;
            const length = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1);

            return (
              <div
                key={`mini-${node.id}`}
                className="mini-edge"
                style={{
                  left: x1,
                  top: y1,
                  width: length,
                  transform: `rotate(${angle}rad)`,
                }}
              />
            );
          })}

          {visibleFreeEdges.map((edge) => {
            const fromNode = map.nodes[edge.fromId];
            const toNode = map.nodes[edge.toId];
            if (!fromNode || !toNode) return null;

            const geometry = getFreeEdgeGeometry(edge, fromNode, toNode, map.rootId);

            return geometry.points.slice(0, -1).map((point, index) => {
              const nextPoint = geometry.points[index + 1];
              const x1 = (point.x - bounds.minX) * miniScale + 8;
              const y1 = (point.y - bounds.minY) * miniScale + 8;
              const x2 = (nextPoint.x - bounds.minX) * miniScale + 8;
              const y2 = (nextPoint.y - bounds.minY) * miniScale + 8;
              const length = Math.hypot(x2 - x1, y2 - y1);
              const angle = Math.atan2(y2 - y1, x2 - x1);

              return (
                <div
                  key={`free-${edge.id}-${index}`}
                  className="mini-edge mini-edge-free"
                  style={{
                    left: x1,
                    top: y1,
                    width: length,
                    borderTopWidth: `${Math.max(1, (edge.thickness || DEFAULT_FREE_EDGE_THICKNESS) - 1)}px`,
                    borderTopStyle:
                      edge.style === "dotted" ? "dotted" : edge.style === "solid" ? "solid" : "dashed",
                    borderTopColor: edge.color || DEFAULT_FREE_EDGE_COLOR,
                    transform: `rotate(${angle}rad)`,
                  }}
                />
              );
            });
          })}

          {visibleNodes.map((node) => (
            <div
              key={`dot-${node.id}`}
              className={`mini-node ${selectedIdSet.has(node.id) ? "active" : ""}`}
              style={{
                left: (node.x - bounds.minX) * miniScale + 6,
                top: (node.y - bounds.minY) * miniScale + 6,
                background: node.color,
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
