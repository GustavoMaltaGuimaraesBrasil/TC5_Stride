# Apresentação (10 min) - FIAP Software Security
## STRIDE Modelador de Ameaças com LLM, Visão, RAG, Web e Mobile

## 1. Objetivo da apresentação
Mostrar, em 10 minutos, como o projeto resolve o problema central do desafio:

- Entender uma imagem de diagrama de arquitetura.
- Aplicar STRIDE para levantar riscos.
- Sugerir mitigação prática para cada risco.

Com diferenciais reais de engenharia:

- Backend em camadas.
- Persistência em banco.
- Web + Mobile com câmera.
- PDF executivo.
- Voz em pt-BR para leitura do resultado.

---

## 2. Roteiro de 10 minutos (slide a slide)

### Slide 1 (0:00-1:00) - Problema e proposta
- Problema: análise de ameaças manual é lenta e depende de especialista.
- Proposta: automatizar a leitura do diagrama + geração STRIDE com explicabilidade.
- Resultado: acelera triagem de risco com consistência técnica.

### Slide 2 (1:00-2:00) - Escopo do projeto
- Entrada: imagem (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`, `BMP`).
- Saída: contexto da infraestrutura + ameaças + mitigação + recomendações.
- Entregáveis adicionais: histórico persistido, PDF e leitura por voz.

### Slide 2.1 (extra de 20s) - Stack de IA usada
- Chat/Vision: `gpt-4o` (extração de arquitetura e geração STRIDE).
- TTS: `tts-1-hd`, voz `shimmer`, saída `mp3`.
- Transcrição (endpoint backend): `gpt-4o-mini-transcribe` com fallback para `whisper-1`.
- RAG local: base `stride_rag.md` para evidências e referências.

### Slide 3 (2:00-3:00) - Arquitetura em camadas
- `frontend/web`: experiência desktop para operação e apresentação.
- `frontend/mobile`: captura por galeria/câmera + consumo dos mesmos endpoints.
- `backend`: FastAPI, pipeline de análise, persistência e geração de PDF/voz.
- `sqlite`: guarda processamento e permite reabrir/excluir.

### Slide 4 (3:00-5:00) - Pipeline técnico (núcleo do desafio)
- Etapa 1 (Vision): LLM extrai componentes, grupos, fluxos e contexto.
- Etapa 2 (STRIDE): LLM gera ameaças e mitigação.
- RAG local: injeta contexto técnico e IDs de referência.
- Pós-processamento determinístico: reforça cobertura e resumo por severidade.

### Slide 5 (5:00-6:30) - Produto aplicado (web e mobile)
- Upload de imagem e abertura de processamentos salvos.
- Mobile com captura por câmera.
- Exibição completa: imagem, contexto, ameaças, recomendações.
- Exclusão de processamento e atualização de histórico.

### Slide 6 (6:30-7:30) - Voz e PDF (valor para negócio)
- Voz por seção: contexto, ameaças/mitigações e recomendações.
- Pré-carregamento de áudio para resposta instantânea no clique.
- PDF com imagem enviada + resumo + listagem detalhada das ameaças.

### Slide 7 (7:30-8:30) - Qualidade e rastreabilidade
- Contratos tipados no backend e compartilhados no frontend.
- Evidências e referências por ameaça (`evidence`, `reference_ids`).
- Teste automatizado em lote com score e relatório JSON.

### Slide 8 (8:30-10:00) - Fechamento
- O objetivo do desafio foi cumprido com produto utilizável.
- O sistema já está pronto para evolução de orquestração.
- Próximo passo de arquitetura: migração controlada para LangChain mantendo contrato da API.

---

## 3. Arquitetura resumida para explicar em 30 segundos

```text
Web/Mobile -> POST /api/analysis
               |
               v
           Backend FastAPI
             1) Vision (extrai diagrama)
             2) STRIDE + RAG (ameaças e mitigação)
             3) Persistência SQLite
             4) Endpoints de consulta, PDF e voz
               |
               v
        Resultado em português (UI + PDF + áudio)
```

---

## 4. Trechos de código para mostrar (slides técnicos)

### 4.1 Pipeline principal da análise
Arquivo: `backend/app/routers/analysis.py`

```python
@router.post("/analysis", response_model=AnalysisResponse, status_code=201)
async def create_analysis(file: UploadFile = File(...), session: AsyncSession = Depends(get_session)):
    ...
    diagram = await vision.extract_diagram(str(upload_path))
    analysis_record.diagram_json = diagram.model_dump()

    stride_report = await stride.analyze_stride(diagram)
    analysis_record.stride_json = stride_report.model_dump()
    analysis_record.status = "done"
    ...
```

Ponto de fala: o endpoint já executa o pipeline fim a fim e persiste o resultado completo.

### 4.2 Visão computacional com saída JSON estruturada
Arquivo: `backend/app/services/vision.py`

```python
response = await client.chat.completions.create(
    model=settings.openai_model,
    messages=[...],
    temperature=0.1,
    max_tokens=4096,
    response_format={"type": "json_object"},
)

data = json.loads(response.choices[0].message.content)
result = DiagramAnalysis.model_validate(data)
```

Ponto de fala: reduz ambiguidade da LLM com `json_object` e validação tipada.

### 4.3 STRIDE com RAG e enriquecimento determinístico
Arquivo: `backend/app/services/stride.py`

```python
rag_chunks = rag.retrieve_stride_context(rag_query, top_k=5)
rag_context = rag.format_context_for_prompt(rag_chunks)

response = await client.chat.completions.create(
    model=settings.openai_model,
    messages=[{"role": "system", "content": _STRIDE_SYSTEM_PROMPT}, ...],
    response_format={"type": "json_object"},
)

report = STRIDEReport.model_validate(json.loads(response.choices[0].message.content))
_ensure_baseline_coverage(diagram, report)
```

Ponto de fala: une geração da LLM com regras objetivas para cobertura mínima STRIDE.

### 4.4 Persistência de processamento
Arquivo: `backend/app/models/database.py`

```python
class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    image_filename = Column(String(255), nullable=False)
    image_path = Column(String(500), nullable=False)
    status = Column(String(50), default="pending")
    diagram_json = Column(JSON, nullable=True)
    stride_json = Column(JSON, nullable=True)
```

Ponto de fala: cada execução vira um ativo consultável, não uma resposta descartável.

### 4.5 Geração de PDF com imagem enviada
Arquivo: `backend/app/services/report.py`

```python
if image_path:
    elements.extend(_build_uploaded_image_flowables(image_path, styles, doc.width))

if diagram.context_summary:
    elements.append(Paragraph("Contexto da Infraestrutura", styles["Heading2"]))
    elements.append(Paragraph(diagram.context_summary, styles["Normal"]))
```

Ponto de fala: relatório pronto para gestão, auditoria e evidência.

### 4.6 Voz no backend (TTS)
Arquivo: `backend/app/services/voice.py`

```python
payload = {
    "model": "tts-1-hd",
    "voice": "shimmer",
    "speed": 1.1,
    "input": text.strip(),
    "response_format": "mp3",
}
response = await client.post("/audio/speech", headers=_auth_headers(), json=payload)
```

Ponto de fala: o frontend nunca chama OpenAI direto; segurança e governança ficam no backend.

### 4.7 Pré-carregamento de áudio para UX imediata
Arquivo: `frontend/web/src/App.tsx`

```typescript
const PRELOAD_TTS_ON_RESULT = true;

async function prepareSpeechCache(analysis: AnalysisResponse) {
  const segments = {
    description: buildDescriptionNarration(analysis),
    threats: buildThreatsNarration(analysis),
    bottom: buildBottomNarration(analysis),
  };
  await Promise.all(
    Object.entries(segments).map(async ([section, text]) => {
      const { audioBase64 } = await synthesizeSpeech(text);
      setSpeechCache((prev) => ({ ...prev, [section]: audioBase64 }));
    }),
  );
}
```

Ponto de fala: escolha consciente de qualidade de experiência acima de economia de chamada.

### 4.8 Mobile com câmera integrada
Arquivo: `frontend/mobile/src/screens/UploadScreen.tsx`

```typescript
const permission = await ImagePicker.requestCameraPermissionsAsync();
if (!permission.granted) return;

const result = await ImagePicker.launchCameraAsync({
  allowsEditing: false,
  quality: 1,
});
```

Ponto de fala: além de analisar arquivo, o usuário captura cenário real em campo.

---

## 5. RAG e LangChain: como posicionar na apresentação

Mensagem recomendada:

- **RAG já implementado** (base local + `reference_ids` por ameaça).
- **LangChain já está desenhado para a próxima fase** (sem quebrar endpoints e contrato).
- Isso preserva estabilidade de produto enquanto evolui a orquestração.

Referência de arquitetura alvo: `docs/GUIA.md` (seção de migração para LangChain).

---

## 6. Script de demo (2 minutos, opcional)

1. Abrir Web.
2. Enviar um diagrama.
3. Mostrar contexto extraído.
4. Mostrar lista STRIDE com mitigação.
5. Clicar em um botão de áudio.
6. Baixar PDF.
7. Voltar para histórico e reabrir análise salva.

Mensagem final da demo:
“Não é apenas inferência pontual; é um fluxo completo de análise, rastreabilidade e operação.”

---

## 7. Frases de impacto para encerramento

- “Transformamos um artefato visual em decisões de segurança acionáveis.”
- “A análise deixa de ser manual e passa a ser reproduzível, auditável e reaproveitável.”
- “O projeto entrega valor agora e já está arquitetado para evolução com LangChain.”

---

## 8. Q&A (respostas curtas prontas)

### Como vocês evitam resposta solta da LLM?
- `response_format=json_object`, validação Pydantic e contratos estáveis.

### Como justificam cada ameaça?
- Campos `evidence` + `reference_ids` por item no STRIDE.

### Onde fica salvo o resultado?
- SQLite (`analyses`), com endpoints para listar, abrir, excluir e gerar PDF.

### Funciona no celular?
- Sim. Mobile com galeria, câmera, histórico e leitura por voz via backend.

### LangChain já está em produção?
- O runtime atual usa services modulares; LangChain está modelado para migração controlada sem quebrar API.
