# -*- coding: utf-8 -*-
"""Grava todas as falas da Ilha do Farol com a voz da Aninha (ElevenLabs) e confere cada uma.

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

VOZ = "hgTbkcw2ddnzYh66cwCI"          # Aninha - Warm, Calm and Soothing (biblioteca ElevenLabs, pt-BR verificado)
MODELO = "eleven_multilingual_v2"      # o modelo em que o português dela é verificado
# calma e constante: estabilidade alta, pouco exagero de estilo, ritmo um pouco mais lento
AJUSTES = {"stability": 0.62, "similarity_boost": 0.8, "style": 0.08, "use_speaker_boost": True, "speed": 0.92}
SEMENTE = 20260928
TAXA = 44100
NOTA_MINIMA = 0.85
DICA = "Lume, Gigi, Tuca, Caco, Fifi, Bolota, Ilha do Farol, concha, termômetro."
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


def gravar(f, semente=SEMENTE):
    destino = BRUTO / f"{f['chave']}.wav"
    corpo = {"text": f["texto"], "model_id": MODELO, "voice_settings": AJUSTES, "seed": semente,
             "apply_text_normalization": "auto", **contexto(f)}
    pcm = eleven_tts.chamar("POST", f"/text-to-speech/{VOZ}?output_format=pcm_{TAXA}", corpo, aceita="*/*")
    with wave.open(str(destino), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(TAXA); w.writeframes(pcm)
    return destino


def conferir(f):
    """Transcreve a fala gravada e mede o quanto bate com o texto esperado."""
    wav = BRUTO / f"{f['chave']}.wav"
    x, taxa = alinhar.ler_wav(wav)
    ouvidos = [o[0] for o in alinhar.palavras_ouvidas(wav, DICA)]
    esperados = alinhar.normalizar(f["texto"])
    pares = alinhar.alinhar_tokens(esperados, ouvidos)
    iguais = sum(1 for i, j in pares if i is not None and j is not None and alinhar.parecido(esperados[i], ouvidos[j]) >= 0.75)
    extras = sum(1 for i, j in pares if i is None)
    nota = max(0.0, (iguais - extras) / max(1, len(esperados)))
    ativo = trecho_ativo(x, taxa)
    fala_s = (ativo[1] - ativo[0]) / taxa if ativo else 0.0
    return {"nota": round(nota, 3), "ouvido": " ".join(ouvidos), "fala_s": round(fala_s, 2),
            "letras_por_s": round(len(f["texto"]) / fala_s, 1) if fala_s else 0.0}


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


def tratar(f):
    """Apara o silêncio das pontas, suaviza as bordas e nivela o volume. Devolve (amostras, taxa)."""
    x, taxa = alinhar.ler_wav(BRUTO / f"{f['chave']}.wav")
    a, b = trecho_ativo(x, taxa)
    x = x[max(0, a - int(0.06 * taxa)):min(len(x), b + int(0.2 * taxa))].copy()
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
    for rodada in range(tentativas):
        ruins = []
        for f in lista:
            if f["chave"] in rel and rel[f["chave"]].get("ok") and rel[f["chave"]].get("texto") == f["texto"]:
                continue
            r = conferir(f)
            r.update({"texto": f["texto"], "quem": f["quem"], "id": f["id"],
                      "ok": r["nota"] >= NOTA_MINIMA and 4 <= r["letras_por_s"] <= 24})
            rel[f["chave"]] = {**rel.get(f["chave"], {}), **r, "rodada": rodada}
            if not r["ok"]:
                ruins.append(f)
        salvar_rel(rel)
        print(f"rodada {rodada + 1}: {len(ruins)} falas fora do padrão", flush=True)
        if not ruins or rodada == tentativas - 1:
            break
        for f in ruins:  # regrava só as ruins, com outra semente
            print(f"  regravando: {f['texto'][:70]}  (ouvido: {rel[f['chave']]['ouvido'][:70]})", flush=True)
            gravar(f, SEMENTE + rodada + 1)
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
        x, taxa = tratar(f)
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
    for t in fora:
        print("  fora:", t)


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else "piloto"
    lista = catalogo()
    if modo == "piloto":
        ids = ["chegada.hoje", "chegada.item.comoEstou", "comoestou.pergunta", "ajs.gigi.alto", "tesouro.12",
               "hist.festa.2", "aj.elogio", "onda.sobe"]
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
