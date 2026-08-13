const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORT || 3000;

const servidor = http.createServer((req, res) => {
  let arquivo = req.url === '/' ? '/index.html' : req.url;

  const caminho = path.join(__dirname, arquivo);

  fs.readFile(caminho, (erro, conteudo) => {
    if (erro) {
      console.log('Arquivo não encontrado:', caminho);

      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
      });

      res.end('Arquivo não encontrado.');
      return;
    }

    let tipo = 'text/html; charset=utf-8';

    if (arquivo.endsWith('.css')) {
      tipo = 'text/css; charset=utf-8';
    } else if (arquivo.endsWith('.js')) {
      tipo = 'application/javascript; charset=utf-8';
    }

    res.writeHead(200, {
      'Content-Type': tipo
    });

    res.end(conteudo);
  });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(`QuizUp funcionando na porta ${PORTA}`);
});
