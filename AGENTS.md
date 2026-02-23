# AGENTS.md - Guia Operacional do Projeto

Este documento define como trabalhar neste repositorio e quais documentos consultar.

## Objetivo do projeto
- Sistema LLM-first para analise STRIDE de diagramas de arquitetura.
- Entrada: imagem de diagrama.
- Saida: analise STRIDE em JSON + relatorio PDF.

## Escopo atual (fev/2026)
- Nao ha pipeline de ML neste projeto.
- O fluxo usa OpenAI GPT-4o para extracao visual e analise textual.
- A camada STRIDE usa RAG local para justificar ameacas e mitigacoes com referencias.
- O foco e execucao de produto (backend + web + mobile).

## Arquitetura resumida
- `frontend/web`: interface web (React + Vite).
- `frontend/mobile`: app mobile (React Native + Expo).
- `backend`: API FastAPI, servicos e persistencia local (SQLite).

## Personas operacionais (obrigatorias)
1. Arquiteto de Software
- Define arquitetura, contratos entre camadas e direcao tecnica.

2. Engenheiro Backend Python Senior (10+ anos)
- Implementa e revisa API FastAPI, validacoes, erros, persistencia e seguranca.

3. Especialista em LLM/IA Aplicada
- Ajusta prompts, schemas JSON, qualidade de extracao e RAG da camada STRIDE.

4. Engenheiro Frontend Full Stack
- Garante integracao web/mobile com backend, UX de upload/resultado/erros e consistencia visual.

5. Revisor de Qualidade (QA/Code Review)
- Verifica regressao funcional, caminhos quebrados, impacto no fluxo principal e coerencia de documentacao.

## Fluxo tecnico
1. Upload de imagem no frontend.
2. Backend chama Vision Service (GPT-4o) e extrai estrutura do diagrama + `context_summary`.
3. Backend chama STRIDE Service (GPT-4o + RAG local + regras deterministicas).
4. Resultado e salvo no SQLite e pode ser exportado em PDF.

## Regra de apresentacao de resultado
- Antes das listagens de ameacas, a UI deve mostrar:
  1. imagem submetida,
  2. contexto da infraestrutura (`context_summary`).
- O mesmo contexto e a imagem devem aparecer no PDF.

## Protocolo obrigatorio antes de executar
Antes de alterar qualquer arquivo, a LLM deve informar:
1. Entendimento objetivo da tarefa.
2. Arquivos que pretende alterar.
3. Riscos esperados (se houver).
4. Plano curto em passos.

Somente depois dessa explicacao a execucao deve comecar.

## Protocolo obrigatorio ao finalizar
Ao concluir, a LLM deve reportar:
1. O que foi alterado.
2. O que nao foi alterado.
3. Como validar rapidamente.

## Documentos de referencia
- `README.md`: guia rapido de setup e execucao.
- `docs/GUIA.md`: guia unico de operacao, arquitetura e validacao.

## Regras de manutencao de docs
- Manter caminhos atualizados com a estrutura real.
- Evitar orientacoes de ML fora do escopo do produto.
- Priorizar instrucoes executaveis e objetivas.

