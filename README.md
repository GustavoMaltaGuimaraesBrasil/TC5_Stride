# FIAP Software Security - STRIDE Modelador de Ameacas (LLM-first)

MVP para modelagem automatizada de ameacas STRIDE a partir de diagramas de arquitetura.

## Visao geral
- Entrada: imagem de diagrama (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`, `BMP`).
- Estagio 1 (Vision): GPT-4o extrai `context_summary`, componentes, grupos e fluxos em JSON.
- Estagio 2 (STRIDE): GPT-4o + RAG local + regras deterministicas gera ameacas e mitigacoes.
- Voz (TTS): backend sintetiza narracao em pt-BR e web/mobile pre-carregam 3 audios ao abrir o resultado.
- Saida: resposta JSON, persistencia em SQLite e relatorio PDF.
- Idioma: resultados para o usuario final em portugues (pt-BR).
- Evolucao em andamento: adocao gradual de LangChain para orquestracao, RAG e observabilidade.

## Stack
- Backend: FastAPI + SQLAlchemy async + SQLite
- Web: React + TypeScript + Vite
- Mobile: React Native + Expo
- IA: OpenAI GPT-4o (vision + texto)

## Estrutura
- `backend/`: API, modelos, servicos e prompts
- `frontend/web/`: interface web
- `frontend/mobile/`: app mobile
- `docs/GUIA.md`: guia operacional unico
- `teste/`: imagens de validacao, script de teste e relatorios
- `scripts/`: scripts utilitarios

## Executar localmente

Voce pode iniciar o projeto de duas formas:
- Script automatizado:
  - Windows: `run.bat`
  - macOS/Linux: `runmac.sh`
- Execucao manual por componente (backend, web e mobile), conforme secoes abaixo.

Com os scripts (`run.bat` ou `runmac.sh`) voce pode:
1. Subir web
2. Subir mobile com QR Code (mesma rede local)
4. Executar teste automatico

No app mobile, alem de selecionar imagem da galeria, o usuario tambem pode tirar foto para enviar o diagrama.
O usuario nao grava audio: a voz e gerada automaticamente pelo sistema para ler contexto, criticidade e mitigacoes.

### Uso dos scripts
Windows:
```bat
run.bat
```

macOS/Linux:
```bash
chmod +x runmac.sh
./runmac.sh
```

### 1) Backend
```bash
cd backend
# criar backend/.env e preencher OPENAI_API_KEY
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Swagger: `http://localhost:8000/api/docs`

### 2) Frontend web
```bash
cd frontend/web
npm install
npm run dev
```
App web: `http://localhost:5173`

### 3) Mobile (opcional)
```bash
cd frontend/mobile
npm install
npx expo start
```
Observacao para celular fisico: o telefone deve estar na mesma rede Wi-Fi do computador.

### 4) Menu rapido no Windows
```bat
run.bat
```
Opcoes do menu:
1. Subir web (sempre sobe backend antes)
2. Subir mobile com QR Code (rede local, sempre sobe backend antes)
4. Executar teste automatico da pasta `teste` (sempre sobe backend antes)

## API principal
- `POST /api/analysis`: upload e analise completa
- `GET /api/analysis`: lista processamentos salvos
- `GET /api/analysis/{id}`: detalhes do processamento salvo
- `GET /api/analysis/{id}/image`: imagem original enviada
- `GET /api/analysis/{id}/pdf`: download do relatorio
- `POST /api/audio/speech`: sintetiza texto em audio (mp3 base64) para leitura da analise em pt-BR
- `POST /api/audio/transcribe`: endpoint backend de transcricao (nao exposto na UI do usuario final)
- `GET /api/health`: health check

## Rastreabilidade STRIDE (RAG)
Cada item em `threats[]` inclui:
- `evidence`: evidencias observadas no diagrama/fluxos/fronteiras.
- `reference_ids`: ids das referencias de seguranca usadas na decisao (ex.: `STRIDE-001`).

Base local de conhecimento: `backend/app/knowledge/stride_rag.md`.

## Roadmap LangChain
Fase 1 (documentacao e desenho):
1. Definir arquitetura alvo com chains separadas para Vision e STRIDE.
2. Definir contratos de entrada/saida e estrategia de parser estruturado.
3. Definir estrategia de RAG (chunking, retrieval e citacao de fontes).

Fase 2 (implementacao backend):
1. Introduzir camada `app/services/langchain/` com chain de Vision.
2. Introduzir chain STRIDE com contexto RAG e validacao de schema.
3. Manter endpoints atuais sem quebra de contrato.

Fase 3 (qualidade e operacao):
1. Instrumentar rastreabilidade de execucao (traces por analise).
2. Comparar qualidade entre pipeline atual e pipeline LangChain.
3. Consolidar pipeline unico e remover duplicacao.

## Exibicao de resultado
- Web e mobile permitem processar nova imagem ou abrir processamento salvo.
- A tela de resultado exibe, nesta ordem:
  1. imagem submetida,
  2. `context_summary`,
  3. resumo e listagens STRIDE.
- Ao concluir ou reabrir uma analise, web e mobile enviam 3 textos para TTS e deixam o audio pre-carregado:
  1. contexto da infraestrutura + criticidade geral,
  2. ameacas e mitigacoes,
  3. recomendacoes.
- O usuario aciona a reproducao pelos icones de audio em cada secao.
- Nota de custo: para economizar chamadas TTS, desabilite `PRELOAD_TTS_ON_RESULT` em `frontend/web/src/App.tsx` e `frontend/mobile/App.tsx`.
- O PDF tambem inclui imagem submetida, contexto e listagens STRIDE.

## Documentacao
- `AGENTS.md`: protocolo operacional de execucao.
- `docs/GUIA.md`: arquitetura, operacao e checklist de validacao.
