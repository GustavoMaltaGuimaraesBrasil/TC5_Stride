# STRIDE Threat Modeler (LLM-first)

MVP para modelagem automatizada de ameaças STRIDE a partir de diagramas de arquitetura.

## Visao geral
- Entrada: imagem de diagrama (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`).
- Estagio 1 (Vision): GPT-4o extrai componentes, grupos e fluxos em JSON.
- Estagio 2 (STRIDE): GPT-4o + regras deterministicas gera ameacas e mitigacoes.
- Saida: resposta JSON, persistencia em SQLite e relatorio PDF.

## Stack
- Backend: FastAPI + SQLAlchemy async + SQLite
- Web: React + TypeScript + Vite
- Mobile: React Native + Expo
- IA: OpenAI GPT-4o (vision + texto)

## Estrutura
- `backend/`: API, modelos, servicos e prompts
- `frontend/`: interface web
- `mobile/`: app mobile
- `docs/`: documentos de apoio

## Executar localmente

### 1) Backend
```bash
cd backend
copy .env.example .env
# preencher OPENAI_API_KEY no .env
python -m uvicorn app.main:app --reload --port 8000
```

Documentacao Swagger: `http://localhost:8000/api/docs`

### 2) Frontend web
```bash
cd frontend
npm install
npm run dev
```

App web: `http://localhost:5173`

### 3) Mobile (opcional)
```bash
cd mobile
npm install
npx expo start
```

## API principal
- `POST /api/analysis`: upload e analise completa
- `GET /api/analysis`: historico
- `GET /api/analysis/{id}`: detalhes
- `GET /api/analysis/{id}/pdf`: download do relatorio
- `GET /api/health`: health check

## Status
- Pipeline LLM ponta a ponta implementado.
- Proximo passo recomendado: validar com diagramas reais e ajustar prompts para qualidade de extracao.
