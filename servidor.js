const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const PORTA = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

function responder(res, status, dados, tipo = "application/json") {
  res.writeHead(status, {
    "Content-Type": tipo + "; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });

  res.end(
    tipo === "application/json"
      ? JSON.stringify(dados)
      : dados
  );
}

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizarNome(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
}

function gerarCodigoConvite(nome, email) {
  const nomeLimpo = normalizarNome(nome);

  const emailLocal = normalizarEmail(email)
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const nomeParte =
    (nomeLimpo.substring(0, 2) + "XX").substring(0, 2);

  const letrasEmail =
    emailLocal.replace(/[^A-Z]/g, "");

  const numerosEmail =
    emailLocal.replace(/[^0-9]/g, "");

  let parteEmail = "";

  if (numerosEmail.length >= 2) {
    parteEmail += numerosEmail.slice(-2);
  } else {
    parteEmail +=
      emailLocal.substring(0, 2).replace(/[^A-Z0-9]/g, "X");
  }

  parteEmail =
    (parteEmail + "00").substring(0, 2);

  let letras =
    letrasEmail.substring(0, 4);

  while (letras.length < 4) {
    letras += "X";
  }

  let codigo =
    nomeParte +
    parteEmail +
    letras.substring(0, 4);

  codigo = codigo.substring(0, 8);

  while (codigo.length < 8) {
    codigo += "X";
  }

  return codigo.toUpperCase();
}

function senhaHash(senha) {
  return crypto
    .createHash("sha256")
    .update(String(senha))
    .digest("hex");
}

async function prepararBanco() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cpf TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      codigo_convite VARCHAR(8) NOT NULL UNIQUE,
      pontos INTEGER NOT NULL DEFAULT 0,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS convites (
      id SERIAL PRIMARY KEY,
      convidador_id INTEGER NOT NULL REFERENCES usuarios(id),
      convidado_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id),
      codigo VARCHAR(8) NOT NULL,
      pontos_convidado INTEGER NOT NULL DEFAULT 5,
      recompensa_liberada BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saques (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      email TEXT NOT NULL,
      pontos INTEGER NOT NULL,
      valor NUMERIC(10,2) NOT NULL,
      metodo TEXT NOT NULL,
      chave TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Banco de dados QuizUp preparado.");
}

async function criarConta(body) {
  const nome = String(body.nome || "").trim();
  const cpf = String(body.cpf || "").trim();
  const email = normalizarEmail(body.email);
  const senha = String(body.senha || "");
  const codigoInformado =
    String(body.codigoConvite || "").trim().toUpperCase();

  if (!nome || !cpf || !email || !senha) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "Preencha todos os campos obrigatórios."
      }
    };
  }

  if (cpf.replace(/\D/g, "").length !== 11) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "Informe um CPF válido."
      }
    };
  }

  if (!email.includes("@")) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "Informe um e-mail válido."
      }
    };
  }

  if (senha.length < 4) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "A senha precisa ter pelo menos 4 caracteres."
      }
    };
  }

  const cpfLimpo = cpf.replace(/\D/g, "");

  const existente = await pool.query(
    `
    SELECT id
    FROM usuarios
    WHERE cpf = $1 OR email = $2
    LIMIT 1
    `,
    [cpfLimpo, email]
  );

  if (existente.rows.length > 0) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "Este CPF ou e-mail já está cadastrado."
      }
    };
  }

  let convidador = null;

  if (codigoInformado) {
    const resultadoConvite = await pool.query(
      `
      SELECT id, nome
      FROM usuarios
      WHERE codigo_convite = $1
      LIMIT 1
      `,
      [codigoInformado]
    );

    if (resultadoConvite.rows.length === 0) {
      return {
        status: 400,
        dados: {
          sucesso: false,
          mensagem: "Código de convite não encontrado."
        }
      };
    }

    convidador = resultadoConvite.rows[0];
  }

  let codigo = gerarCodigoConvite(nome, email);

  const codigoExistente = await pool.query(
    `
    SELECT id
    FROM usuarios
    WHERE codigo_convite = $1
    LIMIT 1
    `,
    [codigo]
  );

  if (codigoExistente.rows.length > 0) {
    const hash = crypto
      .createHash("sha256")
      .update(nome + email)
      .digest("hex")
      .toUpperCase();

    codigo =
      codigo.substring(0, 6) +
      hash.substring(0, 2);
  }

  const senha = senhaHash(body.senha);

  const pontosIniciais = convidador ? 5 : 0;

  const novoUsuario = await pool.query(
    `
    INSERT INTO usuarios
    (
      nome,
      cpf,
      email,
      senha,
      codigo_convite,
      pontos
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING
      id,
      nome,
      email,
      codigo_convite,
      pontos
    `,
    [
      nome,
      cpfLimpo,
      email,
      senha,
      codigo,
      pontosIniciais
    ]
  );

  const usuario = novoUsuario.rows[0];

  if (convidador) {
    await pool.query(
      `
      INSERT INTO convites
      (
        convidador_id,
        convidado_id,
        codigo,
        pontos_convidado
      )
      VALUES ($1,$2,$3,5)
      `,
      [
        convidador.id,
        usuario.id,
        codigoInformado
      ]
    );
  }

  return {
    status: 201,
    dados: {
      sucesso: true,
      mensagem: "Conta criada com sucesso.",
      usuario
    }
  };
}

async function login(body) {
  const email = normalizarEmail(body.email);
  const senha = String(body.senha || "");

  if (!email || !senha) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "Informe e-mail e senha."
      }
    };
  }

  const resultado = await pool.query(
    `
    SELECT
      id,
      nome,
      email,
      codigo_convite,
      pontos
    FROM usuarios
    WHERE email = $1
      AND senha = $2
    LIMIT 1
    `,
    [
      email,
      senhaHash(senha)
    ]
  );

  if (resultado.rows.length === 0) {
    return {
      status: 401,
      dados: {
        sucesso: false,
        mensagem: "E-mail ou senha incorretos."
      }
    };
  }

  return {
    status: 200,
    dados: {
      sucesso: true,
      mensagem: "Login realizado com sucesso.",
      usuario: resultado.rows[0]
    }
  };
}

async function adicionarPontos(body) {
  const usuarioId = Number(body.usuarioId);
  const pontos = Number(body.pontos);

  if (!usuarioId || !Number.isInteger(pontos) || pontos <= 0) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "Dados de pontuação inválidos."
      }
    };
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const usuarioResult = await cliente.query(
      `
      SELECT id, pontos
      FROM usuarios
      WHERE id = $1
      FOR UPDATE
      `,
      [usuarioId]
    );

    if (usuarioResult.rows.length === 0) {
      await cliente.query("ROLLBACK");

      return {
        status: 404,
        dados: {
          sucesso: false,
          mensagem: "Usuário não encontrado."
        }
      };
    }

    const usuario = usuarioResult.rows[0];

    const novoTotal =
      Number(usuario.pontos) + pontos;

    await cliente.query(
      `
      UPDATE usuarios
      SET pontos = $1
      WHERE id = $2
      `,
      [
        novoTotal,
        usuarioId
      ]
    );

    const conviteResult = await cliente.query(
      `
      SELECT
        id,
        convidador_id,
        convidado_id,
        pontos_convidado,
        recompensa_liberada
      FROM convites
      WHERE convidado_id = $1
      FOR UPDATE
      `,
      [usuarioId]
    );

    let recompensaLiberada = false;

    if (conviteResult.rows.length > 0) {
      const convite = conviteResult.rows[0];

      const novoProgresso =
        Math.min(300, novoTotal);

      await cliente.query(
        `
        UPDATE convites
        SET pontos_convidado = $1
        WHERE id = $2
        `,
        [
          novoProgresso,
          convite.id
        ]
      );

      if (
        novoProgresso >= 300 &&
        !convite.recompensa_liberada
      ) {
        await cliente.query(
          `
          UPDATE usuarios
          SET pontos = pontos + 50
          WHERE id = $1
          `,
          [convite.convidador_id]
        );

        await cliente.query(
          `
          UPDATE convites
          SET recompensa_liberada = TRUE
          WHERE id = $1
          `,
          [convite.id]
        );

        recompensaLiberada = true;
      }
    }

    await cliente.query("COMMIT");

    const atualizado = await pool.query(
      `
      SELECT
        id,
        nome,
        email,
        codigo_convite,
        pontos
      FROM usuarios
      WHERE id = $1
      `,
      [usuarioId]
    );

    return {
      status: 200,
      dados: {
        sucesso: true,
        usuario: atualizado.rows[0],
        recompensaLiberada
      }
    };

  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function listarConvites(usuarioId) {
  const resultado = await pool.query(
    `
    SELECT
      c.id,
      u.nome,
      c.pontos_convidado,
      c.recompensa_liberada
    FROM convites c
    INNER JOIN usuarios u
      ON u.id = c.convidado_id
    WHERE c.convidador_id = $1
    ORDER BY c.criado_em DESC
    `,
    [usuarioId]
  );

  return {
    status: 200,
    dados: {
      sucesso: true,
      convites: resultado.rows.map(c => ({
        nome: c.nome,
        pontos: Number(c.pontos_convidado),
        recompensa: c.recompensa_liberada
      }))
    }
  };
}

async function solicitarSaque(body) {
  const usuarioId = Number(body.usuarioId);
  const email = normalizarEmail(body.email);
  const pontos = Number(body.pontos);
  const valor = Number(body.valor);
  const metodo = String(body.metodo || "");
  const chave = String(body.chave || "").trim();

  if (
    !usuarioId ||
    !email ||
    !pontos ||
    !valor ||
    !metodo ||
    !chave
  ) {
    return {
      status: 400,
      dados: {
        sucesso: false,
        mensagem: "Preencha todos os dados do saque."
      }
    };
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const usuarioResult = await cliente.query(
      `
      SELECT id, email, pontos
      FROM usuarios
      WHERE id = $1
      FOR UPDATE
      `,
      [usuarioId]
    );

    if (usuarioResult.rows.length === 0) {
      await cliente.query("ROLLBACK");

      return {
        status: 404,
        dados: {
          sucesso: false,
          mensagem: "Usuário não encontrado."
        }
      };
    }

    const usuario = usuarioResult.rows[0];

    if (Number(usuario.pontos) < pontos) {
      await cliente.query("ROLLBACK");

      return {
        status: 400,
        dados: {
          sucesso: false,
          mensagem: "Você não possui pontos suficientes."
        }
      };
    }

    await cliente.query(
      `
      UPDATE usuarios
      SET pontos = pontos - $1
      WHERE id = $2
      `,
      [
        pontos,
        usuarioId
      ]
    );

    await cliente.query(
      `
      INSERT INTO saques
      (
        usuario_id,
        email,
        pontos,
        valor,
        metodo,
        chave
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        usuarioId,
        email,
        pontos,
        valor,
        metodo,
        chave
      ]
    );

    await cliente.query("COMMIT");

    return {
      status: 200,
      dados: {
        sucesso: true,
        mensagem:
          "Saque solicitado com sucesso. Pedido pendente de pagamento."
      }
    };

  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

function receberCorpo(req) {
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

async function processar(req, res) {
  if (req.method === "OPTIONS") {
    responder(res, 204, {});
    return;
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host}`
  );

  try {

    if (
      req.method === "POST" &&
      url.pathname === "/api/criar-conta"
    ) {
      const body = await receberCorpo(req);
      const resultado = await criarConta(body);

      responder(
        res,
        resultado.status,
        resultado.dados
      );

      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/api/login"
    ) {
      const body = await receberCorpo(req);
      const resultado = await login(body);

      responder(
        res,
        resultado.status,
        resultado.dados
      );

      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/api/adicionar-pontos"
    ) {
      const body = await receberCorpo(req);
      const resultado = await adicionarPontos(body);

      responder(
        res,
        resultado.status,
        resultado.dados
      );

      return;
    }

    if (
      req.method === "GET" &&
      url.pathname === "/api/convites"
    ) {
      const usuarioId =
        Number(url.searchParams.get("usuarioId"));

      const resultado =
        await listarConvites(usuarioId);

      responder(
        res,
        resultado.status,
        resultado.dados
      );

      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/solicitar-saque"
    ) {
      const body = await receberCorpo(req);
      const resultado =
        await solicitarSaque(body);

      responder(
        res,
        resultado.status,
        resultado.dados
      );

      return;
    }

    if (
      req.method === "GET" &&
      (
        url.pathname === "/" ||
        url.pathname === "/index.html"
      )
    ) {
      const arquivo =
        path.join(__dirname, "index.html");

      if (!fs.existsSync(arquivo)) {
        responder(
          res,
          404,
          {
            sucesso: false,
            mensagem: "index.html não encontrado."
          }
        );

        return;
      }

      const conteudo =
        fs.readFileSync(arquivo);

      responder(
        res,
        200,
        conteudo,
        "text/html"
      );

      return;
    }

    let arquivoSolicitado =
      url.pathname === "/"
        ? "/index.html"
        : url.pathname;

    arquivoSolicitado =
      decodeURIComponent(arquivoSolicitado);

    const arquivo =
      path.join(
        __dirname,
        arquivoSolicitado
      );

    if (
      !arquivo.startsWith(__dirname) ||
      !fs.existsSync(arquivo) ||
      !fs.statSync(arquivo).isFile()
    ) {
      responder(
        res,
        404,
        {
          sucesso: false,
          mensagem: "Arquivo não encontrado."
        }
      );

      return;
    }

    const extensao =
      path.extname(arquivo).toLowerCase();

    const tipos = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    };

    const tipo =
      tipos[extensao] ||
      "application/octet-stream";

    const conteudo =
      fs.readFileSync(arquivo);

    responder(
      res,
      200,
      conteudo,
      tipo
    );

  } catch (erro) {

    console.error("ERRO:", erro);

    responder(
      res,
      500,
      {
        sucesso: false,
        mensagem: "Erro interno do servidor."
      }
    );
  }
}

async function iniciar() {

  try {

    await prepararBanco();

    const servidor =
      http.createServer(processar);

    servidor.listen(
      PORTA,
      "0.0.0.0",
      () => {

        console.log(
          `QuizUp funcionando na porta ${PORTA}`
        );

      }
    );

  } catch (erro) {

    console.error(
      "Erro ao iniciar o QuizUp:",
      erro
    );

    process.exit(1);
  }
}

iniciar();
