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

function responder(res, status, dados) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(JSON.stringify(dados));
}

function receberDados(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";

    req.on("data", parte => {
      corpo += parte;
    });

    req.on("end", () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch (erro) {
        reject(erro);
      }
    });

    req.on("error", reject);
  });
}

function enviarArquivo(res, arquivo) {
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8"
      });

      res.end("Página não encontrada.");
      return;
    }

    const extensao = path.extname(arquivo).toLowerCase();

    res.writeHead(200, {
      "Content-Type":
        tiposArquivo[extensao] ||
        "application/octet-stream"
    });

    res.end(dados);
  });
}

const servidor = http.createServer(async (req, res) => {

  const url = new URL(
    req.url,
    `http://${req.headers.host}`
  );

  const caminho = url.pathname;


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

      const dados = await receberDados(req);

      const nome =
        String(dados.nome || "").trim();

      const cpf =
        String(dados.cpf || "").trim();

      const email =
        String(dados.email || "")
          .trim()
          .toLowerCase();

      const senha =
        String(dados.senha || "");

      // Código de indicação é OPCIONAL
      const codigo =
        String(dados.codigo || "").trim();


      // SOMENTE estes campos são obrigatórios:
      // nome, CPF, e-mail e senha

      if (
        !nome ||
        !cpf ||
        !email ||
        !senha
      ) {

        responder(res, 400, {
          erro: "Preencha todos os campos obrigatórios."
        });

        return;
      }


      const existe = usuarios.find(
        usuario =>
          usuario.email === email
      );


      if (existe) {

        responder(res, 400, {
          erro: "Este e-mail já está cadastrado."
        });

        return;
      }


      const usuario = {

        id: Date.now(),

        nome,

        cpf,

        email,

        senha,

        // Pode ficar vazio quando não houver indicação
        codigo,

        pontos: 0,

        saldo: 0,

        saquesHoje: 0,

        dataSaques:
          new Date().toDateString()

      };


      usuarios.push(usuario);


      responder(res, 201, {

        mensagem:
          "Cadastro realizado com sucesso."

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
        String(dados.email || "")
          .trim()
          .toLowerCase();


      const senha =
        String(dados.senha || "");


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


      responder(res, 200, {

        mensagem:
          "Login realizado com sucesso.",

        usuario: {

          id: usuario.id,

          nome: usuario.nome,

          email: usuario.email,

          pontos: usuario.pontos,

          saldo: usuario.saldo

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
        String(dados.email || "")
          .trim()
          .toLowerCase();


      const pontos =
        Number(dados.pontos || 0);


      const saldo =
        Number(dados.saldo || 0);


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


      usuario.pontos = pontos;

      usuario.saldo = saldo;


      responder(res, 200, {

        mensagem:
          "Pontuação salva.",

        pontos:
          usuario.pontos,

        saldo:
          usuario.saldo

      });


    } catch (erro) {

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
        String(dados.email || "")
          .trim()
          .toLowerCase();


      const quantidade =
        Number(dados.pontos || 0);


      const tipo =
        String(dados.tipo || "")
          .trim()
          .toLowerCase();


      const destino =
        String(dados.destino || "")
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


      if (quantidade > usuario.saldo) {

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
       * Limite de 2 saques por dia
       */

      const hoje =
        new Date().toDateString();


      if (
        usuario.dataSaques !== hoje
      ) {

        usuario.dataSaques = hoje;

        usuario.saquesHoje = 0;

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

        id: Date.now(),

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


      usuario.saldo -= quantidade;

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
        String(dados.email || "")
          .trim()
          .toLowerCase();


      const mensagem =
        String(dados.mensagem || "")
          .trim();


      if (!email || !mensagem) {

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

  let arquivo = caminho;


  if (arquivo === "/") {

    arquivo =
      "/index.html";

  }


  arquivo =
    path.join(
      __dirname,
      arquivo
    );


  /*
   * Segurança:
   * impede acessar arquivos fora
   * da pasta do projeto.
   */

  const pastaProjeto =
    path.resolve(__dirname);


  const arquivoFinal =
    path.resolve(arquivo);


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

});


servidor.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `QuizUp funcionando na porta ${PORT}`
    );

  }
);
