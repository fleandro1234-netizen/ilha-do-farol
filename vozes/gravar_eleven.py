# -*- coding: utf-8 -*-
"""Grava todas as falas da Ilha do Farol com a voz do jogo (ElevenLabs) e confere cada uma.

Uso:
  node extrair_falas.js                 # atualiza catalogo.json a partir do código do jogo
  python gravar_eleven.py piloto        # 8 falas de amostra, com medidas
  python gravar_eleven.py tudo          # grava o que falta, confere, regrava o que sair errado
  python gravar_eleven.py publicar      # trata o áudio e grava docs/jogo/audio (mp3 + falas.json)

Resumível: o bruto de cada fala fica em bruto/<chave>.wav; apague um para regravar só aquela fala.
A chave da API mora só em C:\\eleven\\chave.txt.
"""
import concurrent.futures as cf
import json
import re
import subprocess
import sys
import time
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, r"C:\eleven")
sys.path.insert(0, str(Path(__file__).parent))
import alinhar  # noqa: E402
import eleven_tts  # noqa: E402

RAIZ = Path(__file__).parent
BRUTO = RAIZ / "bruto"
BRUTO.mkdir(exist_ok=True)
JOGO = Path(r"C:\Users\filipe.leandro\GitHub\ilha-do-farol\docs\jogo")
FFMPEG = (r"C:\Users\filipe.leandro\AppData\Local\Microsoft\WinGet\Packages"
          r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe")

# Voz do jogo desde 04/10/2026: clone instantâneo criado na conta do ElevenLabs, usado com autorização da dona da voz.
# Antes: hgTbkcw2ddnzYh66cwCI (voz de biblioteca, versões 0.4 e 0.4.1; gravação guardada em bruto-aninha-v100).
VOZ = "DeR18n46zSns7vX4FfXA"
MODELO = "eleven_multilingual_v2"
# Clone de amostra curta: semelhança moderada (alta demais copia o chiado da amostra) e estabilidade média para as
# 346 falas saírem iguais. Velocidade: em 28/09/2026 a psicóloga achou 1,86 palavra/s lento e cansativo e 2,15 ficou
# bom; o alvo é esse ritmo, nunca abaixo da velocidade natural da voz.
# Medido em 04/10/2026 nesta voz: 1,0 = 3,32 palavras/s e nenhuma pausa entre frases; 0,85 = 2,68; 0,75 = 2,50;
# 0,70 = 2,28. Fica 0,75 mais uma pausa marcada entre as frases da mesma fala.
AJUSTES = {"stability": 0.55, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": 0.75}
PAUSA_ENTRE_FRASES = 0.45  # a voz quase emenda uma frase na outra: o respiro entre elas é alongado no tratamento
PAUSA_MAXIMA = 0.55  # teto da pausa entre frases dentro da mesma fala, em segundos
# Falas que precisam de ajuste próprio (só entra aqui o que a transcrição provou que a voz muda). Em 04/10/2026, com
# o ajuste padrão, a voz dizia "pedi e funciona", "e isso a Tuca...", "e isso a Gigi..." e "a Tuca na tartaruga".
AJUSTE_POR_FALA = {
    "Você pediu e a Gigi mudou. Pedir funciona.": {"stability": 0.8},
    "Isso. A Tuca está triste.": {"stability": 0.8},
    "Isso. A Gigi está triste.": {"stability": 0.4},
    "Foi a Tuca, a tartaruga.": {"stability": 0.8},
}
SEMENTE_POR_FALA = {
    "Você pediu e a Gigi mudou. Pedir funciona.": 31, "Isso. A Tuca está triste.": 41,
    "Isso. A Gigi está triste.": 54, "Foi a Tuca, a tartaruga.": 62,
}
# pontuação diferente só no texto ENVIADO à voz (as palavras e a legenda são as mesmas)
TEXTO_PARA_VOZ = {"Foi a Tuca, a tartaruga.": "Foi a Tuca: a tartaruga."}
# com o texto vizinho a voz embolava o começo destes itens da agenda ("e da Vila Conversa", "feiro tesouro")
SEM_CONTEXTO = {"ir à Vila Conversa,", "ir à Clareira do Encontro,", "ver o tesouro,"}
# o transcritor erra estas, a voz acerta: aceitas quando o transcritor ouve exatamente a variante conhecida
ACEITA_SE_OUVIR = {"Agora: enxaguar.": "agora em xaguar", "ir à Clareira do Encontro,": "ira clareira do encontro"}
SEMENTE = 20260928
TAXA = 44100
NOTA_MINIMA = 0.85
DICA = ("Lume, Gigi, Tuca, Caco, Fifi, Bolota, Ilha do Farol, concha, termômetro. Casa do Farol, Enseada Calma, "
        "Vila Conversa, Praia das Caras, Oficina dos Passos, Mercado das Histórias, Clareira do Encontro, "
        "Mirante dos Tesouros. Enxaguar.")  # só nomes e palavra rara: frase inteira aqui viciaria a conferência
REL = RAIZ / "relatorio.json"


def catalogo():
    return json.loads((RAIZ / "catalogo.json").read_text(encoding="utf-8"))


def contexto(f):
    """A agenda falada em partes: o texto vizinho dá a entonação de lista a cada item."""
    if f["id"].startswith("chegada.item."):
        return {"previous_text": "Hoje a gente vai:", "next_text": "e dar tchau."}
    if f["id"].startswith("chegada.fim."):
        return {"previous_text": "Hoje a gente vai: dizer como você está, aquecer,"}
    if f["id"] == "chegada.hoje":
        return {"next_text": "dizer como você está, aquecer, e dar tchau."}
    return {}


def frases_do_texto(texto):
    """As frases de uma fala ("Você pediu ajuda. Pedir ajuda funciona." tem duas)."""
    return [p for p in re.split(r"(?<=[.!?])\s+", texto) if p.strip()]


def gravar(f, semente=SEMENTE):
    # O texto vai igual ao da legenda. 🪤 A marca <break> do ElevenLabs foi testada em 04/10/2026 e esta voz inventou
    # som e palavra no lugar da pausa ("agora a toca", "agora que não toca"): a pausa é alongada depois, no áudio.
    destino = BRUTO / f"{f['chave']}.wav"
    if semente == SEMENTE:
        semente = SEMENTE_POR_FALA.get(f["texto"], SEMENTE)
    corpo = {"text": TEXTO_PARA_VOZ.get(f["texto"], f["texto"]), "model_id": MODELO,
             "voice_settings": {**AJUSTES, **AJUSTE_POR_FALA.get(f["texto"], {})},
             "seed": semente, "apply_text_normalization": "auto",
             **({} if f["texto"] in SEM_CONTEXTO else contexto(f))}
    pcm = eleven_tts.chamar("POST", f"/text-to-speech/{VOZ}?output_format=pcm_{TAXA}", corpo, aceita="*/*")
    with wave.open(str(destino), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(TAXA); w.writeframes(pcm)
    return destino


def segundos_de_fala(f):
    x, taxa = alinhar.ler_wav(BRUTO / f"{f['chave']}.wav")
    ativo = trecho_ativo(x, taxa)
    return (ativo[1] - ativo[0]) / taxa if ativo else 0.0


def avaliar_palavras(f, palavras, fala_s):
    """Compara as palavras ouvidas [(palavra, início, fim)] com o texto da fala. Os tempos são do arquivo bruto.
    Devolve também onde cada frase termina e a seguinte começa, para a pausa entre elas ser alongada no tratamento."""
    ouvidos = [p[0] for p in palavras]
    esperados = alinhar.normalizar(f["texto"])
    pares = alinhar.alinhar_tokens(esperados, ouvidos)
    casado = {i: j for i, j in pares if i is not None and j is not None}
    iguais = sum(1 for i, j in casado.items() if alinhar.parecido(esperados[i], ouvidos[j]) >= 0.75)
    extras = sum(1 for i, j in pares if i is None)
    nota = max(0.0, (iguais - extras) / max(1, len(esperados)))
    fronteiras, soma = [], 0
    partes = frases_do_texto(f["texto"])
    for parte in partes[:-1]:
        soma += len(alinhar.normalizar(parte))
        if soma - 1 in casado and soma in casado:
            fronteiras.append([round(palavras[casado[soma - 1]][2], 3), round(palavras[casado[soma]][1], 3)])
    return {"nota": round(nota, 3), "ouvido": " ".join(ouvidos), "fala_s": round(fala_s, 2),
            "extras": extras, "faltam": len(esperados) - iguais, "palavras": len(esperados),
            "frases": len(partes), "fronteiras": fronteiras,
            "letras_por_s": round(len(f["texto"]) / fala_s, 1) if fala_s else 0.0}


def conferir(f, feixe=5):
    """Transcreve UMA fala gravada e mede o quanto bate com o texto esperado."""
    palavras = alinhar.palavras_ouvidas(BRUTO / f"{f['chave']}.wav", DICA, feixe)
    return avaliar_palavras(f, palavras, segundos_de_fala(f))


def conferir_lote(falas, feixe=1):
    """Transcreve várias falas de uma vez (o transcritor gasta o mesmo com 2 s ou com 30 s de áudio): as falas vão
    em fila, separadas por 1 s de silêncio, e cada palavra ouvida volta para a fala pelo tempo em que foi dita."""
    from faster_whisper.audio import decode_audio
    sr, pos, pedacos, faixas = 16000, 0.0, [], []
    silencio = np.zeros(sr, np.float32)
    for f in falas:
        a = decode_audio(str(BRUTO / f"{f['chave']}.wav"), sampling_rate=sr)
        faixas.append((pos, pos + len(a) / sr))
        pedacos += [a, silencio]
        pos += len(a) / sr + 1.0
    palavras = alinhar.palavras_ouvidas(np.concatenate(pedacos), DICA, feixe)
    saida = []
    for f, (ini, fim) in zip(falas, faixas):
        minhas = [(t, a - ini, b - ini) for t, a, b in palavras if ini - 0.4 <= (a + b) / 2 <= fim + 0.4]
        saida.append(avaliar_palavras(f, minhas, segundos_de_fala(f)))
    return saida


def aprovada(r, aceita):
    """Fala aprovada: bate com o texto, sem palavra a mais (um sopro na pausa vira "a" na transcrição), e num ritmo
    plausível. Fala de uma ou duas palavras sai naturalmente mais arrastada, por isso o piso de ritmo dela é menor."""
    if aceita:
        return True
    piso = 2.5 if r["palavras"] <= 2 else 4
    return r["nota"] >= NOTA_MINIMA and r["extras"] == 0 and piso <= r["letras_por_s"] <= 24


def trecho_ativo(x, taxa, limiar_db=-42):
    """Primeira e última amostra com fala (janelas de 10 ms acima do limiar relativo ao pico)."""
    jan = int(0.01 * taxa)
    if len(x) < jan:
        return None
    n = len(x) // jan
    energia = np.sqrt(np.mean(x[:n * jan].reshape(n, jan) ** 2, axis=1)) + 1e-9
    db = 20 * np.log10(energia / energia.max())
    ativos = np.where(db > limiar_db)[0]
    if not len(ativos):
        return None
    return int(ativos[0] * jan), int((ativos[-1] + 1) * jan)


def encurtar_pausas(x, taxa, limiar_db=-40):
    """Pausa entre frases acima de PAUSA_MAXIMA vira PAUSA_MAXIMA: guarda as duas metades das bordas do silêncio
    (a respiração e o fim da palavra ficam) e tira o meio. As palavras não mudam de velocidade."""
    jan = int(0.01 * taxa)
    n = len(x) // jan
    energia = np.sqrt(np.mean(x[:n * jan].reshape(n, jan) ** 2, axis=1)) + 1e-9
    quieto = 20 * np.log10(energia / energia.max()) <= limiar_db
    manter = int(PAUSA_MAXIMA * 100)
    pedacos, ini, k = [], 0, 0
    while k < n:
        if quieto[k]:
            fim = k
            while fim < n and quieto[fim]:
                fim += 1
            if fim - k > manter and k > 0 and fim < n:  # só pausa interna, nunca as pontas
                meio_a = (k + manter // 2) * jan
                meio_b = (fim - (manter - manter // 2)) * jan
                pedacos.append(x[ini:meio_a])
                ini = meio_b
            k = fim
        else:
            k += 1
    pedacos.append(x[ini:])
    return np.concatenate(pedacos) if len(pedacos) > 1 else x


PAUSAS = {"alongadas": 0, "sem_respiro": 0}  # contagem do último tratamento, para o relatório


def alongar_pausas(x, taxa, fronteiras):
    """Entre uma frase e a seguinte, a pausa vira PAUSA_ENTRE_FRASES. O silêncio entra NO MEIO do respiro que a voz já
    faz ali (trecho pelo menos 30 dB abaixo do pico), então nenhuma palavra é cortada. Se a voz emendou as duas frases
    sem respiro nenhum, a fala fica como está: cortar no meio da fala soaria picotado."""
    jan = int(0.005 * taxa)
    pico = float(np.abs(x).max()) + 1e-9
    for t_fim, t_ini in sorted(fronteiras, reverse=True):  # de trás para frente, para os tempos seguirem valendo
        a = max(0, int((t_fim - 0.10) * taxa))
        b = min(len(x), int((t_ini + 0.10) * taxa))
        n = (b - a) // jan
        if n < 6:
            PAUSAS["sem_respiro"] += 1
            continue
        energia = np.sqrt(np.mean(x[a:a + n * jan].reshape(n, jan) ** 2, axis=1))
        quieto = 20 * np.log10(energia / pico + 1e-9) < -30
        melhor, ini, k = (0, 0), None, 0
        for k in range(n + 1):
            if k < n and quieto[k]:
                ini = k if ini is None else ini
            elif ini is not None:
                if k - ini > melhor[1]:
                    melhor = (ini, k - ini)
                ini = None
        ini, tam = melhor
        if tam * jan < 0.03 * taxa:
            PAUSAS["sem_respiro"] += 1
            continue
        falta = PAUSA_ENTRE_FRASES - tam * jan / taxa
        if falta > 0:
            meio = a + (ini + tam // 2) * jan
            antes, depois = x[:meio].copy(), x[meio:].copy()
            antes[-jan:] *= np.linspace(1, 0, jan)
            depois[:jan] *= np.linspace(0, 1, jan)
            x = np.concatenate([antes, np.zeros(int(falta * taxa), np.float32), depois])
        PAUSAS["alongadas"] += 1
    return x


def tratar(f, fronteiras=None):
    """Alonga a pausa entre frases, apara o silêncio das pontas, suaviza as bordas e nivela o volume."""
    x, taxa = alinhar.ler_wav(BRUTO / f"{f['chave']}.wav")
    x = alongar_pausas(x, taxa, fronteiras or [])
    a, b = trecho_ativo(x, taxa)
    x = x[max(0, a - int(0.06 * taxa)):min(len(x), b + int(0.2 * taxa))].copy()
    x = encurtar_pausas(x, taxa)
    ent, sai = int(0.008 * taxa), int(0.04 * taxa)
    x[:ent] *= np.linspace(0, 1, ent)
    x[-sai:] *= np.linspace(1, 0, sai)
    # volume: a fala ativa em -20 dBFS de RMS (a frase "alta" da Gigi fica 3,5 dB acima), pico no máximo -1,5 dBFS
    jan = int(0.02 * taxa)
    n = len(x) // jan
    rms = np.sqrt(np.mean(x[:n * jan].reshape(n, jan) ** 2, axis=1))
    ativo = rms[rms > 0.1 * rms.max()]
    alvo = 10 ** ((-20 + (3.5 if f.get("alto") else 0)) / 20)
    ganho = alvo / float(np.sqrt(np.mean(ativo ** 2)))
    pico = float(np.abs(x).max()) * ganho
    if pico > 10 ** (-1.5 / 20):
        ganho *= 10 ** (-1.5 / 20) / pico
    return np.clip(x * ganho, -1, 1), taxa


def carregar_rel():
    return json.loads(REL.read_text(encoding="utf-8")) if REL.exists() else {}


def salvar_rel(rel):
    REL.write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8")


def rodar(lista, tentativas=3):
    rel = carregar_rel()
    faltam = [f for f in lista if not (BRUTO / f"{f['chave']}.wav").exists()]
    print(f"{len(lista)} falas; {len(faltam)} para gravar", flush=True)
    inicio = time.time()
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for k, _ in enumerate(ex.map(gravar, faltam), 1):
            if k % 25 == 0:
                print(f"  gravadas {k}/{len(faltam)} em {time.time() - inicio:.0f} s", flush=True)
    # Conferência em lotes de até 26 s de áudio, salvando a cada lote: interrompida, a próxima execução retoma daqui.
    # O que reprovar no lote é conferido de novo sozinho, com a transcrição cuidadosa, e só então regravado.
    def completar(f, r):
        aceita = ACEITA_SE_OUVIR.get(f["texto"]) == r["ouvido"]
        r.update({"texto": f["texto"], "quem": f["quem"], "id": f["id"], "ok": aprovada(r, aceita)})
        if aceita:
            r["aceita_por"] = "o transcritor escreve outra grafia com o mesmo som"
        return r

    def sozinha(f):
        tent = 0
        while True:
            r = completar(f, conferir(f, 5))
            r["tentativa"] = tent
            if r["ok"] or tent >= tentativas - 1:
                r["esgotada"] = not r["ok"]
                return r
            print(f"  regravando ({tent + 2}ª vez): {f['texto'][:60]}  (ouvido: {r['ouvido'][:60]})", flush=True)
            tent += 1
            gravar(f, SEMENTE + tent)

    def duracao(f):
        with wave.open(str(BRUTO / f"{f['chave']}.wav"), "rb") as w:
            return w.getnframes() / w.getframerate()

    pendentes = [f for f in lista if not (rel.get(f["chave"], {}).get("texto") == f["texto"]
                                          and (rel[f["chave"]].get("ok") or rel[f["chave"]].get("esgotada")))]
    lotes, atual, soma = [], [], 0.0
    for f in pendentes:
        d = duracao(f) + 1.0
        if atual and soma + d > 26:
            lotes.append(atual); atual, soma = [], 0.0
        atual.append(f); soma += d
    if atual:
        lotes.append(atual)
    feitas, inicio = 0, time.time()
    for n, lote in enumerate(lotes, 1):
        for f, r in zip(lote, conferir_lote(lote)):
            r = completar(f, r)
            rel[f["chave"]] = r if r["ok"] else sozinha(f)
        feitas += len(lote)
        salvar_rel(rel)
        if n % 5 == 0 or n == len(lotes):
            print(f"  conferidas {feitas}/{len(pendentes)} em {time.time() - inicio:.0f} s", flush=True)
    salvar_rel(rel)
    ruins = [r for r in rel.values() if not r.get("ok")]
    print(f"conferência completa: {len(rel) - len(ruins)} aprovadas, {len(ruins)} fora do padrão", flush=True)
    return rel


def publicar(lista):
    rel = carregar_rel()
    destino = JOGO / "audio" / "v"
    destino.mkdir(parents=True, exist_ok=True)
    mapa, fora = {}, []
    for f in lista:
        r = rel.get(f["chave"])
        if not r or not r.get("ok") or r.get("texto") != f["texto"]:
            fora.append(f["texto"]); continue
        x, taxa = tratar(f, r.get("fronteiras"))
        tmp = RAIZ / "tmp.wav"
        with wave.open(str(tmp), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(taxa); w.writeframes((x * 32767).astype(np.int16).tobytes())
        mp3 = destino / f"{f['chave']}.mp3"
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(tmp), "-ac", "1", "-ar", str(TAXA), "-b:a", "56k", str(mp3)], check=True)
        mapa[f["chave"]] = {"f": f"v/{f['chave']}.mp3", "t": f["texto"], "q": f["quem"], "d": round(len(x) / taxa, 2)}
    # apaga mp3 que não está mais no catálogo
    validos = {Path(v["f"]).name for v in mapa.values()}
    for velho in destino.glob("*.mp3"):
        if velho.name not in validos:
            velho.unlink()
    (JOGO / "audio" / "falas.json").write_text(json.dumps(mapa, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
    tam = sum(p.stat().st_size for p in destino.glob("*.mp3"))
    print(f"publicadas {len(mapa)} falas, {tam / 1e6:.1f} MB, {sum(v['d'] for v in mapa.values()) / 60:.1f} min; fora: {len(fora)}")
    print(f"pausas entre frases: {PAUSAS['alongadas']} alongadas para {PAUSA_ENTRE_FRASES} s, "
          f"{PAUSAS['sem_respiro']} deixadas como estão (a voz emendou sem respiro)")
    for t in fora:
        print("  fora:", t)


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "piloto"
    lista = catalogo()
    if modo == "piloto":
        ids = ["chegada.hoje", "chegada.item.comoEstou", "comoestou.pergunta", "ajs.gigi.alto", "tesouro.12",
               "hist.festa.2", "aj.elogio", "onda.sobe",
               # falas de uma ou duas palavras: é onde clone costuma embolar
               "facil.elogio", "chegada.vamos", "ajuda.tocaaqui", "morador.caco.aqui", "morador.tuca.ajudo", "rec.tuca.tudobem"]
        amostra = [f for f in lista if f["id"] in ids]
        rel = rodar(amostra, tentativas=1)
        for f in amostra:
            r = rel[f["chave"]]
            print(f"{r['nota']:.2f} {r['letras_por_s']:5.1f} letras/s {r['fala_s']:5.2f}s | {f['texto']}\n      ouvido: {r['ouvido']}")
    elif modo == "tudo":
        rodar(lista)
        rel = carregar_rel()
        ruins = [r for r in rel.values() if not r.get("ok")]
        print(f"fim: {len(lista) - len(ruins)} ok, {len(ruins)} fora do padrão")
        for r in ruins:
            print(f"  {r['nota']:.2f} | {r['texto']}\n        ouvido: {r['ouvido']}")
    elif modo == "publicar":
        publicar(lista)


if __name__ == "__main__":
    main()
