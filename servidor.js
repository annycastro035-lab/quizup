const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORT || 3000;

const servidor = http.createServer((req, res) => {
  let arquivo = req.url === '/' ? 'index.html' : req.url.substring(1);

  const caminho = path.join(__dirname, arquivo);

  fs.readFile(caminho, (erro, conteudo) => {
    if (erro) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
      });

      res.end('Arquivo não encontrado.');
      return;
    }

    let tipo = 'text/html';

    if (arquivo.endsWith('.css')) {
      tipo = 'text/css';
    }

    if (arquivo.endsWith('.js')) {
      tipo = 'application/javascript';
    }

    res.writeHead(200, {
      'Content-Type': tipo
    });

    res.end(conteudo);
  });
});

servidor.listen(PORTA, () => {
  console.log(`QuizUp funcionando na porta ${PORTA}`);
});
