# Influencer Tycoon

Em toda tarefa de codigo, siga a skill `ponytail` (`.claude/skills/ponytail/SKILL.md`, nivel full): a menor mudanca completa, reaproveitando o que o projeto ja tem; um teste pequeno para logica arriscada; atalhos marcados com `shortcut: <limite>, <quando melhorar>`; e no fim da resposta, o que ficou de fora e os riscos. Revisoes: `/ponytail-review` (mudanca) e `/ponytail-audit` (repo inteiro).

Responda em portugues. Como rodar e testar no `README.md`.

- Jogo clicker/idle em pixel art, humor trash e debochado de blogueira. Celular primeiro, mas jogavel no computador.
- HTML + CSS + JavaScript puro, sem build e sem dependencias. Regras sem DOM em `game.js` (testadas com `node --test`); tela em `main.js`.
- Todo texto do jogo em portugues.
- Artes: gerar com o PixelLab (MCP `pixellab` em `.mcp.json`, chave na variavel de ambiente `PIXELLAB_API_KEY`, nunca no repositorio). Mostrar a arte ao usuario antes de colocar no jogo. Os creditos sao limitados: conferir o saldo (`get_balance`) antes de gerar.
