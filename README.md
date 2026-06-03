# Mind Board

Editor de mapa mental visual feito em `React + Vite`, com foco em um fluxo limpo de criação, edição contextual, importação de Markdown e exportação pronta para compartilhamento.

## Destaques

- Canvas interativo com criação e edição rápida de nós
- Edição inline de título e nota diretamente nos cards
- Conexões livres entre nós com linha tracejada
- Imagens por upload local ou URL
- Links por nó
- Importação de `Markdown` e `JSON`
- Exportação em `JSON`, `PDF` e `PNG`
- Recorte automático da área útil na exportação
- Persistência automática no navegador

## Preview

Espaço preparado para screenshots e GIFs reais do projeto:

```md
![Tela principal](./docs/assets/screenshot-home.png)
![Importação Markdown](./docs/assets/import-markdown.gif)
![Exportação](./docs/assets/export-map.gif)
```

Arquivos sugeridos:

- `docs/assets/screenshot-home.png`
- `docs/assets/create-map.gif`
- `docs/assets/import-markdown.gif`
- `docs/assets/export-map.gif`

## Stack

- `React 19`
- `Vite`
- `lucide-react`
- `jsPDF`

## Requisitos

- `Node.js 20+`
- `npm 10+`

## Instalação

```bash
cd /Volumes/DockSSD/Projetos/mapa-mental
npm install
```

## Rodando localmente

```bash
npm run dev
```

Depois abra a URL mostrada no terminal, normalmente [http://localhost:5173](http://localhost:5173).

## Build de produção

```bash
npm run build
```

Para pré-visualizar o build:

```bash
npm run preview
```

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
- alterar a cor completa do card principal
- conectar nós fora da mesma hierarquia com linha tracejada
- editar cor, rótulo e remoção de conexões livres

### Navegação

- zoom com scroll
- pan do canvas com `Espaço`
- botão `Centralizar`
- auto layout
- minimapa

### Barra contextual e menu de contexto

- foco no nó selecionado
- paleta visual de cores
- adicionar e remover imagem
- adicionar e remover link
- duplicar e excluir
- iniciar conexões livres entre nós
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
- `##`, `###` e headings seguintes como tópicos
- listas com `- item` como subtópicos
- texto solto como nota do último tópico criado

### Exportação

- `JSON`
- `PDF`
- `Imagem`

Na exportação visual, o sistema:

- recorta automaticamente a área útil do mapa
- exporta com fundo branco limpo
- remove barra superior, grid, minimapa e overlays temporários
- renderiza cards, linhas, notas, imagens, links e conexões livres em uma prancha própria

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

### Criar uma conexão livre

1. Selecione um nó
2. Clique no ícone de conexão na toolbar contextual
3. Clique em outro nó
4. Clique na linha tracejada para editar cor, rótulo ou excluir

### Importar um resumo em Markdown

1. Clique em `MD` para enviar um arquivo
2. Ou clique em `Colar MD`
3. Cole o conteúdo
4. Clique em `Gerar mapa`

### Exportar

1. Clique em `Exportar`
2. Escolha `JSON`, `PDF` ou `Imagem`

## Estrutura do projeto

```text
mapa-mental/
├── docs/
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

- `src/App.jsx`: lógica do editor, importação, exportação e interações
- `src/styles.css`: estilos da interface
- `src/main.jsx`: bootstrap do app React
- `docs/README.md`: convenção para screenshots e GIFs do repositório

## Persistência

O estado atual do mapa, incluindo conexões livres, fica salvo em `localStorage` com a chave `mind-board-react`.

## Scripts disponíveis

```bash
npm run dev
npm run build
npm run preview
```

## Limitações atuais

- o parser de Markdown ainda é simples
- alguns cálculos de layout ainda usam estimativas
- imagens e links ainda não têm edição avançada
- o renderer manual de exportação ainda pode divergir sutilmente do canvas em casos mais ricos

## Troubleshooting

### O build mostra aviso de chunk grande

O fluxo de exportação foi movido para carregamento sob demanda, então o editor principal não precisa mais baixar a parte de PDF na carga inicial. Se ainda houver aviso em builds futuros, o próximo passo natural é segmentar mais chunks do renderer.

### A exportação visual sai com muito espaço em branco

O sistema já faz recorte automático por área útil e ainda aplica um corte final por leitura de pixels, o que reduz bastante margens sobrando. Se um nó estiver extremamente distante dos demais, o espaço entre eles ainda pode aparecer por representar a geometria real do mapa.

## Roadmap

### Curto prazo

- melhorar o cálculo de altura real dos cards
- refinar a barra contextual
- melhorar os modais de mídia e link

### Médio prazo

- redimensionamento de imagem
- suporte a listas numeradas no parser Markdown
- edição mais rica de links e mídia
- melhorias de responsividade

### Longo prazo

- colaboração em tempo real
- backend de persistência real
- templates de mapas mentais
- histórico e versionamento

## To Do

- adicionar screenshots e GIFs reais no README
- refinar o renderer manual de exportação
- medir altura real dos nós via DOM
- permitir redimensionar imagens
- permitir trocar imagem existente sem reabrir o fluxo completo
- adicionar opção de ocultar minimapa
- melhorar a experiência mobile
- refinar microinterações e estados visuais
