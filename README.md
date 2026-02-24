# FIAP Software Security - STRIDE Modelador de AmeaÃ§as (LLM-first)

MVP para modelagem automatizada de ameaÃ§as STRIDE a partir de diagramas de arquitetura.

## O que Ã© STRIDE
STRIDE Ã© um modelo de ameaÃ§as da Microsoft usado para identificar riscos de seguranÃ§a em arquiteturas de software.
Ele organiza riscos em seis categorias:
- `S` Spoofing (falsificaÃ§Ã£o de identidade)
- `T` Tampering (violaÃ§Ã£o de integridade)
- `R` Repudiation (repÃºdio)
- `I` Information Disclosure (divulgaÃ§Ã£o de informaÃ§Ã£o)
- `D` Denial of Service (negaÃ§Ã£o de serviÃ§o)
- `E` Elevation of Privilege (elevaÃ§Ã£o de privilÃ©gio)

## VisÃ£o geral
- Entrada: imagem de diagrama (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`, `BMP`).
- EstÃ¡gio 1 (Vision): GPT-4o extrai `context_summary`, componentes, grupos e fluxos em JSON.
- EstÃ¡gio 2 (STRIDE): GPT-4o + RAG local + regras determinÃ­sticas gera ameaÃ§as e mitigaÃ§Ãµes.
- Voz (TTS): backend sintetiza narraÃ§Ã£o em pt-BR e web/mobile prÃ©-carregam 3 Ã¡udios ao abrir o resultado.
- SaÃ­da: resposta JSON, persistÃªncia em SQLite e relatÃ³rio PDF.
- Idioma: resultados para o usuÃ¡rio final em portuguÃªs (pt-BR).
- EvoluÃ§Ã£o em andamento: adoÃ§Ã£o gradual de LangChain para orquestraÃ§Ã£o, RAG e observabilidade.

## Stack
- Backend: FastAPI + SQLAlchemy async + SQLite
- Web: React + TypeScript + Vite
- Mobile: React Native + Expo
- IA: OpenAI GPT-4o (vision + texto)
- Dependencias Python: `backend/requirements.txt` (somente backend)
- Dependencias JS: `frontend/web/package.json` e `frontend/mobile/package.json`

## Estrutura
- `backend/`: API, modelos, serviÃ§os e prompts
- `frontend/web/`: interface web
- `frontend/mobile/`: app mobile
- `docs/GUIA.md`: guia operacional Ãºnico
- `teste/`: imagens de validaÃ§Ã£o, script de teste e relatÃ³rios

## Preparar ambiente (Python + .env)
O arquivo `requirements.txt` deste projeto e exclusivo do backend (`backend/requirements.txt`).

```bash
cd backend
# criar ambiente virtual local
python -m venv .venv

# ativar ambiente virtual (uso automÃ¡tico no terminal atual)
# Linux/macOS:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# instalar dependÃªncias Python
python -m pip install --upgrade pip
# este requirements e apenas do backend
pip install -r requirements.txt

# copiar arquivo de exemplo e ajustar OPENAI_API_KEY
# Linux/macOS:
cp .env.example .env
# Windows (PowerShell):
Copy-Item .env.example .env
```

## Executar localmente

VocÃª pode iniciar o projeto de duas formas:
- Script automatizado:
  - Windows: `run.bat`
  - macOS/Linux: `runmac.sh`
- ExecuÃ§Ã£o manual por componente (backend, web e mobile), conforme seÃ§Ãµes abaixo.

Com os scripts (`run.bat` ou `runmac.sh`) vocÃª pode:
1. Subir web
2. Subir mobile com QR Code (mesma rede local)
4. Executar teste automÃ¡tico

No app mobile, alÃ©m de selecionar imagem da galeria, o usuÃ¡rio tambÃ©m pode tirar foto para enviar o diagrama.
O usuÃ¡rio nÃ£o grava Ã¡udio: a voz Ã© gerada automaticamente pelo sistema para ler contexto, criticidade e mitigaÃ§Ãµes.

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
# iniciar API
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
ObservaÃ§Ã£o para celular fÃ­sico: o telefone deve estar na mesma rede Wi-Fi do computador.

### 4) Menu rÃ¡pido no Windows
```bat
run.bat
```
OpÃ§Ãµes do menu:
1. Subir web (sempre sobe backend antes)
2. Subir mobile com QR Code (rede local, sempre sobe backend antes)
4. Executar teste automÃ¡tico da pasta `teste` (sempre sobe backend antes)

## API principal
- `POST /api/analysis`: upload e anÃ¡lise completa
- `GET /api/analysis`: lista processamentos salvos
- `GET /api/analysis/{id}`: detalhes do processamento salvo
- `GET /api/analysis/{id}/image`: imagem original enviada
- `GET /api/analysis/{id}/pdf`: download do relatÃ³rio
- `POST /api/audio/speech`: sintetiza texto em Ã¡udio (mp3 base64) para leitura da anÃ¡lise em pt-BR
- `POST /api/audio/transcribe`: endpoint backend de transcriÃ§Ã£o (nÃ£o exposto na UI do usuÃ¡rio final)
- `GET /api/health`: health check

## Rastreabilidade STRIDE (RAG)
Cada item em `threats[]` inclui:
- `evidence`: evidÃªncias observadas no diagrama/fluxos/fronteiras.
- `reference_ids`: ids das referÃªncias de seguranÃ§a usadas na decisÃ£o (ex.: `STRIDE-001`).

Base local de conhecimento: `backend/app/knowledge/stride_rag.md`.

## Roadmap LangChain
Fase 1 (documentaÃ§Ã£o e desenho):
1. Definir arquitetura alvo com chains separadas para Vision e STRIDE.
2. Definir contratos de entrada/saÃ­da e estratÃ©gia de parser estruturado.
3. Definir estratÃ©gia de RAG (chunking, retrieval e citaÃ§Ã£o de fontes).

Fase 2 (implementaÃ§Ã£o backend):
1. Introduzir camada `app/services/langchain/` com chain de Vision.
2. Introduzir chain STRIDE com contexto RAG e validaÃ§Ã£o de schema.
3. Manter endpoints atuais sem quebra de contrato.

Fase 3 (qualidade e operaÃ§Ã£o):
1. Instrumentar rastreabilidade de execuÃ§Ã£o (traces por anÃ¡lise).
2. Comparar qualidade entre pipeline atual e pipeline LangChain.
3. Consolidar pipeline Ãºnico e remover duplicaÃ§Ã£o.

## ExibiÃ§Ã£o de resultado
- Web e mobile permitem processar nova imagem ou abrir processamento salvo.
- A tela de resultado exibe, nesta ordem:
  1. imagem submetida,
  2. `context_summary`,
  3. resumo e listagens STRIDE.
- Ao concluir ou reabrir uma anÃ¡lise, web e mobile enviam 3 textos para TTS e deixam o Ã¡udio prÃ©-carregado:
  1. contexto da infraestrutura + criticidade geral,
  2. ameaÃ§as e mitigaÃ§Ãµes,
  3. recomendaÃ§Ãµes.
- O usuÃ¡rio aciona a reproduÃ§Ã£o pelos Ã­cones de Ã¡udio em cada seÃ§Ã£o.
- Nota de custo: para economizar chamadas TTS, desabilite `PRELOAD_TTS_ON_RESULT` em `frontend/web/src/App.tsx` e `frontend/mobile/App.tsx`.
- O PDF tambÃ©m inclui imagem submetida, contexto e listagens STRIDE.

## DocumentaÃ§Ã£o
- `AGENTS.md`: protocolo operacional de execuÃ§Ã£o.
- `docs/GUIA.md`: arquitetura, operaÃ§Ã£o e checklist de validaÃ§Ã£o.

## Artefatos visuais (docs)
Clique nas miniaturas para abrir a imagem completa:

<p align="center">
  <a href="docs/infra.png">
    <img src="docs/infra.png" alt="Infraestrutura" width="32%" />
  </a>
  <a href="docs/wf.png">
    <img src="docs/wf.png" alt="Workflow" width="32%" />
  </a>
  <a href="docs/dir.png">
    <img src="docs/dir.png" alt="Estrutura de diretorios" width="32%" />
  </a>
</p>

Outros artefatos:
- `docs/Hackaton IADT.pdf`
- `docs/APRESENTACAO_10MIN.md`
- `docs/APRESENTACAO_10MIN_v2.md`

