# Viatura de Gabriele

Arte gerada com ImageGen a partir da referência de viatura fornecida pelo usuário, com
dois policiais nas janelas apontando para a direita. Sem marcas ou insígnias reais.
PNG RGBA original em `source.png` (1448 × 1086), sem recorte. `prepare.py` grava a cópia do
jogo, `public/vfx/police-car.png`, em meia resolução (724 × 543, ~220 KB em vez de ~730 KB,
carregada na abertura), ainda mais nítida do que o carro aparece na tela.

O renderer mede tudo em pixels da fonte: 0,28 px de mundo por px (tamanho de um carro de
verdade ao lado da Gabriele; a imagem é desenhada com escala 0,56) e ancora o chão em y=829. Espelha a imagem para a
esquerda e mantém sirene, clarões, traçantes e fumaça procedurais. A configuração usa
`assets.specialEffects['gabriele.190'].emblem`; o carregamento passa pela BootScene.

```
python3 scripts/vfx-art/police-car/prepare.py
```

Prompt: adaptar a viatura branca com faixa azul da referência em pixel art detalhada,
vista lateral com leve perspectiva frontal, voltada à direita, com dois policiais adultos
de uniforme azul-marinho inclinados pelas janelas e apontando armas compactas à direita.
Contornos nítidos, proporções naturais, acabamento arcade dos anos 1990, fundo transparente,
veículo completo. Sem clarões, rastros, fumaça, texto, marcas, insígnias, sangue ou cenário
incorporados: os efeitos são animados no jogo. A geração não é determinística.
