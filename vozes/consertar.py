# -*- coding: utf-8 -*-
"""Para as falas que a voz insiste em dizer diferente do texto: testa variações (estabilidade, semente e pontuação do
texto ENVIADO à voz; as palavras e a legenda não mudam) e fica com a primeira que a transcrição cuidadosa aprova.
Imprime o ajuste vencedor, para ele entrar em AJUSTE_POR_FALA / TEXTO_PARA_VOZ do gravar_eleven.py."""
import json
import sys
import wave
from pathlib import Path

sys.path.insert(0, "C:/eleven")
sys.path.insert(0, str(Path(__file__).parent))
import eleven_tts  # noqa: E402
import gravar_eleven as g  # noqa: E402

CASOS = {
    "Você pediu e a Gigi mudou. Pedir funciona.": [
        ("Você pediu e a Gigi mudou. Pedir funciona.", {"stability": 0.8}, 31),
        ("Você pediu, e a Gigi mudou. Pedir funciona.", {"stability": 0.8}, 32),
        ("Você pediu e a Gigi mudou! Pedir funciona.", {"stability": 0.7}, 33),
        ("Você pediu e a Gigi mudou. Pedir... funciona.", {"stability": 0.8}, 34),
        ("Você pediu e a Gigi mudou. Pedir funciona.", {"stability": 0.4}, 35),
        ("Você pediu e a Gigi mudou. Pedir funciona.", {"stability": 0.9, "speed": 0.8}, 36),
    ],
    "Isso. A Tuca está triste.": [
        ("Isso. A Tuca está triste.", {"stability": 0.8}, 41),
        ("Isso! A Tuca está triste.", {"stability": 0.8}, 42),
        ("Isso, a Tuca está triste.", {"stability": 0.8}, 43),
        ("Isso. A Tuca está triste.", {"stability": 0.4}, 44),
        ("Isso! A Tuca está triste.", {"stability": 0.55}, 45),
    ],
    "Isso. A Gigi está triste.": [
        ("Isso. A Gigi está triste.", {"stability": 0.8}, 51),
        ("Isso! A Gigi está triste.", {"stability": 0.8}, 52),
        ("Isso, a Gigi está triste.", {"stability": 0.8}, 53),
        ("Isso. A Gigi está triste.", {"stability": 0.4}, 54),
        ("Isso! A Gigi está triste.", {"stability": 0.55}, 55),
    ],
    "Foi a Tuca, a tartaruga.": [
        ("Foi a Tuca, a tartaruga.", {"stability": 0.8}, 61),
        ("Foi a Tuca: a tartaruga.", {"stability": 0.8}, 62),
        ("Foi a Tuca. A tartaruga.", {"stability": 0.8}, 63),
        ("Foi a Tuca... a tartaruga.", {"stability": 0.7}, 64),
        ("Foi a Tuca, a tartaruga.", {"stability": 0.4}, 65),
    ],
}


def main():
    cat = {f["texto"]: f for f in g.catalogo()}
    rel = g.carregar_rel()
    for texto, variantes in CASOS.items():
        f = cat[texto]
        if rel.get(f["chave"], {}).get("ok"):
            print("já aprovada:", texto)
            continue
        venceu = None
        for texto_voz, extra, semente in variantes:
            corpo = {"text": texto_voz, "model_id": g.MODELO, "voice_settings": {**g.AJUSTES, **extra},
                     "seed": semente, "apply_text_normalization": "auto"}
            pcm = eleven_tts.chamar("POST", f"/text-to-speech/{g.VOZ}?output_format=pcm_{g.TAXA}", corpo, aceita="*/*")
            with wave.open(str(g.BRUTO / f"{f['chave']}.wav"), "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(g.TAXA); w.writeframes(pcm)
            r = g.conferir(f, 5)
            ok = g.aprovada(r, False) and r["nota"] >= 0.99
            print(f"  {'OK ' if ok else 'não'} nota {r['nota']:.2f} extras {r['extras']} | enviado: {texto_voz} {extra} | ouvido: {r['ouvido']}", flush=True)
            if ok:
                r.update({"texto": texto, "quem": f["quem"], "id": f["id"], "ok": True, "esgotada": False,
                          "texto_voz": texto_voz, "ajuste": extra, "semente": semente})
                rel[f["chave"]] = r
                venceu = (texto_voz, extra, semente)
                break
        g.salvar_rel(rel)
        print(("RESOLVIDA: " if venceu else "SEM SOLUÇÃO: ") + texto, json.dumps(venceu, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
