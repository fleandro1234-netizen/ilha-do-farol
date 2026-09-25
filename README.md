# Ilha do Farol

Roteiro de um jogo terapêutico para crianças autistas de 4 a 10 anos. A criança ajuda um polvinho a reacender o farol de uma ilha; cada lugar da ilha treina uma habilidade que a terapia já usa, e cada sessão termina com uma missão para fazer fora da tela, com um adulto.

**Leitura online:** https://fleandro1234-netizen.github.io/ilha-do-farol/

Situação: roteiro na versão 2 e protótipo jogável de homologação (versão 0.3, os oito lugares da ilha) em https://fleandro1234-netizen.github.io/ilha-do-farol/jogo/. O jogo ainda não foi testado com crianças; as práticas citadas têm evidência, o jogo ainda não.

## Como atualizar

A fonte única é `fonte/roteiro.html`. Depois de editar:

```
python gerar_site.py
```

O script gera `docs/index.html` (servido pelo GitHub Pages) e atualiza a cópia da Área de Trabalho. Ele recusa gerar se encontrar travessão no texto.

## Protótipo do jogo (`docs/jogo/`)

Aplicativo web instalável, sem servidor e sem conta: tudo fica no aparelho (localStorage) e funciona sem internet depois da primeira abertura (`sw.js`).

- `arte.js`: desenho provisório em SVG.
- `app.js`: motor da sessão, escada de ajuda, registro e área do adulto.
- `lugares.js`: os oito lugares da ilha, cada um com as próprias telas e tarefas.
- Fotos das Histórias Minhas ficam no IndexedDB do aparelho, nunca no localStorage.
- `img/arte.json`: mapa das imagens definitivas (geradas por IA). Quando uma chave existe, a imagem entra no lugar do desenho provisório.
- `audio/falas.json`: mapa das falas gravadas. Sem arquivo, o jogo usa a voz sintética do aparelho. A lista completa de falas sai na área do adulto, aba Aparelho.
- Ao mudar arquivos do jogo, subir a versão em `VERSAO` (`app.js`) e em `CACHE` (`sw.js`).
- Teste local: `python -m http.server 8830 --directory docs` e abrir `http://localhost:8830/jogo/`.

## Arte (`arte/`)

Toda a arte vem de IA de imagem e passa por `arte/processar.py`. A ficha de cada peça está em `arte/lote.json`, o resultado de cada geração em `arte/gerados.json`, e o passo a passo em `arte/LEIA-ME.md`. Os originais ficam em `arte-fonte/`, fora do git.
