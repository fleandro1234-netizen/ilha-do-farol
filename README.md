# Ilha do Farol

Roteiro de um jogo terapêutico para crianças autistas de 4 a 10 anos. A criança ajuda um polvinho a reacender o farol de uma ilha; cada lugar da ilha treina uma habilidade que a terapia já usa, e cada sessão termina com uma missão para fazer fora da tela, com um adulto.

**Leitura online:** https://fleandro1234-netizen.github.io/ilha-do-farol/

Situação: versão 1 do roteiro, em revisão. O jogo ainda não foi programado nem testado; as práticas citadas têm evidência, o jogo ainda não.

## Como atualizar

A fonte única é `fonte/roteiro.html`. Depois de editar:

```
python gerar_site.py
```

O script gera `docs/index.html` (servido pelo GitHub Pages) e atualiza a cópia da Área de Trabalho. Ele recusa gerar se encontrar travessão no texto.
