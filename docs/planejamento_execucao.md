# Planejamento de Execucao - MVP STRIDE (LLM-first)

## Direcao tecnica
- Arquitetura em camadas: Frontend (web/mobile) -> Backend FastAPI -> Services -> SQLite.
- Dois estagios de LLM: extracao visual e analise STRIDE.
- Regras deterministicas para robustez.
- Sem pipeline de ML no escopo.

## Stack
- Web: React + TypeScript + Vite
- Mobile: React Native + Expo + TypeScript
- Backend: FastAPI + Python
- IA: OpenAI GPT-4o
- Persistencia: SQLite + SQLAlchemy

## Estrutura do repositorio
- `backend/`
- `frontend/web/`
- `frontend/mobile/`
- `docs/`
- `scripts/`

## Contratos
- Estagio 1 retorna JSON de componentes, grupos e fluxos.
- Estagio 2 retorna JSON com resumo, ameacas e recomendacoes STRIDE.

## Plano adaptativo
- Falha de API externa: fallback por regras + mensagens claras de erro.
- Falha de frontend: validar fluxo via Swagger.
- Falha de PDF: manter entrega em JSON.

## Checklist
- [x] Backend funcional
- [x] Frontend web funcional
- [x] Mobile funcional
- [x] Persistencia e PDF
- [ ] Validacao com casos reais e ajustes finos de prompt

