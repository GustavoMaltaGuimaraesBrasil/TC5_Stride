# Planejamento Final - MVP STRIDE

## Objetivo
Entregar um fluxo ponta a ponta para analisar diagramas de arquitetura com STRIDE.

## Escopo funcional
- Upload de imagem.
- Extracao estruturada do diagrama (Vision).
- Analise STRIDE (texto + regras).
- Persistencia local.
- Exportacao PDF.

## Arquitetura
1. Frontend web e mobile enviam imagem para o backend.
2. Backend executa estagio Vision (GPT-4o).
3. Backend executa estagio STRIDE (GPT-4o + regras).
4. Backend salva resultado e disponibiliza JSON/PDF.

## Criterios de pronto
- Resultado STRIDE visivel pela API e pelo frontend.
- Download de PDF funcionando.
- Fluxo validado com diagramas reais.
- Documentacao atualizada e consistente.

## Fora de escopo
- Pipeline de ML dedicado.
- Pipeline de MLOps dedicado.
- Gestao de datasets para ML.

