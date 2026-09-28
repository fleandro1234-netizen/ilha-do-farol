# -*- coding: utf-8 -*-
"""Corta um áudio longo nas falas esperadas e mede a fidelidade de cada uma.

1. faster-whisper transcreve o áudio com o tempo de cada palavra.
2. As palavras ouvidas são alinhadas às palavras esperadas (programação dinâmica, com casamento aproximado).
3. Cada fala vai do fim da anterior ao começo da seguinte, cortando no ponto mais silencioso do intervalo.
4. A nota de cada fala = palavras esperadas que foram ouvidas iguais, menos as palavras a mais que apareceram dentro dela.
"""
import difflib
import re
import unicodedata
import wave

import numpy as np

UNIDADES = "zero um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze dezesseis dezessete dezoito dezenove".split()
DEZENAS = {20: "vinte", 30: "trinta", 40: "quarenta", 50: "cinquenta", 60: "sessenta", 70: "setenta", 80: "oitenta", 90: "noventa"}


def numero_por_extenso(n):
    if n < 20:
        return UNIDADES[n]
    if n in DEZENAS:
        return DEZENAS[n]
    if n < 100:
        return f"{DEZENAS[n - n % 10]} e {UNIDADES[n % 10]}"
    return str(n)


def normalizar(texto):
    t = texto.lower()
    t = re.sub(r"\d+", lambda m: " " + numero_por_extenso(int(m.group())) + " ", t)
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    t = re.sub(r"[^a-z ]+", " ", t)
    return t.split()


def parecido(a, b):
    if a == b:
        return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def ler_wav(caminho):
    with wave.open(str(caminho), "rb") as w:
        taxa = w.getframerate()
        amostras = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    return amostras, taxa


_modelo = None


def modelo_whisper():
    global _modelo
    if _modelo is None:
        from faster_whisper import WhisperModel
        _modelo = WhisperModel("small", device="cpu", compute_type="int8")
    return _modelo


def palavras_ouvidas(caminho, dica=None):
    segs, _ = modelo_whisper().transcribe(str(caminho), language="pt", word_timestamps=True, beam_size=5,
                                          condition_on_previous_text=False, initial_prompt=dica)
    saida = []
    for s in segs:
        for w in s.words or []:
            for tok in normalizar(w.word):
                saida.append((tok, w.start, w.end))
    return saida


def alinhar_tokens(esperados, ouvidos):
    """Needleman-Wunsch: casar custa 0 (igual) a 1 (diferente); pular custa 0,9. Devolve pares (i_esperado, j_ouvido)."""
    n, m = len(esperados), len(ouvidos)
    custo = np.zeros((n + 1, m + 1), dtype=np.float32)
    custo[:, 0] = np.arange(n + 1) * 0.9
    custo[0, :] = np.arange(m + 1) * 0.9
    passo = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 diagonal, 1 cima (pula esperado), 2 esquerda (pula ouvido)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            p = parecido(esperados[i - 1], ouvidos[j - 1])
            diag = custo[i - 1, j - 1] + (0.0 if p == 1.0 else (0.4 if p >= 0.75 else 1.2))
            cima = custo[i - 1, j] + 0.9
            esq = custo[i, j - 1] + 0.9
            melhor = min(diag, cima, esq)
            custo[i, j] = melhor
            passo[i, j] = 0 if melhor == diag else (1 if melhor == cima else 2)
    pares, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and passo[i, j] == 0:
            pares.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and (j == 0 or passo[i, j] == 1):
            pares.append((i - 1, None)); i -= 1
        else:
            pares.append((None, j - 1)); j -= 1
    return pares[::-1]


def ponto_quieto(amostras, taxa, ini, fim):
    """Instante mais silencioso (janela de 20 ms) entre ini e fim, em segundos."""
    a, b = int(ini * taxa), int(fim * taxa)
    if b - a < int(0.02 * taxa):
        return (ini + fim) / 2
    jan = int(0.02 * taxa)
    trecho = amostras[a:b]
    energias = [float(np.mean(trecho[k:k + jan] ** 2)) for k in range(0, len(trecho) - jan, jan // 2)]
    k = int(np.argmin(energias))
    return (a + k * (jan // 2) + jan / 2) / taxa


def cortar(caminho, textos, dica=None):
    """Devolve, para cada texto esperado, {ini, fim, nota, ouvido} em segundos no áudio de origem."""
    amostras, taxa = ler_wav(caminho)
    dur = len(amostras) / taxa
    esperados, dono = [], []
    for k, t in enumerate(textos):
        for tok in normalizar(t):
            esperados.append(tok); dono.append(k)
    ouvidos = palavras_ouvidas(caminho, dica)
    pares = alinhar_tokens(esperados, [o[0] for o in ouvidos])
    por_fala = [{"iguais": 0, "total": 0, "js": [], "extras": 0} for _ in textos]
    for k in dono:
        por_fala[k]["total"] += 1
    ultimo_dono = 0
    for i, j in pares:
        if i is not None:
            ultimo_dono = dono[i]
            if j is not None:
                por_fala[dono[i]]["js"].append(j)
                if parecido(esperados[i], ouvidos[j][0]) >= 0.75:
                    por_fala[dono[i]]["iguais"] += 1
        elif j is not None:
            por_fala[ultimo_dono]["extras"] += 1
    # começo e fim de cada fala pelas palavras casadas
    limites = []
    for f in por_fala:
        if f["js"]:
            limites.append((ouvidos[min(f["js"])][1], ouvidos[max(f["js"])][2]))
        else:
            limites.append(None)
    resultado = []
    for k, t in enumerate(textos):
        f = por_fala[k]
        nota = max(0.0, (f["iguais"] - f["extras"]) / max(1, f["total"]))
        if limites[k] is None:
            resultado.append({"ini": None, "fim": None, "nota": 0.0, "ouvido": ""}); continue
        ini_fala, fim_fala = limites[k]
        ant = next((limites[x][1] for x in range(k - 1, -1, -1) if limites[x]), 0.0)
        prox = next((limites[x][0] for x in range(k + 1, len(textos)) if limites[x]), dur)
        corte_ini = ponto_quieto(amostras, taxa, ant, ini_fala) if k > 0 else max(0.0, ini_fala - 0.4)
        corte_fim = ponto_quieto(amostras, taxa, fim_fala, prox) if k < len(textos) - 1 else min(dur, fim_fala + 0.6)
        ouvido = " ".join(ouvidos[j][0] for j in range(min(f["js"]), max(f["js"]) + 1))
        resultado.append({"ini": round(corte_ini, 3), "fim": round(corte_fim, 3), "nota": round(nota, 3), "ouvido": ouvido})
    return resultado
