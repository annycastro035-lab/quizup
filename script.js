const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const servidor = http.createServer(async (req, res) => {

  const url = new URL(req.url, `http://${req.headers.host}`);

  // ENVIO DO CÓDIGO POR E-MAIL
  if (url.pathname === '/enviar-codigo' && req.method === 'POST') {

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
          res.writeHead(500, {
            'Content-Type': 'application/json; charset=utf-8'
          });

          res.end(JSON.stringify({
            sucesso: false,
            mensagem: 'RESEND_API_KEY não configurada no Render.'
          }));

          return;
        }

        const resposta = await fetch('https://api.resend.com/emails', {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },

          body: JSON.stringify({

            from: 'QuizUp <onboarding@resend.dev>',

            to: [email],

            subject: 'Código de recuperação - QuizUp',

            html: `
              <div style="font-family:Arial,sans-serif;padding:20px">

                <h1>🎯 QuizUp</h1>

                <p>Seu código para recuperar a senha é:</p>

                <h2 style="font-size:32px;letter-spacing:6px">
                  ${codigo}
                </h2>

                <p>
                  Digite este código no QuizUp para continuar.
                </p>

                <p>
                  Se você não solicitou este código,
                  ignore este e-mail.
                </p>

              </div>
            `

          })

        });

        const resultado = await resposta.json();

        console.log('Resposta Resend:', resultado);

        if (!resposta.ok) {

          res.writeHead(500, {
            'Content-Type': 'application/json; charset=utf-8'
          });

          res.end(JSON.stringify({
            sucesso: false,
            mensagem: 'Não foi possível enviar o e-mail.',
            erro: resultado
          }));

          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify({
          sucesso: true,
          mensagem: 'Código enviado para o e-mail.'
        }));

      } catch (erro) {

        console.log('Erro:', erro);

        res.writeHead(500, {
          'Content-Type': 'application/json; charset=utf-8'
        });

        res.end(JSON.stringify({
          sucesso: false,
          mensagem: 'Erro no servidor.'
        }));

      }

    });

    return;
  }


  // SITE

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
