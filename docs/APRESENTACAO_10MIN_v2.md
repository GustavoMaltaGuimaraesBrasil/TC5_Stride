# Apresentação (10 min) — FIAP Software Security  
## STRIDE Modelador de Ameaças com LLM + Visão + RAG + Web + Mobile

> **Pitch (1 frase):** Transformamos um diagrama de arquitetura (imagem) em **decisões de segurança acionáveis**: contexto da infraestrutura + ameaças STRIDE + mitigação prática, com **rastreabilidade**, **PDF** e **narração em pt-BR**.

---

## 1) Objetivo (o que a banca precisa enxergar em 10 min)
Demonstrar que o projeto:

1. **Entende uma imagem** de arquitetura (Vision).
2. **Modela ameaças com STRIDE** (com mitigação).
3. **Explica e referencia** (RAG + evidências).
4. **Entrega como produto** (Web + Mobile, histórico, PDF e voz).
5. Tem **engenharia real** (camadas, contratos tipados, persistência, testes).

---

## 2) Roteiro (slide a slide) — com tempo sugerido

### Slide 1 (0:00–0:45) — Problema e proposta
- **Problema:** modelagem de ameaças manual é lenta, inconsistente e depende de especialista.
- **Proposta:** upload de imagem → extração de arquitetura → STRIDE + mitigação → relatório consumível.
- **Resultado:** acelera triagem de risco com consistência técnica.

**Mensagem-chave:** “Um artefato visual vira uma lista rastreável de riscos e ações.”

---

### Slide 2 (0:45–1:30) — Escopo e entregáveis
- **Entrada:** imagem (`PNG`, `JPG`, `JPEG`, `GIF`, `WEBP`, `BMP`).
- **Saída principal:**  
  - Contexto da infraestrutura (componentes, fluxos, limites de confiança)  
  - Ameaças STRIDE (por componente/fluxo)  
  - Mitigações e recomendações (práticas)
- **Entregáveis de produto:** histórico persistido, **PDF** e **áudio** por seção.

---

### Slide 3 (1:30–2:10) — Stack de IA (objetiva, sem hype)
- Vision + geração STRIDE: **`gpt-4o`**
- TTS (voz pt-BR): **`tts-1-hd`**, voz `shimmer`, saída `mp3`
- Transcrição (endpoint backend): **`gpt-4o-mini-transcribe`** (fallback `whisper-1`)
- RAG local: base **`stride_rag.md`** (trechos + `reference_ids`)

**Mensagem-chave:** “LLM com saída estruturada + validação tipada → menos ambiguidade.”

---

### Slide 4 (2:10–3:00) — Arquitetura do produto (camadas)
- **Frontend**
  - `frontend/web`: operação desktop e visualização completa
  - `frontend/mobile`: captura por câmera/galeria consumindo os mesmos endpoints
- **Backend** (FastAPI): pipeline, persistência, PDF e voz
- **SQLite**: histórico de execuções (abrir/excluir/relatórios)

**Estrutura (curta):**
```text
TC5_STRIDE/
  backend/ (FastAPI + pipeline + SQLite)
  frontend/
    web/ (React)
    mobile/ (Expo/React Native)
```

---

### Slide 5 (3:00–4:20) — Pipeline técnico (núcleo do desafio)
1) **Vision (extração de diagrama)**  
   - componentes, grupos, fluxos, limites de confiança  
2) **STRIDE (ameaças + mitigação)**  
   - por componente/fluxo, com severidade e prioridade  
3) **RAG local**  
   - injeta contexto técnico + referências para evidência  
4) **Pós-processamento determinístico**  
   - reforça cobertura mínima e padroniza resumo por severidade

**Mensagem-chave:** “Geração + regras objetivas para reduzir lacunas.”

---

### Slide 6 (4:20–5:20) — Prova rápida (um exemplo STRIDE de ponta a ponta)
**Exemplo (como a banca enxerga valor):**  
- **Ameaça:** *Spoofing* em autenticação (ex.: ausência de MFA / tokens fracos)  
- **Evidência:** fluxo exposto / trust boundary / componente de auth identificado  
- **Mitigação prática:** MFA, rotação de tokens, rate limit, validação de sessão, logs de auditoria

> (Na demo: abrir 1 ameaça e mostrar `evidence` + `reference_ids`.)

---

### Slide 7 (5:20–6:10) — Segurança e governança (curto e forte)
- **Frontend não chama OpenAI direto**: chaves e governança ficam no backend.
- **Contratos tipados + validação**: resposta sempre no formato esperado.
- **Persistência com histórico**: auditoria, reabertura e comparações.

**Mensagem-chave:** “Produto pronto para operar com controle de acesso e rastreabilidade.”

---

### Slide 8 (6:10–7:10) — PDF e voz (valor para negócio)
- **PDF executivo**: imagem + contexto + resumo + ameaças + mitigação.
- **Voz por seção**: leitura rápida para decisão e apresentação.
- **Pré-carregamento** no frontend web para UX imediata.

---

### Slide 9 (7:10–8:20) — Qualidade e testes (o que diferencia)
- **Teste automatizado em lote**: score + relatório JSON.
- **Cobertura mínima garantida**: regras determinísticas para evitar “silêncio” em categorias STRIDE.
- **Rastreabilidade**: cada ameaça com evidência e referência.

---

### Slide 10 (8:20–10:00) — Fechamento e roadmap
- Objetivo do desafio cumprido com **produto utilizável**.
- **RAG já implementado** com `reference_ids`.
- Próxima evolução: **migração controlada para LangChain** mantendo contratos e endpoints.

**Frases finais:**
- “Transformamos um artefato visual em decisões de segurança acionáveis.”
- “A análise deixa de ser manual e passa a ser reproduzível e auditável.”

---

## 3) Arquitetura resumida (30 segundos)
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
        Resultado em pt-BR (UI + PDF + áudio)
```

---

## 4) Trechos de código (para slides técnicos)

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

### 4.2 Visão com saída JSON estruturada
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

### 4.3 STRIDE com RAG + enriquecimento determinístico
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

### 4.4 Persistência
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

### 4.5 PDF
Arquivo: `backend/app/services/report.py`
```python
if image_path:
    elements.extend(_build_uploaded_image_flowables(image_path, styles, doc.width))

if diagram.context_summary:
    elements.append(Paragraph("Contexto da Infraestrutura", styles["Heading2"]))
    elements.append(Paragraph(diagram.context_summary, styles["Normal"]))
```

### 4.6 Voz (TTS) no backend
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

### 4.7 Pré-carregamento de áudio (Web)
Arquivo: `frontend/web/src/App.tsx`
```ts
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

### 4.8 Mobile com câmera
Arquivo: `frontend/mobile/src/screens/UploadScreen.tsx`
```ts
const permission = await ImagePicker.requestCameraPermissionsAsync();
if (!permission.granted) return;

const result = await ImagePicker.launchCameraAsync({
  allowsEditing: false,
  quality: 1,
});
```

---

## 5) Script de demo (2 min, opcional)
1. Abrir Web.
2. Enviar um diagrama.
3. Mostrar contexto extraído.
4. Abrir 1 item STRIDE (mostrar evidência + referência).
5. Clicar no áudio.
6. Baixar PDF.
7. Reabrir pelo histórico.

---

## 6) Q&A (curto)
**Como evitam resposta solta da LLM?**  
- `response_format=json_object`, validação Pydantic e contratos estáveis.

**Como justificam cada ameaça?**  
- Campos `evidence` + `reference_ids` por item no STRIDE.

**Onde fica salvo o resultado?**  
- SQLite (`analyses`), com endpoints para listar, abrir, excluir e gerar PDF.

**Funciona no celular?**  
- Sim. Mobile com galeria/câmera e os mesmos endpoints do backend.

**LangChain já está em produção?**  
- Runtime atual é modular; LangChain é evolução planejada, sem quebrar API.
