"""Registra as gerações da versão 0.3 em gerados.json e ajusta a ficha (lote.json)."""
import io
import json
from pathlib import Path

AQUI = Path(__file__).parent
B = "https://cdn.kairogen.ai/gallery/images/6a7b7d777a352efac4204e5e/"

g = json.load(io.open(AQUI / "gerados.json", encoding="utf-8"))
g.update({
    "folha-lugares": {"geracao": "6ab694759783ca089a53526d", "url": B + "9d98d70e-2144-40be-934c-6ce36482b678.png", "creditos": 6},
    "fifi": {"geracao": "6ab694aabddac791cc8b9baf", "url": B + "970074a2-1f10-41cb-9fb6-7ca5d9d6fd34.png", "creditos": 6, "tolerancia": 6},
    "folha-bolota": {"geracao": "6ab694ec9783ca089a535c3b", "url": B + "eadc2340-da76-4e4f-80b1-907335328455.png", "creditos": 6},
    "folha-ferramentas": {"geracao": "6ab695209783ca089a535f41", "url": B + "fc3b97a5-9844-42f6-85ab-de8c7adb826d.png", "creditos": 6},
    "folha-emocoes": {"geracao": "6ab69569bddac791cc8ba43b", "url": B + "2a464e17-953c-481e-9cdc-e71577750d3a.png", "creditos": 6,
                      "recorte_x": [0.315, 1.0], "nota": "as duas tartarugas saíram grudadas e cortadas: usa só as 4 da direita"},
    "tuca-triste": {"geracao": "6ab695f9bddac791cc8babbf", "url": B + "d5f79002-b879-46ee-961a-6439b720115d.png", "creditos": 6},
    "folha-rotina": {"geracao": "6ab6959d9783ca089a5364e4", "url": B + "7c19465c-88bc-4cd0-83ff-2d06f70c0cd1.png", "creditos": 6},
    "folha-maos": {"geracao": "6ab6963b9783ca089a536b9d", "url": B + "b4c4eba2-52ed-40ab-94ad-3340b1e9948b.png", "creditos": 6},
    "folha-dentes": {"geracao": "6ab6968abddac791cc8bb147", "url": B + "4794a206-7b87-4a5e-b07c-9a079b55ff60.png", "creditos": 6, "tolerancia": 6},
    "folha-vestir": {"geracao": "6ab696cdbddac791cc8bb518", "url": B + "07ea30b4-9599-40c8-b647-93bc76c24e6a.png", "creditos": 6},
    "historia-festa-1": {"geracao": "6ab69715bddac791cc8bba2f", "url": B + "e7edf861-e7ae-435f-a99e-bba3015a909d.png", "creditos": 6},
    "historia-festa-2": {"geracao": "6ab697849783ca089a537ce4", "url": B + "aeefd16b-8b80-424a-be61-1fd82b891d73.png", "creditos": 6},
    "historia-medico-1": {"geracao": "6ab697d99783ca089a538178", "url": B + "8e586c09-70c5-46a8-b033-7040a9371c69.png", "creditos": 6,
                          "apagar": [[0.2372, 0.2351, 0.3048, 0.2768]], "nota": "a IA escreveu CLINIC na placa: o script pinta por cima"},
    "historia-medico-2": {"geracao": "6ab698119783ca089a53843a", "url": B + "49d26680-aed7-4c89-b546-d85b207f61bf.png", "creditos": 6},
    "folha-barco": {"geracao": "6ab698629783ca089a53898d", "url": B + "1b0a246f-51d2-4594-9517-6ca9bf8e1bc3.png", "creditos": 6, "buracos": True},
    "folha-meujeito": {"geracao": "6ab698969783ca089a538bda", "url": B + "358cee4a-22f2-4726-abcb-0a13a34157c1.png", "creditos": 6, "sombra_quente": True},
})
io.open(AQUI / "gerados.json", "w", encoding="utf-8", newline="\n").write(json.dumps(g, indent=1, ensure_ascii=False) + "\n")

L = json.load(io.open(AQUI / "lote.json", encoding="utf-8"))
for p in L["pecas"]:
    if p["id"] == "folha-emocoes":
        p["chaves"] = ["caco-bravo", "caco-medo", "gigi-feliz", "gigi-triste"]
if not any(p["id"] == "tuca-triste" for p in L["pecas"]):
    L["pecas"].append({"id": "tuca-triste", "chaves": ["tuca-triste"], "tipo": "personagem", "aspecto": "1:1", "referencias": ["tuca"],
                       "prompt": "The exact same turtle as the reference image (Tuca), same colors, shell pattern, proportions and pose, side view facing left. Now she looks clearly sad in a way young children can easily read: inner eyebrows raised, eyes looking a little down, small downturned mouth, head slightly lowered. No tears. Full body, centered."})
io.open(AQUI / "lote.json", "w", encoding="utf-8", newline="\n").write(json.dumps(L, indent=1, ensure_ascii=False) + "\n")
print(len(g), "gerações registradas;", sum(v["creditos"] for v in g.values()), "créditos no total")
