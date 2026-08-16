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


/*
 * =========================
 * RESPOSTA JSON
 * =========================
 */

function responder(res, status, dados) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(JSON.stringify(dados));
}


/*
 * =========================
 * RECEBER JSON
 * =========================
 */

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


/*
 * =========================
 * ARQUIVOS
 * =========================
 */

function enviarArquivo(res, arquivo) {

  fs.readFile(arquivo, (erro, dados) => {

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
      path.extname(arquivo).toLowerCase();

    res.writeHead(200, {
      "Content-Type":
        tiposArquivo[extensao] ||
        "application/octet-stream"
    });

    res.end(dados);

  });

}


/*
 * =========================
 * GERAR CÓDIGO DE INDICAÇÃO
 * =========================
 *
 * 8 caracteres.
 *
 * Usa alguns caracteres do nome
 * e do e-mail, mas embaralhados.
 *
 * Não mostra o nome completo
 * nem o e-mail.
 *
 */

function gerarCodigoIndicacao(nome, email) {

  const letrasNome =
    String(nome || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase();

  const dadosEmail =
    String(email || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");


  let caracteres = [];


  /*
   * Pega alguns caracteres
   * do nome.
   */

  for (
    let i = 0;
    i < letrasNome.length &&
    caracteres.length < 4;
    i += 2
  ) {

    caracteres.push(
      letrasNome[i]
    );

  }


  /*
   * Pega alguns caracteres
   * do e-mail.
   */

  for (
    let i = 0;
    i < dadosEmail.length &&
    caracteres.length < 8;
    i += 3
  ) {

    caracteres.push(
      dadosEmail[i]
    );

  }


  /*
   * Completa caso não tenha
   * caracteres suficientes.
   */

  const base =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let indice = 0;

  while (caracteres.length < 8) {

    caracteres.push(
      base[
        Math.floor(
          Math.random() * base.length
        )
      ]
    );

    indice++;

  }


  /*
   * Embaralha tudo.
   */

  for (
    let i = caracteres.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      caracteres[i],
      caracteres[j]
    ] =
    [
      caracteres[j],
      caracteres[i]
    ];

  }


  return caracteres
    .slice(0, 8)
    .join("");

}


/*
 * =========================
 * GARANTIR CÓDIGO ÚNICO
 * =========================
 */

function criarCodigoUnico(nome, email) {

  let codigo;

  do {

    codigo =
      gerarCodigoIndicacao(
        nome,
        email
      );

  } while (
    usuarios.some(
      usuario =>
        usuario.codigoIndicacao === codigo
    )
  );

  return codigo;
}


/*
 * =========================
 * BUSCAR INDICAÇÕES
 * =========================
 */

function obterIndicacoesDoUsuario(usuarioId) {

  return usuarios
    .filter(
      usuario =>
        usuario.indicadoPor === usuarioId
    )
    .map(usuario => {

      const pontosIndicacao =
        Math.min(
          Number(usuario.pontos || 0),
          300
        );

      return {

        id:
          usuario.id,

        nome:
          usuario.nome,

        pontos:
          pontosIndicacao,

        meta:
          300,

        bonus:
          50,

        status:
          usuario.bonusIndicacaoPago
            ? "CONCLUÍDO"
            : "EM ANDAMENTO",

        bonusPago:
          Boolean(
            usuario.bonusIndicacaoPago
          )

      };

    });

}


/*
 * =========================
 * VERIFICAR BÔNUS
 * =========================
 *
 * Quando a pessoa indicada
 * chegar a 300 pontos:
 *
 * +50 pontos para quem indicou.
 *
 * O bônus só pode ser pago
 * uma única vez.
 *
 */

function verificarBonusIndicacao(usuario) {

  if (!usuario) {
    return;
  }

  if (!usuario.indicadoPor) {
    return;
  }

  if (usuario.bonusIndicacaoPago) {
    return;
  }

  if (Number(usuario.pontos || 0) < 300) {
    return;
  }


  const indicador =
    usuarios.find(
      item =>
        item.id === usuario.indicadoPor
    );


  if (!indicador) {
    return;
  }


  /*
   * Adiciona os 50 pontos
   * ao saldo do indicador.
   */

  indicador.pontos =
    Number(indicador.pontos || 0) + 50;

  indicador.saldo =
    Number(indicador.saldo || 0) + 50;


  /*
   * Marca para nunca pagar
   * novamente.
   */

  usuario.bonusIndicacaoPago = true;

}


/*
 * =========================
 * CRIAR SERVIDOR
 * =========================
 */

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


      /*
       * =========================
       * CADASTRO
       * =========================
       */

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
           * Código digitado pelo
           * novo jogador.
           *
           * Continua OPCIONAL.
           */

          const codigo =
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

            responder(res, 400, {

              erro:
                "Preencha todos os campos obrigatórios."

            });

            return;
          }


          if (senha.length < 6) {

            responder(res, 400, {

              erro:
                "A senha deve ter pelo menos 6 caracteres."

            });

            return;
          }


          const existe =
            usuarios.find(
              usuario =>
                usuario.email === email
            );


          if (existe) {

            responder(res, 400, {

              erro:
                "Este e-mail já está cadastrado."

            });

            return;
          }


          /*
           * Se foi informado um código,
           * procura o jogador que indicou.
           */

          let indicador = null;


          if (codigo) {

            indicador =
              usuarios.find(
                usuario =>
                  usuario.codigoIndicacao === codigo
              );


            if (!indicador) {

              responder(res, 400, {

                erro:
                  "Código de indicação inválido."

              });

              return;
            }

          }


          /*
           * Cada jogador recebe
           * seu próprio código.
           */

          const codigoIndicacao =
            criarCodigoUnico(
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
             * Código usado para
             * entrar por indicação.
             */

            codigoRecebido:
              codigo,


            /*
             * Quem indicou este jogador.
             */

            indicadoPor:
              indicador
                ? indicador.id
                : null,


            /*
             * Código próprio
             * deste jogador.
             */

            codigoIndicacao,


            pontos: 0,

            saldo: 0,


            /*
             * Controle do bônus
             * de 50 pontos.
             */

            bonusIndicacaoPago:
              false,


            /*
             * Premium será tratado
             * na próxima etapa,
             * preservando a estrutura.
             */

            premium: false,

            plano: "GRATUITO",


            saquesHoje: 0,

            dataSaques:
              new Date().toDateString()

          };


          usuarios.push(usuario);


          responder(res, 201, {

            mensagem:
              "Cadastro realizado com sucesso.",

            codigoIndicacao:
              usuario.codigoIndicacao

          });


        } catch (erro) {

          console.error(
            "Erro no cadastro:",
            erro
          );

          responder(res, 400, {

            erro:
              "Dados inválidos."

          });

        }

        return;
      }


      /*
       * =========================
       * LOGIN
       * =========================
       */

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

            responder(res, 401, {

              erro:
                "E-mail ou senha incorretos."

            });

            return;
          }


          const indicacoes =
            obterIndicacoesDoUsuario(
              usuario.id
            );


          responder(res, 200, {

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


              indicacoes,


              premium:
                Boolean(
                  usuario.premium
                ),

              plano:
                usuario.plano

            }

          });


        } catch (erro) {

          responder(res, 400, {

            erro:
              "Dados inválidos."

          });

        }

        return;
      }


      /*
       * =========================
       * INDICAÇÕES
       * =========================
       */

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

            responder(res, 404, {

              erro:
                "Usuário não encontrado."

            });

            return;
          }


          /*
           * Antes de mostrar,
           * verifica se alguma
           * indicação chegou aos 300.
           */

          usuarios
            .filter(
              item =>
                item.indicadoPor === usuario.id
            )
            .forEach(
              indicado =>
                verificarBonusIndicacao(
                  indicado
                )
            );


          responder(res, 200, {

            codigoIndicacao:
              usuario.codigoIndicacao,

            indicacoes:
              obterIndicacoesDoUsuario(
                usuario.id
              ),

            pontos:
              usuario.pontos,

            saldo:
              usuario.saldo

          });


        } catch (erro) {

          responder(res, 400, {

            erro:
              "Não foi possível carregar as indicações."

          });

        }

        return;
      }


      /*
       * =========================
       * ATUALIZAR PONTUAÇÃO
       * =========================
       */

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


          const novosPontos =
            Number(
              dados.pontos || 0
            );


          const novoSaldo =
            Number(
              dados.saldo || 0
            );


          const usuario =
            usuarios.find(
              item =>
                item.email === email
            );


          if (!usuario) {

            responder(res, 404, {

              erro:
                "Usuário não encontrado."

            });

            return;
          }


          usuario.pontos =
            novosPontos;

          usuario.saldo =
            novoSaldo;


          /*
           * Verifica se a pessoa
           * indicada chegou aos
           * 300 pontos.
           */

          verificarBonusIndicacao(
            usuario
          );


          responder(res, 200, {

            mensagem:
              "Pontuação salva.",

            pontos:
              usuario.pontos,

            saldo:
              usuario.saldo,


            bonusIndicacaoPago:
              Boolean(
                usuario.bonusIndicacaoPago
              )

          });


        } catch (erro) {

          console.error(
            "Erro ao salvar pontuação:",
            erro
          );

          responder(res, 400, {

            erro:
              "Não foi possível salvar a pontuação."

          });

        }

        return;
      }


      /*
       * =========================
       * SAQUE
       * =========================
       */

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
            )
            .trim();


          const usuario =
            usuarios.find(
              item =>
                item.email === email
            );


          if (!usuario) {

            responder(res, 404, {

              erro:
                "Usuário não encontrado."

            });

            return;
          }


          if (quantidade < 1000) {

            responder(res, 400, {

              erro:
                "O saque mínimo é de 1.000 pontos."

            });

            return;
          }


          if (
            quantidade >
            usuario.saldo
          ) {

            responder(res, 400, {

              erro:
                "Saldo insuficiente."

            });

            return;
          }


          if (
            tipo !== "pix" &&
            tipo !== "paypal"
          ) {

            responder(res, 400, {

              erro:
                "Forma de pagamento inválida."

            });

            return;
          }


          if (!destino) {

            responder(res, 400, {

              erro:
                "Informe a chave PIX ou e-mail PayPal."

            });

            return;
          }


          /*
           * Limite de 2 saques por dia.
           */

          const hoje =
            new Date().toDateString();


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

            responder(res, 400, {

              erro:
                "Você já realizou 2 solicitações de saque hoje."

            });

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


          responder(res, 200, {

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

          });


        } catch (erro) {

          responder(res, 400, {

            erro:
              "Não foi possível solicitar o saque."

          });

        }

        return;
      }


      /*
       * =========================
       * SAC
       * =========================
       */

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
            )
            .trim();


          if (
            !email ||
            !mensagem
          ) {

            responder(res, 400, {

              erro:
                "Informe o e-mail e a mensagem."

            });

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


          responder(res, 200, {

            mensagem:
              "Mensagem enviada com sucesso."

          });


        } catch (erro) {

          responder(res, 400, {

            erro:
              "Não foi possível enviar a mensagem."

          });

        }

        return;
      }


      /*
       * =========================
       * STATUS
       * =========================
       */

      if (
        caminho === "/api/status" &&
        req.method === "GET"
      ) {

        responder(res, 200, {

          status:
            "online",

          mensagem:
            "QuizUp funcionando!",

          usuarios:
            usuarios.length,

          saques:
            saques.length

        });

        return;
      }


      /*
       * =========================
       * ARQUIVOS DO SITE
       * =========================
       */

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


      /*
       * Segurança.
       */

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

        res.writeHead(403, {

          "Content-Type":
            "text/plain; charset=utf-8"

        });

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


servidor.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `QuizUp funcionando na porta ${PORT}`
    );

  }
);
