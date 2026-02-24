# AGENTS.md - Guia Operacional do Projeto

Este documento define o modo de trabalho tecnico do repositorio.

## Objetivo
- Entregar um produto LLM-first (FIAP Software Security) para analise STRIDE de diagramas de arquitetura.
- Entrada: imagem de arquitetura.
- Saida: analise STRIDE em JSON e relatorio PDF.

## Escopo atual (fev/2026)
- Nao existe pipeline de treinamento de modelo neste projeto.
- O processamento depende de OpenAI (Vision + STRIDE).
- A camada STRIDE usa RAG local para justificar ameacas e mitigacoes.
- Resultado e persistido em SQLite para reabertura posterior.
- Migracao planejada: adocao gradual de LangChain sem quebrar contrato da API.

## Arquitetura resumida
- `frontend/web`: upload, historico e visualizacao de resultado no navegador.
- `frontend/mobile`: fluxo equivalente no app (galeria e camera).
- `backend`: FastAPI, persistencia, servicos de visao/STRIDE/PDF.

## Fluxo funcional
1. Usuario escolhe entre processar nova imagem ou abrir processamento salvo.
2. Upload chama `POST /api/analysis`.
3. Backend executa Vision (extracao + `context_summary`).
4. Backend executa STRIDE (RAG + regras deterministicas).
5. Resultado e salvo no banco e pode ser reaberto via `GET /api/analysis/{id}`.
6. Imagem original e acessivel por `GET /api/analysis/{id}/image`.
7. PDF e baixado por `GET /api/analysis/{id}/pdf`.
8. No mobile (Expo Go), o acesso deve ocorrer na mesma rede local do backend.

## Diretriz de migracao para LangChain
Ao implementar LangChain neste projeto:
1. Preservar contratos (`AnalysisResponse`, `DiagramAnalysis`, `STRIDEReport`).
2. Isolar nova implementacao em camada dedicada para permitir comparacao com pipeline atual.
3. Migrar por etapas: Vision chain, depois RAG/STRIDE chain, depois orquestracao completa.
4. So remover o fluxo antigo apos validacao funcional em `teste/test_batch.py`.

## Regras obrigatorias de saida
- Idioma para usuario final: portugues (pt-BR).
- Na UI e no PDF, mostrar antes das listagens:
  1. imagem submetida,
  2. contexto da infraestrutura (`context_summary`).
- Voz na UI: leitura automatica de contexto, criticidade, pontos de atencao e mitigacoes; nao expor gravacao de audio para o usuario final.
- Campos de rastreabilidade por ameaca:
  - `evidence`
  - `reference_ids`

## Personas operacionais recomendadas
1. Arquiteto de Software
- Define contratos entre camadas, fronteiras e decisoes estruturais.

2. Engenheiro Backend Python Senior
- Garante confiabilidade da API, validacoes, persistencia e seguranca.

3. Especialista em LLM/IA Aplicada
- Ajusta prompts, schema JSON e qualidade das respostas STRIDE com RAG.

4. Engenheiro Frontend (Web/Mobile)
- Mantem consistencia de UX, idioma, upload, historico e visualizacao de resultados.

5. Revisor de Qualidade
- Verifica regressao funcional, integridade do fluxo ponta a ponta e aderencia da documentacao.

## Protocolo antes de executar alteracoes
Antes de editar arquivos:
1. Declarar entendimento objetivo da tarefa.
2. Listar arquivos que serao alterados.
3. Declarar riscos esperados.
4. Informar plano curto em passos.

## Protocolo ao finalizar
1. Informar o que foi alterado.
2. Informar o que nao foi alterado.
3. Informar como validar rapidamente.

## Documentos de referencia
- `README.md`: setup e execucao rapida.
- `docs/GUIA.md`: operacao, endpoints e checklist de validacao.
