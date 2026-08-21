"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

/* =====================================================
   CONFIGURAÇÃO
===================================================== */

const PORT = Number(process.env.PORT || 10000);
const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_KEY = process.env.QUIZUP_ADMIN_KEY || "";

const CONFIG = {
  PONTOS_INDICACAO_META: 300,
  BONUS_INDICADOR: 50,
  PONTOS_POR_RESPOSTA: 10,
  PREMIUM_DIAS_PADRAO: 30
};

if (!DATABASE_URL) {
  console.error(
    "ERRO: DATABASE_URL não configurado."
  );
  process.exit(1);
}

/* =====================================================
   POSTGRESQL
===================================================== */

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

/* =====================================================
   TIPOS DE ARQUIVO
===================================================== */

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
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8"
};

/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function texto(valor) {
  return String(valor ?? "").trim();
}

function numero(valor, padrao = 0) {
  const n = Number(valor);

  return Number.isFinite(n)
    ? n
    : padrao;
}

function emailNormalizado(valor) {
  return texto(valor).toLowerCase();
}

function gerarIdJogador() {
  return (
    "QZ" +
    Date.now().toString(36).toUpperCase() +
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

function criarHashSenha(senha) {
  const salt = crypto
    .randomBytes(16)
    .toString("hex");

  const hash = crypto
    .scryptSync(String(senha), salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

function verificarSenha(senha, senhaHash) {
  try {
    const partes = String(senhaHash).split(":");

    if (partes.length !== 2) {
      return false;
    }

    const salt = partes[0];
    const hashSalvo = partes[1];

    const hashAtual = crypto
      .scryptSync(String(senha), salt, 64)
      .toString("hex");

    const a = Buffer.from(hashAtual, "hex");
    const b = Buffer.from(hashSalvo, "hex");

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/* =====================================================
   CÓDIGO DE INDICAÇÃO
===================================================== */

async function gerarCodigoIndicacao(nome, email) {
  const nomeLimpo = texto(nome)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();

  const emailParte = emailNormalizado(email)
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const caracteresAleatorios =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let base = "";

  for (
    let i = 0;
    i < nomeLimpo.length && base.length < 4;
    i += 2
  ) {
    base += nomeLimpo[i];
  }

  for (
    let i = 0;
    i < emailParte.length && base.length < 8;
    i += 2
  ) {
    base += emailParte[i];
  }

  while (base.length < 8) {
    base +=
      caracteresAleatorios[
        Math.floor(
          Math.random() * caracteresAleatorios.length
        )
      ];
  }

  const lista = base.substring(0, 8).split("");

  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [lista[i], lista[j]] = [lista[j], lista[i]];
  }

  const codigo = lista.join("");

  const existe = await pool.query(
    `
      SELECT id
      FROM usuarios
      WHERE codigo_indicacao = $1
      LIMIT 1
    `,
    [codigo]
  );

  if (existe.rows.length > 0) {
    return gerarCodigoIndicacao(nome, email);
  }

  return codigo;
}

/* =====================================================
   RESPOSTAS HTTP
===================================================== */

function responder(res, status, dados) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Admin-Key, Authorization"
  });

  res.end(JSON.stringify(dados));
}

function erroPublico(res, status, mensagem) {
  return responder(res, status, {
    sucesso: false,
    erro: mensagem
  });
}

/* =====================================================
   RECEBER JSON
===================================================== */

function receberDados(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";

    req.on("data", parte => {
      corpo += parte;

      if (corpo.length > 2 * 1024 * 1024) {
        reject(
          new Error("Dados muito grandes.")
        );

        req.destroy();
      }
    });

    req.on("end", () => {
      if (!corpo) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(corpo));
      } catch {
        reject(
          new Error("JSON inválido.")
        );
      }
    });

    req.on("error", reject);
  });
}

/* =====================================================
   BANCO DE DADOS
===================================================== */

async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      codigo_indicacao TEXT UNIQUE,
      indicado_por TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
      pontos INTEGER NOT NULL DEFAULT 0,
      pontos_ganhos INTEGER NOT NULL DEFAULT 0,
      premium BOOLEAN NOT NULL DEFAULT FALSE,
      premium_ate TIMESTAMP NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS atividades (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
      tipo TEXT NOT NULL,
      descricao TEXT,
      pontos INTEGER NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mensagens (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
      nome TEXT,
      email TEXT,
      assunto TEXT,
      mensagem TEXT NOT NULL,
      resposta TEXT,
      status TEXT NOT NULL DEFAULT 'ABERTO',
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      respondido_em TIMESTAMP NULL
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_atividades_usuario
    ON atividades(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mensagens_usuario
    ON mensagens(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_usuarios_indicado_por
    ON usuarios(indicado_por)
  `);
}

/* =====================================================
   ATIVIDADES
===================================================== */

async function registrarAtividade(
  usuarioId,
  tipo,
  descricao = "",
  pontos = 0
) {
  try {
    await pool.query(
      `
        INSERT INTO atividades
          (usuario_id, tipo, descricao, pontos)
        VALUES
          ($1, $2, $3, $4)
      `,
      [
        usuarioId || null,
        tipo,
        descricao,
        numero(pontos)
      ]
    );
  } catch (erro) {
    console.error(
      "Erro ao registrar atividade:",
      erro.message
    );
  }
}

/* =====================================================
   BUSCAR USUÁRIO
===================================================== */

async function buscarUsuarioPorId(id) {
  const resultado = await pool.query(
    `
      SELECT
        id,
        nome,
        email,
        codigo_indicacao,
        indicado_por,
        pontos,
        pontos_ganhos,
        premium,
        premium_ate,
        criado_em,
        atualizado_em
      FROM usuarios
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return resultado.rows[0] || null;
}

async function buscarUsuarioPorEmail(email) {
  const resultado = await pool.query(
    `
      SELECT *
      FROM usuarios
      WHERE email = $1
      LIMIT 1
    `,
    [emailNormalizado(email)]
  );

  return resultado.rows[0] || null;
}

/* =====================================================
   USUÁRIO PÚBLICO
===================================================== */

function usuarioPublico(usuario) {
  if (!usuario) {
    return null;
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,

    codigoIndicacao:
      usuario.codigo_indicacao,

    codigo_indicacao:
      usuario.codigo_indicacao,

    indicadoPor:
      usuario.indicado_por,

    indicado_por:
      usuario.indicado_por,

    pontos:
      numero(usuario.pontos),

    pontosGanhos:
      numero(usuario.pontos_ganhos),

    pontos_ganhos:
      numero(usuario.pontos_ganhos),

    premium:
      Boolean(usuario.premium),

    premiumAte:
      usuario.premium_ate,

    premium_ate:
      usuario.premium_ate,

    criadoEm:
      usuario.criado_em,

    atualizadoEm:
      usuario.atualizado_em
  };
}

/* =====================================================
   CADASTRO
===================================================== */

async function cadastrarUsuario(dados) {
  const nome = texto(dados.nome);
  const email = emailNormalizado(dados.email);
  const senha = texto(dados.senha);

  const codigoInformado = texto(
    dados.codigoIndicacao ||
    dados.codigo_indicacao ||
    dados.codigo
  ).toUpperCase();

  if (nome.length < 2) {
    throw new Error(
      "Informe seu nome."
    );
  }

  if (!email || !email.includes("@")) {
    throw new Error(
      "Informe um e-mail válido."
    );
  }

  if (senha.length < 6) {
    throw new Error(
      "A senha deve ter pelo menos 6 caracteres."
    );
  }

  const existente =
    await buscarUsuarioPorEmail(email);

  if (existente) {
    throw new Error(
      "Este e-mail já está cadastrado."
    );
  }

  let indicador = null;

  if (codigoInformado) {
    const resultadoIndicador =
      await pool.query(
        `
          SELECT *
          FROM usuarios
          WHERE UPPER(codigo_indicacao) = $1
          LIMIT 1
        `,
        [codigoInformado]
      );

    indicador =
      resultadoIndicador.rows[0] || null;

    if (!indicador) {
      throw new Error(
        "Código de indicação inválido."
      );
    }
  }

  const id = gerarIdJogador();

  const codigo =
    await gerarCodigoIndicacao(
      nome,
      email
    );

  const senhaHash =
    criarHashSenha(senha);

  const resultado = await pool.query(
    `
      INSERT INTO usuarios
        (
          id,
          nome,
          email,
          senha_hash,
          codigo_indicacao,
          indicado_por
        )
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      id,
      nome,
      email,
      senhaHash,
      codigo,
      indicador
        ? indicador.id
        : null
    ]
  );

  const usuario =
    resultado.rows[0];

  await registrarAtividade(
    usuario.id,
    "CADASTRO",
    "Cadastro realizado"
  );

  return usuario;
}

/* =====================================================
   LOGIN
===================================================== */

async function loginUsuario(dados) {
  const email =
    emailNormalizado(dados.email);

  const senha =
    texto(dados.senha);

  if (!email || !senha) {
    throw new Error(
      "Informe e-mail e senha."
    );
  }

  const usuario =
    await buscarUsuarioPorEmail(
      email
    );

  if (!usuario) {
    throw new Error(
      "E-mail ou senha incorreta."
    );
  }

  const correto =
    verificarSenha(
      senha,
      usuario.senha_hash
    );

  if (!correto) {
    throw new Error(
      "E-mail ou senha incorreta."
    );
  }

  await registrarAtividade(
    usuario.id,
    "LOGIN",
    "Login realizado"
  );

  return usuario;
}

/* =====================================================
   PONTOS
===================================================== */

async function adicionarPontos(
  usuarioId,
  pontos
) {
  const quantidade =
    Math.floor(
      numero(pontos)
    );

  if (quantidade <= 0) {
    throw new Error(
      "Quantidade de pontos inválida."
    );
  }

  const cliente =
    await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado =
      await cliente.query(
        `
          UPDATE usuarios
          SET
            pontos = pontos + $1,
            pontos_ganhos =
              pontos_ganhos + $1,
            atualizado_em =
              CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `,
        [
          quantidade,
          usuarioId
        ]
      );

    if (!resultado.rows.length) {
      throw new Error(
        "Usuário não encontrado."
      );
    }

    await cliente.query(
      `
        INSERT INTO atividades
          (
            usuario_id,
            tipo,
            descricao,
            pontos
          )
        VALUES
          (
            $1,
            'PONTOS',
            $2,
            $3
          )
      `,
      [
        usuarioId,
        `Ganhou ${quantidade} pontos`,
        quantidade
      ]
    );

    await verificarBonusIndicacao(
      cliente,
      usuarioId
    );

    await cliente.query("COMMIT");

    return resultado.rows[0];
  } catch (erro) {
    await cliente.query(
      "ROLLBACK"
    );

    throw erro;
  } finally {
    cliente.release();
  }
}

/* =====================================================
   BÔNUS DE INDICAÇÃO
===================================================== */

async function verificarBonusIndicacao(
  cliente,
  usuarioIndicadoId
) {
  const resultado =
    await cliente.query(
      `
        SELECT
          u.id,
          u.pontos,
          u.indicado_por,
          i.id AS indicador_id
        FROM usuarios u
        LEFT JOIN usuarios i
          ON i.id = u.indicado_por
        WHERE u.id = $1
        FOR UPDATE OF u
      `,
      [usuarioIndicadoId]
    );

  if (!resultado.rows.length) {
    return;
  }

  const indicado =
    resultado.rows[0];

  if (!indicado.indicador_id) {
    return;
  }

  if (
    numero(indicado.pontos) <
    CONFIG.PONTOS_INDICACAO_META
  ) {
    return;
  }

  const descricaoBusca =
    `%${usuarioIndicadoId}%`;

  const jaPago =
    await cliente.query(
      `
        SELECT id
        FROM atividades
        WHERE
          usuario_id = $1
          AND tipo = 'BONUS_INDICACAO'
          AND descricao LIKE $2
        LIMIT 1
      `,
      [
        indicado.indicador_id,
        descricaoBusca
      ]
    );

  if (jaPago.rows.length) {
    return;
  }

  await cliente.query(
    `
      UPDATE usuarios
      SET
        pontos =
          pontos + $1,
        pontos_ganhos =
          pontos_ganhos + $1,
        atualizado_em =
          CURRENT_TIMESTAMP
      WHERE id = $2
    `,
    [
      CONFIG.BONUS_INDICADOR,
      indicado.indicador_id
    ]
  );

  await cliente.query(
    `
      INSERT INTO atividades
        (
          usuario_id,
          tipo,
          descricao,
          pontos
        )
      VALUES
        (
          $1,
          'BONUS_INDICACAO',
          $2,
          $3
        )
    `,
    [
      indicado.indicador_id,
      `Bônus da indicação ${usuarioIndicadoId}`,
      CONFIG.BONUS_INDICADOR
    ]
  );
}

/* =====================================================
   INDICAÇÕES
===================================================== */

async function obterIndicacoes(
  usuarioId
) {
  const usuario =
    await buscarUsuarioPorId(
      usuarioId
    );

  if (!usuario) {
    throw new Error(
      "Usuário não encontrado."
    );
  }

  const resultado =
    await pool.query(
      `
        SELECT
          id,
          nome,
          email,
          pontos,
          pontos_ganhos,
          criado_em
        FROM usuarios
        WHERE indicado_por = $1
        ORDER BY criado_em DESC
      `,
      [usuarioId]
    );

  const indicados =
    resultado.rows.map(item => {
      const pontos =
        numero(item.pontos);

      const progresso =
        Math.min(
          100,
          Math.round(
            (pontos /
              CONFIG.PONTOS_INDICACAO_META) *
              100
          )
        );

      return {
        id: item.id,
        nome: item.nome,
        email: item.email,
        pontos,

        meta:
          CONFIG.PONTOS_INDICACAO_META,

        progresso,

        status:
          pontos >=
          CONFIG.PONTOS_INDICACAO_META
            ? "CONCLUIDO"
            : "EM_ANDAMENTO",

        bonus:
          pontos >=
          CONFIG.PONTOS_INDICACAO_META
            ? CONFIG.BONUS_INDICADOR
            : 0,

        criadoEm:
          item.criado_em
      };
    });

  return {
    codigoIndicacao:
      usuario.codigo_indicacao,

    codigo_indicacao:
      usuario.codigo_indicacao,

    meta:
      CONFIG.PONTOS_INDICACAO_META,

    bonus:
      CONFIG.BONUS_INDICADOR,

    indicados
  };
}

/* =====================================================
   HISTÓRICO DE ATIVIDADES
===================================================== */

async function listarAtividades(
  usuarioId
) {
  const resultado =
    await pool.query(
      `
        SELECT
          id,
          tipo,
          descricao,
          pontos,
          criado_em
        FROM atividades
        WHERE usuario_id = $1
        ORDER BY criado_em DESC
        LIMIT 200
      `,
      [usuarioId]
    );

  return resultado.rows;
}

/* =====================================================
   SAC
===================================================== */

async function criarMensagemSac(
  dados
) {
  const usuarioId =
    texto(
      dados.usuarioId ||
      dados.usuario_id
    ) || null;

  const nome =
    texto(dados.nome);

  const email =
    emailNormalizado(
      dados.email
    );

  const assunto =
    texto(dados.assunto) ||
    "Atendimento";

  const mensagem =
    texto(dados.mensagem);

  if (!mensagem) {
    throw new Error(
      "Digite sua mensagem."
    );
  }

  const resultado =
    await pool.query(
      `
        INSERT INTO mensagens
          (
            usuario_id,
            nome,
            email,
            assunto,
            mensagem
          )
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        usuarioId,
        nome,
        email,
        assunto,
        mensagem
      ]
    );

  return resultado.rows[0];
}

async function listarMensagensAdmin(
  status
) {
  const parametros = [];
  let filtro = "";

  if (texto(status)) {
    parametros.push(
      texto(status).toUpperCase()
    );

    filtro =
      "WHERE m.status = $1";
  }

  const resultado =
    await pool.query(
      `
        SELECT
          m.*,
          u.nome AS usuario_nome,
          u.email AS usuario_email
        FROM mensagens m
        LEFT JOIN usuarios u
          ON u.id = m.usuario_id
        ${filtro}
        ORDER BY m.criado_em DESC
        LIMIT 500
      `,
      parametros
    );

  return resultado.rows;
}

async function responderSac(
  id,
  resposta
) {
  const textoResposta =
    texto(resposta);

  if (!textoResposta) {
    throw new Error(
      "Digite uma resposta."
    );
  }

  const resultado =
    await pool.query(
      `
        UPDATE mensagens
        SET
          resposta = $2,
          status = 'RESPONDIDO',
          respondido_em =
            CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        textoResposta
      ]
    );

  if (!resultado.rows.length) {
    throw new Error(
      "Mensagem não encontrada."
    );
  }

  return resultado.rows[0];
}

/* =====================================================
   ADMIN
===================================================== */

function validarAdmin(req) {
  if (!ADMIN_KEY) {
    return false;
  }

  const chave =
    texto(
      req.headers["x-admin-key"]
    );

  return (
    chave !== "" &&
    chave === ADMIN_KEY
  );
}

function exigirAdmin(req, res) {
  if (!validarAdmin(req)) {
    erroPublico(
      res,
      403,
      "Acesso administrativo negado."
    );

    return false;
  }

  return true;
}

/* =====================================================
   ATIVAR PREMIUM INTERNAMENTE
===================================================== */

async function ativarPremium(
  usuarioId,
  dias = CONFIG.PREMIUM_DIAS_PADRAO
) {
  const quantidadeDias =
    Math.max(
      1,
      Math.floor(
        numero(
          dias,
          CONFIG.PREMIUM_DIAS_PADRAO
        )
      )
    );

  const resultado =
    await pool.query(
      `
        UPDATE usuarios
        SET
          premium = TRUE,
          premium_ate =
            GREATEST(
              COALESCE(
                premium_ate,
                CURRENT_TIMESTAMP
              ),
              CURRENT_TIMESTAMP
            )
            +
            ($2 || ' days')::interval,
          atualizado_em =
            CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [
        usuarioId,
        quantidadeDias
      ]
    );

  if (!resultado.rows.length) {
    throw new Error(
      "Usuário não encontrado."
    );
  }

  return resultado.rows[0];
}

/* =====================================================
   STATUS DO SISTEMA
===================================================== */

async function statusSistema() {
  let banco = false;

  try {
    await pool.query("SELECT 1");
    banco = true;
  } catch {
    banco = false;
  }

  return {
    ok: banco,

    banco: banco
      ? "PostgreSQL conectado"
      : "PostgreSQL indisponível",

    pontosPorResposta:
      CONFIG.PONTOS_POR_RESPOSTA,

    metaIndicacao:
      CONFIG.PONTOS_INDICACAO_META
  };
}

/* =====================================================
   ARQUIVOS DO SITE
===================================================== */

function servirArquivo(req, res) {
  let urlPath;

  try {
    urlPath = decodeURIComponent(
      req.url.split("?")[0]
    );
  } catch {
    return erroPublico(
      res,
      400,
      "URL inválida."
    );
  }

  if (urlPath === "/") {
    urlPath = "/index.html";
  }

  const raiz =
    path.resolve(__dirname);

  const arquivo =
    path.resolve(
      raiz,
      "." + urlPath
    );

  if (
    arquivo !== raiz &&
    !arquivo.startsWith(
      raiz + path.sep
    )
  ) {
    return erroPublico(
      res,
      403,
      "Acesso negado."
    );
  }

  fs.stat(
    arquivo,
    (erro, stat) => {
      if (
        erro ||
        !stat.isFile()
      ) {
        return erroPublico(
          res,
          404,
          "Arquivo não encontrado."
        );
      }

      const extensao =
        path.extname(
          arquivo
        ).toLowerCase();

      const tipo =
        tiposArquivo[extensao] ||
        "application/octet-stream";

      res.writeHead(
        200,
        {
          "Content-Type": tipo
        }
      );

      fs.createReadStream(
        arquivo
      ).pipe(res);
    }
  );
}

/* =====================================================
   API
===================================================== */

async function processarApi(
  req,
  res
) {
  const url =
    new URL(
      req.url,
      `http://${
        req.headers.host ||
        "localhost"
      }`
    );

  const rota =
    url.pathname;

  const metodo =
    req.method;

  /* ---------------------------------------------------
     OPTIONS
  --------------------------------------------------- */

  if (metodo === "OPTIONS") {
    res.writeHead(
      204,
      {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET,POST,PUT,OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-Admin-Key, Authorization"
      }
    );

    res.end();
    return;
  }

  /* ---------------------------------------------------
     CADASTRO
  --------------------------------------------------- */

  if (
    rota === "/api/cadastro" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const usuario =
        await cadastrarUsuario(
          dados
        );

      return responder(
        res,
        201,
        {
          sucesso: true,
          mensagem:
            "Cadastro realizado com sucesso.",
          usuario:
            usuarioPublico(
              usuario
            )
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        400,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     LOGIN
  --------------------------------------------------- */

  if (
    rota === "/api/login" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const usuario =
        await loginUsuario(
          dados
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          mensagem:
            "Login realizado com sucesso.",
          usuario:
            usuarioPublico(
              usuario
            )
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        401,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     STATUS
  --------------------------------------------------- */

  if (
    rota === "/api/status" &&
    metodo === "GET"
  ) {
    try {
      return responder(
        res,
        200,
        await statusSistema()
      );
    } catch (erro) {
      return erroPublico(
        res,
        500,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     USUÁRIO
  --------------------------------------------------- */

  if (
    rota === "/api/usuario" &&
    metodo === "GET"
  ) {
    try {
      const id =
        texto(
          url.searchParams.get(
            "usuarioId"
          ) ||
          url.searchParams.get(
            "usuario_id"
          ) ||
          url.searchParams.get(
            "id"
          )
        );

      if (!id) {
        return erroPublico(
          res,
          400,
          "Usuário não informado."
        );
      }

      const usuario =
        await buscarUsuarioPorId(
          id
        );

      if (!usuario) {
        return erroPublico(
          res,
          404,
          "Usuário não encontrado."
        );
      }

      return responder(
        res,
        200,
        {
          sucesso: true,
          usuario:
            usuarioPublico(
              usuario
            )
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        500,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     PONTUAÇÃO
  --------------------------------------------------- */

  if (
    rota === "/api/pontuacao" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const usuarioId =
        texto(
          dados.usuarioId ||
          dados.usuario_id ||
          dados.id
        );

      const pontos =
        numero(
          dados.pontos
        );

      const usuario =
        await adicionarPontos(
          usuarioId,
          pontos
        );

      return responder(
        res,
        200,
        {
          sucesso: true,

          pontos:
            numero(
              usuario.pontos
            ),

          usuario:
            usuarioPublico(
              usuario
            )
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        400,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     INDICAÇÕES
  --------------------------------------------------- */

  if (
    rota === "/api/indicacoes" &&
    metodo === "GET"
  ) {
    try {
      const usuarioId =
        texto(
          url.searchParams.get(
            "usuarioId"
          ) ||
          url.searchParams.get(
            "usuario_id"
          ) ||
          url.searchParams.get(
            "id"
          )
        );

      const dados =
        await obterIndicacoes(
          usuarioId
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          ...dados
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        400,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     ATIVIDADES
  --------------------------------------------------- */

  if (
    rota === "/api/atividades" &&
    metodo === "GET"
  ) {
    try {
      const usuarioId =
        texto(
          url.searchParams.get(
            "usuarioId"
          ) ||
          url.searchParams.get(
            "usuario_id"
          ) ||
          url.searchParams.get(
            "id"
          )
        );

      if (!usuarioId) {
        return erroPublico(
          res,
          400,
          "Usuário não informado."
        );
      }

      const atividades =
        await listarAtividades(
          usuarioId
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          atividades
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        500,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     SAC
  --------------------------------------------------- */

  if (
    rota === "/api/sac" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const mensagem =
        await criarMensagemSac(
          dados
        );

      return responder(
        res,
        201,
        {
          sucesso: true,
          mensagem:
            "Mensagem enviada com sucesso.",
          atendimento:
            mensagem
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        400,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     ADMIN - SAC
  --------------------------------------------------- */

  if (
    rota === "/api/admin/sac" &&
    metodo === "GET"
  ) {
    if (
      !exigirAdmin(req, res)
    ) {
      return;
    }

    try {
      const mensagens =
        await listarMensagensAdmin(
          url.searchParams.get(
            "status"
          )
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          mensagens
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        500,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     ADMIN - RESPONDER SAC
  --------------------------------------------------- */

  if (
    rota === "/api/admin/sac/responder" &&
    metodo === "POST"
  ) {
    if (
      !exigirAdmin(req, res)
    ) {
      return;
    }

    try {
      const dados =
        await receberDados(req);

      const mensagem =
        await responderSac(
          dados.id,
          dados.resposta
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          mensagem
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        400,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     ADMIN - ATIVAR PREMIUM
  --------------------------------------------------- */

  if (
    rota === "/api/admin/premium/ativar" &&
    metodo === "POST"
  ) {
    if (
      !exigirAdmin(req, res)
    ) {
      return;
    }

    try {
      const dados =
        await receberDados(req);

      const usuarioId =
        texto(
          dados.usuarioId ||
          dados.usuario_id ||
          dados.id
        );

      const usuario =
        await ativarPremium(
          usuarioId,
          dados.dias || 30
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          mensagem:
            "Premium ativado.",
          usuario:
            usuarioPublico(
              usuario
            )
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        400,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     ADMIN - STATUS
  --------------------------------------------------- */

  if (
    rota === "/api/admin/status" &&
    metodo === "GET"
  ) {
    if (
      !exigirAdmin(req, res)
    ) {
      return;
    }

    try {
      const sistema =
        await statusSistema();

      const usuarios =
        await pool.query(`
          SELECT COUNT(*)::int AS total
          FROM usuarios
        `);

      const atividades =
        await pool.query(`
          SELECT COUNT(*)::int AS total
          FROM atividades
        `);

      const mensagens =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*)
              FILTER (
                WHERE status = 'ABERTO'
              )::int AS abertas
          FROM mensagens
        `);

      return responder(
        res,
        200,
        {
          sucesso: true,

          sistema,

          usuarios:
            usuarios.rows[0],

          atividades:
            atividades.rows[0],

          mensagens:
            mensagens.rows[0]
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        500,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     ADMIN - USUÁRIOS
  --------------------------------------------------- */

  if (
    rota === "/api/admin/usuarios" &&
    metodo === "GET"
  ) {
    if (
      !exigirAdmin(req, res)
    ) {
      return;
    }

    try {
      const resultado =
        await pool.query(`
          SELECT
            id,
            nome,
            email,
            codigo_indicacao,
            indicado_por,
            pontos,
            pontos_ganhos,
            premium,
            premium_ate,
            criado_em,
            atualizado_em
          FROM usuarios
          ORDER BY criado_em DESC
          LIMIT 500
        `);

      return responder(
        res,
        200,
        {
          sucesso: true,
          usuarios:
            resultado.rows
        }
      );
    } catch (erro) {
      return erroPublico(
        res,
        500,
        erro.message
      );
    }
  }

  /* ---------------------------------------------------
     ROTA API DESCONHECIDA
  --------------------------------------------------- */

  if (
    rota.startsWith("/api/")
  ) {
    return erroPublico(
      res,
      404,
      "Rota da API não encontrada."
    );
  }

  /* ---------------------------------------------------
     ARQUIVOS
  --------------------------------------------------- */

  return servirArquivo(
    req,
    res
  );
}

/* =====================================================
   SERVIDOR HTTP
===================================================== */

const servidor =
  http.createServer(
    async (req, res) => {
      try {
        await processarApi(
          req,
          res
        );
      } catch (erro) {
        console.error(
          "ERRO NO SERVIDOR:",
          erro
        );

        if (!res.headersSent) {
          erroPublico(
            res,
            500,
            "Erro interno do servidor."
          );
        } else {
          res.end();
        }
      }
    }
  );

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

async function iniciar() {
  try {
    console.log(
      "Conectando ao PostgreSQL..."
    );

    await pool.query(
      "SELECT 1"
    );

    console.log(
      "PostgreSQL conectado."
    );

    console.log(
      "Criando/verificando tabelas..."
    );

    await criarTabelas();

    console.log(
      "Tabelas verificadas."
    );

    servidor.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `QuizUp funcionando na porta ${PORT}`
        );

        console.log(
          "Sistema de pontos ativado."
        );

        console.log(
          `Pontos por resposta: ${CONFIG.PONTOS_POR_RESPOSTA}`
        );

        console.log(
          `Meta de indicação: ${CONFIG.PONTOS_INDICACAO_META}`
        );
      }
    );
  } catch (erro) {
    console.error(
      "ERRO AO INICIAR QUIZUP:"
    );

    console.error(erro);

    process.exit(1);
  }
}

/* =====================================================
   ENCERRAMENTO SEGURO
===================================================== */

process.on(
  "SIGTERM",
  async () => {
    console.log(
      "Encerrando QuizUp..."
    );

    servidor.close(
      async () => {
        await pool.end();
        process.exit(0);
      }
    );
  }
);

process.on(
  "SIGINT",
  async () => {
    console.log(
      "Encerrando QuizUp..."
    );

    servidor.close(
      async () => {
        await pool.end();
        process.exit(0);
      }
    );
  }
);

/* =====================================================
   INICIAR
===================================================== */

iniciar();
