const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 10000;

/*
=========================================================
  ARMAZENAMENTO
=========================================================

  Os dados são salvos em quizup-dados.json.

  Isso permite que o servidor recarregue os usuários
  quando o processo do Node for reiniciado.

=========================================================
*/

const arquivoDados = path.join(
  __dirname,
  "quizup-dados.json"
);


let banco = {
  usuarios: [],
  saques: [],
  mensagens: []
};


function carregarBanco() {

  try {

    if (fs.existsSync(arquivoDados)) {

      const dados =
        fs.readFileSync(
          arquivoDados,
          "utf8"
        );

      const convertido =
        JSON.parse(dados);

      banco = {
        usuarios:
          Array.isArray(convertido.usuarios)
            ? convertido.usuarios
            : [],

        saques:
          Array.isArray(convertido.saques)
            ? convertido.saques
            : [],

        mensagens:
          Array.isArray(convertido.mensagens)
            ? convertido.mensagens
            : []
      };

    }

  } catch (erro) {

    console.log(
      "Não foi possível carregar os dados:",
      erro.message
    );

  }

}


function salvarBanco() {

  try {

    fs.writeFileSync(
      arquivoDados,
      JSON.stringify(
        banco,
        null,
        2
      ),
      "utf8"
    );

  } catch (erro) {

    console.log(
      "Não foi possível salvar os dados:",
      erro.message
    );

  }

}


carregarBanco();


const usuarios =
  banco.usuarios;

const saques =
  banco.saques;

const mensagens =
  banco.mensagens;


/*
=========================================================
  TIPOS DE ARQUIVO
=========================================================
*/

const tiposArquivo = {

  ".html":
    "text/html; charset=utf-8",

  ".css":
    "text/css; charset=utf-8",

  ".js":
    "application/javascript; charset=utf-8",

  ".json":
    "application/json; charset=utf-8",

  ".png":
    "image/png",

  ".jpg":
    "image/jpeg",

  ".jpeg":
    "image/jpeg",

  ".gif":
    "image/gif",

  ".svg":
    "image/svg+xml",

  ".ico":
    "image/x-icon"

};


/*
=========================================================
  RESPOSTA
=========================================================
*/

function responder(
  res,
  status,
  dados
) {

  res.writeHead(
    status,
    {
      "Content-Type":
        "application/json; charset=utf-8",

      "Access-Control-Allow-Origin":
        "*",

      "Access-Control-Allow-Methods":
        "GET,POST,OPTIONS",

      "Access-Control-Allow-Headers":
        "Content-Type"
    }
  );

  res.end(
    JSON.stringify(dados)
  );

}


/*
=========================================================
  RECEBER JSON
=========================================================
*/

function receberDados(req) {

  return new Promise(
    (resolve, reject) => {

      let corpo = "";

      req.on(
        "data",
        parte => {

          corpo += parte;

        }
      );

      req.on(
        "end",
        () => {

          try {

            resolve(
              corpo
                ? JSON.parse(corpo)
                : {}
            );

          } catch (erro) {

            reject(erro);

          }

        }
      );

      req.on(
        "error",
        reject
      );

    }
  );

}


/*
=========================================================
  ID DO JOGADOR
=========================================================
*/

function gerarIdJogador() {

  let id;

  do {

    id =
      "QZ" +
      Date.now().toString(36).toUpperCase() +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

  } while (
    usuarios.some(
      usuario =>
        usuario.idJogador === id
    )
  );

  return id;

}


/*
=========================================================
  CÓDIGO DE INDICAÇÃO
=========================================================
*/

function gerarCodigoIndicacao(
  nome,
  email
) {

  const nomeLimpo =
    String(nome || "")
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z]/g,
        ""
      )
      .toUpperCase();


  const emailParte =
    String(email || "")
      .split("@")[0]
      .replace(
        /[^a-zA-Z0-9]/g,
        ""
      )
      .toUpperCase();


  let caracteres = "";


  for (
    let i = 0;
    i < nomeLimpo.length &&
    caracteres.length < 4;
    i += 2
  ) {

    caracteres +=
      nomeLimpo[i];

  }


  for (
    let i = 0;
    i < emailParte.length &&
    caracteres.length < 8;
    i += 2
  ) {

    caracteres +=
      emailParte[i];

  }


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


  caracteres =
    caracteres.substring(
      0,
      8
    );


  const lista =
    caracteres.split("");


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
    ] = [
      lista[j],
      lista[i]
    ];

  }


  const codigo =
    lista.join("");


  const existe =
    usuarios.some(
      usuario =>
        usuario.codigoIndicacao ===
        codigo
    );


  if (existe) {

    return gerarCodigoIndicacao(
      nome,
      email
    );

  }


  return codigo;

}


/*
=========================================================
  ATUALIZAR INDICAÇÕES
=========================================================
*/

function atualizarIndicacoesDoUsuario(
  usuario
) {

  let bonusPago = false;


  if (!usuario.indicacoes) {

    usuario.indicacoes = [];

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


      if (
        pontosIndicada < 300 &&
        !indicacao.bonusPago
      ) {

        indicacao.status =
          "EM ANDAMENTO";

        return;

      }


      if (
        pontosIndicada >= 300 &&
        !indicacao.bonusPago
      ) {

        usuario.pontos =
          Number(
            usuario.pontos || 0
          ) + 50;


        usuario.saldo =
          Number(
            usuario.saldo || 0
          ) + 50;


        indicacao.bonusPago =
          true;


        indicacao.status =
          "CONCLUÍDO";


        indicacao.dataConclusao =
          new Date().toISOString();


        bonusPago = true;

      }

    }
  );


  return {
    bonusPago
  };

}


/*
=========================================================
  LOCALIZAR USUÁRIO
=========================================================
*/

function encontrarUsuario(dados) {

  const id =
    String(
      dados.idJogador ||
      dados.id ||
      ""
    ).trim();


  const email =
    String(
      dados.email ||
      ""
    )
      .trim()
      .toLowerCase();


  if (id) {

    const porId =
      usuarios.find(
        usuario =>
          usuario.idJogador === id ||
          String(usuario.id) === id
      );

    if (porId) {

      return porId;

    }

  }


  if (email) {

    return usuarios.find(
      usuario =>
        usuario.email === email
    );

  }


  return null;

}


/*
=========================================================
  ARQUIVOS
=========================================================
*/

function enviarArquivo(
  res,
  arquivo
) {

  fs.readFile(
    arquivo,
    (erro, dados) => {

      if (erro) {

        res.writeHead(
          404,
          {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        );

        res.end(
          "Página não encontrada."
        );

        return;

      }


      const extensao =
        path.extname(
          arquivo
        ).toLowerCase();


      res.writeHead(
        200,
        {
          "Content-Type":
            tiposArquivo[extensao] ||
            "application/octet-stream"
        }
      );


      res.end(dados);

    }
  );

}


/*
=========================================================
  SERVIDOR
=========================================================
*/

const servidor =
  http.createServer(
    async (
      req,
      res
    ) => {

      /*
      ---------------------------------------------------
        CORS OPTIONS
      ---------------------------------------------------
      */

      if (
        req.method ===
        "OPTIONS"
      ) {

        res.writeHead(
          204,
          {
            "Access-Control-Allow-Origin":
              "*",

            "Access-Control-Allow-Methods":
              "GET,POST,OPTIONS",

            "Access-Control-Allow-Headers":
              "Content-Type"
          }
        );

        res.end();

        return;

      }


      const url =
        new URL(
          req.url,
          `http://${req.headers.host}`
        );


      const caminho =
        url.pathname;


      /*
      ===================================================
        CADASTRO
      ===================================================
      */

      if (
        caminho ===
          "/api/cadastro" &&
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
                usuario.email ===
                email
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


          const codigoIndicacao =
            gerarCodigoIndicacao(
              nome,
              email
            );


          const usuario = {

            id:
              Date.now() +
              Math.floor(
                Math.random() *
                10000
              ),

            idJogador:
              gerarIdJogador(),

            nome,

            cpf,

            email,

            senha,

            codigoIndicacao,

            codigoUsado:
              codigoRecebido || "",

            indicadoPorId:
              indicador
                ? indicador.id
                : null,

            indicacoes: [],

            plano:
              "GRATUITO",

            pontos:
              0,

            saldo:
              0,

            /*
            ---------------------------------------------
              DADOS DE RECEBIMENTO
            ---------------------------------------------
            */

            pix:
              "",

            paypal:
              "",

            tipoPagamentoPreferido:
              "",

            /*
            ---------------------------------------------
              SAQUES
            ---------------------------------------------
            */

            saquesHoje:
              0,

            dataSaques:
              new Date().toDateString(),

            historicoSaques: [],

            /*
            ---------------------------------------------
              DATA
            ---------------------------------------------
            */

            criadoEm:
              new Date().toISOString(),

            ultimoLogin:
              new Date().toISOString(),

            ativo:
              true

          };


          usuarios.push(
            usuario
          );


          /*
          -----------------------------------------------
            REGISTRA INDICAÇÃO
          -----------------------------------------------
          */

          if (indicador) {

            if (
              !Array.isArray(
                indicador.indicacoes
              )
            ) {

              indicador.indicacoes =
                [];

            }


            indicador.indicacoes.push({

              usuarioId:
                usuario.id,

              idJogador:
                usuario.idJogador,

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


          salvarBanco();


          responder(
            res,
            201,
            {

              mensagem:
                "Cadastro realizado com sucesso.",

              idJogador:
                usuario.idJogador,

              codigoIndicacao:
                usuario.codigoIndicacao,

              usuario: {

                idJogador:
                  usuario.idJogador,

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
                  usuario.plano

              }

            }
          );


        } catch (erro) {

          console.log(
            "Erro no cadastro:",
            erro
          );


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


      /*
      ===================================================
        LOGIN
      ===================================================
      */

      if (
        caminho ===
          "/api/login" &&
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


          usuario.ultimoLogin =
            new Date().toISOString();


          usuario.ativo =
            true;


          atualizarIndicacoesDoUsuario(
            usuario
          );


          salvarBanco();


          responder(
            res,
            200,
            {

              mensagem:
                "Login realizado com sucesso.",

              usuario: {

                id:
                  usuario.id,

                idJogador:
                  usuario.idJogador,

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

                codigoUsado:
                  usuario.codigoUsado,

                plano:
                  usuario.plano,

                pix:
                  usuario.pix || "",

                paypal:
                  usuario.paypal || "",

                tipoPagamentoPreferido:
                  usuario.tipoPagamentoPreferido || "",

                indicacoes:
                  usuario.indicacoes || [],

                saquesHoje:
                  usuario.saquesHoje || 0

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


      /*
      ===================================================
        SAIR
      ===================================================

        O jogador pode sair.

        Os dados continuam salvos.

      ===================================================
      */

      if (
        caminho ===
          "/api/logout" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const usuario =
            encontrarUsuario(
              dados
            );


          if (usuario) {

            usuario.ativo =
              false;

            usuario.ultimoLogout =
              new Date().toISOString();

            salvarBanco();

          }


          responder(
            res,
            200,
            {

              mensagem:
                "Você saiu do QuizUp com segurança.",

              dadosSalvos:
                true

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível sair."
            }
          );

        }

        return;

      }


      /*
      ===================================================
        PERFIL DO JOGADOR
      ===================================================
      */

      if (
        caminho ===
          "/api/perfil" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const usuario =
            encontrarUsuario(
              dados
            );


          if (!usuario) {

            responder(
              res,
              404,
              {
                erro:
                  "Jogador não encontrado."
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

              idJogador:
                usuario.idJogador,

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

              pix:
                usuario.pix || "",

              paypal:
                usuario.paypal || "",

              tipoPagamentoPreferido:
                usuario.tipoPagamentoPreferido || "",

              indicacoes:
                usuario.indicacoes || [],

              saquesHoje:
                usuario.saquesHoje || 0

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível carregar o perfil."
            }
          );

        }

        return;

      }


      /*
      ===================================================
        SALVAR PIX / PAYPAL
      ===================================================
      */

      if (
        caminho ===
          "/api/pagamento" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const usuario =
            encontrarUsuario(
              dados
            );


          if (!usuario) {

            responder(
              res,
              404,
              {
                erro:
                  "Jogador não encontrado."
              }
            );

            return;

          }


          const pix =
            String(
              dados.pix || ""
            ).trim();


          const paypal =
            String(
              dados.paypal || ""
            )
              .trim()
              .toLowerCase();


          const preferido =
            String(
              dados.tipo || ""
            )
              .trim()
              .toLowerCase();


          if (
            !pix &&
            !paypal
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Informe uma chave Pix ou um e-mail do PayPal."
              }
            );

            return;

          }


          if (
            preferido === "pix" &&
            !pix
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Informe a chave Pix."
              }
            );

            return;

          }


          if (
            preferido === "paypal" &&
            !paypal
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Informe o e-mail do PayPal."
              }
            );

            return;

          }


          if (pix) {

            usuario.pix =
              pix;

          }


          if (paypal) {

            usuario.paypal =
              paypal;

          }


          if (
            preferido === "pix" ||
            preferido === "paypal"
          ) {

            usuario.tipoPagamentoPreferido =
              preferido;

          }


          salvarBanco();


          responder(
            res,
            200,
            {

              mensagem:
                "Dados de pagamento salvos.",

              idJogador:
                usuario.idJogador,

              pix:
                usuario.pix,

              paypal:
                usuario.paypal,

              tipoPagamentoPreferido:
                usuario.tipoPagamentoPreferido

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível salvar os dados de pagamento."
            }
          );

        }

        return;

      }


      /*
      ===================================================
        INDICAÇÕES
      ===================================================
      */

      if (
        caminho ===
          "/api/indicacoes" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const usuario =
            encontrarUsuario(
              dados
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


          salvarBanco();


          responder(
            res,
            200,
            {

              idJogador:
                usuario.idJogador,

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


      /*
      ===================================================
        PONTUAÇÃO
      ===================================================
      */

      if (
        caminho ===
          "/api/pontuacao" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const usuario =
            encontrarUsuario(
              dados
            );


          const pontosRecebidos =
            Number(
              dados.pontos || 0
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


          /*
           * O valor enviado representa a
           * pontuação atual do jogador.
           */

          if (
            Number.isFinite(
              pontosRecebidos
            ) &&
            pontosRecebidos >= 0
          ) {

            usuario.pontos =
              pontosRecebidos;

          }


          /*
           * O saldo acompanha os pontos
           * para manter a compatibilidade
           * com a versão anterior.
           */

          usuario.saldo =
            usuario.pontos;


          /*
           * INDICAÇÃO
           */

          if (
            usuario.indicadoPorId
          ) {

            const indicador =
              usuarios.find(
                item =>
                  item.id ===
                  usuario.indicadoPorId
              );


            if (indicador) {

              if (
                !Array.isArray(
                  indicador.indicacoes
                )
              ) {

                indicador.indicacoes =
                  [];

              }


              const indicacao =
                indicador.indicacoes.find(
                  item =>
                    item.usuarioId ===
                    usuario.id
                );


              if (
                indicacao
              ) {

                if (
                  usuario.pontos >= 300 &&
                  !indicacao.bonusPago
                ) {

                  indicador.pontos =
                    Number(
                      indicador.pontos || 0
                    ) + 50;


                  indicador.saldo =
                    Number(
                      indicador.saldo || 0
                    ) + 50;


                  indicacao.pontos =
                    300;


                  indicacao.bonusPago =
                    true;


                  indicacao.status =
                    "CONCLUÍDO";


                  indicacao.dataConclusao =
                    new Date().toISOString();

                }

                else if (
                  !indicacao.bonusPago
                ) {

                  indicacao.pontos =
                    Math.min(
                      usuario.pontos,
                      300
                    );


                  indicacao.status =
                    "EM ANDAMENTO";

                }

              }

            }

          }


          salvarBanco();


          responder(
            res,
            200,
            {

              mensagem:
                "Pontuação salva.",

              idJogador:
                usuario.idJogador,

              pontos:
                usuario.pontos,

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
                "Não foi possível salvar a pontuação."
            }
          );

        }

        return;

      }


      /*
      ===================================================
        REGRAS DE SAQUE
      ===================================================
      */

      function calcularSaque(
        pontos
      ) {

        /*
         * VALOR RECEBIDO PELO JOGADOR
         */

        if (
          pontos === 2000
        ) {

          return 1;

        }


        if (
          pontos === 6000
        ) {

          return 5;

        }


        if (
          pontos === 11000
        ) {

          return 11;

        }


        return 0;

      }


      /*
      ===================================================
        SAQUE
      ===================================================
      */

      if (
        caminho ===
          "/api/saque" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const usuario =
            encontrarUsuario(
              dados
            );


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


          if (!usuario) {

            responder(
              res,
              404,
              {
                erro:
                  "Jogador não encontrado."
              }
            );

            return;

          }


          /*
           * SOMENTE OS VALORES DEFINIDOS
           * PODEM SER SOLICITADOS.
           */

          const valorJogador =
            calcularSaque(
              quantidade
            );


          if (
            valorJogador <= 0
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Os saques disponíveis são: 2.000 pontos = R$ 1,00; 6.000 pontos = R$ 5,00; 11.000 pontos = R$ 11,00."
              }
            );

            return;

          }


          if (
            usuario.pontos <
            quantidade
          ) {

            responder(
              res,
              400,
              {
                erro:
                  "Pontos insuficientes."
              }
            );

            return;

          }


          /*
           * 30% DA PLATAFORMA
           *
           * O jogador recebe o valor definido.
           *
           * A plataforma recebe 30% desse valor
           * adicionalmente.
           */

          const percentualPlataforma =
            0.30;


          const valorPlataforma =
            Number(
              (
                valorJogador *
                percentualPlataforma
              ).toFixed(2)
            );


          const custoTotal =
            Number(
              (
                valorJogador +
                valorPlataforma
              ).toFixed(2)
            );


          /*
           * VERIFICA PAGAMENTO
           */

          let destinoFinal =
            destino;


          if (
            tipo === "pix"
          ) {

            destinoFinal =
              destino ||
              usuario.pix ||
              "";

          }


          if (
            tipo === "paypal"
          ) {

            destinoFinal =
              destino ||
              usuario.paypal ||
              "";

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
                  "Escolha PIX ou PayPal."
              }
            );

            return;

          }


          if (!destinoFinal) {

            responder(
              res,
              400,
              {
                erro:
                  "Cadastre sua chave Pix ou e-mail do PayPal antes de solicitar o saque."
              }
            );

            return;

          }


          /*
           * LIMITE DE 2 SAQUES POR DIA
           */

          const hoje =
            new Date().toDateString();


          if (
            usuario.dataSaques !==
            hoje
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


          /*
           * CRIA SAQUE
           */

          const saque = {

            id:
              "SAC" +
              Date.now(),

            usuarioId:
              usuario.id,

            idJogador:
              usuario.idJogador,

            nome:
              usuario.nome,

            email:
              usuario.email,

            pontos:
              quantidade,

            valorJogador:
              valorJogador,

            percentualPlataforma:
              30,

            valorPlataforma:
              valorPlataforma,

            custoTotal:
              custoTotal,

            tipo:
              tipo,

            destino:
              destinoFinal,

            status:
              "PENDENTE",

            data:
              new Date().toISOString()

          };


          saques.push(
            saque
          );


          /*
           * RETIRA OS PONTOS
           */

          usuario.pontos -=
            quantidade;


          usuario.saldo =
            usuario.pontos;


          usuario.saquesHoje++;


          if (
            !Array.isArray(
              usuario.historicoSaques
            )
          ) {

            usuario.historicoSaques =
              [];

          }


          usuario.historicoSaques.push(
            saque.id
          );


          salvarBanco();


          responder(
            res,
            200,
            {

              mensagem:
                "Solicitação de saque enviada.",

              idJogador:
                usuario.idJogador,

              saque: {

                id:
                  saque.id,

                pontos:
                  saque.pontos,

                valorJogador:
                  saque.valorJogador,

                percentualPlataforma:
                  saque.percentualPlataforma,

                valorPlataforma:
                  saque.valorPlataforma,

                custoTotal:
                  saque.custoTotal,

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

          console.log(
            "Erro no saque:",
            erro
          );


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


      /*
      ===================================================
        HISTÓRICO DE SAQUES
      ===================================================
      */

      if (
        caminho ===
          "/api/saques" &&
        req.method === "POST"
      ) {

        try {

          const dados =
            await receberDados(req);


          const usuario =
            encontrarUsuario(
              dados
            );


          if (!usuario) {

            responder(
              res,
              404,
              {
                erro:
                  "Jogador não encontrado."
              }
            );

            return;

          }


          const lista =
            saques.filter(
              saque =>
                saque.usuarioId ===
                usuario.id
            );


          responder(
            res,
            200,
            {

              idJogador:
                usuario.idJogador,

              saques:
                lista

            }
          );


        } catch (erro) {

          responder(
            res,
            400,
            {
              erro:
                "Não foi possível carregar os saques."
            }
          );

        }

        return;

      }


      /*
      ===================================================
        SAC
      ===================================================
      */

      if (
        caminho ===
          "/api/sac" &&
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


          const idJogador =
            String(
              dados.idJogador || ""
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
              "MSG" +
              Date.now(),

            idJogador:
              idJogador,

            email:
              email,

            mensagem:
              mensagem,

            data:
              new Date().toISOString(),

            status:
              "NOVA"

          });


          salvarBanco();


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


      /*
      ===================================================
        STATUS
      ===================================================
      */

      if (
        caminho ===
          "/api/status" &&
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

            jogadoresAtivos:
              usuarios.filter(
                usuario =>
                  usuario.ativo === true
              ).length,

            saques:
              saques.length,

            mensagens:
              mensagens.length,

            indicacoes:
              usuarios.reduce(
                (
                  total,
                  usuario
                ) =>
                  total +
                  (
                    Array.isArray(
                      usuario.indicacoes
                    )
                      ? usuario.indicacoes.length
                      : 0
                  ),
                0
              )

          }
        );

        return;

      }


      /*
      ===================================================
        ARQUIVOS DO SITE
      ===================================================
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


      const pastaProjeto =
        path.resolve(
          __dirname
        );


      const arquivoFinal =
        path.resolve(
          arquivo
        );


      /*
       * Segurança contra acesso
       * a arquivos fora do projeto.
       */

      if (
        arquivoFinal !==
          pastaProjeto &&
        !arquivoFinal.startsWith(
          pastaProjeto +
          path.sep
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


/*
=========================================================
  INICIAR SERVIDOR
=========================================================
*/

servidor.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `QuizUp funcionando na porta ${PORT}`
    );

  }
);
