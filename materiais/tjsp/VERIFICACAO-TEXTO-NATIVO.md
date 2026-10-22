# Correção da seleção de texto nos PDFs

Os 15 cadernos e o consolidado foram diagramados novamente com texto nativo,
fontes incorporadas e espaçamento regular. O guia e o mapa de páginas foram
atualizados para a nova paginação. Baixe novamente os arquivos indicados no README.

Em 22/10/2026, foram removidos os avisos repetidos “Fonte: caderno original…,
página…” do corpo dos cadernos e do consolidado. O conteúdo de estudo foi comparado
com a edição anterior e permaneceu idêntico. As referências permanecem no guia.

## Causa reproduzida

A edição anterior importava recortes visuais de páginas. Os objetos importados
conservavam texto fora da área visível, que alguns leitores ainda consideravam
selecionável. Na página do art. 327 do Código Penal, por exemplo, o PDFium também
extraía o art. 328 e outros trechos da página-fonte que não estavam visíveis.
Isso explica a seleção de áreas em branco e de texto além da palavra desejada.

Na edição corrigida, somente o texto visível é inserido nas páginas novas.
Não há objetos de páginas recortadas nem glifos fora da folha.

## Conferências concluídas

- Texto visível da edição anterior comparado com o conteúdo do novo arquivo,
  normalizando apenas espaços e equivalências Unicode.
- Mesma ordem dos 180 subtópicos jurídicos do aplicativo no consolidado.
- 623 páginas dos 15 cadernos conferidas com MuPDF e PDFium, com concordância
  entre as extrações da página inteira.
- 16.271 linhas do conteúdo verificadas quanto ao texto e aos limites de seleção,
  incluindo seleção por retângulo em um segundo motor de PDF.
- Nenhum objeto de página recortada; nenhum glifo fora da área visível da folha.
- 609 páginas do consolidado conferidas com ambos os motores, além dos índices
  e dos destinos dos links.
- Teste de anotação de grifo sobre uma palavra, com conferência visual do alinhamento.
- Integridade do ZIP verificada.
- Ausência dos avisos repetidos de fonte conferida em todos os PDFs do pacote.

O Foxit não está disponível neste ambiente; não foi executado um teste diretamente
nele. As verificações cobrem a estrutura do PDF e a seleção em dois motores
independentes, inclusive reproduzindo o defeito da edição anterior.

## Conteúdo

Esta é uma correção de diagramação. O conteúdo e a sequência foram preservados;
a paginação mudou. A inclusão dos anexos da LC nº 1.111/2010 e a revisão legislativa
integral continuam pendentes, conforme a conferência do edital.
