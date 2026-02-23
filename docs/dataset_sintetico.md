# Dataset Sintetico - Plano de Geracao

Objetivo: complementar o dataset real com diagramas sinteticos, garantindo licenca segura e classes balanceadas.

## Abordagens recomendadas (ordem de prioridade)

### A) C4-PlantUML (MIT) + export SVG
- Por que: licenca permissiva, gera diagramas de arquitetura consistentes.
- Como:
  1) Criar templates C4 (Context/Container) com as classes base.
  2) Gerar SVG/PNG via PlantUML.
  3) Extrair bounding boxes do SVG (retangulos e labels).
  4) Converter para anotacoes estruturadas em JSON.
- Vantagem: controle total do layout e dos componentes.
- Risco: precisa parsing do SVG (trabalho tecnico moderado).

### B) diagrams (MIT) + Graphviz JSON
- Por que: rapido para criar variacoes de arquiteturas.
- Como:
  1) Gerar diagramas com nodes genericos (evitar logos proprietarios).
  2) Exportar em DOT e JSON (Graphviz suporta output com coordenadas).
  3) Converter coordenadas para anotacoes estruturadas em JSON.
- Vantagem: muitas variacoes com pouco codigo.
- Risco: dependencia do Graphviz e parsing do output.

### C) drawio-diagrams (Apache-2.0) + templates
- Por que: possui muitos templates e exemplos prontos.
- Como:
  1) Selecionar templates genericos (cloud/network/software).
  2) Exportar para PNG/SVG.
  3) Anotar manualmente as primeiras amostras.
- Vantagem: qualidade visual alta.
- Risco: possiveis logos proprietarios em alguns templates.

## Regras para evitar risco legal
- Evitar logos e marcas de vendors quando nao houver permissao explicita.
- Preferir formas genericas (retangulos, cilindros, filas).
- Manter classes base genericas (database, backend_service, external_system).

## Padrao minimo do dataset sintetico
- 30 a 50 imagens iniciais.
- 5 a 12 componentes por diagrama.
- Cada classe base aparece em pelo menos 20 imagens.
- Variar layouts (horizontal, vertical, hub-and-spoke).

## Variacoes e realismo
- Labels com sinonimos (API, Service, Backend, DB, Queue).
- Variar cores e espessura de linha.
- Opcional: leve rotacao, compressao e ruido para simular screenshots.

## Saidas esperadas
- `data/raw/images` com PNGs gerados.
- `data/raw/annotations` com anotacoes estruturadas.
- Registro no inventario com fonte "sintetico".
