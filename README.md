# Influencer Tycoon

Clicker/idle em pixel art com humor trash de blogueira: toque na blogueira, ganhe seguidores e compre ring light, estagiaria nao remunerada e fazenda de bots. HTML + CSS + JavaScript puro, sem build e sem dependencias.

Jogar: https://lubra-lucas.github.io/influencer-tycoon/

## Rodar

```bash
python3 -m http.server 8080   # ou: npx serve
```

Abra http://localhost:8080 (no celular: o IP do computador na mesma wifi). Precisa de servidor porque usa modulos JS; abrir o arquivo direto nao funciona.

## Testar

```bash
node --test
```

## Arquivos

- `game.js`: regras (itens, custos, toque, viral, tempo offline, save). Sem DOM.
- `main.js`: tela, pixel art da personagem, loja, loop e save no `localStorage`.
- `index.html`: layout (celular primeiro; vira duas colunas a partir de 820px).

## Publicar

Cada push na `main` roda os testes e publica no GitHub Pages (`.github/workflows/deploy.yml`). Uma vez so: Settings > Pages > Source: "GitHub Actions".
