# -*- coding: utf-8 -*-
"""Mede o ritmo das falas como elas vão para o jogo (com o tratamento de pausas).

Uso: python medir_ritmo.py            # a gravação atual (bruto + relatorio.json)
     python medir_ritmo.py bruto-aninha-v100   # uma gravação guardada (só o teto de pausa, como foi publicada)
Referência: 1,86 palavra/s foi lento para a psicóloga (28/09/2026); 2,15 é o ritmo que ficou no ar.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import alinhar  # noqa: E402
import gravar_eleven as g  # noqa: E402


def sinal(f, pasta, rel):
    if pasta == "bruto":
        r = rel.get(f["chave"])
        if not r:
            return None
        x, taxa = g.tratar(f, r.get("fronteiras"))
        a, b = g.trecho_ativo(x, taxa)
        return x[a:b], taxa
    wav = Path(pasta) / f"{f['chave']}.wav"
    if not wav.exists():
        return None
    x, taxa = alinhar.ler_wav(wav)
    a, b = g.trecho_ativo(x, taxa)
    return g.encurtar_pausas(x[a:b], taxa), taxa


def medir(pasta):
    rel = g.carregar_rel() if pasta == "bruto" else {}
    ritmos, pausas, total, n = [], [], 0.0, 0
    for f in g.catalogo():
        s = sinal(f, pasta, rel)
        if s is None:
            continue
        x, taxa = s
        jan = int(0.01 * taxa)
        m = len(x) // jan
        e = np.sqrt(np.mean(x[:m * jan].reshape(m, jan) ** 2, axis=1)) + 1e-9
        fala = 20 * np.log10(e / e.max()) > -40
        run = 0
        for v in fala:
            if not v:
                run += 1
            else:
                if run >= 20:
                    pausas.append(run / 100)
                run = 0
        dur = len(x) / taxa
        total += dur
        n += 1
        palavras = len(alinhar.normalizar(f["texto"]))
        if palavras >= 5:
            ritmos.append(palavras / dur)
    return {"falas": n, "palavras_por_s": round(float(np.median(ritmos)), 2) if ritmos else None,
            "pausa_tipica_s": round(float(np.median(pausas)), 2) if pausas else None,
            "pausas_de_0,2s_ou_mais": len(pausas), "minutos": round(total / 60, 1)}


if __name__ == "__main__":
    for pasta in sys.argv[1:] or ["bruto"]:
        print(pasta, medir(pasta))
