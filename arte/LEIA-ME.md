# Estrutura de criação da arte

Toda a arte do jogo sai de IA de imagem (Kairogen, modelo Nano Banana Pro, 2k) e é processada aqui, sem edição manual.

## Arquivos

- `lote.json`: a ficha de cada peça. Id, chaves que ela vira no jogo, tipo, proporção, referências e o prompt exato. O bloco de estilo, as proibições e o fundo branco são comuns a todas.
- `gerados.json`: o resultado de cada geração (id, endereço do original, créditos) e os ajustes de recorte da peça (`tolerancia`, `buracos`, `sombra_quente`).
- `processar.py`: baixa os originais para `arte-fonte/originais` (fora do git), tira o fundo, separa as folhas com várias peças, reduz, grava WebP em `docs/jogo/img` e reescreve `docs/jogo/img/arte.json`. Também monta o logo e os ícones do app, e gera `arte-fonte/revisao.png` para conferir.

## Regras de estilo

- A referência de estilo é o Lume feliz aprovado (`referencia_estilo` na ficha). Toda peça nova vai com ela, para o elenco sair com a mesma cara.
- Personagens olham para a esquerda (o Lume fica à esquerda da cena).
- Cor calma e pouco detalhe. Sem texto, sem brilho, sem sombra no chão.
- Cartões de comunicação são pictogramas de traço, sem a referência.

## Para refazer ou acrescentar uma peça

1. Escrever ou ajustar a peça em `lote.json`.
2. Gerar no Kairogen com o prompt montado assim: proibições + estilo + prompt da peça + fundo branco, com a referência de estilo. Custa 6 créditos em 2k.
3. Registrar em `gerados.json` o endereço do resultado (e apagar o original antigo em `arte-fonte/originais`, se for refazer).
4. Rodar `python arte/processar.py` e olhar `arte-fonte/revisao.png`.
5. No jogo, subir `VERSAO` em `docs/jogo/app.js` e `CACHE` em `docs/jogo/sw.js`.

## Recorte

- O fundo é o branco ligado à borda da imagem; o branco de dentro (olhos, brilhos) fica.
- `tolerancia`: quanto do quase branco conta como fundo. Mais baixa para personagem claro (Gigi, farol).
- `buracos`: esvazia vãos brancos grandes e fechados (o vão da barraca).
- `sombra_quente`: tira a sombra clara cor de pêssego que a IA às vezes deixa sob objetos.
- Folhas com várias peças são separadas pelas colunas vazias, ignorando fiapos soltos.
