# STRIDE Threat Modeler (LLM-first)

MVP para modelagem automatizada de ameacas STRIDE a partir de diagramas de arquitetura.

## Visao geral
- Entrada: imagem de diagrama (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`, `BMP`).
- Estagio 1 (Vision): GPT-4o extrai `context_summary`, componentes, grupos e fluxos em JSON.
- Estagio 2 (STRIDE): GPT-4o + RAG local + regras deterministicas gera ameacas e mitigacoes.
- Saida: resposta JSON, persistencia em SQLite e relatorio PDF.

## Stack
- Backend: FastAPI + SQLAlchemy async + SQLite
- Web: React + TypeScript + Vite
- Mobile: React Native + Expo
- IA: OpenAI GPT-4o (vision + texto)

## Estrutura
- `backend/`: API, modelos, servicos e prompts
- `frontend/web/`: interface web
- `frontend/mobile/`: app mobile
- `docs/GUIA.md`: documentacao operacional unica
- `scripts/`: scripts utilitarios

## Executar localmente

### 1) Backend
```bash
cd backend
# criar backend/.env e preencher OPENAI_API_KEY
python -m uvicorn app.main:app --reload --port 8000
```

Documentacao Swagger: `http://localhost:8000/api/docs`

### 2) Frontend web
```bash
cd frontend/web
npm install
npm run dev
```

App web: `http://localhost:5173`

### 3) Mobile (opcional)
```bash
cd frontend/mobile
npm install
npx expo start
```

## API principal
- `POST /api/analysis`: upload e analise completa
- `GET /api/analysis`: historico
- `GET /api/analysis/{id}`: detalhes
- `GET /api/analysis/{id}/pdf`: download do relatorio
- `GET /api/health`: health check

## Rastreabilidade STRIDE (RAG)
- Cada ameaca retornada inclui:
  - `evidence`: evidencias observadas no diagrama/fluxos/boundaries.
  - `reference_ids`: ids de referencias de seguranca usadas na decisao (ex.: `STRIDE-001`).
- Base local de conhecimento: `backend/app/knowledge/stride_rag.md`.

## Exibicao de resultado
- Web e mobile exibem:
  - a imagem submetida,
  - o `context_summary` da etapa Vision,
  - e depois as listagens de ameacas/recomendacoes.
- O PDF tambem inclui:
  - imagem submetida,
  - contexto da infraestrutura,
  - e listagens STRIDE.

## Status
- Pipeline LLM ponta a ponta implementado.
- Proximo passo recomendado: validar com diagramas reais e ajustar prompts para qualidade de extracao.

## Documentacao
- `AGENTS.md`: regras de trabalho e protocolo de execucao.
- `docs/GUIA.md`: arquitetura, operacao e checklist de validacao.
