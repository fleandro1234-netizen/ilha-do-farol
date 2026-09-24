"""Gera o site do roteiro a partir de uma fonte só.

fonte/roteiro.html  ->  docs/index.html (GitHub Pages, documento completo)
                    ->  cópia na Área de Trabalho (mesmo arquivo publicado como Artifact)

Uso: python gerar_site.py
"""
from pathlib import Path
import shutil
import sys

RAIZ = Path(__file__).resolve().parent
FONTE = RAIZ / "fonte" / "roteiro.html"
SITE = RAIZ / "docs" / "index.html"
COPIA_DESKTOP = Path(
    r"C:\Users\filipe.leandro\OneDrive - BRASTERRA EMPREENDIMENTOS IMOBILIARIOS LTDA"
    r"\Área de Trabalho\Jogo Ilha do Farol\ilha-do-farol-roteiro.html"
)
MARCA_CORPO = '<div class="wrap">'

CABECA = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta property="og:type" content="article">
<meta property="og:title" content="Ilha do Farol">
<meta property="og:description" content="Roteiro de jogo terapêutico para crianças autistas, baseado em práticas com evidência.">
<style>html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
"""


def main() -> int:
    texto = FONTE.read_text(encoding="utf-8")

    # Regra de escrita do projeto: nada de travessão em texto corrido.
    if "\u2014" in texto:
        print("ERRO: a fonte tem travessão (U+2014). Troque antes de gerar.")
        return 1
    if texto.count(MARCA_CORPO) != 1:
        print(f"ERRO: esperava 1 ocorrência de {MARCA_CORPO!r} na fonte.")
        return 1

    cabeca_da_fonte, corpo = texto.split(MARCA_CORPO, 1)
    pagina = (
        CABECA
        + cabeca_da_fonte.strip()
        + "\n</head>\n<body>\n"
        + MARCA_CORPO
        + corpo.rstrip()
        + "\n</body>\n</html>\n"
    )
    SITE.parent.mkdir(parents=True, exist_ok=True)
    SITE.write_text(pagina, encoding="utf-8", newline="\n")
    print(f"site:   {SITE}  ({len(pagina.encode('utf-8'))} bytes)")

    if COPIA_DESKTOP.parent.exists():
        shutil.copyfile(FONTE, COPIA_DESKTOP)
        print(f"cópia:  {COPIA_DESKTOP}")
    else:
        print("aviso: pasta da Área de Trabalho não encontrada; cópia não atualizada.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
