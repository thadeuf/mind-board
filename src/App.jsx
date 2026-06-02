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

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function createInitialMap() {
  const rootId = makeId();

  return {
    title: "Novo mapa mental",
    rootId,
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

function loadMap() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialMap();

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.rootId || !parsed?.nodes) return createInitialMap();
    return parsed;
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

function App() {
  const [map, setMap] = useState(() => loadMap());
  const [selectedId, setSelectedId] = useState(() => loadMap().rootId);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [status, setStatus] = useState("Pronto");
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeContextPanel, setActiveContextPanel] = useState(null);
  const [assetModal, setAssetModal] = useState(EMPTY_ASSET_MODAL);
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const fileInputRef = useRef(null);
  const markdownInputRef = useRef(null);
  const assetFileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }, [map]);

  useEffect(() => {
    if (selectedId && !map.nodes[selectedId]) {
      setSelectedId(map.rootId);
    }
  }, [map, selectedId]);

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

      if (isEditing) return;
      if (!selectedId) return;

      if (event.key === "Tab") {
        event.preventDefault();
        addChild(selectedId);
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeNode(selectedId);
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
  }, [selectedId, map]);

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
  const selectedNodeMetrics = selectedNode
    ? {
        width: getNodeWidth(selectedNode, map.rootId),
        height: getNodeHeight(selectedNode, map.rootId),
      }
    : null;
  const selectedNodeOverlay = selectedNode && selectedNodeMetrics
    ? {
        left: selectedNode.x * viewport.scale + viewport.x,
        top: selectedNode.y * viewport.scale + viewport.y,
        width: selectedNodeMetrics.width * viewport.scale,
        height: selectedNodeMetrics.height * viewport.scale,
      }
    : null;

  const transformStyle = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
  };

  function updateMap(updater, nextStatus) {
    setMap((current) => {
      const next = updater(current);
      return next;
    });
    if (nextStatus) setStatus(nextStatus);
  }

  function setNodeField(id, field, value) {
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
    }, "Mapa atualizado");
  }

  function setNodeFields(id, patch) {
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
    }, "Mapa atualizado");
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
    setSelectedId(childId);
  }

  function addSibling(nodeId) {
    const node = map.nodes[nodeId];
    if (!node?.parentId) return;
    addChild(node.parentId);
  }

  function removeNode(nodeId) {
    if (nodeId === map.rootId) return;

    updateMap((current) => {
      const target = current.nodes[nodeId];
      if (!target) return current;

      const toDelete = [];
      const visit = (id) => {
        const node = current.nodes[id];
        if (!node) return;
        toDelete.push(id);
        node.children.forEach(visit);
      };
      visit(nodeId);

      const nodes = { ...current.nodes };
      toDelete.forEach((id) => delete nodes[id]);

      const parent = current.nodes[target.parentId];
      if (parent) {
        nodes[parent.id] = {
          ...parent,
          children: parent.children.filter((childId) => childId !== nodeId),
        };
      }

      return {
        ...current,
        nodes,
      };
    }, "Tópico removido");

    setSelectedId(map.nodes[nodeId]?.parentId ?? map.rootId);
  }

  function duplicateNode(nodeId) {
    const cloneId = makeId();

    updateMap((current) => {
      const node = current.nodes[nodeId];
      if (!node) return current;
      const parentId = node.parentId ?? current.rootId;
      const parent = current.nodes[parentId];

      return {
        ...current,
        nodes: {
          ...current.nodes,
          [parentId]: {
            ...parent,
            children: [...parent.children, cloneId],
          },
          [cloneId]: {
            ...node,
            id: cloneId,
            title: `${node.title} cópia`,
            x: node.x + 36,
            y: node.y + 36,
            children: [],
            parentId,
          },
        },
      };
    }, "Tópico duplicado");
    setSelectedId(cloneId);
  }

  function autoLayout() {
    updateMap((current) => {
      const nodes = structuredClone(current.nodes);

      const walk = (parentId, direction, depth) => {
        const parent = nodes[parentId];
        if (!parent) return;
        const gapX = Math.max(230 - depth * 12, 150);
        const gapY = Math.max(94 - depth * 4, 70);
        const total = parent.children.length;

        parent.children.forEach((childId, index) => {
          const child = nodes[childId];
          if (!child) return;
          child.x = parent.x + gapX * direction;
          child.y = parent.y + index * gapY - ((total - 1) * gapY) / 2;
          walk(childId, direction, depth + 1);
        });
      };

      const root = nodes[current.rootId];
      root.x = 0;
      root.y = 0;

      root.children.forEach((childId, index) => {
        const child = nodes[childId];
        if (!child) return;
        const direction = index % 2 === 0 ? -1 : 1;
        child.x = root.x + 300 * direction;
        child.y = root.y + Math.floor(index / 2) * 170 - 85;
        walk(childId, direction, 1);
      });

      return {
        ...current,
        nodes,
      };
    }, "Layout reorganizado");
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
    const frame = frameRef.current;
    if (!frame || visibleNodes.length === 0) return;

    const rect = frame.getBoundingClientRect();
    const bounds = visibleNodes.reduce(
      (acc, node) => {
        const nodeBounds = getNodeBounds(node, map.rootId);
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

    setViewport((current) => ({
      ...current,
      x: rect.width / 2 - mapCenterX * current.scale,
      y: (rect.height + topOffset) / 2 - mapCenterY * current.scale,
    }));
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

  async function exportAsImage() {
    if (!frameRef.current) return;
    try {
      const canvas = await createExportCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(map.title || "mapa").toLowerCase().replace(/\s+/g, "-")}.png`;
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
      pdf.save(`${(map.title || "mapa").toLowerCase().replace(/\s+/g, "-")}.pdf`);
      setStatus("Mapa exportado como PDF");
    } catch {
      setStatus("Falha ao exportar PDF");
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
        setMap(parsed);
        setSelectedId(parsed.rootId);
        setStatus("Mapa importado");
        requestAnimationFrame(() => centerOnNode(parsed.rootId));
      } catch {
        setStatus("JSON inválido");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function importMarkdownText(markdownText) {
    const parsedMap = parseMarkdownToMap(markdownText);
    setMap(parsedMap);
    setSelectedId(parsedMap.rootId);
    setStatus("Markdown convertido em mapa");
    requestAnimationFrame(() => centerOnNode(parsedMap.rootId));
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
  }

  function handleCanvasPointerMove(event) {
    if (dragRef.current) {
      const world = getWorldPoint(event);
      const { id, offsetX, offsetY } = dragRef.current;
      updateMap((current) => {
        const node = current.nodes[id];
        if (!node) return current;
        return {
          ...current,
          nodes: {
            ...current.nodes,
            [id]: {
              ...node,
              x: world.x - offsetX,
              y: world.y - offsetY,
            },
          },
        };
      });
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
  }

  function handleNodePointerDown(event, node) {
    if (event.target.closest("input, textarea, button")) {
      event.stopPropagation();
      return;
    }

    event.stopPropagation();
    setSelectedId(node.id);

    const world = getWorldPoint(event);
    dragRef.current = {
      id: node.id,
      offsetX: world.x - node.x,
      offsetY: world.y - node.y,
    };
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

  function resetMap() {
    const freshMap = createInitialMap();
    setMap(freshMap);
    setSelectedId(freshMap.rootId);
    setViewport({ x: 0, y: 0, scale: 1 });
    setStatus("Novo mapa criado");
    requestAnimationFrame(() => centerOnNode(freshMap.rootId));
  }

  function stopCanvasPropagation(event) {
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
    setSelectedId(node.id);
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
      const curve = Math.max(Math.abs(endX - startX) * 0.36, 52);

      ctx.beginPath();
      ctx.moveTo(startX - exportBounds.minX + padding, startY - exportBounds.minY + padding);
      ctx.bezierCurveTo(
        startX + curve - exportBounds.minX + padding,
        startY - exportBounds.minY + padding,
        endX - curve - exportBounds.minX + padding,
        endY - exportBounds.minY + padding,
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
                setMap((current) => ({
                  ...current,
                  title: event.target.value,
                  nodes: {
                    ...current.nodes,
                    [current.rootId]: {
                      ...current.nodes[current.rootId],
                      title: event.target.value || "Meu novo mapa mental",
                    },
                  },
                }))
              }
              placeholder="Nome do mapa mental"
            />
          </div>
          <div className="toolbar">
            <button onClick={resetMap}>Novo</button>
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
          {visibleNodes.map((node) => {
            if (!node.parentId) return null;
            const parent = map.nodes[node.parentId];
            if (!parent) return null;
            const { startX, startY, endX, endY } = getEdgeAnchors(parent, node, map.rootId);
            const curve = Math.max(Math.abs(endX - startX) * 0.36, 52);

            return (
              <path
                key={`${parent.id}-${node.id}`}
                d={`M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke={selectedId === node.id || selectedId === parent.id ? "#4d7cff" : node.color}
                strokeOpacity={selectedId === node.id || selectedId === parent.id ? "0.95" : "0.68"}
                strokeWidth={selectedId === node.id ? 4 : 3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="node-layer" style={transformStyle}>
          {visibleNodes.map((node) => (
            <article
              key={node.id}
              className={`node-card ${selectedId === node.id ? "selected" : ""} ${node.id === map.rootId ? "root" : ""}`}
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
                setSelectedId(node.id);
              }}
            >
              <div className="node-head">
                <div className="node-title-row">
                  {selectedId === node.id ? (
                    <input
                      className="node-title-input"
                      value={node.title}
                      onChange={(event) => setNodeField(node.id, "title", event.target.value)}
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
              {selectedId === node.id ? (
                <div className="node-editor" onPointerDown={stopCanvasPropagation} onClick={stopCanvasPropagation}>
                  <textarea
                    className="node-note-input"
                    rows="2"
                    value={node.note}
                    onChange={(event) => setNodeField(node.id, "note", event.target.value)}
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
                  left: selectedNodeOverlay.left + selectedNodeOverlay.width / 2,
                  top: selectedNodeOverlay.top - 6,
                }}
                onPointerDown={stopCanvasPointerFlow}
                onClick={stopCanvasPropagation}
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

        {contextMenu ? (
          <div
            className="context-menu"
            style={{ left: contextMenu.left, top: contextMenu.top }}
            onPointerDown={stopCanvasPropagation}
            onClick={stopCanvasPropagation}
          >
            <button onClick={() => runContextAction("create")}>Criar</button>
            <button onClick={() => runContextAction("duplicate")} disabled={contextMenu.type !== "node"}>
              Duplicar
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

          {visibleNodes.map((node) => (
            <div
              key={`dot-${node.id}`}
              className={`mini-node ${selectedId === node.id ? "active" : ""}`}
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
