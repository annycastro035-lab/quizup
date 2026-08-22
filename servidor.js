const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 10000);

const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_KEY = process.env.QUIZUP_ADMIN_KEY || "";

const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || "";
const ASAAS_BASE_URL =
  process.env.ASAAS_BASE_URL || "https://api.asaas.com";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET =
  process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.paypal.com";

const APP_URL =
  process.env.APP_URL || "";

const PORTA = PORT;

if (!DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não configurada.");
  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| POSTGRESQL
|--------------------------------------------------------------------------
*/

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES
|--------------------------------------------------------------------------
*/

const CONFIG = {
  PONTOS_POR_REAL: 100,
  VALOR_MINIMO_SAQUE: 5,
  VALOR_MAXIMO_SAQUE: 1000,

  PREMIUM_DIAS: 30,
  PREMIUM_VALOR: 9.90,

  BONUS_INDICACAO: 50,
  PONTOS_INDICACAO_META: 300,

  TAXA_SAQUE: 0,

  TOKEN_DIAS: 30
};

/*
|--------------------------------------------------------------------------
| MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(express.json({
  limit: "1mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "1mb"
}));

/*
|--------------------------------------------------------------------------
| FUNÇÕES AUXILIARES
|--------------------------------------------------------------------------
*/

function texto(valor) {
  return String(valor ?? "").trim();
}

function emailNormalizado(valor) {
  return texto(valor).toLowerCase();
}

function numero(valor, padrao = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

function dinheiro(valor) {
  const n = Number(valor);

  if (!Number.isFinite(n)) {
    throw new Error("Valor financeiro inválido.");
  }

  return Math.round(n * 100) / 100;
}

function gerarId(prefixo = "ID") {
  return (
    prefixo +
    Date.now().toString(36).toUpperCase() +
    crypto.randomBytes(8).toString("hex").toUpperCase()
  );
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function criarToken() {
  return crypto.randomBytes(48).toString("hex");
}

function criarHashSenha(senha) {
  const salt = crypto.randomBytes(16).toString("hex");

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

    const hashAtual = crypto.scryptSync(
      String(senha),
      partes[0],
      64
    );

    const hashBanco = Buffer.from(
      partes[1],
      "hex"
    );

    if (hashAtual.length !== hashBanco.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      hashAtual,
      hashBanco
    );
  } catch {
    return false;
  }
}

function responder(res, status, dados) {
  return res.status(status).json(dados);
}

function sucesso(res, dados = {}) {
  return responder(res, 200, {
    sucesso: true,
    ...dados
  });
}

function erroPublico(
  res,
  status,
  mensagem
) {
  return responder(res, status, {
    sucesso: false,
    erro: mensagem
  });
}

/*
|--------------------------------------------------------------------------
| API EXTERNA
|--------------------------------------------------------------------------
*/

async function apiJson(
  url,
  options = {}
) {
  const resposta = await fetch(url, options);

  const textoResposta =
    await resposta.text();

  let dados;

  try {
    dados = textoResposta
      ? JSON.parse(textoResposta)
      : {};
  } catch {
    dados = {
      resposta: textoResposta
    };
  }

  if (!resposta.ok) {
    const mensagem =
      dados?.errors?.map?.(
        e => e.description || e.code
      ).join("; ") ||
      dados?.message ||
      dados?.error_description ||
      `HTTP ${resposta.status}`;

    const erro = new Error(mensagem);

    erro.status = resposta.status;
    erro.dados = dados;

    throw erro;
  }

  return dados;
}

/*
|--------------------------------------------------------------------------
| ASAAS
|--------------------------------------------------------------------------
*/

function verificarAsaasConfigurado() {
  if (!ASAAS_API_KEY) {
    throw new Error(
      "Asaas não configurado no servidor."
    );
  }
}

async function asaasRequest(
  endpoint,
  options = {}
) {
  verificarAsaasConfigurado();

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    access_token: ASAAS_API_KEY,
    ...(options.headers || {})
  };

  return apiJson(
    `${ASAAS_BASE_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );
}

/*
|--------------------------------------------------------------------------
| PAYPAL
|--------------------------------------------------------------------------
*/

function verificarPayPalConfigurado() {
  if (
    !PAYPAL_CLIENT_ID ||
    !PAYPAL_CLIENT_SECRET
  ) {
    throw new Error(
      "PayPal não configurado no servidor."
    );
  }
}

async function obterTokenPayPal() {
  verificarPayPalConfigurado();

  const credenciais =
    Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

  const resposta = await fetch(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Basic ${credenciais}`,
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body:
        "grant_type=client_credentials"
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.error_description ||
      "Não foi possível autenticar no PayPal."
    );
  }

  return dados.access_token;
}

async function paypalRequest(
  endpoint,
  options = {}
) {
  const token =
    await obterTokenPayPal();

  return apiJson(
    `${PAYPAL_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
        ...(options.headers || {})
      }
    }
  );
}

/*
|--------------------------------------------------------------------------
| BANCO - TABELAS
|--------------------------------------------------------------------------
*/

async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,

      codigo_indicacao TEXT UNIQUE,
      indicado_por TEXT,

      pontos INTEGER NOT NULL DEFAULT 0,
      pontos_ganhos INTEGER NOT NULL DEFAULT 0,

      saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
      saldo_total_ganho NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      premium BOOLEAN NOT NULL DEFAULT FALSE,
      premium_ate TIMESTAMP NULL,

      pix_chave TEXT,
      pix_tipo TEXT,

      paypal_email TEXT,

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      atualizado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessoes (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

      token_hash TEXT NOT NULL UNIQUE,

      expira_em TIMESTAMP NOT NULL,

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS atividades (
      id BIGSERIAL PRIMARY KEY,

      usuario_id TEXT
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

      tipo TEXT NOT NULL,
      descricao TEXT,
      pontos INTEGER DEFAULT 0,

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id TEXT PRIMARY KEY,

      usuario_id TEXT NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

      tipo TEXT NOT NULL,

      valor NUMERIC(12,2) NOT NULL,

      status TEXT NOT NULL,

      provedor TEXT,

      provedor_id TEXT,

      referencia_externa TEXT,

      descricao TEXT,

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      atualizado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_transacoes_provedor_id
    ON transacoes(provedor, provedor_id)
    WHERE provedor_id IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saques (
      id TEXT PRIMARY KEY,

      usuario_id TEXT NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

      valor NUMERIC(12,2) NOT NULL,

      taxa NUMERIC(12,2)
        NOT NULL DEFAULT 0,

      valor_liquido NUMERIC(12,2)
        NOT NULL,

      metodo TEXT NOT NULL,

      destino TEXT NOT NULL,

      status TEXT NOT NULL,

      provedor_id TEXT,

      motivo_falha TEXT,

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      atualizado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_saques_provedor
    ON saques(provedor_id)
    WHERE provedor_id IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id TEXT PRIMARY KEY,

      usuario_id TEXT NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

      finalidade TEXT NOT NULL,

      valor NUMERIC(12,2) NOT NULL,

      provedor TEXT NOT NULL,

      provedor_id TEXT,

      status TEXT NOT NULL,

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      atualizado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_pagamentos_provedor
    ON pagamentos(provedor, provedor_id)
    WHERE provedor_id IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhooks_processados (
      id TEXT PRIMARY KEY,

      provedor TEXT NOT NULL,

      evento TEXT,

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mensagens (
      id BIGSERIAL PRIMARY KEY,

      usuario_id TEXT
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

      nome TEXT,
      email TEXT,
      assunto TEXT,

      mensagem TEXT NOT NULL,

      resposta TEXT,

      status TEXT NOT NULL
        DEFAULT 'ABERTO',

      criado_em TIMESTAMP
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

      respondido_em TIMESTAMP NULL
    );
  `);
}

/*
|--------------------------------------------------------------------------
| USUÁRIOS
|--------------------------------------------------------------------------
*/

async function buscarUsuarioPorId(id) {
  const resultado = await pool.query(
    `
    SELECT *
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

    pontos:
      numero(usuario.pontos),

    pontosGanhos:
      numero(usuario.pontos_ganhos),

    saldo:
      Number(usuario.saldo || 0),

    saldoTotalGanho:
      Number(
        usuario.saldo_total_ganho || 0
      ),

    premium:
      Boolean(usuario.premium),

    premiumAte:
      usuario.premium_ate,

    pixConfigurado:
      Boolean(usuario.pix_chave),

    paypalConfigurado:
      Boolean(usuario.paypal_email),

    criadoEm:
      usuario.criado_em
  };
}

async function gerarCodigoIndicacao() {
  const caracteres =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  while (true) {
    let codigo = "";

    for (let i = 0; i < 8; i++) {
      codigo += caracteres[
        Math.floor(
          Math.random() *
          caracteres.length
        )
      ];
    }

    const resultado =
      await pool.query(
        `
        SELECT id
        FROM usuarios
        WHERE codigo_indicacao = $1
        `,
        [codigo]
      );

    if (!resultado.rows.length) {
      return codigo;
    }
  }
}

/*
|--------------------------------------------------------------------------
| SESSÃO
|--------------------------------------------------------------------------
*/

async function criarSessao(usuarioId) {
  const token = criarToken();

  const expira =
    new Date(
      Date.now() +
      CONFIG.TOKEN_DIAS *
      24 *
      60 *
      60 *
      1000
    );

  await pool.query(
    `
    INSERT INTO sessoes
    (
      usuario_id,
      token_hash,
      expira_em
    )
    VALUES ($1,$2,$3)
    `,
    [
      usuarioId,
      hashToken(token),
      expira
    ]
  );

  return token;
}

function obterTokenRequisicao(req) {
  const cabecalho =
    texto(
      req.headers.authorization
    );

  if (
    cabecalho
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return cabecalho.substring(7).trim();
  }

  return texto(
    req.headers["x-auth-token"]
  );
}

async function autenticar(req, res, next) {
  try {
    const token =
      obterTokenRequisicao(req);

    if (!token) {
      return erroPublico(
        res,
        401,
        "Faça login para continuar."
      );
    }

    const resultado =
      await pool.query(
        `
        SELECT
          u.*
        FROM sessoes s
        JOIN usuarios u
          ON u.id = s.usuario_id
        WHERE
          s.token_hash = $1
          AND s.expira_em > CURRENT_TIMESTAMP
        LIMIT 1
        `,
        [hashToken(token)]
      );

    if (!resultado.rows.length) {
      return erroPublico(
        res,
        401,
        "Sessão inválida ou expirada."
      );
    }

    req.usuario = resultado.rows[0];
    req.tokenHash = hashToken(token);

    next();
  } catch (erro) {
    next(erro);
  }
}

/*
|--------------------------------------------------------------------------
| CADASTRO
|--------------------------------------------------------------------------
*/

async function cadastrarUsuario(dados) {
  const nome = texto(dados.nome);
  const email =
    emailNormalizado(dados.email);

  const senha =
    texto(dados.senha);

  const codigoIndicacao =
    texto(
      dados.codigoIndicacao ||
      dados.codigo_indicacao ||
      dados.codigo
    ).toUpperCase();

  if (nome.length < 2) {
    throw new Error(
      "Informe seu nome."
    );
  }

  if (
    !email ||
    !email.includes("@")
  ) {
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

  if (codigoIndicacao) {
    const resultado =
      await pool.query(
        `
        SELECT *
        FROM usuarios
        WHERE UPPER(codigo_indicacao) = $1
        LIMIT 1
        `,
        [codigoIndicacao]
      );

    indicador =
      resultado.rows[0] || null;

    if (!indicador) {
      throw new Error(
        "Código de indicação inválido."
      );
    }
  }

  const id =
    gerarId("QZ");

  const codigo =
    await gerarCodigoIndicacao();

  const senhaHash =
    criarHashSenha(senha);

  const resultado =
    await pool.query(
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
      ($1,$2,$3,$4,$5,$6)
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

  await registrarAtividade(
    id,
    "CADASTRO",
    "Cadastro realizado"
  );

  return resultado.rows[0];
}

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

async function loginUsuario(dados) {
  const email =
    emailNormalizado(dados.email);

  const senha =
    texto(
      dados.senha ||
      dados.password
    );

  if (!email || !senha) {
    throw new Error(
      "Informe e-mail e senha."
    );
  }

  const usuario =
    await buscarUsuarioPorEmail(
      email
    );

  if (
    !usuario ||
    !verificarSenha(
      senha,
      usuario.senha_hash
    )
  ) {
    throw new Error(
      "E-mail ou senha incorretos."
    );
  }

  const token =
    await criarSessao(
      usuario.id
    );

  await registrarAtividade(
    usuario.id,
    "LOGIN",
    "Login realizado"
  );

  return {
    usuario,
    token
  };
}

/*
|--------------------------------------------------------------------------
| ATIVIDADES / PONTOS
|--------------------------------------------------------------------------
*/

async function registrarAtividade(
  usuarioId,
  tipo,
  descricao = "",
  pontos = 0
) {
  await pool.query(
    `
    INSERT INTO atividades
    (
      usuario_id,
      tipo,
      descricao,
      pontos
    )
    VALUES ($1,$2,$3,$4)
    `,
    [
      usuarioId,
      tipo,
      descricao,
      numero(pontos)
    ]
  );
}

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

  const resultado =
    await pool.query(
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

  await registrarAtividade(
    usuarioId,
    "PONTOS",
    `Ganhou ${quantidade} pontos`,
    quantidade
  );

  return resultado.rows[0];
}

/*
|--------------------------------------------------------------------------
| INDICAÇÕES
|--------------------------------------------------------------------------
*/

async function obterIndicacoes(
  usuarioId
) {
  const resultado =
    await pool.query(
      `
      SELECT
        id,
        nome,
        email,
        pontos,
        criado_em
      FROM usuarios
      WHERE indicado_por = $1
      ORDER BY criado_em DESC
      `,
      [usuarioId]
    );

  const usuario =
    await buscarUsuarioPorId(
      usuarioId
    );

  return {
    codigoIndicacao:
      usuario.codigo_indicacao,

    meta:
      CONFIG.PONTOS_INDICACAO_META,

    bonus:
      CONFIG.BONUS_INDICACAO,

    indicados:
      resultado.rows.map(item => ({
        id: item.id,
        nome: item.nome,
        email: item.email,

        pontos:
          numero(item.pontos),

        progresso:
          Math.min(
            100,
            Math.round(
              (
                numero(item.pontos) /
                CONFIG.PONTOS_INDICACAO_META
              ) * 100
            )
          ),

        criadoEm:
          item.criado_em
      }))
  };
}

/*
|--------------------------------------------------------------------------
| CARTEIRA
|--------------------------------------------------------------------------
*/

async function obterCarteira(
  usuarioId
) {
  const usuario =
    await buscarUsuarioPorId(
      usuarioId
    );

  const transacoes =
    await pool.query(
      `
      SELECT *
      FROM transacoes
      WHERE usuario_id = $1
      ORDER BY criado_em DESC
      LIMIT 100
      `,
      [usuarioId]
    );

  const saques =
    await pool.query(
      `
      SELECT *
      FROM saques
      WHERE usuario_id = $1
      ORDER BY criado_em DESC
      LIMIT 100
      `,
      [usuarioId]
    );

  return {
    saldo:
      Number(usuario.saldo || 0),

    saldoTotalGanho:
      Number(
        usuario.saldo_total_ganho || 0
      ),

    transacoes:
      transacoes.rows,

    saques:
      saques.rows
  };
}

/*
|--------------------------------------------------------------------------
| CONVERSÃO DE PONTOS
|--------------------------------------------------------------------------
*/

async function converterPontosParaSaldo(
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

  const valor =
    Math.round(
      (
        quantidade /
        CONFIG.PONTOS_POR_REAL
      ) * 100
    ) / 100;

  const cliente =
    await pool.connect();

  try {
    await cliente.query(
      "BEGIN"
    );

    const usuarioResult =
      await cliente.query(
        `
        SELECT *
        FROM usuarios
        WHERE id = $1
        FOR UPDATE
        `,
        [usuarioId]
      );

    if (!usuarioResult.rows.length) {
      throw new Error(
        "Usuário não encontrado."
      );
    }

    const usuario =
      usuarioResult.rows[0];

    if (
      Number(usuario.pontos) <
      quantidade
    ) {
      throw new Error(
        "Pontos insuficientes."
      );
    }

    await cliente.query(
      `
      UPDATE usuarios
      SET
        pontos =
          pontos - $1,

        saldo =
          saldo + $2,

        saldo_total_ganho =
          saldo_total_ganho + $2,

        atualizado_em =
          CURRENT_TIMESTAMP

      WHERE id = $3
      `,
      [
        quantidade,
        valor,
        usuarioId
      ]
    );

    const transacaoId =
      gerarId("TR");

    await cliente.query(
      `
      INSERT INTO transacoes
      (
        id,
        usuario_id,
        tipo,
        valor,
        status,
        provedor,
        descricao
      )
      VALUES
      (
        $1,$2,'CONVERSAO_PONTOS',
        $3,'CONCLUIDA','INTERNO',
        $4
      )
      `,
      [
        transacaoId,
        usuarioId,
        valor,
        `${quantidade} pontos convertidos`
      ]
    );

    await cliente.query(
      "COMMIT"
    );

    return {
      pontosConvertidos:
        quantidade,

      valorAdicionado:
        valor
    };
  } catch (erro) {
    await cliente.query(
      "ROLLBACK"
    );

    throw erro;
  } finally {
    cliente.release();
  }
}

/*
|--------------------------------------------------------------------------
| CONFIGURAR DESTINO DO SAQUE
|--------------------------------------------------------------------------
*/

async function configurarPix(
  usuarioId,
  dados
) {
  const chave =
    texto(dados.pixChave);

  const tipo =
    texto(dados.pixTipo)
      .toUpperCase();

  const tiposPermitidos = [
    "CPF",
    "CNPJ",
    "EMAIL",
    "PHONE",
    "EVP"
  ];

  if (!chave) {
    throw new Error(
      "Informe a chave Pix."
    );
  }

  if (
    !tiposPermitidos.includes(tipo)
  ) {
    throw new Error(
      "Tipo de chave Pix inválido."
    );
  }

  await pool.query(
    `
    UPDATE usuarios
    SET
      pix_chave = $1,
      pix_tipo = $2,
      atualizado_em =
        CURRENT_TIMESTAMP
    WHERE id = $3
    `,
    [
      chave,
      tipo,
      usuarioId
    ]
  );

  return true;
}

async function configurarPayPal(
  usuarioId,
  dados
) {
  const email =
    emailNormalizado(
      dados.paypalEmail
    );

  if (
    !email ||
    !email.includes("@")
  ) {
    throw new Error(
      "Informe um e-mail PayPal válido."
    );
  }

  await pool.query(
    `
    UPDATE usuarios
    SET
      paypal_email = $1,
      atualizado_em =
        CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [
      email,
      usuarioId
    ]
  );

  return true;
}

/*
|--------------------------------------------------------------------------
| SAQUE PIX - ASAAS
|--------------------------------------------------------------------------
*/

async function criarSaquePix(
  usuarioId,
  dados
) {
  const valor =
    dinheiro(dados.valor);

  if (
    valor <
    CONFIG.VALOR_MINIMO_SAQUE
  ) {
    throw new Error(
      `O saque mínimo é R$ ${CONFIG.VALOR_MINIMO_SAQUE.toFixed(2)}.`
    );
  }

  if (
    valor >
    CONFIG.VALOR_MAXIMO_SAQUE
  ) {
    throw new Error(
      `O saque máximo é R$ ${CONFIG.VALOR_MAXIMO_SAQUE.toFixed(2)}.`
    );
  }

  const usuario =
    await buscarUsuarioPorId(
      usuarioId
    );

  if (
    Number(usuario.saldo) <
    valor
  ) {
    throw new Error(
      "Saldo insuficiente."
    );
  }

  if (!usuario.pix_chave) {
    throw new Error(
      "Configure sua chave Pix antes de sacar."
    );
  }

  const taxa =
    CONFIG.TAXA_SAQUE;

  const valorLiquido =
    Math.round(
      (valor - taxa) * 100
    ) / 100;

  const saqueId =
    gerarId("SAQ");

  const cliente =
    await pool.connect();

  try {
    await cliente.query(
      "BEGIN"
    );

    const bloqueio =
      await cliente.query(
        `
        SELECT saldo
        FROM usuarios
        WHERE id = $1
        FOR UPDATE
        `,
        [usuarioId]
      );

    const saldoAtual =
      Number(
        bloqueio.rows[0]?.saldo || 0
      );

    if (saldoAtual < valor) {
      throw new Error(
        "Saldo insuficiente."
      );
    }

    await cliente.query(
      `
      UPDATE usuarios
      SET
        saldo =
          saldo - $1,

        atualizado_em =
          CURRENT_TIMESTAMP

      WHERE id = $2
      `,
      [
        valor,
        usuarioId
      ]
    );

    await cliente.query(
      `
      INSERT INTO saques
      (
        id,
        usuario_id,
        valor,
        taxa,
        valor_liquido,
        metodo,
        destino,
        status
      )
      VALUES
      (
        $1,$2,$3,$4,$5,
        'PIX',$6,'PROCESSANDO'
      )
      `,
      [
        saqueId,
        usuarioId,
        valor,
        taxa,
        valorLiquido,
        usuario.pix_chave
      ]
    );

    await cliente.query(
      `
      INSERT INTO transacoes
      (
        id,
        usuario_id,
        tipo,
        valor,
        status,
        provedor,
        referencia_externa,
        descricao
      )
      VALUES
      (
        $1,$2,'SAQUE',
        $3,'PROCESSANDO',
        'ASAAS',$4,$5
      )
      `,
      [
        gerarId("TR"),
        usuarioId,
        valor,
        saqueId,
        "Saque Pix solicitado"
      ]
    );

    await cliente.query(
      "COMMIT"
    );
  } catch (erro) {
    await cliente.query(
      "ROLLBACK"
    );

    throw erro;
  } finally {
    cliente.release();
  }

  try {
    const transferencia =
      await asaasRequest(
        "/v3/transfers",
        {
          method: "POST",
          headers: {
            "Idempotency-Key": saqueId
          },
          body: JSON.stringify({
            value: valorLiquido,
            operationType: "PIX",
            pixAddressKey:
              usuario.pix_chave,
            pixAddressKeyType:
              usuario.pix_tipo,
            description:
              `QuizUp saque ${saqueId}`,
            externalReference:
              saqueId
          })
        }
      );

    await pool.query(
      `
      UPDATE saques
      SET
        provedor_id = $1,
        atualizado_em =
          CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        transferencia.id,
        saqueId
      ]
    );

    await pool.query(
      `
      UPDATE transacoes
      SET
        provedor_id = $1,
        atualizado_em =
          CURRENT_TIMESTAMP
      WHERE referencia_externa = $2
      `,
      [
        transferencia.id,
        saqueId
      ]
    );

    return {
      saqueId,
      status:
        transferencia.status ||
        "PROCESSANDO",

      provedorId:
        transferencia.id
    };
  } catch (erro) {
    await devolverSaldoSaque(
      saqueId,
      erro.message
    );

    throw erro;
  }
}

/*
|--------------------------------------------------------------------------
| SAQUE PAYPAL
|--------------------------------------------------------------------------
*/

async function criarSaquePayPal(
  usuarioId,
  dados
) {
  const valor =
    dinheiro(dados.valor);

  if (
    valor <
    CONFIG.VALOR_MINIMO_SAQUE
  ) {
    throw new Error(
      `O saque mínimo é R$ ${CONFIG.VALOR_MINIMO_SAQUE.toFixed(2)}.`
    );
  }

  if (
    valor >
    CONFIG.VALOR_MAXIMO_SAQUE
  ) {
    throw new Error(
      `O saque máximo é R$ ${CONFIG.VALOR_MAXIMO_SAQUE.toFixed(2)}.`
    );
  }

  const usuario =
    await buscarUsuarioPorId(
      usuarioId
    );

  if (
    Number(usuario.saldo) <
    valor
  ) {
    throw new Error(
      "Saldo insuficiente."
    );
  }

  if (!usuario.paypal_email) {
    throw new Error(
      "Configure seu PayPal antes de sacar."
    );
  }

  /*
   * O saldo do QuizUp está em BRL.
   * O PayPal Payouts usa a moeda enviada
   * na solicitação.
   *
   * Aqui usamos BRL.
   */

  const saqueId =
    gerarId("SAQ");

  const cliente =
    await pool.connect();

  try {
    await cliente.query(
      "BEGIN"
    );

    const bloqueio =
      await cliente.query(
        `
        SELECT saldo
        FROM usuarios
        WHERE id = $1
        FOR UPDATE
        `,
        [usuarioId]
      );

    const saldoAtual =
      Number(
        bloqueio.rows[0]?.saldo || 0
      );

    if (saldoAtual < valor) {
      throw new Error(
        "Saldo insuficiente."
      );
    }

    await cliente.query(
      `
      UPDATE usuarios
      SET
        saldo =
          saldo - $1,

        atualizado_em =
          CURRENT_TIMESTAMP

      WHERE id = $2
      `,
      [
        valor,
        usuarioId
      ]
    );

    await cliente.query(
      `
      INSERT INTO saques
      (
        id,
        usuario_id,
        valor,
        taxa,
        valor_liquido,
        metodo,
        destino,
        status
      )
      VALUES
      (
        $1,$2,$3,0,$3,
        'PAYPAL',$4,'PROCESSANDO'
      )
      `,
      [
        saqueId,
        usuarioId,
        valor,
        usuario.paypal_email
      ]
    );

    await cliente.query(
      `
      INSERT INTO transacoes
      (
        id,
        usuario_id,
        tipo,
        valor,
        status,
        provedor,
        referencia_externa,
        descricao
      )
      VALUES
      (
        $1,$2,'SAQUE',
        $3,'PROCESSANDO',
        'PAYPAL',$4,$5
      )
      `,
      [
        gerarId("TR"),
        usuarioId,
        valor,
        saqueId,
        "Saque PayPal solicitado"
      ]
    );

    await cliente.query(
      "COMMIT"
    );
  } catch (erro) {
    await cliente.query(
      "ROLLBACK"
    );

    throw erro;
  } finally {
    cliente.release();
  }

  try {
    const payout =
      await paypalRequest(
        "/v1/payments/payouts",
        {
          method: "POST",
          headers: {
            "PayPal-Request-Id":
              saqueId
          },
          body: JSON.stringify({
            sender_batch_header: {
              sender_batch_id:
                saqueId,
              email_subject:
                "Seu saque do QuizUp",
              email_message:
                "Seu saque foi enviado pelo QuizUp."
            },

            items: [
              {
                recipient_type:
                  "EMAIL",

                amount: {
                  value:
                    valor.toFixed(2),

                  currency:
                    "BRL"
                },

                receiver:
                  usuario.paypal_email,

                note:
                  `Saque QuizUp ${saqueId}`,

                sender_item_id:
                  saqueId
              }
            ]
          })
        }
      );

    const batchId =
      payout.batch_header
        ?.payout_batch_id ||
      null;

    await pool.query(
      `
      UPDATE saques
      SET
        provedor_id = $1,
        atualizado_em =
          CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        batchId,
        saqueId
      ]
    );

    return {
      saqueId,

      status:
        payout.batch_header
          ?.batch_status ||
        "PROCESSANDO",

      provedorId:
        batchId
    };
  } catch (erro) {
    await devolverSaldoSaque(
      saqueId,
      erro.message
    );

    throw erro;
  }
}

/*
|--------------------------------------------------------------------------
| DEVOLVER SALDO QUANDO SAQUE FALHAR
|--------------------------------------------------------------------------
*/

async function devolverSaldoSaque(
  saqueId,
  motivo
) {
  const cliente =
    await pool.connect();

  try {
    await cliente.query(
      "BEGIN"
    );

    const saqueResult =
      await cliente.query(
        `
        SELECT *
        FROM saques
        WHERE id = $1
        FOR UPDATE
        `,
        [saqueId]
      );

    if (!saqueResult.rows.length) {
      await cliente.query(
        "ROLLBACK"
      );
      return;
    }

    const saque =
      saqueResult.rows[0];

    if (
      saque.status ===
      "DEVOLVIDO"
    ) {
      await cliente.query(
        "ROLLBACK"
      );
      return;
    }

    await cliente.query(
      `
      UPDATE usuarios
      SET
        saldo =
          saldo + $1,

        atualizado_em =
          CURRENT_TIMESTAMP

      WHERE id = $2
      `,
      [
        Number(saque.valor),
        saque.usuario_id
      ]
    );

    await cliente.query(
      `
      UPDATE saques
      SET
        status = 'DEVOLVIDO',
        motivo_falha = $1,
        atualizado_em =
          CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        motivo,
        saqueId
      ]
    );

    await cliente.query(
      `
      UPDATE transacoes
      SET
        status = 'DEVOLVIDO',
        atualizado_em =
          CURRENT_TIMESTAMP
      WHERE referencia_externa = $1
      `,
      [saqueId]
    );

    await cliente.query(
      "COMMIT"
    );
  } catch (erro) {
    await cliente.query(
      "ROLLBACK"
    );
    console.error(
      "Erro ao devolver saldo:",
      erro
    );
  } finally {
    cliente.release();
  }
}

/*
|--------------------------------------------------------------------------
| PREMIUM - CRIAR COBRANÇA ASAAS
|--------------------------------------------------------------------------
*/

async function criarClienteAsaas(
  usuario
) {
  const existente =
    await asaasRequest(
      `/v3/customers?email=${encodeURIComponent(usuario.email)}`
    );

  if (
    existente.data &&
    existente.data.length
  ) {
    return existente.data[0];
  }

  return asaasRequest(
    "/v3/customers",
    {
      method: "POST",
      body: JSON.stringify({
        name: usuario.nome,
        email: usuario.email
      })
    }
  );
}

async function criarPagamentoPremium(
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

  const cliente =
    await criarClienteAsaas(
      usuario
    );

  const pagamentoInterno =
    gerarId("PAY");

  const pagamento =
    await asaasRequest(
      "/v3/payments",
      {
        method: "POST",
        body: JSON.stringify({
          customer:
            cliente.id,

          billingType:
            "PIX",

          value:
            CONFIG.PREMIUM_VALOR,

          dueDate:
            new Date()
              .toISOString()
              .slice(0, 10),

          description:
            "QuizUp Premium",

          externalReference:
            pagamentoInterno
        })
      }
    );

  await pool.query(
    `
    INSERT INTO pagamentos
    (
      id,
      usuario_id,
      finalidade,
      valor,
      provedor,
      provedor_id,
      status
    )
    VALUES
    (
      $1,$2,'PREMIUM',
      $3,'ASAAS',$4,$5
    )
    `,
    [
      pagamentoInterno,
      usuarioId,
      CONFIG.PREMIUM_VALOR,
      pagamento.id,
      pagamento.status ||
        "PENDING"
    ]
  );

  let pix = null;

  try {
    pix =
      await asaasRequest(
        `/v3/payments/${pagamento.id}/pixQrCode`
      );
  } catch (erro) {
    console.error(
      "Não foi possível obter QR Code:",
      erro.message
    );
  }

  return {
    pagamentoId:
      pagamento.id,

    valor:
      CONFIG.PREMIUM_VALOR,

    status:
      pagamento.status,

    invoiceUrl:
      pagamento.invoiceUrl ||
      null,

    pix: pix
      ? {
          encodedImage:
            pix.encodedImage ||
            null,

          payload:
            pix.payload ||
            null,

          expirationDate:
            pix.expirationDate ||
            null
        }
      : null
  };
}

/*
|--------------------------------------------------------------------------
| ATIVAR PREMIUM
|--------------------------------------------------------------------------
*/

async function ativarPremium(
  usuarioId,
  dias = CONFIG.PREMIUM_DIAS
) {
  const quantidade =
    Math.max(
      1,
      Math.floor(
        numero(
          dias,
          CONFIG.PREMIUM_DIAS
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
        quantidade
      ]
    );

  if (!resultado.rows.length) {
    throw new Error(
      "Usuário não encontrado."
    );
  }

  return resultado.rows[0];
}

/*
|--------------------------------------------------------------------------
| WEBHOOK ASAAS
|--------------------------------------------------------------------------
*/

function validarWebhookAsaas(req) {
  if (!ASAAS_WEBHOOK_TOKEN) {
    return false;
  }

  const recebido =
    texto(
      req.headers["asaas-access-token"]
    );

  const a =
    Buffer.from(
      recebido
    );

  const b =
    Buffer.from(
      ASAAS_WEBHOOK_TOKEN
    );

  if (
    a.length !== b.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    a,
    b
  );
}

async function processarWebhookAsaas(
  req,
  res
) {
  if (
    !validarWebhookAsaas(req)
  ) {
    return erroPublico(
      res,
      401,
      "Webhook não autorizado."
    );
  }

  const evento = req.body || {};
  const eventoId =
    texto(evento.id);

  if (!eventoId) {
    return erroPublico(
      res,
      400,
      "Evento inválido."
    );
  }

  const cliente =
    await pool.connect();

  try {
    await cliente.query(
      "BEGIN"
    );

    const insercao =
      await cliente.query(
        `
        INSERT INTO webhooks_processados
        (
          id,
          provedor,
          evento
        )
        VALUES
        ($1,'ASAAS',$2)
        ON CONFLICT (id)
        DO NOTHING
        RETURNING id
        `,
        [
          eventoId,
          texto(evento.event)
        ]
      );

    /*
     * Evento já recebido.
     * Retornamos 200 para evitar
     * reprocessamento desnecessário.
     */

    if (!insercao.rows.length) {
      await cliente.query(
        "COMMIT"
      );

      return sucesso(
        res,
        {
          duplicado: true
        }
      );
    }

    const tipoEvento =
      texto(evento.event);

    /*
     * PAGAMENTO PREMIUM
     */

    if (
      tipoEvento ===
        "PAYMENT_RECEIVED" ||
      tipoEvento ===
        "PAYMENT_CONFIRMED"
    ) {
      const pagamento =
        evento.payment || {};

      const pagamentoId =
        texto(pagamento.id);

      const pagamentoInterno =
        texto(
          pagamento.externalReference
        );

      const valorPago =
        Number(
          pagamento.value || 0
        );

      if (
        pagamentoId &&
        pagamentoInterno
      ) {
        const pagamentoDb =
          await cliente.query(
            `
            SELECT *
            FROM pagamentos
            WHERE id = $1
            FOR UPDATE
            `,
            [pagamentoInterno]
          );

        if (
          pagamentoDb.rows.length &&
          pagamentoDb.rows[0].status !==
            "RECEIVED"
        ) {
          const registro =
            pagamentoDb.rows[0];

          await cliente.query(
            `
            UPDATE pagamentos
            SET
              status = 'RECEIVED',
              atualizado_em =
                CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [pagamentoInterno]
          );

          if (
            registro.finalidade ===
              "PREMIUM" &&
            valorPago >=
              Number(registro.valor)
          ) {
            const usuario =
              await cliente.query(
                `
                SELECT *
                FROM usuarios
                WHERE id = $1
                FOR UPDATE
                `,
                [registro.usuario_id]
              );

            if (
              usuario.rows.length
            ) {
              await cliente.query(
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
                `,
                [
                  registro.usuario_id,
                  CONFIG.PREMIUM_DIAS
                ]
              );
            }
          }
        }
      }
    }

    /*
     * TRANSFERÊNCIAS / SAQUES
     */

    if (
      tipoEvento.startsWith(
        "TRANSFER_"
      )
    ) {
      const transferencia =
        evento.transfer || {};

      const transferenciaId =
        texto(
          transferencia.id
        );

      const status =
        texto(
          transferencia.status
        ).toUpperCase();

      if (transferenciaId) {
        const saque =
          await cliente.query(
            `
            SELECT *
            FROM saques
            WHERE provedor_id = $1
            FOR UPDATE
            `,
            [transferenciaId]
          );

        if (
          saque.rows.length
        ) {
          const registro =
            saque.rows[0];

          if (
            [
              "DONE",
              "COMPLETED"
            ].includes(status)
          ) {
            await cliente.query(
              `
              UPDATE saques
              SET
                status = 'CONCLUIDO',
                atualizado_em =
                  CURRENT_TIMESTAMP
              WHERE id = $1
              `,
              [registro.id]
            );

            await cliente.query(
              `
              UPDATE transacoes
              SET
                status = 'CONCLUIDA',
                atualizado_em =
                  CURRENT_TIMESTAMP
              WHERE referencia_externa = $1
              `,
              [registro.id]
            );
          }

          if (
            [
              "FAILED",
              "CANCELLED",
              "BLOCKED"
            ].includes(status)
          ) {
            /*
             * Não devolvemos o saldo aqui
             * dentro da mesma transação para
             * evitar duplicação.
             *
             * A devolução é feita pela função
             * abaixo após COMMIT.
             */
          }
        }
      }
    }

    await cliente.query(
      "COMMIT"
    );

    /*
     * Tratamento posterior de transferência
     * falha.
     */

    if (
      tipoEvento.startsWith(
        "TRANSFER_"
      )
    ) {
      const transferencia =
        evento.transfer || {};

      const status =
        texto(
          transferencia.status
        ).toUpperCase();

      if (
        [
          "FAILED",
          "CANCELLED",
          "BLOCKED"
        ].includes(status)
      ) {
        const saque =
          await pool.query(
            `
            SELECT id
            FROM saques
            WHERE provedor_id = $1
            LIMIT 1
            `,
            [
              texto(
                transferencia.id
              )
            ]
          );

        if (
          saque.rows.length
        ) {
          await devolverSaldoSaque(
            saque.rows[0].id,
            texto(
              transferencia.failReason
            ) ||
              `Transferência ${status}`
          );
        }
      }
    }

    return sucesso(
      res,
      {
        recebido: true
      }
    );
  } catch (erro) {
    await cliente.query(
      "ROLLBACK"
    );

    throw erro;
  } finally {
    cliente.release();
  }
}

/*
|--------------------------------------------------------------------------
| SAC
|--------------------------------------------------------------------------
*/

async function criarMensagemSac(
  usuarioId,
  dados
) {
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
      (
        $1,$2,$3,$4,$5
      )
      RETURNING *
      `,
      [
        usuarioId || null,
        texto(dados.nome),
        emailNormalizado(
          dados.email
        ),
        texto(dados.assunto) ||
          "Atendimento",
        mensagem
      ]
    );

  return resultado.rows[0];
}

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

function validarAdmin(req) {
  if (!ADMIN_KEY) {
    return false;
  }

  const chave =
    texto(
      req.headers["x-admin-key"]
    );

  const a =
    Buffer.from(chave);

  const b =
    Buffer.from(ADMIN_KEY);

  if (
    a.length !== b.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    a,
    b
  );
}

function exigirAdmin(
  req,
  res
) {
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

/*
|--------------------------------------------------------------------------
| STATUS
|--------------------------------------------------------------------------
*/

async function statusSistema() {
  let banco = false;

  try {
    await pool.query(
      "SELECT 1"
    );

    banco = true;
  } catch {}

  return {
    ok: banco,

    servidor:
      "online",

    banco:
      banco
        ? "PostgreSQL conectado"
        : "PostgreSQL indisponível",

    pagamentos:
      Boolean(
        ASAAS_API_KEY
      ),

    pix:
      Boolean(
        ASAAS_API_KEY
      ),

    paypal:
      Boolean(
        PAYPAL_CLIENT_ID &&
        PAYPAL_CLIENT_SECRET
      ),

    modo:
      "producao"
  };
}

/*
|--------------------------------------------------------------------------
| ROTAS
|--------------------------------------------------------------------------
*/

/*
 * HEALTH
 */

app.get(
  "/health",
  (req, res) => {
    res.status(200).send("OK");
  }
);

/*
 * STATUS
 */

app.get(
  "/api/status",
  async (req, res, next) => {
    try {
      return sucesso(
        res,
        await statusSistema()
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * CADASTRO
 */

app.post(
  "/api/cadastro",
  async (req, res, next) => {
    try {
      const usuario =
        await cadastrarUsuario(
          req.body
        );

      const token =
        await criarSessao(
          usuario.id
        );

      return responder(
        res,
        201,
        {
          sucesso: true,

          mensagem:
            "Cadastro realizado com sucesso.",

          token,

          usuario:
            usuarioPublico(
              usuario
            )
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * LOGIN
 */

app.post(
  "/api/login",
  async (req, res, next) => {
    try {
      const resultado =
        await loginUsuario(
          req.body
        );

      return sucesso(
        res,
        {
          mensagem:
            "Login realizado com sucesso.",

          token:
            resultado.token,

          usuario:
            usuarioPublico(
              resultado.usuario
            )
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * LOGOUT
 */

app.post(
  "/api/logout",
  autenticar,
  async (req, res, next) => {
    try {
      await pool.query(
        `
        DELETE FROM sessoes
        WHERE token_hash = $1
        `,
        [req.tokenHash]
      );

      return sucesso(
        res,
        {
          mensagem:
            "Sessão encerrada."
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * USUÁRIO
 */

app.get(
  "/api/usuario",
  autenticar,
  (req, res) => {
    return sucesso(
      res,
      {
        usuario:
          usuarioPublico(
            req.usuario
          )
      }
    );
  }
);

/*
 * PONTOS
 */

app.post(
  "/api/pontuacao",
  autenticar,
  async (req, res, next) => {
    try {
      const pontos =
        await adicionarPontos(
          req.usuario.id,
          req.body.pontos
        );

      return sucesso(
        res,
        {
          usuario:
            usuarioPublico(
              pontos
            )
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * INDICAÇÕES
 */

app.get(
  "/api/indicacoes",
  autenticar,
  async (req, res, next) => {
    try {
      return sucesso(
        res,
        await obterIndicacoes(
          req.usuario.id
        )
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * CARTEIRA
 */

app.get(
  "/api/carteira",
  autenticar,
  async (req, res, next) => {
    try {
      return sucesso(
        res,
        await obterCarteira(
          req.usuario.id
        )
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * CONVERTER PONTOS
 */

app.post(
  "/api/carteira/converter",
  autenticar,
  async (req, res, next) => {
    try {
      const resultado =
        await converterPontosParaSaldo(
          req.usuario.id,
          req.body.pontos
        );

      return sucesso(
        res,
        resultado
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * CONFIGURAR PIX
 */

app.post(
  "/api/saque/pix/configurar",
  autenticar,
  async (req, res, next) => {
    try {
      await configurarPix(
        req.usuario.id,
        req.body
      );

      return sucesso(
        res,
        {
          mensagem:
            "Chave Pix configurada."
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * CONFIGURAR PAYPAL
 */

app.post(
  "/api/saque/paypal/configurar",
  autenticar,
  async (req, res, next) => {
    try {
      await configurarPayPal(
        req.usuario.id,
        req.body
      );

      return sucesso(
        res,
        {
          mensagem:
            "PayPal configurado."
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * SAQUE PIX
 */

app.post(
  "/api/saque/pix",
  autenticar,
  async (req, res, next) => {
    try {
      const resultado =
        await criarSaquePix(
          req.usuario.id,
          req.body
        );

      return sucesso(
        res,
        resultado
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * SAQUE PAYPAL
 */

app.post(
  "/api/saque/paypal",
  autenticar,
  async (req, res, next) => {
    try {
      const resultado =
        await criarSaquePayPal(
          req.usuario.id,
          req.body
        );

      return sucesso(
        res,
        resultado
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * HISTÓRICO DE SAQUES
 */

app.get(
  "/api/saques",
  autenticar,
  async (req, res, next) => {
    try {
      const resultado =
        await pool.query(
          `
          SELECT *
          FROM saques
          WHERE usuario_id = $1
          ORDER BY criado_em DESC
          LIMIT 100
          `,
          [req.usuario.id]
        );

      return sucesso(
        res,
        {
          saques:
            resultado.rows
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * COMPRAR PREMIUM
 */

app.post(
  "/api/premium/comprar",
  autenticar,
  async (req, res, next) => {
    try {
      const pagamento =
        await criarPagamentoPremium(
          req.usuario.id
        );

      return sucesso(
        res,
        {
          mensagem:
            "Pagamento Premium criado.",

          pagamento
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
 * PREMIUM STATUS
 */

app.get(
  "/api/premium",
  autenticar,
  (req, res) => {
    return sucesso(
      res,
      {
        premium:
          Boolean(
            req.usuario.premium
          ),

        premiumAte:
          req.usuario.premium_ate,

        valor:
          CONFIG.PREMIUM_VALOR,

        dias:
          CONFIG.PREMIUM_DIAS
      }
    );
  }
);

/*
 * SAC
 */

app.post(
  "/api/sac",
  async (req, res, next) => {
    try {
      const atendimento =
        await criarMensagemSac(
          null,
          req.body
        );

      return responder(
        res,
        201,
        {
          sucesso: true,
          mensagem:
            "Mensagem enviada com sucesso.",
          atendimento
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
|--------------------------------------------------------------------------
| WEBHOOK ASAAS
|--------------------------------------------------------------------------
*/

app.post(
  "/api/webhooks/asaas",
  async (req, res, next) => {
    try {
      return await processarWebhookAsaas(
        req,
        res
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADMIN - USUÁRIOS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/admin/usuarios",
  async (req, res, next) => {
    try {
      if (
        !exigirAdmin(
          req,
          res
        )
      ) {
        return;
      }

      const resultado =
        await pool.query(
          `
          SELECT
            id,
            nome,
            email,
            pontos,
            saldo,
            premium,
            premium_ate,
            criado_em
          FROM usuarios
          ORDER BY criado_em DESC
          LIMIT 1000
          `
        );

      return sucesso(
        res,
        {
          usuarios:
            resultado.rows
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADMIN - ATIVAR PREMIUM
|--------------------------------------------------------------------------
*/

app.post(
  "/api/admin/premium/ativar",
  async (req, res, next) => {
    try {
      if (
        !exigirAdmin(
          req,
          res
        )
      ) {
        return;
      }

      const id =
        texto(
          req.body.usuarioId ||
          req.body.id
        );

      const usuario =
        await ativarPremium(
          id,
          req.body.dias
        );

      return sucesso(
        res,
        {
          usuario:
            usuarioPublico(
              usuario
            )
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADMIN - SAQUES
|--------------------------------------------------------------------------
*/

app.get(
  "/api/admin/saques",
  async (req, res, next) => {
    try {
      if (
        !exigirAdmin(
          req,
          res
        )
      ) {
        return;
      }

      const resultado =
        await pool.query(
          `
          SELECT
            s.*,
            u.nome,
            u.email
          FROM saques s
          JOIN usuarios u
            ON u.id = s.usuario_id
          ORDER BY s.criado_em DESC
          LIMIT 1000
          `
        );

      return sucesso(
        res,
        {
          saques:
            resultado.rows
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADMIN - MENSAGENS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/admin/sac",
  async (req, res, next) => {
    try {
      if (
        !exigirAdmin(
          req,
          res
        )
      ) {
        return;
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
          ORDER BY m.criado_em DESC
          LIMIT 500
          `
        );

      return sucesso(
        res,
        {
          mensagens:
            resultado.rows
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
|--------------------------------------------------------------------------
| ADMIN - RESPONDER SAC
|--------------------------------------------------------------------------
*/

app.post(
  "/api/admin/sac/responder",
  async (req, res, next) => {
    try {
      if (
        !exigirAdmin(
          req,
          res
        )
      ) {
        return;
      }

      const resposta =
        texto(
          req.body.resposta
        );

      if (!resposta) {
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
            req.body.id,
            resposta
          ]
        );

      if (
        !resultado.rows.length
      ) {
        throw new Error(
          "Mensagem não encontrada."
        );
      }

      return sucesso(
        res,
        {
          mensagem:
            resultado.rows[0]
        }
      );
    } catch (erro) {
      next(erro);
    }
  }
);

/*
|--------------------------------------------------------------------------
| ARQUIVOS DO SITE
|--------------------------------------------------------------------------
*/

app.use(
  express.static(__dirname)
);

app.get(
  "/",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return erroPublico(
        res,
        404,
        "Rota da API não encontrada."
      );
    }

    res.status(404).send(
      "Página não encontrada."
    );
  }
);

/*
|--------------------------------------------------------------------------
| ERROS
|--------------------------------------------------------------------------
*/

app.use(
  (err, req, res, next) => {
    console.error(
      "ERRO:",
      err
    );

    if (
      res.headersSent
    ) {
      return next(err);
    }

    const status =
      Number(
        err.status
      ) || 500;

    return erroPublico(
      res,
      status,
      status === 500
        ? "Erro interno do servidor."
        : err.message
    );
  }
);

/*
|--------------------------------------------------------------------------
| INICIAR
|--------------------------------------------------------------------------
*/

async function iniciar() {
  try {
    console.log(
      "================================="
    );

    console.log(
      "INICIANDO QUIZUP..."
    );

    console.log(
      "Porta:",
      PORTA
    );

    console.log(
      "================================="
    );

    await pool.query(
      "SELECT 1"
    );

    console.log(
      "PostgreSQL conectado."
    );

    await criarTabelas();

    console.log(
      "Tabelas verificadas."
    );

    app.listen(
      PORTA,
      "0.0.0.0",
      () => {
        console.log(
          "================================="
        );

        console.log(
          "QUIZUP ONLINE"
        );

        console.log(
          "Porta:",
          PORTA
        );

        console.log(
          "Financeiro:",
          ASAAS_API_KEY
            ? "Asaas configurado"
            : "Asaas não configurado"
        );

        console.log(
          "PayPal:",
          PAYPAL_CLIENT_ID
            ? "PayPal configurado"
            : "PayPal não configurado"
        );

        console.log(
          "================================="
        );
      }
    );
  } catch (erro) {
    console.error(
      "ERRO AO INICIAR QUIZUP:"
    );

    console.error(
      erro
    );

    process.exit(1);
  }
}

/*
|--------------------------------------------------------------------------
| ENCERRAMENTO
|--------------------------------------------------------------------------
*/

async function encerrar() {
  console.log(
    "Encerrando servidor..."
  );

  await pool.end();

  process.exit(0);
}

process.on(
  "SIGTERM",
  encerrar
);

process.on(
  "SIGINT",
  encerrar
);

iniciar();
