# Fontes GitHub (licencas permissivas)

Este documento lista repositorios com licencas permissivas e relevancia para diagramas de arquitetura.

## Confirmados (licenca verificada)
| Repo | Licenca | Uso no projeto | Evidencia |
| --- | --- | --- | --- |
| https://github.com/jgraph/drawio-diagrams | Apache-2.0 | dataset real (templates e exemplos) | LICENSE confirmado; contem `templates/` e `diagrams/` |
| https://github.com/plantuml-stdlib/C4-PlantUML | MIT | dataset sintetico (C4) | LICENSE confirmado |
| https://github.com/mingrammer/diagrams | MIT | dataset sintetico (diagramas por codigo) | LICENSE confirmado |

## Pendentes (nao usar ate confirmar)
| Repo | Motivo |
| --- | --- |
| https://github.com/michenriksen/drawio-threatmodeling | licenca nao localizada no repo |

## Observacoes
- O repo `drawio-diagrams` contem muitos templates, incluindo cloud/network/software. Preferir templates genericos e evitar logos proprietarios.
- `C4-PlantUML` e `diagrams` sao fontes seguras para gerar dataset sintetico com classes base.

## Limite atual
- A API de busca de codigo do GitHub exige autenticacao, entao nao foi possivel varrer repositorios automaticamente por arquivos `.drawio`.
- Se quiser ampliar a lista, forneca um token do GitHub com permissao de leitura publica.
