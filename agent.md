# agent.md - Instrucoes do Projeto

Este arquivo define o contexto e as regras de trabalho para todas as conversas sobre este repositorio.

## Contexto
- Competicao (hackathon FIAP). Objetivo: ficar entre os 3 melhores.
- Tema: IA para modelagem automatica de ameacas (STRIDE) a partir de diagramas de arquitetura.
- Entregaveis: documentacao do fluxo, video (ate 15 min), repositorio no GitHub, demo com resultados reais.

## Objetivo do MVP
- Entrada: imagem de diagrama (PNG/JPG/JPEG/GIF/WEBP).
- Estagio 1 (Visao): OpenAI GPT-4o analisa a imagem e extrai componentes, grupos, fluxos (setas) e trust boundaries em JSON estruturado.
- Estagio 2 (STRIDE): Segundo modelo/prompt recebe o JSON estruturado e gera analise STRIDE cruzando componentes x fluxos x boundaries.
- Saida: JSON + PDF, alem de imagem anotada.

## Arquitetura em camadas
- Frontend Web: React + TypeScript + Vite (SPA responsiva).
- Frontend Mobile: React Native + Expo + TypeScript (Android/iOS).
- Backend: FastAPI (Python) com API REST.
- Banco local: SQLite (via SQLAlchemy) para historico de analises.
- Servicos: Vision Service (OpenAI), STRIDE Service (OpenAI + regras), Report Service (JSON/PDF).

## Principios tecnicos
- LLM (GPT-4o Vision) faz a extracao de componentes da imagem.
- Segundo estagio de LLM cruza dados estruturados com STRIDE e gera ameacas/mitigacoes.
- Regras deterministicas complementam a LLM e garantem baseline.
- Pipeline de dois estagios: Visao -> STRIDE (separacao limpa, testavel e auditavel).
- Cada estagio tem prompt e JSON schema proprio.

## Restricoes e recursos
- Trabalho solo.
- Sem GPU local; sem tempo para treinar modelo.
- API key OpenAI disponivel (GPT-4o com vision).
- Sem "tudo ou nada": se algo falhar, trocar abordagem rapidamente.

## Plano adaptativo (obrigatorio)
- Se API OpenAI cair: cache de resultados + fallback para regras deterministicas.
- Se extracao de fluxos for imprecisa: entregar STRIDE por componente.
- Se frontend atrasar: demo via terminal/Swagger e UI depois.
- Se banco nao for necessario no demo: usar apenas em memoria.

## Qualidade e avaliacao
- Pipeline ponta a ponta funcionando (imagem -> extracao LLM -> STRIDE -> relatorio).
- Explicabilidade clara (prompts, schemas, regras, resultados).
- Aparencia de produto corporativo (UI React + relatorio PDF bem formatado).

## Estilo de trabalho esperado do assistente
- Propor passos objetivos e confirmar escolhas criticas.
- Registrar decisoes e o motivo delas.
- Manter foco em MVP funcional antes de features avancadas.
- Evitar dependencia de rede/servicos externos quando nao for necessario.
- O usuario nao manja deste projeto, entao o assistente deve decidir mais e pedir menos confirmacoes.
