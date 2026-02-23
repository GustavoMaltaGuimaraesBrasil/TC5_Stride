# Ponto de Continuacao (v2 - LLM + React + Mobile)

Este arquivo resume o estado atual do projeto e os proximos passos para retomar o trabalho.

## O que ja foi feito
- **Backend completo** (`backend/`): FastAPI com config, models, schemas, services (Vision, STRIDE, Report), routers, prompts de sistema.
- **Frontend web completo** (`frontend/`): React + TypeScript + Vite com upload drag-and-drop, loading, resultados STRIDE e download PDF.
- **App mobile completo** (`mobile/`): React Native + Expo com galeria, camera, telas de loading/resultado, mesma identidade visual.
- **Banco SQLite** configurado com SQLAlchemy async (tabela `analyses`).
- **Prompts de sistema** para Estagio 1 (Vision) e Estagio 2 (STRIDE) em `backend/app/prompts/`.
- **Regras deterministicas** implementadas como fallback no STRIDE Service.
- Documentacao atualizada (agent.md, planejamento_final.md, planejamento_execucao.md).

## Decisoes tomadas (v2)
- **OpenAI GPT-4o Vision como extrator principal**: sem tempo para treinar modelo proprio.
- **Dois estagios LLM**: Estagio 1 (extracao visual) e Estagio 2 (analise STRIDE).
- **FastAPI** como backend API REST.
- **React + TypeScript** como frontend web (Vite).
- **React Native + Expo** como app mobile (Android/iOS).
- **SQLite** como banco local (via SQLAlchemy async).
- **Regras deterministicas** como fallback se LLM falhar.

## Proximos passos recomendados (ordem sugerida)
1) Colocar API key OpenAI real em `backend/.env`.
2) Subir backend: `cd backend && python -m uvicorn app.main:app --reload`.
3) Subir frontend web: `cd frontend && npm run dev`.
4) Testar pipeline com 2+ diagramas de arquitetura reais.
5) Para mobile: ajustar `API_BASE` em `mobile/src/services/api.ts` e rodar `cd mobile && npx expo start`.
6) Documentar resultados e gravar video.

## Como rodar
### Backend
```bash
cd backend
copy .env.example .env   # editar com API key real
python -m uvicorn app.main:app --reload --port 8000
```
Swagger docs: http://localhost:8000/api/docs

### Frontend Web
```bash
cd frontend
npm install
npm run dev
```
Acesso: http://localhost:5173

### Mobile
```bash
cd mobile
npm install
npx expo start
```
Escanear QR com Expo Go no celular. Ajustar IP do backend em `src/services/api.ts`.

## Nota de adaptacao
- Se API OpenAI cair: cache local + regras deterministicas.
- Se frontend atrasar: demo via Swagger UI do FastAPI.
- Se banco nao for essencial: usar em memoria.
