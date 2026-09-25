"""Acrescenta à ficha (lote.json) as peças dos outros sete lugares da ilha (versão 0.3)."""
import io
import json
from pathlib import Path

P = Path(__file__).with_name("lote.json")
L = json.load(io.open(P, encoding="utf-8"))
ids = {x["id"] for x in L["pecas"]}

LINHA = "in one horizontal row, similar size, evenly spaced with very wide empty gaps between them"
ESTILO = "drawn in the same art style as the reference image (do not draw the octopus)"

novas = [
    {"id": "folha-lugares", "chaves": ["lugar-praia", "lugar-enseada", "lugar-mercado", "lugar-oficina", "lugar-clareira", "lugar-mirante"],
     "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": f"Six separate small place icons for a children's island map, {LINHA}, {ESTILO}. From left to right: a small sandy beach corner with a seashell and a gentle wave; a calm little cove with a soft curling teal wave and a small round rock; a small stand shaped like an open storybook with a teal striped awning; a small wooden workbench with a toolbox on top; a round grassy clearing with two small round trees and a picnic blanket; a little grassy hill lookout with a small telescope on top."},
    {"id": "fifi", "chaves": ["fifi"], "tipo": "personagem", "aspecto": "1:1", "referencias": ["estilo"],
     "prompt": "A new character drawn in exactly the same art style as the reference image (do not draw the octopus): Fifi, a friendly chubby baby seal. Soft light grey body with a lighter belly, small flippers, big friendly round eyes like the reference character, small whiskers, gentle smile. Sitting, three-quarter view facing left, full body, centered."},
    {"id": "folha-bolota", "chaves": ["bolota", "bolota-inchado"], "tipo": "folha", "aspecto": "16:9", "referencias": ["estilo"],
     "prompt": "Two versions of the same new character side by side with a very wide empty gap between them, drawn in exactly the same art style as the reference image (do not draw the octopus): Bolota, a small friendly pufferfish, soft pastel yellow with a lighter belly and big round friendly eyes like the reference character. Left: Bolota calm and small, gentle smile, facing left. Right: the same Bolota puffed up into a big round ball with small soft rounded spikes, cheeks puffed, a little grumpy but still cute, facing left."},
    {"id": "folha-ferramentas", "chaves": ["ferramenta-onda", "ferramenta-apertar", "ferramenta-pular", "ferramenta-silencio", "ferramenta-cantinho"],
     "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": f"Five separate simple calm-down tool icons for children, {LINHA}, {ESTILO}. From left to right: one soft rounded teal wave; two small hands squeezing a soft ball of pastel play dough; a pair of small sneakers with two soft motion lines (jumping); soft teal over-ear headphones; a cozy corner with a big soft cushion and a small folded blanket."},
    {"id": "folha-emocoes", "chaves": ["tuca-feliz", "tuca-triste", "caco-bravo", "caco-medo", "gigi-feliz", "gigi-triste"],
     "tipo": "folha", "aspecto": "21:9", "referencias": ["tuca", "caco", "gigi"],
     "prompt": "Six separate character portraits in one horizontal row, same size, evenly spaced with very wide empty gaps between them, using exactly the three characters from the reference images with the same colors and style (the turtle Tuca, the crab Caco with teal headphones, the seagull Gigi). Each shows one clear, easy-to-read emotion for young children. From left to right: Tuca happy with a big smile; Tuca sad with a small downturned mouth; Caco a little angry with lowered eyebrows and a pout; Caco scared with wide eyes and a small round mouth; Gigi happy with a smile; Gigi sad with droopy eyes and a small downturned beak. No tears, nothing scary."},
    {"id": "folha-rotina", "chaves": ["rotina-acordar", "rotina-escovar", "rotina-cafe", "rotina-vestir"], "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": f"Four separate simple daily-routine icons for a visual schedule, {LINHA}, {ESTILO}. From left to right: a small bed with a smiling sun rising behind it (waking up); a toothbrush with a line of toothpaste; breakfast with a cup of milk and a slice of bread; a folded light blue t-shirt."},
    {"id": "folha-maos", "chaves": ["passo-maos-1", "passo-maos-2", "passo-maos-3", "passo-maos-4", "passo-maos-5"], "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": f"Five separate step icons showing how to wash hands, for a children's visual step list, {LINHA}, {ESTILO}, with simple child hands. From left to right: a hand turning on a faucet with water starting to run; two hands under running water; soap foam in the palm of one hand; two hands rubbing together with soft bubbles; two hands drying with a small towel. No numbers."},
    {"id": "folha-dentes", "chaves": ["passo-dentes-1", "passo-dentes-2", "passo-dentes-3", "passo-dentes-4"], "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": f"Four separate step icons showing how to brush teeth, for a children's visual step list, {LINHA}, {ESTILO}. From left to right: toothpaste being squeezed onto a toothbrush; a smiling mouth with clean teeth and a toothbrush brushing them; a small sink with a little water splash (spitting out); a small cup of water (rinsing the mouth). No numbers."},
    {"id": "folha-vestir", "chaves": ["passo-vestir-1", "passo-vestir-2", "passo-vestir-3", "passo-vestir-4"], "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": f"Four separate clothing icons for a children's getting-dressed step list, {LINHA}, {ESTILO}. From left to right: a light blue t-shirt; a pair of soft green shorts; a pair of small socks; a pair of small sneakers. No numbers."},
    {"id": "historia-festa-1", "chaves": ["festa-1", "festa-2", "festa-3"], "tipo": "paineis", "aspecto": "21:9", "referencias": ["estilo", "gigi", "caco", "tuca"],
     "prompt": "Three separate square illustration panels side by side with wide pure white gutters between them, like pages of a calm children's picture book, same art style and same characters as the reference images (Lume the orange baby octopus, Gigi the seagull, Caco the crab with teal headphones, Tuca the turtle). Panel 1: Lume at the door of the lighthouse happily holding a small invitation card decorated with a balloon. Panel 2: a small birthday party on the beach with a few soft balloons, a cake on a blanket, Gigi, Caco and Tuca smiling. Panel 3: everyone singing loudly with open mouths and Lume looking a little worried. Soft simple backgrounds, low detail, no text, no letters."},
    {"id": "historia-festa-2", "chaves": ["festa-4", "festa-5", "festa-6"], "tipo": "paineis", "aspecto": "21:9", "referencias": ["estilo", "gigi", "caco", "tuca"],
     "prompt": "Three separate square illustration panels side by side with wide pure white gutters between them, like pages of a calm children's picture book, same art style and same characters as the reference images (Lume the orange baby octopus, Gigi the seagull, Caco the crab with teal headphones, Tuca the turtle). Panel 1: Lume putting on soft teal over-ear headphones, calmer. Panel 2: Lume resting in a quiet shady spot under a small palm tree, holding a small card with a pause symbol, Caco sitting calmly beside. Panel 3: Lume happy eating a small slice of cake with Gigi, Caco and Tuca at the beach party. Soft simple backgrounds, low detail, no text, no letters."},
    {"id": "historia-medico-1", "chaves": ["medico-1", "medico-2", "medico-3"], "tipo": "paineis", "aspecto": "21:9", "referencias": ["estilo", "tuca"],
     "prompt": "Three separate square illustration panels side by side with wide pure white gutters between them, like pages of a calm children's picture book, same art style and same characters as the reference images (Lume the orange baby octopus, Tuca the turtle). Panel 1: Lume and Tuca walking together along the beach to a small friendly clinic with a teal door. Panel 2: a calm waiting room with two chairs and a small toy, Lume sitting next to Tuca. Panel 3: a kind light blue whale doctor with a stethoscope gently listening to Lume's chest. Soft simple backgrounds, low detail, no needles, no text, no letters."},
    {"id": "historia-medico-2", "chaves": ["medico-4", "medico-5", "medico-6"], "tipo": "paineis", "aspecto": "21:9", "referencias": ["estilo", "tuca"],
     "prompt": "Three separate square illustration panels side by side with wide pure white gutters between them, like pages of a calm children's picture book, same art style and same characters as the reference images (Lume the orange baby octopus, Tuca the turtle, and a kind light blue whale doctor). Panel 1: the whale doctor gently looking into Lume's open mouth with a small soft light. Panel 2: Lume holding Tuca's flipper for comfort and breathing calmly. Panel 3: Lume smiling with a small round star sticker on the head, waving goodbye to the doctor. Soft simple backgrounds, low detail, no needles, no text, no letters."},
    {"id": "folha-barco", "chaves": ["barco-casco", "barco-mastro", "barco-vela", "barco-bandeira", "barco-janela", "barco-boia"], "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": f"Six separate parts of a simple toy sailboat, {LINHA}, {ESTILO}. From left to right: a small rounded wooden boat hull seen from the side; a straight wooden mast; a triangular cream sail with a teal stripe; a small amber triangular flag; a round porthole window with a wooden rim; a red and white lifebuoy ring."},
    {"id": "folha-meujeito", "chaves": ["jeito-pular", "jeito-esconder", "jeito-abracar", "jeito-chorar", "jeito-quieto", "jeito-agitar"], "tipo": "folha", "aspecto": "21:9", "referencias": ["estilo"],
     "prompt": "Six separate small illustrations of the exact same character from the reference image (Lume, the orange baby octopus, same colors and shape), in one horizontal row, same size, evenly spaced with very wide empty gaps between them. From left to right: Lume jumping happily in the air; Lume hiding its face behind its tentacles; Lume hugging a soft round pillow; Lume crying a little with one small tear; Lume sitting very still and quiet with calm eyes; Lume waving all its tentacles energetically. Each clear and easy to read for young children."},
]
acrescentadas = [x for x in novas if x["id"] not in ids]
L["pecas"] += acrescentadas
io.open(P, "w", encoding="utf-8", newline="\n").write(json.dumps(L, indent=1, ensure_ascii=False) + "\n")

# prompt completo de cada peça nova, para colar na geração
for x in acrescentadas:
    partes = [L["proibicoes"], L["estilo"] if x["referencias"] else "", x["prompt"]]
    if x["tipo"] not in ("paineis",):
        partes.append(L["fundo_branco"])
    x["_completo"] = " ".join(p for p in partes if p)
io.open(P.with_name("prompts_v3.json"), "w", encoding="utf-8", newline="\n").write(
    json.dumps({x["id"]: {"prompt": x["_completo"], "aspecto": x["aspecto"], "referencias": x["referencias"]} for x in acrescentadas}, indent=1, ensure_ascii=False) + "\n")
print(len(L["pecas"]), "peças na ficha;", len(acrescentadas), "novas")
