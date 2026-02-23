# GUIA do Projeto

## Objetivo
Entregar analise STRIDE de diagramas de arquitetura com fluxo LLM-first e saida em portugues.

## Escopo funcional
- Entrada: imagem (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`, `BMP`).
- Estagio 1 (Vision): extrai `context_summary`, `components`, `groups`, `flows`.
- Estagio 2 (STRIDE): gera ameacas, mitigacoes e recomendacoes com RAG local.
- Persistencia: cada processamento fica salvo em SQLite e pode ser reaberto.
- Saida: JSON + PDF.

## Arquitetura
- `frontend/web`: upload, historico e tela de resultado.
- `frontend/mobile`: fluxo equivalente no app com galeria/camera.
- `backend`: FastAPI, banco SQLite, servicos Vision/STRIDE/Report.

Fluxo:
1. Frontend envia imagem para `POST /api/analysis`.
2. Backend processa Vision.
3. Backend processa STRIDE com contexto de `backend/app/knowledge/stride_rag.md`.
4. Backend salva resultado e disponibiliza endpoints de consulta, imagem e PDF.

## Arquitetura alvo com LangChain
Objetivo: manter os mesmos endpoints e contrato de resposta, trocando a orquestracao interna por chains.

Camadas previstas:
1. `VisionChain`
- Entrada: imagem normalizada.
- Saida: `DiagramAnalysis` validado.
- Responsabilidade: extracao estruturada com parser consistente.

2. `StrideChain`
- Entrada: `DiagramAnalysis`.
- Saida: `STRIDEReport` validado.
- Responsabilidade: analise STRIDE com prompts controlados e saida estruturada.

3. `RAGChain`
- Entrada: consulta derivada do diagrama.
- Saida: contexto recuperado + ids para citacao.
- Responsabilidade: retrieval e preparacao de contexto para a `StrideChain`.

4. `OrchestratorChain`
- Encadeia Vision -> RAG -> STRIDE.
- Aplica validacoes de schema e regras deterministicas de pos-processamento.

## Endpoints
- `POST /api/analysis`
- `GET /api/analysis`
- `GET /api/analysis/{id}`
- `GET /api/analysis/{id}/image`
- `GET /api/analysis/{id}/pdf`
- `GET /api/health`

## Contrato de resposta (resumo)
`AnalysisResponse`:
- `id`, `image_filename`, `image_url`, `status`
- `diagram`: `context_summary`, `components[]`, `groups[]`, `flows[]`
- `stride`: `summary`, `threats[]`, `recommendations[]`
- `error_message`, `created_at`, `completed_at`

Cada item de `threats[]` inclui rastreabilidade:
- `evidence`
- `reference_ids`

Regra de compatibilidade:
- Durante a migracao para LangChain, `AnalysisResponse` nao pode mudar.
- Web e mobile devem funcionar sem alteracao de contrato.

## Regras de idioma
- Resultado exibido ao usuario deve estar em portugues (pt-BR).
- `stride_category` e `severity` permanecem nos enums tecnicos do contrato.

## Ordem de exibicao na tela/PDF
1. Imagem submetida.
2. Contexto da infraestrutura (`context_summary`).
3. Resumo de severidade.
4. Listagem de ameacas.
5. Recomendacoes.

## Execucao local
### Backend
```bash
cd backend
# criar backend/.env com OPENAI_API_KEY
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Swagger: `http://localhost:8000/api/docs`

### Web
```bash
cd frontend/web
npm install
npm run dev
```
App: `http://localhost:5173`

### Mobile
```bash
cd frontend/mobile
npm install
npx expo start
```
Para uso no celular (Expo Go), mantenha celular e computador na mesma rede Wi-Fi.

### Menu unico (Windows)
```bat
run.bat
```
Menu atual:
1. Subir web
2. Subir mobile com QR Code (rede local)
4. Executar teste automatico (pasta `teste`)

## Testes automatizados
- Pasta: `teste/`
- Script: `teste/test_batch.py`
- Relatorio: `teste/test_report.json`

Execucao direta:
```bash
python teste/test_batch.py
```

## Criterios de aceite da migracao LangChain
1. API publica inalterada (`/api/analysis`, `/api/analysis/{id}`, `/image`, `/pdf`).
2. Resultado em portugues preservado.
3. Campos `evidence` e `reference_ids` presentes nas ameacas.
4. Teste automatizado em `teste/` com 100% de sucesso nas imagens base.
5. Sem degradacao de desempenho perceptivel para o usuario no fluxo principal.

## Checklist rapido de validacao
1. Subir backend e abrir Swagger.
2. Processar imagem e confirmar status `done`.
3. Validar `context_summary`, `threats`, `evidence` e `reference_ids`.
4. Validar historico (`GET /api/analysis`) e reabertura (`GET /api/analysis/{id}`).
5. Validar imagem original (`GET /api/analysis/{id}/image`).
6. Baixar PDF e validar imagem + contexto + listagens.
7. Repetir no web e no mobile.
