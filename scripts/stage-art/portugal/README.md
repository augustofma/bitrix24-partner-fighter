# Arte do cenário PORTUGAL, luta do Filipe

`source.webp` é a arte oficial (1448×1086, 4:3) fornecida pelo usuário: um calçadão de pedra
portuguesa sobre o litoral de Portugal, com falésias, encostas em socalcos, uma cidade branca com
torre de igreja, veleiros, estandartes da Arrecife Digital, a torcida atrás da grade "Arrecife
Digital", gaivotas e um avião voando para a DIREITA com a faixa "Arrecife Digital / Sua empresa
conectada" atrás dele.

`prepare_portugal.py` gera em `public/stages/portugal/` as mesmas camadas dos outros cenários
(`background.jpg`, `plane.png`, `propeller.png`, `banner.png`, `skyline.png`), com o preparo
compartilhado `scripts/stage-art/flyover_art.py`. Particularidades:

- **4:3:** a arte é cortada em 16:9 (`CROP`: do céu com o avião até o meio do chão) antes do
  preparo.
- **Avião para a direita:** o preparo compartilhado espera o avião à esquerda, então roda numa
  cópia espelhada e tudo é desespelhado no fim; o cenário usa `direction: 'right'` (opção nova da
  animação do voo).
- **Faixa azul royal parecida com o céu:** `sky_min_value` e `sky_max_hue` (opções novas, sem
  efeito nos outros cenários) separam pelo brilho e pelo tom; as nuvens brancas em volta do avião
  e da faixa contam como céu (`clouds`), e `clear_ring` maior evita manchas no céu preenchido.

Uso (ferramenta offline, fora do build; requer Python 3, Pillow e NumPy):

```bash
python scripts/stage-art/portugal/prepare_portugal.py
```
