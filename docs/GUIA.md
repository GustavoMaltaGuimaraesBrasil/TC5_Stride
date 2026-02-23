# GUIA do Projeto

## Objetivo
Entregar analise STRIDE de diagramas de arquitetura com fluxo LLM-first.

## Escopo atual
- Entrada: imagem de diagrama (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`).
- Estagio 1: GPT-4o extrai componentes, grupos e fluxos em JSON.
- Estagio 2: GPT-4o + regras deterministicas gera ameacas e mitigacoes STRIDE.
- Saida: JSON, persistencia local (SQLite) e PDF.

## Arquitetura
- `frontend/web`: upload, visualizacao de resultados e download de PDF.
- `frontend/mobile`: fluxo equivalente para app mobile.
- `backend`: API FastAPI, servicos de visao/STRIDE/relatorio, persistencia SQLite.

Fluxo:
1. Frontend envia imagem para `POST /api/analysis`.
2. Backend executa extracao visual.
3. Backend executa analise STRIDE.
4. Backend salva resultado e disponibiliza consulta e PDF.

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
3. Confirmar retorno com `summary`, `threats` e `recommendations`.
4. Baixar PDF e validar integridade.
5. Repetir teste no web e no mobile.
