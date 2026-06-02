# Mind Board

Editor de mapa mental visual construído em React, com foco em criação rápida, edição contextual, importação de Markdown e exportação em múltiplos formatos.

---

## Visão geral

O Mind Board foi pensado para transformar ideias, resumos e estruturas textuais em mapas mentais navegáveis.

Hoje o sistema já permite:

- criar mapas mentais visualmente
- editar nós inline
- importar Markdown e converter em estrutura de mapa
- adicionar imagens e links aos nós
- exportar em JSON, PDF e imagem com recorte automático da área útil

---

## Destaques

- Interface visual com canvas interativo
- Edição contextual diretamente nos cards
- Upload de imagem local ou por URL
- Modal melhorado para imagem e link
- Importação de `.md` e colagem de Markdown
- Exportação visual limpa e recortada automaticamente
- Persistência automática no navegador

---

## Preview

Você pode usar esta seção para inserir depois:

- screenshot da tela principal
- GIF curto criando e conectando nós
- GIF de importação de Markdown
- GIF de exportação

Exemplo de blocos sugeridos para o futuro:

```md
![Tela principal](./docs/screenshot-home.png)
![Criando mapa](./docs/create-map.gif)
```

---

## Requisitos

- `Node.js` 20+ recomendado
- `npm` 10+ recomendado

---

## Instalação

```bash
cd /Volumes/DockSSD/Projetos/mapa-mental
npm install
```

---

## Rodando em desenvolvimento

```bash
npm run dev
```

Depois abra a URL mostrada no terminal, normalmente:

```text
http://localhost:5173
```

---

## Build de produção

```bash
npm run build
```

Arquivos gerados:

```text
dist/
```

Para pré-visualizar o build:

```bash
npm run preview
```

---

## Stack

- `React`
- `Vite`
- `html-to-image`
- `jsPDF`
- `lucide-react`

---

## Estrutura do projeto

```text
mapa-mental/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── App.jsx
    ├── main.jsx
    └── styles.css
```

Arquivos principais:

- `src/App.jsx`: lógica do editor, importação, exportação e interação
- `src/styles.css`: estilos da interface
- `src/main.jsx`: bootstrap do app React

---

## Funcionalidades

### Edição do mapa

- criar novo mapa
- renomear o mapa pela barra superior
- criar tópico filho
- criar tópico irmão
- duplicar tópico
- remover tópico
- recolher e expandir ramos
- arrastar nós no canvas
- editar título diretamente no card
- editar nota diretamente no card
- alterar cor dos nós
- alterar cor completa do card principal

### Navegação

- zoom com scroll
- pan do canvas com `Espaço`
- botão `Centralizar`
- centralização do mapa visível
- auto layout
- minimapa

### Barra contextual e menu de contexto

- foco no nó selecionado
- paleta visual de cores
- adicionar imagem
- remover imagem
- adicionar link
- remover link
- duplicar
- excluir
- clique direito com ações rápidas
- ícones refinados com `lucide-react`

### Conteúdo por nó

- imagem por upload do computador
- imagem por URL
- link por URL
- nota descritiva
- remoção de imagem direto no card

### Importação

- importar mapa em `JSON`
- importar arquivo `.md`
- colar Markdown em modal

### Conversão de Markdown

O parser atual entende:

- `# título` como nome do mapa
- `##`, `###` e demais headings como tópicos
- listas com `- item` como subtópicos
- texto solto como nota do último tópico criado

### Exportação

- `JSON`
- `PDF`
- `Imagem`

Na exportação visual, o sistema:

- recorta automaticamente a área útil do mapa
- exporta em fundo branco limpo
- remove barra superior, grid, minimapa e overlays temporários
- renderiza cards, linhas, notas, imagens e links em uma prancha própria

---

## Fluxos principais

### Criar um mapa do zero

1. Clique em `Novo`
2. Renomeie o mapa na barra superior
3. Selecione o card principal
4. Use `Tab` ou os botões `+` para criar ramificações

### Editar um nó

1. Clique no nó
2. Edite o título no próprio card
3. Escreva a nota abaixo
4. Use a barra contextual para imagem, link, cor e duplicação

### Adicionar imagem ou link

1. Selecione um nó
2. Use a barra contextual
3. Para imagem, escolha:
   `Upload do computador`
   ou
   `URL da imagem`
4. Para link, informe a URL no modal

### Importar um resumo em Markdown

1. Clique em `MD` para enviar um arquivo
ou
2. Clique em `Colar MD`
3. Cole o conteúdo
4. Clique em `Gerar mapa`

### Exportar

1. Clique em `Exportar`
2. Escolha `JSON`, `PDF` ou `Imagem`

---

## Persistência

O estado atual do mapa fica salvo em `localStorage`.

Chave usada:

```text
mind-board-react
```

---

## Limitações atuais

- parser de Markdown ainda é simples
- ainda há estimativas em alguns cálculos de posicionamento
- imagens e links não têm edição avançada
- bundle está pesado por causa das dependências de exportação
- exportação ainda usa um renderer manual simplificado, então o visual pode divergir sutilmente do canvas em casos mais ricos

---

## Troubleshooting

### `npm install` mostra vulnerabilidade

Atualmente existe pelo menos `1 critical severity vulnerability` reportada por dependências. O projeto continua funcionando, mas isso deve ser revisado antes de um uso em produção.

### O build mostra aviso de chunk grande

As dependências de exportação visual aumentam bastante o bundle. O build passa normalmente, mas há espaço para otimização com carregamento sob demanda.

### A exportação visual sai com muito espaço em branco

O recorte automático já existe, mas casos extremos com conteúdo muito fora do fluxo principal ainda podem precisar de refinamento.

---

## Scripts disponíveis

```bash
npm run dev
npm run build
npm run preview
```

---

## Roadmap sugerido

### Curto prazo

- modais mais refinados para imagem e link
- melhoria do cálculo de altura real dos cards
- refinamento fino da barra contextual

### Médio prazo

- redimensionamento de imagem
- suporte a listas numeradas no parser Markdown
- edição mais rica de links e mídia
- melhorias de responsividade

### Longo prazo

- colaboração em tempo real
- backend de persistência real
- templates de mapas mentais
- histórico/versionamento

---

## To Do

- adicionar screenshots e GIFs reais no README
- melhorar parser de Markdown para listas numeradas e estruturas mais complexas
- refinar ainda mais o renderer manual de exportação
- medir altura real dos nós via DOM
- permitir redimensionar imagens
- permitir trocar imagem existente sem reabrir fluxo completo
- adicionar opção de ocultar minimapa
- melhorar experiência mobile
- otimizar bundle com lazy loading nas dependências de exportação
- revisar vulnerabilidades das dependências
- refinar microinterações e estados visuais
