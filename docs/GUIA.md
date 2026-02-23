# GUIA do Projeto

## Objetivo
Entregar analise STRIDE de diagramas de arquitetura com fluxo LLM-first.

## Escopo atual
- Entrada: imagem de diagrama (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`, `BMP`).
- Estagio 1: GPT-4o extrai `context_summary`, componentes, grupos e fluxos em JSON.
- Estagio 2: GPT-4o + RAG local + regras deterministicas gera ameacas e mitigacoes STRIDE.
- Saida: JSON, persistencia local (SQLite) e PDF.

## Arquitetura
- `frontend/web`: upload, visualizacao de resultados e download de PDF.
- `frontend/mobile`: fluxo equivalente para app mobile.
- `backend`: API FastAPI, servicos de visao/STRIDE/relatorio, persistencia SQLite.

Fluxo:
1. Frontend envia imagem para `POST /api/analysis`.
2. Backend executa extracao visual.
3. Backend executa analise STRIDE com contexto recuperado de `backend/app/knowledge/stride_rag.md`.
4. Backend salva resultado e disponibiliza consulta e PDF.

## Contrato de resposta STRIDE (rastreavel)
Cada item em `threats[]` inclui:
- `description`: ameaca identificada.
- `mitigation`: acao recomendada.
- `affected_flows`: fluxos impactados.
- `evidence`: evidencias usadas pela LLM (componentes, fluxos, boundary crossing).
- `reference_ids`: ids de referencias RAG usadas na decisao (ex.: `STRIDE-001`).

## Contrato de resposta Vision
`diagram` inclui:
- `context_summary`: explicacao curta do contexto de infraestrutura/projeto inferido pela etapa Vision.
- `components[]`, `groups[]`, `flows[]`.

## Ordem de exibicao no resultado
1. Imagem submetida.
2. Contexto da infraestrutura (`context_summary`).
3. Cards de resumo.
4. Listagens STRIDE (ameacas e recomendacoes).

Essa mesma ordem base (imagem + contexto antes das listagens) tambem aparece no PDF.

## Execucao local
### Backend
```bash
cd backend
# criar backend/.env com OPENAI_API_KEY
python -m uvicorn app.main:app --reload --port 8000
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

## Endpoints principais
- `POST /api/analysis`
- `GET /api/analysis`
- `GET /api/analysis/{id}`
- `GET /api/analysis/{id}/pdf`
- `GET /api/health`

## Checklist rapido de validacao
1. Subir backend e abrir Swagger.
2. Enviar um diagrama por `POST /api/analysis`.
3. Confirmar retorno com `diagram.context_summary`, `summary`, `threats`, `recommendations`, `evidence` e `reference_ids`.
4. Validar que web/mobile mostram imagem + contexto antes das listagens.
5. Baixar PDF e validar imagem + contexto + integridade.
6. Repetir teste no web e no mobile.
