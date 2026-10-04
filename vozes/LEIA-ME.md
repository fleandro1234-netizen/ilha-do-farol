# Vozes da Ilha do Farol

Todas as falas do jogo são gravadas com uma voz só, criada no ElevenLabs a partir da voz de uma pessoa real, com autorização dela
(clone instantâneo na conta do projeto, modelo `eleven_multilingual_v2`). A autorização foi dada por escrito em
04/10/2026. O plano da conta é pago e libera uso comercial. Nas versões 0.4 e 0.4.1 a voz era uma voz de biblioteca.

## Como regravar (depois de mudar ou acrescentar um texto no jogo)

Rodar numa pasta de caminho curto e sem acento (por exemplo `C:\voz\ilha`), com os arquivos desta pasta:

1. `node extrair_falas.js`: lê `arte.js`, `app.js` e `lugares.js` do jogo e grava `catalogo.json` com todas as falas.
2. `python gravar_eleven.py tudo`: grava só o que ainda não tem áudio e confere tudo por transcrição (faster-whisper),
   em lotes de até 26 s de áudio, salvando a cada lote (interrompido, retoma). Fala que sai diferente do texto, ou com
   palavra a mais, é conferida de novo sozinha e regravada com outra semente, até 3 vezes.
3. `python consertar.py`: para a fala que insiste em sair diferente, testa variações de estabilidade, semente e
   pontuação do texto enviado à voz (as palavras e a legenda não mudam). O ajuste vencedor entra no `gravar_eleven.py`.
4. `python gravar_eleven.py publicar`: alonga para 0,45 s a pausa entre as frases de uma mesma fala (dentro do respiro
   que a voz já faz), apara o silêncio das pontas, nivela o volume (fala em -20 dBFS; a frase alta da Gigi 3,5 dB
   acima) e grava `docs/jogo/audio/v/*.mp3` e `docs/jogo/audio/falas.json`.
5. `python medir_ritmo.py`: mede o ritmo do jogo inteiro. Referência: 1,86 palavra por segundo foi lento e cansativo
   para a psicóloga; a versão aprovada por ela ficou em 2,15 a 2,2.
6. Subir a versão em `VERSAO` (`app.js`) e `CACHE` (`sw.js`).

Ajustes desta voz: velocidade 0,75 (na velocidade natural ela fala 3,3 palavras por segundo e emenda as frases).
A marca de pausa do ElevenLabs (`<break>`) não serve com ela: a voz inventa som e palavra no lugar da pausa.

A chave da API **não fica aqui**: o script lê `C:\eleven\chave.txt` pelo `eleven_tts.py` daquela pasta.

## Por que a voz é achada pelo texto

`falas.json` liga a chave de cada fala (texto + quem fala, `chaveFala` em `app.js`) ao arquivo. Uma frase alterada
ganha outra chave e toca na voz do aparelho até ser regravada, em vez de tocar o áudio velho. Frase sem gravação
(as Histórias Minhas, que o adulto escreve) também usa a voz do aparelho. Toda fala tem legenda.
