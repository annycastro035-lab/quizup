const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

const usuarios = [];
const saques = [];
const mensagens = [];

const tiposArquivo = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};


/* =========================================================
   RESPOSTA JSON
========================================================= */

function responder(res, status, dados) {

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(JSON.stringify(dados));
}


/* =========================================================
   RECEBER JSON
========================================================= */

function receberDados(req) {

  return new Promise((resolve, reject) => {

    let corpo = "";

    req.on("data", parte => {
      corpo += parte;
    });

    req.on("end", () => {

      try {

        resolve(
          corpo
            ? JSON.parse(corpo)
            : {}
        );

      } catch (erro) {

        reject(erro);

      }

    });

    req.on("error", reject);

  });

}


/* =========================================================
   GERADOR DO CÓDIGO DE INDICAÇÃO
=========================================================

   O código possui exatamente 8 caracteres.

   Ele usa pequenos trechos do nome e do e-mail,
   mas embaralhados.

   O e-mail completo NUNCA é mostrado.

   Exemplo:
   Nome: Leidiane
   E-mail: annycastro035@gmail.com

   Resultado possível:
   LNYAOC35
========================================================= */

function gerarCodigoIndicacao(nome, email) {

  const nomeLimpo =
    String(nome || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase();

  const emailParte =
    String(email || "")
      .split("@")[0]
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

  let caracteres = "";


  /*
   * Pegamos alguns caracteres do nome
   */

  for (
    let i = 0;
    i < nomeLimpo.length && caracteres.length < 4;
    i += 2
  ) {

    caracteres +=
      nomeLimpo[i];

  }


  /*
   * Pegamos alguns caracteres
   * do início do e-mail.
   */

  for (
    let i = 0;
    i < emailParte.length && caracteres.length < 8;
    i += 2
  ) {

    caracteres +=
      emailParte[i];

  }


  /*
   * Se ainda não tiver 8 caracteres,
   * completa com caracteres aleatórios.
   */

  const aleatorio =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


  while (
    caracteres.length < 8
  ) {

    caracteres +=
      aleatorio[
        Math.floor(
          Math.random() *
          aleatorio.length
        )
      ];

  }


  /*
   * Embaralha tudo.
   */

  const lista =
    caracteres
      .substring(0, 8)
      .split("");

  for (
    let i = lista.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      lista[i],
      lista[j]
    ] =
    [
      lista[j],
      lista[i]
    ];

  }


  const codigo =
    lista.join("");


  /*
   * Garante que não exista outro igual.
   */

  const existe =
    usuarios.some(
      usuario =>
        usuario.codigoIndicacao === codigo
    );


  if (existe) {

    return gerarCodigoIndicacao(
      nome,
      email
    );

  }


  return codigo;

}


/* =========================================================
   ARQUIVOS
========================================================= */

function enviarArquivo(res, arquivo) {

  fs.readFile(
    arquivo,
    (erro, dados) => {

      if (erro) {

        res.writeHead(404, {
          "Content-Type":
            "text/plain; charset=utf-8"
        });

        res.end(
          "Página não encontrada."
        );

        return;

      }


      const extensao =
        path.extname(
          arquivo
        ).toLowerCase();


      res.writeHead(200, {

        "Content-Type":
          tiposArquivo[extensao] ||
          "application/octet-stream"

      });


      res.end(dados);

    }
  );

}


/* =========================================================
   SERVIDOR
========================================================= */

const servidor =
  http.createServer(
    async (req, res) => {

      const url =
        new URL(
          req.url,
          `http://${req.headers.host}`
        );


      const caminho =
        url.pathname;


      /* ===================================================
         CADASTRO
      =================================================== */

      if (
        caminho === "/api/cadastro" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const nome =
            String(
              dados.nome || ""
            ).trim();


          const cpf =
            String(
              dados.cpf || ""
            ).trim();


          const email =
            String(
              dados.email || ""
            )
              .trim()
              .toLowerCase();


          const senha =
            String(
              dados.senha || ""
            );


          /*
           * Código de indicação é opcional.
           */

          const codigoRecebido =
            String(
              dados.codigo || ""
            )
              .trim()
              .toUpperCase();


          if (
            !nome ||
            !cpf ||
            !email ||
            !senha
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Preencha todos os campos obrigatórios."
              }
            );

            return;

          }


          if (
            senha.length < 6
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "A senha deve ter pelo menos 6 caracteres."
              }
            );

            return;

          }


          const existeEmail =
            usuarios.find(
              usuario =>
                usuario.email === email
            );


          if (existeEmail) {

            responder(
              res,
              400,
              {
                erro:
                  "Este e-mail já está cadastrado."
              }
            );

            return;

          }


          /*
           * Se foi informado código,
           * encontramos o indicador.
           */

          let indicador = null;


          if (codigoRecebido) {

            indicador =
              usuarios.find(
                usuario =>
                  usuario.codigoIndicacao ===
                  codigoRecebido
              );


            if (!indicador) {

              responder(
                res,
                400,
                {
                  erro:
                    "Código de indicação inválido."
                }
              );

              return;

            }

          }


          /*
           * Cria o código próprio
           * do novo jogador.
           */

          const codigoIndicacao =
            gerarCodigoIndicacao(
              nome,
              email
            );


          const usuario = {

            id:
              Date.now() +
              Math.floor(
                Math.random() * 10000
              ),

            nome,

            cpf,

            email,

            senha,

            /*
             * Código próprio.
             */

            codigoIndicacao,

            /*
             * Código usado no cadastro.
             */

            codigoUsado:
              codigoRecebido || "",

            /*
             * ID de quem indicou.
             */

            indicadoPorId:
              indicador
                ? indicador.id
                : null,

            /*
             * Dados das indicações.
             */

            indicacoes: [],

            /*
             * Plano atual.
             */

            plano:
              "GRATUITO",

            pontos: 0,

            saldo: 0,

            saquesHoje: 0,

            dataSaques:
              new Date().toDateString()

          };


          usuarios.push(usuario);


          /*
           * Registra a nova indicação
           * na conta de quem indicou.
           */

          if (indicador) {

            indicador.indicacoes.push({

              usuarioId:
                usuario.id,

              nome:
                usuario.nome,

              pontos:
                0,

              meta:
                300,

              bonus:
                50,

              bonusPago:
                false,

              status:
                "EM ANDAMENTO",

              data:
                new Date().toISOString()

            });

          }


          responder(
            res,
            201,
            {

              mensagem:
                "Cadastro realizado com sucesso.",

              codigoIndicacao:
                usuario.codigoIndicacao

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Dados inválidos."
            }
          );

        }

        return;

      }


      /* ===================================================
         LOGIN
      =================================================== */

      if (
        caminho === "/api/login" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const email =
            String(
              dados.email || ""
            )
              .trim()
              .toLowerCase();


          const senha =
            String(
              dados.senha || ""
            );


          const usuario =
            usuarios.find(
              item =>
                item.email === email &&
                item.senha === senha
            );


          if (!usuario) {

            responder(
              res,
              401,
              {
                erro:
                  "E-mail ou senha incorretos."
              }
            );

            return;

          }


          /*
           * Atualiza as indicações antes
           * de devolver os dados.
           */

          atualizarIndicacoesDoUsuario(
            usuario
          );


          responder(
            res,
            200,
            {

              mensagem:
                "Login realizado com sucesso.",

              usuario: {

                id:
                  usuario.id,

                nome:
                  usuario.nome,

                email:
                  usuario.email,

                pontos:
                  usuario.pontos,

                saldo:
                  usuario.saldo,

                codigoIndicacao:
                  usuario.codigoIndicacao,

                plano:
                  usuario.plano,

                indicacoes:
                  usuario.indicacoes

              }

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Dados inválidos."
            }
          );

        }

        return;

      }


      /* ===================================================
         INDICAÇÕES
      =================================================== */

      if (
        caminho === "/api/indicacoes" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const email =
            String(
              dados.email || ""
            )
              .trim()
              .toLowerCase();


          const usuario =
            usuarios.find(
              item =>
                item.email === email
            );


          if (!usuario) {

            responder(
              res,
              404,
              {
                erro:
                  "Usuário não encontrado."
              }
            );

            return;

          }


          atualizarIndicacoesDoUsuario(
            usuario
          );


          responder(
            res,
            200,
            {

              codigoIndicacao:
                usuario.codigoIndicacao,

              pontos:
                usuario.pontos,

              saldo:
                usuario.saldo,

              plano:
                usuario.plano,

              indicacoes:
                usuario.indicacoes

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível carregar as indicações."
            }
          );

        }

        return;

      }


      /* ===================================================
         ATUALIZAR PONTUAÇÃO
      =================================================== */

      if (
        caminho === "/api/pontuacao" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const email =
            String(
              dados.email || ""
            )
              .trim()
              .toLowerCase();


          const pontos =
            Number(
              dados.pontos || 0
            );


          const saldo =
            Number(
              dados.saldo || 0
            );


          const usuario =
            usuarios.find(
              item =>
                item.email === email
            );


          if (!usuario) {

            responder(
              res,
              404,
              {
                erro:
                  "Usuário não encontrado."
              }
            );

            return;

          }


          usuario.pontos =
            Math.max(
              0,
              pontos
            );


          usuario.saldo =
            Math.max(
              0,
              saldo
            );


          /*
           * Verifica se alguma indicação
           * chegou aos 300 pontos.
           */

          const resultadoIndicacao =
            atualizarIndicacoesDoUsuario(
              usuario
            );


          responder(
            res,
            200,
            {

              mensagem:
                "Pontuação salva.",

              pontos:
                usuario.pontos,

              saldo:
                usuario.saldo,

              bonusIndicacaoPago:
                resultadoIndicacao.bonusPago

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível salvar a pontuação."
            }
          );

        }

        return;

      }


      /* ===================================================
         SAQUE
      =================================================== */

      if (
        caminho === "/api/saque" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const email =
            String(
              dados.email || ""
            )
              .trim()
              .toLowerCase();


          const quantidade =
            Number(
              dados.pontos || 0
            );


          const tipo =
            String(
              dados.tipo || ""
            )
              .trim()
              .toLowerCase();


          const destino =
            String(
              dados.destino || ""
            ).trim();


          const usuario =
            usuarios.find(
              item =>
                item.email === email
            );


          if (!usuario) {

            responder(
              res,
              404,
              {
                erro:
                  "Usuário não encontrado."
              }
            );

            return;

          }


          if (
            quantidade < 1000
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "O saque mínimo é de 1.000 pontos."
              }
            );

            return;

          }


          if (
            quantidade > usuario.saldo
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Saldo insuficiente."
              }
            );

            return;

          }


          if (
            tipo !== "pix" &&
            tipo !== "paypal"
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Forma de pagamento inválida."
              }
            );

            return;

          }


          if (!destino) {

            responder(
              res,
              400,
              {
                erro:
                  "Informe a chave PIX ou e-mail PayPal."
              }
            );

            return;

          }


          const hoje =
            new Date()
              .toDateString();


          if (
            usuario.dataSaques !== hoje
          ) {

            usuario.dataSaques =
              hoje;

            usuario.saquesHoje =
              0;

          }


          if (
            usuario.saquesHoje >= 2
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Você já realizou 2 solicitações de saque hoje."
              }
            );

            return;

          }


          const saque = {

            id:
              Date.now(),

            usuarioId:
              usuario.id,

            email:
              usuario.email,

            pontos:
              quantidade,

            valor:
              quantidade / 1000,

            tipo,

            destino,

            status:
              "PENDENTE",

            data:
              new Date().toISOString()

          };


          saques.push(saque);


          usuario.saldo -=
            quantidade;


          usuario.saquesHoje++;


          responder(
            res,
            200,
            {

              mensagem:
                "Solicitação de saque enviada.",

              saque: {

                id:
                  saque.id,

                pontos:
                  saque.pontos,

                valor:
                  saque.valor,

                tipo:
                  saque.tipo,

                status:
                  saque.status

              },

              saldo:
                usuario.saldo

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível solicitar o saque."
            }
          );

        }

        return;

      }


      /* ===================================================
         SAC
      =================================================== */

      if (
        caminho === "/api/sac" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const email =
            String(
              dados.email || ""
            )
              .trim()
              .toLowerCase();


          const mensagem =
            String(
              dados.mensagem || ""
            ).trim();


          if (
            !email ||
            !mensagem
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Informe o e-mail e a mensagem."
              }
            );

            return;

          }


          mensagens.push({

            id:
              Date.now(),

            email,

            mensagem,

            data:
              new Date().toISOString()

          });


          responder(
            res,
            200,
            {
              mensagem:
                "Mensagem enviada com sucesso."
            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível enviar a mensagem."
            }
          );

        }

        return;

      }


      /* ===================================================
         STATUS
      =================================================== */

      if (
        caminho === "/api/status" &&
        req.method === "GET"
      ) {

        responder(
          res,
          200,
          {

            status:
              "online",

            mensagem:
              "QuizUp funcionando!",

            usuarios:
              usuarios.length,

            saques:
              saques.length,

            indicacoes:
              usuarios.reduce(
                (total, usuario) =>
                  total +
                  usuario.indicacoes.length,
                0
              )

          }
        );

        return;

      }


      /* ===================================================
         ARQUIVOS DO SITE
      =================================================== */

      let arquivo =
        caminho;


      if (
        arquivo === "/"
      ) {

        arquivo =
          "/index.html";

      }


      arquivo =
        path.join(
          __dirname,
          arquivo
        );


      const pastaProjeto =
        path.resolve(
          __dirname
        );


      const arquivoFinal =
        path.resolve(
          arquivo
        );


      if (
        !arquivoFinal.startsWith(
          pastaProjeto
        )
      ) {

        res.writeHead(
          403,
          {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        );

        res.end(
          "Acesso negado."
        );

        return;

      }


      enviarArquivo(
        res,
        arquivoFinal
      );

    }
  );


/* =========================================================
   ATUALIZA INDICAÇÕES
=========================================================

   Exemplo:

   Vinicius indicou Vera.

   Vera = 250 pontos
   → Vinicius vê 250 / 300
   → continua EM ANDAMENTO

   Vera = 300 pontos
   → Vinicius recebe +50 pontos
   → indicação vira CONCLUÍDO
   → não paga novamente.
========================================================= */

function atualizarIndicacoesDoUsuario(
  usuario
) {

  let bonusPago =
    false;


  if (
    !usuario.indicacoes
  ) {

    usuario.indicacoes =
      [];

  }


  usuario.indicacoes.forEach(
    indicacao => {

      const indicado =
        usuarios.find(
          item =>
            item.id ===
            indicacao.usuarioId
        );


      if (!indicado) {
        return;
      }


      const pontosIndicada =
        Number(
          indicado.pontos || 0
        );


      indicacao.pontos =
        Math.min(
          pontosIndicada,
          300
        );


      /*
       * Chegou aos 300?
       */

      if (
        pontosIndicada >= 300 &&
        !indicacao.bonusPago
      ) {

        /*
         * Libera os 50 pontos
         * para quem indicou.
         */

        usuario.pontos +=
          50;

        usuario.saldo +=
          50;


        indicacao.bonusPago =
          true;


        indicacao.status =
          "CONCLUÍDO";


        indicacao.dataConclusao =
          new Date().toISOString();


        bonusPago =
          true;

      } else if (
        !indicacao.bonusPago
      ) {

        indicacao.status =
          "EM ANDAMENTO";

      }

    }
  );


  return {
    bonusPago
  };

}


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

servidor.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `QuizUp funcionando na porta ${PORT}`
    );

  }
);
