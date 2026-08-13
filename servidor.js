const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const servidor = http.createServer(async (req, res) => {

  // ENVIAR CÓDIGO POR E-MAIL
  if (req.method === 'POST' && req.url === '/enviar-codigo') {

    let corpo = '';

    req.on('data', parte => {
      corpo += parte;
    });

    req.on('end', async () => {

      try {
        const dados = JSON.parse(corpo);
        const email = dados.email;
        const codigo = dados.codigo;

        if (!email || !codigo) {
          res.writeHead(400, {
            'Content-Type': 'application/json; charset=utf-8'
          });

          res.end(JSON.stringify({
            sucesso: false,
            mensagem: 'E-mail ou código não informado.'
          }));

          return;
        }

        if (!RESEND_API_KEY) {
          console.error('RESEND_API_KEY não configurada.');

          res.writeHead(500, {
            'Content-Type': 'application/json; charset=utf-8'
          });

          res.end(JSON.stringify({
            sucesso: false,
            mensagem: 'Serviço de e-mail não configurado.'
          }));

          return;
        }

        const resposta = await fetch('https://api.resend.com/emails', {
          method: 'POST',

          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            from: 'QuizUp <onboarding@resend.dev>',
            to: [email],
            subject: 'Seu código de recuperação - QuizUp',
            html: `
              <div style="font-family:Arial,sans-serif">
                <h2>🎯 QuizUp</h2>
                <p>Seu código para recuperar a senha é:</p>

                <h1 style="letter-spacing:5px">
                  ${codigo}
                </h1>

                <p>Se você não solicitou este código, ignore este e-mail.</p>
              </div>
            `
          })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
          console.error('Erro do Resend:', resultado);

          res.writeHead(500, {
            'Content-Type': 'application/json; charset=utf-8'
          });

          res.end(JSON.stringify({
            sucesso: false,
            mensagem: 'Não foi possível enviar o e-mail.'
          }));

          return;
        }

        console.log('E-mail enviado:', resultado);

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify({
          sucesso: true,
          mensagem: 'Código enviado com sucesso.'
        }));

      } catch (erro) {

        console.error('Erro:', erro);

        res.writeHead(500, {
          'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify({
          sucesso: false,
          mensagem: 'Erro ao enviar o código.'
        }));
      }
    });

    return;
  }


  // SERVIR OS ARQUIVOS DO QUIZUP

  const url = new URL(req.url, `http://${req.headers.host}`);
  let arquivo = url.pathname;

  if (arquivo === '/') {
    arquivo = '/index.html';
  }

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
    }

    else if (arquivo.endsWith('.js')) {
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
