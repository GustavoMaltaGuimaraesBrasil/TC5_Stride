# Inventario de Dataset - Diagramas de Arquitetura

Objetivo: manter controle das fontes de dados, licencas, qualidade e status de uso no projeto.

## Criterios de selecao
- Licenca permissiva ou com uso permitido para pesquisa/projeto academico.
- Diagramas legiveis, com componentes claros e texto visivel.
- Variedade de classes (user, app, api, db, external).
- Preferir PNG/JPG/SVG (converter para PNG se necessario).

## Tabela de inventario
| ID | Fonte | Link/Local | Tipo | Formato | Licenca | Classes cobertas | Qualidade | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | GitHub repos publicos | (pesquisar) | real | PNG/SVG | por repo (MIT/Apache/CC) | variado | media | pendente |
| DS-002 | AWS Architecture Center | https://aws.amazon.com/architecture/ | real | PNG/PDF | restrito (Site Terms) | cloud | alta | restrito |
| DS-003 | Azure Architecture Center | https://learn.microsoft.com/azure/architecture/ | real | PNG/PDF | restrito (Terms of Use) | cloud | alta | restrito |
| DS-004 | Google Cloud Architecture | https://cloud.google.com/architecture | real | PNG/PDF | nao confirmado | cloud | alta | pendente |
| DS-005 | diagrams (mingrammer) | https://github.com/mingrammer/diagrams | sintetico | PNG | MIT (repo) + verificar icones | base | media | aprovado |
| DS-006 | drawio-diagrams (jgraph) | https://github.com/jgraph/drawio-diagrams | real | SVG/PNG | Apache-2.0 | variado | alta | aprovado |
| DS-007 | C4-PlantUML | https://github.com/plantuml-stdlib/C4-PlantUML | sintetico | PNG/SVG | MIT | base | alta | aprovado |
| DS-008 | drawio-threatmodeling | https://github.com/michenriksen/drawio-threatmodeling | real | (nao confirmado) | licenca nao encontrada | threat modeling | media | pendente |

## Fontes sugeridas (links base)
- AWS Architecture Center: https://aws.amazon.com/architecture/
- Azure Architecture Center: https://learn.microsoft.com/azure/architecture/
- Google Cloud Architecture: https://cloud.google.com/architecture
- diagrams (lib de geracao): https://github.com/mingrammer/diagrams
- GitHub (repos publicos): buscar por "architecture diagram", "draw.io", "c4 model"

## Validacao de licencas (resumo)
- AWS Site Terms: conteudo do site e protegido; uso limitado e sem copiar imagens/logos sem permissao explicita.
  - O proprio termo menciona que materiais do site nao podem ser reproduzidos sem consentimento.
  - Observacao: docs.aws.amazon.com tem licenca CC-BY-SA-4.0 para documentacao e MIT-0 para codigo, mas isso nao cobre o Architecture Center (aws.amazon.com).
- Microsoft Learn Terms of Use: uso pessoal/nao comercial e sem copiar imagens/logos sem permissao expressa.
  - O termo menciona que nenhum logo/graphic/image pode ser copiado ou retransmitido sem permissao.
  - Algumas paginas podem ter licenca explicita; verificar caso a caso.
- Google Cloud: nao foi encontrada licenca explicita via pagina de termos (cloud.google.com/terms/docs retornou 404).
  - Tratar como pendente ate encontrar licenca clara por pagina/asset.
- diagrams (mingrammer): repositorio com licenca MIT (confirmado em LICENSE).
  - Atencao: icones de vendors podem ter licencas/brand guidelines proprias.
- drawio-diagrams (jgraph): repositorio com licenca Apache-2.0 (confirmado em LICENSE).
  - Contem templates e exemplos; evitar uso de logos de vendors sem permissao explicita.
- C4-PlantUML: repositorio com licenca MIT (confirmado em LICENSE).
  - Recomendado para gerar diagramas sinteticos com classes base.
- drawio-threatmodeling: licenca nao localizada no repositorio; manter pendente ate confirmar.

## Processo de coleta (manual)
1) Abrir a fonte e verificar licenca de uso.
2) Baixar imagens ou exportar para PNG.
3) Registrar no inventario (link direto e licenca).
4) Salvar em `data/raw/images` e manter nome consistente.
5) Atualizar status para "aprovado".

## Nota sobre logos e marcas
- Mesmo com licenca permissiva, evite logos ou icones proprietarios quando nao houver autorizacao explicita.
- Preferir templates genericos e formas neutras para reduzir risco legal.

## Notas de avaliacao
- Licenca: documentar a fonte e a permissao de uso.
- Se houver restricao, marcar como "nao usar".
- Para cada fonte aprovada, salvar exemplos em `data/raw/images`.

## Proximos passos
- Preencher links e licencas.
- Selecionar 30-50 imagens iniciais para o MVP.
- Iniciar anotacao e criar split treino/validacao/teste.
