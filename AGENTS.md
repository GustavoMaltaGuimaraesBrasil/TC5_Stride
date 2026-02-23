# AGENTS.md - Guia Operacional do Projeto

Este documento define como trabalhar neste repositorio e quais documentos consultar.

## Objetivo do projeto
- Sistema LLM-first para analise STRIDE de diagramas de arquitetura.
- Entrada: imagem de diagrama.
- Saida: analise STRIDE em JSON + relatorio PDF.

## Escopo atual (fev/2026)
- Nao ha pipeline de ML neste projeto.
- O fluxo usa OpenAI GPT-4o para extracao visual e analise textual.
- O foco e execucao de produto (backend + web + mobile).

## Arquitetura resumida
- `frontend/web`: interface web (React + Vite).
- `frontend/mobile`: app mobile (React Native + Expo).
- `backend`: API FastAPI, servicos e persistencia local (SQLite).

## Fluxo tecnico
1. Upload de imagem no frontend.
2. Backend chama Vision Service (GPT-4o) e extrai estrutura do diagrama.
3. Backend chama STRIDE Service (GPT-4o + regras deterministicas).
4. Resultado e salvo no SQLite e pode ser exportado em PDF.

## Documentos de referencia
- `README.md`: guia rapido de setup e execucao.
- `docs/continuar.md`: estado atual e proximo passo pratico.
- `docs/planejamento_execucao.md`: plano tecnico de execucao.
- `docs/planejamento_final.md`: arquitetura e escopo final do MVP.
- `docs/fontes_github.md`: referencias externas uteis.
- `docs/inventario_dataset.md`: historico de fontes de diagramas para testes.
- `docs/dataset_sintetico.md`: historico de alternativas de geracao de exemplos.

## Regras de manutencao de docs
- Manter caminhos atualizados com a estrutura real.
- Evitar orientacoes de ML fora do escopo do produto.
- Priorizar instrucoes executaveis e objetivas.

