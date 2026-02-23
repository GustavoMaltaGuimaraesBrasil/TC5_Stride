# Planejamento de Execucao - MVP STRIDE v2 (LLM + React)

## 3 linhas de raciocinio (senior)
- Arquiteto de sistemas: arquitetura em camadas (React -> FastAPI -> Services -> SQLite), desacoplada e testavel.
- Especialista em IA: dois estagios de LLM com prompts e schemas bem definidos, regras deterministicas como fallback.
- Programador senior: foco em entrega incremental — backend funcional primeiro, frontend depois, mobile so se sobrar tempo.

Sintese: pipeline LLM de dois estagios com backend robusto, frontend React minimo e banco local.

## Decisoes chave e porques (v2)
- **OpenAI GPT-4o Vision como extrator principal**: sem tempo para treinar modelo; LLM multimodal e capaz de extrair componentes, fluxos e grupos de diagramas.
- **Dois estagios de LLM**: Estagio 1 (extracao visual) e Estagio 2 (analise STRIDE) separados para testabilidade e auditoria.
- **FastAPI como backend**: python (mesmo ecossistema), async, auto-docs Swagger, facil de conectar com React.
- **React como frontend**: permite web e PWA/mobile futura; separacao limpa de responsabilidades.
- **SQLite como banco local**: zero config, arquivo unico, perfeito para MVP; migravel para PostgreSQL.
- **Regras deterministicas como fallback**: se LLM falhar ou alucinar, baseline STRIDE por tipo de componente garante resultado.

## Stack tecnologica
| Camada | Tecnologia | Versao |
| --- | --- | --- |
| Frontend Web | React + TypeScript + Vite | React 18+ |
| Frontend Mobile | React Native + Expo + TypeScript | Expo SDK 52+ |
| Backend | FastAPI + Python | Python 3.11+ |
| LLM | OpenAI API (GPT-4o) | gpt-4o |
| ORM | SQLAlchemy | 2.0+ |
| Banco | SQLite | 3 |
| PDF | ReportLab | latest |
| HTTP Client | openai SDK | latest |

## Estrutura do repositorio (v2)
```
/
  backend/
    app/
      __init__.py
      main.py              # FastAPI app
      config.py             # Settings (API keys, DB path)
      models/
        __init__.py
        database.py         # SQLAlchemy models
        schemas.py          # Pydantic schemas (request/response)
      services/
        __init__.py
        vision.py           # OpenAI Vision (estagio 1)
        stride.py           # STRIDE analysis (estagio 2)
        report.py           # PDF generation
      routers/
        __init__.py
        analysis.py         # /api/analysis endpoints
        health.py           # /api/health
      prompts/
        vision_system.md    # System prompt estagio 1
        vision_user.md      # User prompt template estagio 1
        stride_system.md    # System prompt estagio 2
        stride_user.md      # User prompt template estagio 2
    requirements.txt
    .env.example
  frontend/
    src/
      App.tsx
      components/
      pages/
      services/
    package.json
    vite.config.ts
  mobile/
    App.tsx
    src/
      screens/              # UploadScreen, LoadingScreen, ResultsScreen
      components/            # SummaryCards, ThreatCard
      services/api.ts        # Mesmos tipos, adaptado para React Native
      theme/colors.ts
    app.json
    package.json
  data/                     # dataset anterior (mantido para referencia)
  config/                   # configs anteriores (mantidos)
  docs/
  tests/
  README.md
```

## Prompts e schemas (especificacao)

### Estagio 1: Vision (extracao de diagrama)
- Input: imagem (base64) + system prompt descrevendo o formato esperado.
- Output esperado: JSON com `components[]`, `groups[]`, `flows[]`.
- Cada componente: id, name, type (livre, mas sugerido: user, client, web_app, api_gateway, service, database, external, queue, storage, load_balancer, cache, cdn, auth).
- Cada grupo: id, name, type (trust_boundary, vpc, subnet, region, zone), component_ids[].
- Cada fluxo: from_id, to_id, label, protocol, bidirectional.

### Estagio 2: STRIDE (analise de ameacas)
- Input: JSON DiagramAnalysis + system prompt com matriz STRIDE.
- Output esperado: JSON com `summary{}`, `threats[]`, `recommendations[]`.
- Cada threat: id, stride_category (S/T/R/I/D/E), target_id, target_name, description, severity, mitigation, affected_flows[].

## Plano adaptativo (nada e escrito em pedra)
- Se API OpenAI cair: cache local + regras deterministicas como fallback.
- Se extracao de fluxos for imprecisa: STRIDE por componente primeiro.
- Se frontend atrasar: demo via Swagger UI.
- Se banco nao for essencial no demo: em memoria.
- Se PDF atrasar: JSON + visualizacao na UI.

## Checklist (tudo o que precisa ser feito)
- [x] Confirmar nova arquitetura (LLM + React + FastAPI + SQLite).
- [x] Atualizar documentacao do projeto.
- [x] Criar estrutura backend FastAPI.
- [x] Implementar Vision Service (OpenAI GPT-4o).
- [x] Implementar STRIDE Service (LLM + regras).
- [x] Configurar banco SQLite + models.
- [x] Criar endpoints REST.
- [x] Implementar geracao de relatorio PDF.
- [x] Criar frontend React minimo (web).
- [x] Criar app mobile React Native (Expo).
- [ ] Configurar API key OpenAI real e testar.
- [ ] Testar com 2+ diagramas reais.
- [ ] Documentar fluxo e resultados.
- [ ] Gravar video de ate 15 minutos.

## Estado atual (fev/2026)
- Backend completo: FastAPI com Vision Service, STRIDE Service, Report Service, banco SQLite, endpoints REST.
- Frontend web completo: React + TypeScript + Vite com upload, loading, resultados e download PDF.
- App mobile completo: React Native + Expo com galeria, camera, resultados e download PDF.
- Prompts de sistema definidos para Estagio 1 (Vision) e Estagio 2 (STRIDE).
- Regras deterministicas implementadas como fallback no STRIDE Service.
- Pendente: configurar API key real e testar pipeline ponta a ponta.
