# Vozes da Ilha do Farol

Todas as falas do jogo são gravadas com uma voz só: **Aninha** (`hgTbkcw2ddnzYh66cwCI`, "Warm, Calm and Soothing"),
voz profissional brasileira da biblioteca do ElevenLabs, no modelo `eleven_multilingual_v2`. O plano da conta é pago
e libera uso comercial.

## Como regravar (depois de mudar ou acrescentar um texto no jogo)

Rodar numa pasta de caminho curto e sem acento (por exemplo `C:\voz\ilha`), com estes três arquivos:

1. `node extrair_falas.js`: lê `arte.js`, `app.js` e `lugares.js` do jogo e grava `catalogo.json` com todas as falas.
2. `python gravar_eleven.py tudo`: grava só o que ainda não tem áudio, transcreve cada fala com o faster-whisper,
   compara com o texto e regrava com outra semente o que sair diferente (até 3 rodadas).
3. `python gravar_eleven.py publicar`: apara o silêncio, nivela o volume (fala em -20 dBFS; a frase alta da Gigi
   3,5 dB acima) e grava `docs/jogo/audio/v/*.mp3` e `docs/jogo/audio/falas.json`.
4. Subir a versão em `VERSAO` (`app.js`) e `CACHE` (`sw.js`).

A chave da API **não fica aqui**: o script lê `C:\eleven\chave.txt` pelo `eleven_tts.py` daquela pasta.

## Por que a voz é achada pelo texto

`falas.json` liga a chave de cada fala (texto + quem fala, `chaveFala` em `app.js`) ao arquivo. Uma frase alterada
ganha outra chave e toca na voz do aparelho até ser regravada, em vez de tocar o áudio velho. Frase sem gravação
(as Histórias Minhas, que o adulto escreve) também usa a voz do aparelho. Toda fala tem legenda.
