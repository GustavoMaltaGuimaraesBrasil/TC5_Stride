# Ponto de Continuacao

Resumo do estado atual e proxima sequencia de execucao.

## Estado atual
- Backend funcional em `backend/` (FastAPI + SQLite + servicos Vision/STRIDE/Report).
- Frontend web funcional em `frontend/web/`.
- App mobile funcional em `frontend/mobile/`.
- Documentacao consolidada em `AGENTS.md` e `docs/`.

## Decisoes tecnicas
- Estrategia LLM-first com GPT-4o para extracao e analise.
- Regras deterministicas como fallback no STRIDE Service.
- Sem pipeline de ML no escopo do projeto.

## Proximos passos recomendados
1. Configurar `backend/.env` com `OPENAI_API_KEY`.
2. Subir backend: `cd backend && python -m uvicorn app.main:app --reload --port 8000`.
3. Subir web: `cd frontend/web && npm install && npm run dev`.
4. Validar com diagramas reais.
5. Subir mobile quando necessario: `cd frontend/mobile && npm install && npx expo start`.

## Links internos
- Guia rapido: `README.md`
- Guia de colaboracao: `AGENTS.md`
- Plano tecnico: `docs/planejamento_execucao.md`
- Escopo final: `docs/planejamento_final.md`

