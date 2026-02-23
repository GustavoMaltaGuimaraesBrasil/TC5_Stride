# Planejamento Final - MVP STRIDE (v2 - LLM + React)

Objetivo: entregar um MVP ponta a ponta que recebe uma imagem de diagrama de arquitetura, extrai componentes/fluxos/grupos via OpenAI Vision, gera analise STRIDE e apresenta resultados em uma interface React com persistencia local.

## Escopo do MVP
- Entrada: imagem PNG/JPG/JPEG/GIF/WEBP de diagrama de arquitetura.
- Estagio 1 (Visao): GPT-4o Vision extrai componentes, grupos (trust boundaries), fluxos (setas) em JSON estruturado.
- Estagio 2 (STRIDE): Segundo prompt/modelo cruza JSON extraido com matriz STRIDE, gerando ameacas e mitigacoes.
- Saida: JSON estruturado + PDF executivo + visualizacao na interface React (web e mobile).
- Banco local: SQLite para historico de analises.
- Demo: upload de imagem na UI web ou app mobile -> resultado STRIDE visivel na tela + download PDF.

## Principios de arquitetura
- Pipeline de dois estagios LLM (Visao -> STRIDE), cada um com prompt e schema proprio.
- Regras deterministicas complementam LLM (anti-alucinacao).
- Arquitetura em camadas: Frontend Web (React) + Mobile (React Native) -> Backend (FastAPI) -> Services -> Data Layer.
- Codigo compartilhado: mesmos tipos/schemas e service layer entre web e mobile.
- Projeto adaptativo: se uma parte nao funcionar, mudamos a abordagem sem travar o MVP.

## Arquitetura geral (pipeline)
```
Imagem do diagrama
  -> Backend recebe via API REST
  -> Estagio 1: OpenAI GPT-4o Vision
     -> Extrai: componentes, tipos, grupos, fluxos (origem->destino), trust boundaries
     -> Saida: JSON estruturado (DiagramAnalysis)
  -> Estagio 2: OpenAI GPT-4o (texto)
     -> Recebe DiagramAnalysis JSON
     -> Cruza com matriz STRIDE por componente, por fluxo e por boundary
     -> Saida: JSON estruturado (STRIDEReport)
  -> Persistencia: salva analise no SQLite
  -> Relatorio: gera PDF a partir do STRIDEReport
  -> Frontend: exibe resultado na interface React
```

## Camadas e responsabilidades

### 1) Frontend (React)
- Single Page Application (SPA) com React + TypeScript.
- Pagina unica: upload de imagem, visualizacao de resultado STRIDE, historico.
- Responsiva (PWA-ready para mobile futuro).
- Comunicacao com backend via REST API (fetch/axios).

### 2) Backend API (FastAPI)
- Endpoints REST para upload, analise, historico, download PDF.
- Validacao de entrada (Pydantic models).
- CORS configurado para o frontend React.

### 3) Service Layer (Python)
- **VisionService**: envia imagem para OpenAI GPT-4o Vision, extrai JSON estruturado.
- **STRIDEService**: recebe JSON de componentes, aplica analise STRIDE via LLM + regras.
- **ReportService**: gera PDF a partir do resultado STRIDE.
- **StorageService**: salva/recupera imagens e resultados.

### 4) Data Layer
- SQLAlchemy ORM + SQLite (arquivo local).
- Tabelas: analyses (id, image_path, diagram_json, stride_json, created_at, status).
- Migracao futura para PostgreSQL se necessario.

## JSON Schemas (contratos entre estagios)

### DiagramAnalysis (saida do Estagio 1)
```json
{
  "components": [
    {"id": "c1", "name": "API Gateway", "type": "api_gateway", "group": "DMZ"}
  ],
  "groups": [
    {"id": "g1", "name": "DMZ", "type": "trust_boundary", "component_ids": ["c1"]}
  ],
  "flows": [
    {"from_id": "c1", "to_id": "c2", "label": "HTTPS", "protocol": "HTTPS", "bidirectional": false}
  ]
}
```

### STRIDEReport (saida do Estagio 2)
```json
{
  "summary": {"total_threats": 12, "critical": 3, "high": 5, "medium": 4, "low": 0},
  "threats": [
    {
      "id": "t1",
      "stride_category": "Spoofing",
      "target_id": "c1",
      "target_name": "API Gateway",
      "description": "...",
      "severity": "high",
      "mitigation": "...",
      "affected_flows": ["c1 -> c2"]
    }
  ],
  "recommendations": ["Enable mTLS between edge and backend services"]
}
```

## Backlog priorizado (nova ordem)
1) Backend FastAPI + estrutura de projeto.
2) Vision Service (OpenAI GPT-4o) com prompt e schema.
3) STRIDE Service (LLM + regras deterministicas).
4) Banco SQLite + persistencia.
5) Endpoints REST (upload, analise, historico).
6) Relatorio JSON + PDF.
7) Frontend React minimo (upload + resultado).
8) Integracao ponta a ponta + demo.
9) PWA/mobile (se sobrar tempo).
10) Documentacao final + video.

## Plano adaptativo (pivot rapido)
- Se API OpenAI cair: cache local + regras deterministicas como fallback.
- Se extracao de fluxos for imprecisa: gerar STRIDE por componente primeiro, fluxos opcionais.
- Se frontend atrasar: demo via Swagger UI (FastAPI gera automaticamente).
- Se banco nao for necessario no demo: usar em memoria.
- Se PDF atrasar: entregar JSON + visualizacao na UI.

## Criterios de pronto (MVP)
- Upload de imagem na UI gera resultado STRIDE visivel.
- Pipeline completo: imagem -> extracao -> STRIDE -> JSON/PDF.
- Explicacao clara do pipeline e dos prompts/schemas.
- Resultado demonstravel em pelo menos 2 diagramas de teste.
