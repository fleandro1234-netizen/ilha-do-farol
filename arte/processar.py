"""Processa a arte gerada por IA para o jogo.

Lê arte/lote.json (o que é cada peça) e arte/gerados.json (onde está o original),
baixa os originais para arte-fonte/originais, tira o fundo branco, separa as folhas
com várias peças, reduz, grava WebP em docs/jogo/img e reescreve docs/jogo/img/arte.json.
Também monta o logo e os ícones do app a partir das peças já prontas, e uma folha de
revisão em arte-fonte/revisao.png para conferir os recortes.

Uso: python arte/processar.py
"""
from pathlib import Path
import json
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

RAIZ = Path(__file__).resolve().parent.parent
LOTE = RAIZ / "arte" / "lote.json"
GERADOS = RAIZ / "arte" / "gerados.json"
ORIGINAIS = RAIZ / "arte-fonte" / "originais"
DESTINO = RAIZ / "docs" / "jogo" / "img"
ICONES = RAIZ / "docs" / "jogo" / "icones"
REVISAO = RAIZ / "arte-fonte" / "revisao.png"

TEAL = (42, 119, 120)
LADO_MAXIMO = {"personagem": 900, "cenario": 1000, "folha": 420, "logo": 1400, "fundo": 1920, "paineis": 1100}
LADO_ESPECIAL = {"barraca": 900, "folha-cartoes": 360, "folha-atividades": 360, "folha-temas": 360,
                 "folha-bolota": 800, "folha-emocoes": 700, "folha-meujeito": 500, "folha-rotina": 360,
                 "folha-maos": 360, "folha-dentes": 360, "folha-vestir": 360, "folha-ferramentas": 360}
SUAVE = 36  # distância do branco em que a borda fica totalmente opaca


def baixar(pid: str, url: str) -> Path:
    ORIGINAIS.mkdir(parents=True, exist_ok=True)
    arquivo = ORIGINAIS / f"{pid}.png"
    if not arquivo.exists() or arquivo.stat().st_size == 0:
        # a rede Peralta intercepta TLS: sem --ssl-no-revoke o curl do Windows falha (exit 35)
        subprocess.run(["curl", "-sS", "--ssl-no-revoke", "-o", str(arquivo), url], check=True)
    return arquivo


def tirar_fundo(im: Image.Image, tol: int = 10, buracos: bool = False, sombra_quente: bool = False) -> Image.Image:
    """Fundo = pixels quase brancos ligados à borda. O branco de dentro (olhos, brilhos) fica."""
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    dist = (255.0 - rgb).max(axis=2)
    candidato = dist <= tol
    if sombra_quente:
        # sombra clara puxada para o pêssego que a IA deixa sob alguns objetos; objeto frio e claro fica
        candidato |= (dist <= 40) & ((rgb[..., 0] - rgb[..., 2]) >= 8)
    rotulos, n = ndimage.label(candidato)
    na_borda = np.unique(np.concatenate([rotulos[0], rotulos[-1], rotulos[:, 0], rotulos[:, -1]]))
    fundo = np.isin(rotulos, na_borda[na_borda > 0])
    if buracos and n:
        # vãos fechados e grandes, quase brancos (ex.: o vão da barraca entre os postes)
        tamanhos = ndimage.sum(np.ones_like(rotulos), rotulos, index=np.arange(1, n + 1))
        grandes = np.arange(1, n + 1)[tamanhos >= 0.004 * rotulos.size]
        fundo |= np.isin(rotulos, grandes) & (dist <= 4)
    suave = np.clip(dist * 255.0 / SUAVE, 0, 255)
    alfa = np.where(fundo, 0.0, 255.0)
    perto = ndimage.binary_dilation(fundo, iterations=2) & ~fundo      # borda do objeto
    anel = ndimage.binary_dilation(~fundo, iterations=1) & fundo       # 1 px de fora
    alfa[perto] = np.minimum(255.0, suave[perto])
    alfa[anel] = suave[anel]
    a = alfa / 255.0
    parcial = (a > 0) & (a < 1)
    for c in range(3):  # tira o branco que ficou misturado na borda
        canal = rgb[..., c]
        canal[parcial] = np.clip((canal[parcial] - (1 - a[parcial]) * 255.0) / a[parcial], 0, 255)
    return Image.fromarray(np.dstack([rgb, alfa]).astype(np.uint8), "RGBA")


def recortar(im: Image.Image, margem: float = 0.02) -> Image.Image:
    a = np.asarray(im)[..., 3] > 8
    # pontinhos soltos (ruído do fundo) não contam para o enquadramento
    rot, n = ndimage.label(a)
    if n > 1:
        areas = ndimage.sum(a, rot, index=np.arange(1, n + 1))
        a = np.isin(rot, np.arange(1, n + 1)[areas >= max(40, 0.002 * areas.max())])
    ys, xs = np.nonzero(a)
    if not len(xs):
        return im
    m = int(max(im.size) * margem)
    x0, x1 = max(0, xs.min() - m), min(im.width, xs.max() + 1 + m)
    y0, y1 = max(0, ys.min() - m), min(im.height, ys.max() + 1 + m)
    return im.crop((x0, y0, x1, y1))


def faixas_de_colunas(im: Image.Image):
    ocupada = (np.asarray(im)[..., 3] > 24).sum(axis=0) > 1
    faixas, dentro, inicio = [], False, 0
    for x, v in enumerate(ocupada):
        if v and not dentro:
            dentro, inicio = True, x
        elif not v and dentro:
            dentro = False
            faixas.append([inicio, x - 1])
    if dentro:
        faixas.append([inicio, len(ocupada) - 1])
    return faixas


def dividir(im: Image.Image, n: int):
    """Separa uma folha com n peças lado a lado, juntando os pedaços mais próximos."""
    faixas = faixas_de_colunas(im)
    # fiapos (resto de sombra, pontinho solto) não viram peça: saem antes de juntar
    alfa = np.asarray(im)[..., 3].astype(np.float64)
    massa = [alfa[:, x0:x1 + 1].sum() for x0, x1 in faixas]
    faixas = [f for f, m in zip(faixas, massa) if m >= 0.03 * max(massa)]
    while len(faixas) > n:
        folgas = [faixas[i + 1][0] - faixas[i][1] for i in range(len(faixas) - 1)]
        i = int(np.argmin(folgas))
        faixas[i] = [faixas[i][0], faixas[i + 1][1]]
        del faixas[i + 1]
    ocupacao = (alfa > 24).sum(axis=0)
    while len(faixas) < n:
        # duas figuras encostadas: parte a faixa mais larga onde a ocupação é menor (o ponto de contato)
        i = int(np.argmax([x1 - x0 for x0, x1 in faixas]))
        x0, x1 = faixas[i]
        m0, m1 = x0 + (x1 - x0) // 5, x1 - (x1 - x0) // 5
        corte = m0 + int(np.argmin(ocupacao[m0:m1]))
        faixas[i:i + 1] = [[x0, corte], [corte + 1, x1]]
    if len(faixas) != n:
        raise ValueError(f"esperava {n} peças, achei {len(faixas)}")
    return [recortar(im.crop((x0, 0, x1 + 1, im.height))) for x0, x1 in faixas]


def corridas(marcas) -> list:
    """Trechos seguidos de True num vetor: [[início, fim], ...]."""
    trechos, dentro, inicio = [], False, 0
    for i, v in enumerate(marcas):
        if v and not dentro:
            dentro, inicio = True, i
        elif not v and dentro:
            dentro = False
            trechos.append([inicio, i - 1])
    if dentro:
        trechos.append([inicio, len(marcas) - 1])
    return trechos


def dividir_paineis(im: Image.Image, n: int, apagar=None):
    """Quadros de história lado a lado, separados por margem branca. Ficam com o fundo (sem transparência)."""
    rgb = np.asarray(im.convert("RGB")).astype(np.float32).copy()
    h, w, _ = rgb.shape
    for fx0, fy0, fx1, fy1 in apagar or []:
        # pinta por cima de texto que a IA escreveu, com a cor da placa em volta
        x0, y0, x1, y1 = int(fx0 * w), int(fy0 * h), int(fx1 * w), int(fy1 * h)
        borda = np.concatenate([rgb[y0 - 4:y0 - 1, x0:x1].reshape(-1, 3), rgb[y1 + 1:y1 + 4, x0:x1].reshape(-1, 3)])
        rgb[y0:y1, x0:x1] = np.median(borda, axis=0)
    conteudo = (255.0 - rgb).max(axis=2) > 14
    colunas = corridas(conteudo.sum(axis=0) > 0.3 * h)
    colunas = [c for c in colunas if c[1] - c[0] > 0.05 * w]
    while len(colunas) > n:
        folgas = [colunas[i + 1][0] - colunas[i][1] for i in range(len(colunas) - 1)]
        i = int(np.argmin(folgas))
        colunas[i] = [colunas[i][0], colunas[i + 1][1]]
        del colunas[i + 1]
    if len(colunas) != n:
        raise ValueError(f"esperava {n} quadros, achei {len(colunas)}")
    quadros = []
    base = Image.fromarray(rgb.astype(np.uint8), "RGB")
    for x0, x1 in colunas:
        linhas = corridas(conteudo[:, x0:x1 + 1].sum(axis=1) > 0.3 * (x1 - x0))
        y0, y1 = linhas[0][0], linhas[-1][1]
        quadros.append(base.crop((x0 + 3, y0 + 3, x1 - 2, y1 - 2)))  # 3 px para dentro: sem a borda borrada
    return quadros


def reduzir(im: Image.Image, lado: int) -> Image.Image:
    escala = lado / max(im.size)
    if escala >= 1:
        return im
    return im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)


def gravar(im: Image.Image, chave: str, mapa: dict, fundo_opaco: bool = False) -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    arquivo = f"{chave}.webp"
    if fundo_opaco:
        im.convert("RGB").save(DESTINO / arquivo, "WEBP", quality=82, method=6)
    else:
        im.save(DESTINO / arquivo, "WEBP", quality=90, method=6)
    mapa[chave] = arquivo


def montar_logo(original: Image.Image, farol: Image.Image) -> Image.Image:
    """Usa só o letreiro do logo gerado e põe o farol do jogo no lugar do farol dele."""
    limpo = recortar(tirar_fundo(original, tol=12), margem=0)
    faixas = faixas_de_colunas(limpo)
    texto = recortar(limpo.crop((faixas[1][0], 0, limpo.width, limpo.height)), margem=0)
    alto = int(texto.height * 2.3)
    f = farol.resize((round(farol.width * alto / farol.height), alto), Image.LANCZOS)
    folga = int(texto.height * 0.28)
    tela = Image.new("RGBA", (f.width + folga + texto.width, alto), (0, 0, 0, 0))
    tela.alpha_composite(f, (0, 0))
    tela.alpha_composite(texto, (f.width + folga, alto - texto.height - int(alto * 0.06)))
    return recortar(tela, margem=0.03)


def montar_icone(farol: Image.Image, lume: Image.Image, conteudo: float) -> Image.Image:
    lado = 1024
    tela = Image.new("RGBA", (lado, lado), TEAL + (255,))
    d = ImageDraw.Draw(tela)
    raio = int(lado * 0.36 * conteudo / 0.8)
    d.ellipse([lado / 2 - raio, lado * 0.46 - raio, lado / 2 + raio, lado * 0.46 + raio], fill=(212, 233, 232, 70))
    alto_f = int(lado * 0.62 * conteudo / 0.8)
    f = farol.resize((round(farol.width * alto_f / farol.height), alto_f), Image.LANCZOS)
    larg_l = int(lado * 0.40 * conteudo / 0.8)
    l_ = lume.resize((larg_l, round(lume.height * larg_l / lume.width)), Image.LANCZOS)
    base = int(lado * (0.5 + 0.34 * conteudo / 0.8))
    tela.alpha_composite(f, (int(lado * 0.5 - f.width * 0.78), base - f.height))
    tela.alpha_composite(l_, (int(lado * 0.5 - l_.width * 0.05), base - l_.height + int(lado * 0.01)))
    return tela


def folha_de_revisao(mapa: dict) -> None:
    pecas = [k for k in mapa if k != "fundo"]
    cel, colunas = 220, 8
    linhas = (len(pecas) + colunas - 1) // colunas
    tela = Image.new("RGB", (colunas * cel, linhas * (cel + 26)), (210, 230, 230))
    d = ImageDraw.Draw(tela)
    for i, k in enumerate(pecas):
        im = Image.open(DESTINO / mapa[k]).convert("RGBA")
        im.thumbnail((cel - 16, cel - 16))
        x, y = (i % colunas) * cel, (i // colunas) * (cel + 26)
        xadrez = Image.new("RGBA", (cel - 8, cel - 8), (238, 231, 211, 255))
        tela.paste(xadrez, (x + 4, y + 4))
        tela.paste(im, (x + (cel - im.width) // 2, y + (cel - im.height) // 2), im)
        d.text((x + 6, y + cel + 4), k, fill=(20, 48, 58))
    REVISAO.parent.mkdir(parents=True, exist_ok=True)
    tela.save(REVISAO)


def main() -> int:
    lote = json.loads(LOTE.read_text(encoding="utf-8"))
    gerados = json.loads(GERADOS.read_text(encoding="utf-8"))
    mapa = {}
    usados = {}
    for peca in lote["pecas"]:
        pid, tipo = peca["id"], peca["tipo"]
        if pid in ("logo", "icone"):
            continue
        g = gerados.get(pid)
        if not g:
            print(f"falta gerar: {pid}")
            continue
        original = Image.open(baixar(pid, g["url"]))
        lado = LADO_ESPECIAL.get(pid, LADO_MAXIMO[tipo])
        if tipo == "fundo":
            gravar(reduzir(original.convert("RGB"), lado), "fundo", mapa, fundo_opaco=True)
            continue
        if tipo == "paineis":
            for chave, quadro in zip(peca["chaves"], dividir_paineis(original, len(peca["chaves"]), g.get("apagar"))):
                gravar(reduzir(quadro, lado), chave, mapa, fundo_opaco=True)
            print(f"ok  {pid:18s} -> {', '.join(peca['chaves'])}")
            continue
        limpo = tirar_fundo(original, tol=g.get("tolerancia", 10), buracos=g.get("buracos", False), sombra_quente=g.get("sombra_quente", False))
        if g.get("recorte_x"):
            fx0, fx1 = g["recorte_x"]
            limpo = limpo.crop((int(fx0 * limpo.width), 0, int(fx1 * limpo.width), limpo.height))
        if tipo == "folha":
            partes = dividir(recortar(limpo, 0), len(peca["chaves"]))
            for chave, parte in zip(peca["chaves"], partes):
                gravar(reduzir(parte, lado), chave, mapa)
        else:
            im = reduzir(recortar(limpo), lado)
            gravar(im, peca["chaves"][0], mapa)
            usados[pid] = im
        print(f"ok  {pid:18s} -> {', '.join(peca['chaves'])}")

    # o Lume feliz é o teste de estilo aprovado, fora da ficha do lote
    feliz = Image.open(baixar("lume-feliz", gerados["lume-feliz"]["url"]))
    usados["lume-feliz"] = reduzir(recortar(tirar_fundo(feliz)), LADO_MAXIMO["personagem"])
    gravar(usados["lume-feliz"], "lume-feliz", mapa)
    print("ok  lume-feliz")

    farol = Image.open(DESTINO / mapa["farol"]).convert("RGBA")
    logo = montar_logo(Image.open(baixar("logo", gerados["logo"]["url"])), farol)
    gravar(reduzir(logo, LADO_MAXIMO["logo"]), "logo", mapa)
    print("ok  logo (letreiro gerado + farol do jogo)")

    ICONES.mkdir(parents=True, exist_ok=True)
    comum = montar_icone(farol, usados["lume-feliz"], 0.8)
    mascaravel = montar_icone(farol, usados["lume-feliz"], 0.62)
    for tam, nome in ((512, "icone-512.png"), (192, "icone-192.png"), (180, "icone-180.png")):
        comum.resize((tam, tam), Image.LANCZOS).save(ICONES / nome)
    mascaravel.resize((512, 512), Image.LANCZOS).save(ICONES / "icone-maskable-512.png")
    print("ok  ícones do app (montados com farol + Lume)")

    with open(DESTINO / "arte.json", "w", encoding="utf-8", newline="\n") as f:  # LF, igual ao que o git publica
        f.write(json.dumps(dict(sorted(mapa.items())), indent=1, ensure_ascii=False) + "\n")
    folha_de_revisao(mapa)
    total = sum((DESTINO / f).stat().st_size for f in mapa.values())
    print(f"{len(mapa)} imagens em docs/jogo/img ({total / 1024:.0f} KB); revisão em {REVISAO}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
