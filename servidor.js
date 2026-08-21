const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 10000);

const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_KEY = process.env.QUIZUP_ADMIN_KEY || "";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_ENV = String(process.env.ASAAS_ENV || "sandbox").toLowerCase();
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || "";

const ASAAS_BASE_URL =
  ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

const CONFIG = {
  PONTOS_INDICACAO_META: 300,
  BONUS_INDICADOR: 50,
  LIMITE_SAQUES_DIA: 2,

  SAQUES: {
    2000: 2,
    6000: 6,
    11000: 11
  },

  PERCENTUAL_PLATAFORMA: 30,
  PREMIUM_VALOR: 9.9
};

if (!DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não configurada no Render.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

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

function gerarIdJogador() {
  return (
    "QZ" +
    Date.now().toString(36).toUpperCase() +
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

function dataHoje() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
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

    if (partes.length !== 2) return false;

    const salt = partes[0];
    const hashSalvo = partes[1];

    const hashAtual = crypto
      .scryptSync(String(senha), salt, 64)
      .toString("hex");

    const a = Buffer.from(hashAtual, "hex");
    const b = Buffer.from(hashSalvo, "hex");

    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

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

  const aleatorio = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let tentativa = 0; tentativa < 20; tentativa++) {
    let caracteres = "";

    for (
      let i = 0;
      i < nomeLimpo.length && caracteres.length < 4;
      i += 2
    ) {
      caracteres += nomeLimpo[i];
    }

    for (
      let i = 0;
      i < emailParte.length && caracteres.length < 8;
      i += 2
    ) {
      caracteres += emailParte[i];
    }

    while (caracteres.length < 8) {
      caracteres += aleatorio[
        Math.floor(Math.random() * aleatorio.length)
      ];
    }

    const lista = caracteres.substring(0, 8).split("");

    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }

    const codigo = lista.join("");

    const existe = await pool.query(
      `SELECT id
       FROM usuarios
       WHERE codigo_indicacao = $1
       LIMIT 1`,
      [codigo]
    );

    if (!existe.rows.length) {
      return codigo;
    }
  }

  throw new Error("Não foi possível gerar código de indicação.");
}

function responder(res, status, dados) {
  if (res.headersSent) return;

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Admin-Key, x-admin-key, Authorization, asaas-access-token",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(dados));
}

function erroPublico(res, status, mensagem) {
  return responder(res, status, {
    sucesso: false,
    erro: mensagem
  });
}

function receberDados(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";
    let finalizado = false;

    req.on("data", parte => {
      if (finalizado) return;

      corpo += parte.toString();

      if (corpo.length > 2 * 1024 * 1024) {
        finalizado = true;
        reject(new Error("Dados muito grandes."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (finalizado) return;

      try {
        const dados = corpo ? JSON.parse(corpo) : {};
        resolve(dados);
      } catch {
        reject(new Error("JSON inválido."));
      }
    });

    req.on("error", erro => {
      if (!finalizado) {
        finalizado = true;
        reject(erro);
      }
    });
  });
}

function identificarTipoPix(chave) {
  const valor = texto(chave);

  if (!valor) return null;

  const somenteNumeros = valor.replace(/\D/g, "");

  if (somenteNumeros.length === 11) return "CPF";
  if (somenteNumeros.length === 14) return "CNPJ";

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    return "EMAIL";
  }

  if (/^[0-9a-fA-F-]{32,36}$/.test(valor)) {
    return "EVP";
  }

  if (/^\+?\d{10,13}$/.test(valor)) {
    return "PHONE";
  }

  return null;
}

async function asaasRequisicao(endpoint, metodo = "GET", corpo = null) {
  if (!ASAAS_API_KEY) {
    throw new Error("ASAAS_API_KEY não configurada no Render.");
  }

  const opcoes = {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      access_token: ASAAS_API_KEY
    }
  };

  if (corpo !== null) {
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(
    ASAAS_BASE_URL + endpoint,
    opcoes
  );

  const textoResposta = await resposta.text();

  let dados;

  try {
    dados = textoResposta ? JSON.parse(textoResposta) : {};
  } catch {
    dados = { mensagem: textoResposta };
  }

  if (!resposta.ok) {
    const erro =
      dados?.errors?.[0]?.description ||
      dados?.message ||
      dados?.error ||
      "Erro desconhecido no Asaas.";

    throw new Error(`Asaas ${resposta.status}: ${erro}`);
  }

  return dados;
}

async function testarAsaas() {
  if (!ASAAS_API_KEY) {
    console.log("Asaas: ASAAS_API_KEY não configurada.");
    return;
  }

  try {
    const resposta = await asaasRequisicao("/myAccount");

    console.log(
      "Asaas conectado:",
      resposta.name || resposta.email || "OK"
    );
  } catch (erro) {
    console.log("Asaas não conectado:", erro.message);
  }
}

async function criarTransferenciaPixAsaas(saque) {
  if (!saque) {
    throw new Error("Saque inválido.");
  }

  if (saque.tipo !== "pix") {
    throw new Error(
      "O pagamento automático está disponível somente para PIX."
    );
  }

  const chavePix = texto(saque.destino);

  if (!chavePix) {
    throw new Error("Chave Pix não informada.");
  }

  let tipoPix = texto(saque.tipo_pix).toUpperCase();

  if (!tipoPix) {
    tipoPix = identificarTipoPix(chavePix);
  }

  const tiposPermitidos = [
    "CPF",
    "CNPJ",
    "EMAIL",
    "PHONE",
    "EVP"
  ];

  if (!tiposPermitidos.includes(tipoPix)) {
    throw new Error("Tipo de chave Pix inválido.");
  }

  const valor = Number(saque.valor_jogador);

  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("Valor da transferência inválido.");
  }

  const corpo = {
    value: Number(valor.toFixed(2)),
    operationType: "PIX",
    pixAddressKey: chavePix,
    pixAddressKeyType: tipoPix,
    description: `Pagamento QuizUp ${saque.id}`,
    externalReference: String(saque.id)
  };

  return asaasRequisicao("/transfers", "POST", corpo);
}

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
      saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
      pontos_ganhos INTEGER NOT NULL DEFAULT 0,
      premium BOOLEAN NOT NULL DEFAULT FALSE,
      premium_ate TIMESTAMP NULL,
      pix_chave TEXT,
      pix_tipo TEXT,
      paypal_email TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saques (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      pontos INTEGER NOT NULL,
      valor NUMERIC(12,2) NOT NULL,
      valor_jogador NUMERIC(12,2) NOT NULL,
      valor_plataforma NUMERIC(12,2) NOT NULL,
      tipo TEXT NOT NULL,
      destino TEXT NOT NULL,
      tipo_pix TEXT,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      motivo_recusa TEXT,
      asaas_id TEXT,
      asaas_status TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      aprovado_em TIMESTAMP NULL,
      pago_em TIMESTAMP NULL
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
    CREATE TABLE IF NOT EXISTS atividades (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
      tipo TEXT NOT NULL,
      descricao TEXT,
      pontos INTEGER DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pagamentos_premium (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
      valor NUMERIC(12,2) NOT NULL DEFAULT 9.90,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      asaas_id TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_saques_usuario
    ON saques(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_saques_status
    ON saques(status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_atividades_usuario
    ON atividades(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mensagens_usuario
    ON mensagens(usuario_id)
  `);
}

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
      VALUES ($1,$2,$3,$4)
      `,
      [
        usuarioId,
        tipo,
        descricao,
        numero(pontos)
      ]
    );
  } catch (erro) {
    console.error("Erro atividade:", erro.message);
  }
}

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
      saldo,
      pontos_ganhos,
      premium,
      premium_ate,
      pix_chave,
      pix_tipo,
      paypal_email,
      criado_em
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
  if (!usuario) return null;

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,

    codigoIndicacao: usuario.codigo_indicacao,
    codigo_indicacao: usuario.codigo_indicacao,

    indicadoPor: usuario.indicado_por,
    indicado_por: usuario.indicado_por,

    pontos: numero(usuario.pontos),

    saldo: Number(
      numero(usuario.saldo).toFixed(2)
    ),

    pontosGanhos: numero(usuario.pontos_ganhos),
    pontos_ganhos: numero(usuario.pontos_ganhos),

    premium: Boolean(usuario.premium),

    premiumAte: usuario.premium_ate,
    premium_ate: usuario.premium_ate,

    pixChave: usuario.pix_chave,
    pixTipo: usuario.pix_tipo,
    paypalEmail: usuario.paypal_email,

    criadoEm: usuario.criado_em
  };
}

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
    throw new Error("Informe seu nome.");
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("Informe um e-mail válido.");
  }

  if (senha.length < 6) {
    throw new Error(
      "A senha deve ter pelo menos 6 caracteres."
    );
  }

  const existente = await buscarUsuarioPorEmail(email);

  if (existente) {
    throw new Error(
      "Este e-mail já está cadastrado."
    );
  }

  let indicador = null;

  if (codigoInformado) {
    const resultadoIndicador = await pool.query(
      `
      SELECT *
      FROM usuarios
      WHERE UPPER(codigo_indicacao) = $1
      LIMIT 1
      `,
      [codigoInformado]
    );

    indicador = resultadoIndicador.rows[0] || null;

    if (!indicador) {
      throw new Error(
        "Código de indicação inválido."
      );
    }
  }

  const id = gerarIdJogador();

  const codigo = await gerarCodigoIndicacao(
    nome,
    email
  );

  const senhaHash = criarHashSenha(senha);

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
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
    `,
    [
      id,
      nome,
      email,
      senhaHash,
      codigo,
      indicador ? indicador.id : null
    ]
  );

  const usuario = resultado.rows[0];

  await registrarAtividade(
    usuario.id,
    "CADASTRO",
    "Cadastro realizado"
  );

  return usuario;
}

async function loginUsuario(dados) {
  const email = emailNormalizado(dados.email);

  const senha = texto(
    dados.senha || dados.password
  );

  if (!email || !senha) {
    throw new Error(
      "Informe e-mail e senha."
    );
  }

  const usuario = await buscarUsuarioPorEmail(email);

  if (!usuario) {
    throw new Error(
      "E-mail ou senha incorretos."
    );
  }

  if (
    !verificarSenha(
      senha,
      usuario.senha_hash
    )
  ) {
    throw new Error(
      "E-mail ou senha incorretos."
    );
  }

  await registrarAtividade(
    usuario.id,
    "LOGIN",
    "Login realizado"
  );

  return usuario;
}

async function adicionarPontos(usuarioId, pontos) {
  const quantidade = Math.floor(
    numero(pontos)
  );

  if (!usuarioId) {
    throw new Error("Usuário não informado.");
  }

  if (quantidade <= 0) {
    throw new Error(
      "Quantidade de pontos inválida."
    );
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
      UPDATE usuarios
      SET
        pontos = pontos + $1,
        pontos_ganhos = pontos_ganhos + $1,
        saldo = saldo + ($1::numeric / 1000),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [quantidade, usuarioId]
    );

    if (!resultado.rows.length) {
      throw new Error(
        "Usuário não encontrado."
      );
    }

    await cliente.query(
      `
      INSERT INTO atividades
      (usuario_id, tipo, descricao, pontos)
      VALUES ($1,'PONTOS',$2,$3)
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
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function verificarBonusIndicacao(
  cliente,
  usuarioIndicadoId
) {
  const resultado = await cliente.query(
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

  if (!resultado.rows.length) return;

  const indicado = resultado.rows[0];

  if (!indicado.indicador_id) return;

  if (
    numero(indicado.pontos) <
    CONFIG.PONTOS_INDICACAO_META
  ) {
    return;
  }

  const jaPago = await cliente.query(
    `
    SELECT id
    FROM atividades
    WHERE usuario_id = $1
      AND tipo = 'BONUS_INDICACAO'
      AND descricao = $2
    LIMIT 1
    `,
    [
      indicado.indicador_id,
      `Bônus da indicação ${usuarioIndicadoId}`
    ]
  );

  if (jaPago.rows.length) return;

  await cliente.query(
    `
    UPDATE usuarios
    SET
      pontos = pontos + $1,
      pontos_ganhos = pontos_ganhos + $1,
      saldo = saldo + ($1::numeric / 1000),
      atualizado_em = CURRENT_TIMESTAMP
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
    VALUES ($1,'BONUS_INDICACAO',$2,$3)
    `,
    [
      indicado.indicador_id,
      `Bônus da indicação ${usuarioIndicadoId}`,
      CONFIG.BONUS_INDICADOR
    ]
  );
}

async function obterIndicacoes(usuarioId) {
  if (!usuarioId) {
    throw new Error("Usuário não informado.");
  }

  const usuario = await buscarUsuarioPorId(usuarioId);

  if (!usuario) {
    throw new Error(
      "Usuário não encontrado."
    );
  }

  const resultado = await pool.query(
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

  const indicados = resultado.rows.map(item => {
    const pontos = numero(item.pontos);

    const progresso = Math.min(
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
      meta: CONFIG.PONTOS_INDICACAO_META,
      progresso,
      status:
        pontos >= CONFIG.PONTOS_INDICACAO_META
          ? "CONCLUÍDO"
          : "EM ANDAMENTO",
      bonus:
        pontos >= CONFIG.PONTOS_INDICACAO_META
          ? CONFIG.BONUS_INDICADOR
          : 0,
      criadoEm: item.criado_em
    };
  });

  return {
    codigoIndicacao: usuario.codigo_indicacao,
    codigo_indicacao: usuario.codigo_indicacao,
    meta: CONFIG.PONTOS_INDICACAO_META,
    bonus: CONFIG.BONUS_INDICADOR,
    indicados
  };
}

function obterPlanoSaque(pontos) {
  const p = Math.floor(numero(pontos));

  if (p === 2000) {
    return { pontos: 2000, valor: 2 };
  }

  if (p === 6000) {
    return { pontos: 6000, valor: 6 };
  }

  if (p === 11000) {
    return { pontos: 11000, valor: 11 };
  }

  return null;
}

async function contarSaquesHoje(
  usuarioId,
  cliente = pool
) {
  const resultado = await cliente.query(
    `
    SELECT COUNT(*)::int AS total
    FROM saques
    WHERE usuario_id = $1
      AND criado_em::date = CURRENT_DATE
    `,
    [usuarioId]
  );

  return numero(
    resultado.rows[0]?.total
  );
}

async function solicitarSaque(dados) {
  const usuarioId = texto(
    dados.usuarioId ||
    dados.usuario_id ||
    dados.id
  );

  const tipo = texto(
    dados.tipo
  ).toLowerCase();

  const destino = texto(
    dados.destino ||
    dados.chavePix ||
    dados.chave_pix ||
    dados.emailPaypal ||
    dados.email_paypal
  );

  let tipoPix = texto(
    dados.tipoPix ||
    dados.tipo_pix
  ).toUpperCase();

  if (!usuarioId) {
    throw new Error(
      "Usuário não informado."
    );
  }

  const plano = obterPlanoSaque(
    dados.pontos
  );

  if (!plano) {
    throw new Error(
      "Saque disponível somente para 2.000, 6.000 ou 11.000 pontos."
    );
  }

  if (
    tipo !== "pix" &&
    tipo !== "paypal"
  ) {
    throw new Error(
      "Tipo de saque inválido."
    );
  }

  if (!destino) {
    throw new Error(
      "Informe o destino do saque."
    );
  }

  if (tipo === "pix") {
    tipoPix =
      tipoPix ||
      identificarTipoPix(destino);

    if (!tipoPix) {
      throw new Error(
        "Não foi possível identificar o tipo da chave Pix."
      );
    }
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const usuarioResult = await cliente.query(
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

    const usuario = usuarioResult.rows[0];

    const saquesHoje =
      await contarSaquesHoje(
        usuarioId,
        cliente
      );

    if (
      saquesHoje >=
      CONFIG.LIMITE_SAQUES_DIA
    ) {
      throw new Error(
        "Limite de 2 saques por dia atingido."
      );
    }

    if (
      numero(usuario.pontos) <
      plano.pontos
    ) {
      throw new Error(
        "Você não possui pontos suficientes para este saque."
      );
    }

    const valorTotal = Number(
      plano.valor
    );

    const valorPlataforma = Number(
      (
        valorTotal *
        CONFIG.PERCENTUAL_PLATAFORMA /
        100
      ).toFixed(2)
    );

    const valorJogador = Number(
      (
        valorTotal -
        valorPlataforma
      ).toFixed(2)
    );

    await cliente.query(
      `
      UPDATE usuarios
      SET
        pontos = pontos - $1,
        saldo = GREATEST(0, saldo - $2),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        plano.pontos,
        valorTotal / 1000,
        usuarioId
      ]
    );

    const saqueResult = await cliente.query(
      `
      INSERT INTO saques
      (
        usuario_id,
        pontos,
        valor,
        valor_jogador,
        valor_plataforma,
        tipo,
        destino,
        tipo_pix,
        status
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,'PENDENTE')
      RETURNING *
      `,
      [
        usuarioId,
        plano.pontos,
        valorTotal,
        valorJogador,
        valorPlataforma,
        tipo,
        destino,
        tipo === "pix" ? tipoPix : null
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
      VALUES ($1,'SAQUE',$2,$3)
      `,
      [
        usuarioId,
        `Solicitação de saque ${saqueResult.rows[0].id}`,
        -plano.pontos
      ]
    );

    await cliente.query("COMMIT");

    return saqueResult.rows[0];
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function listarSaquesUsuario(usuarioId) {
  if (!usuarioId) {
    throw new Error(
      "Usuário não informado."
    );
  }

  const resultado = await pool.query(
    `
    SELECT
      id,
      usuario_id,
      pontos,
      valor,
      valor_jogador,
      valor_plataforma,
      tipo,
      destino,
      tipo_pix,
      status,
      motivo_recusa,
      asaas_id,
      asaas_status,
      criado_em,
      atualizado_em,
      aprovado_em,
      pago_em
    FROM saques
    WHERE usuario_id = $1
    ORDER BY criado_em DESC
    `,
    [usuarioId]
  );

  return resultado.rows;
}

function validarAdmin(req) {
  if (!ADMIN_KEY) return false;

  const chave = texto(
    req.headers["x-admin-key"]
  );

  return Boolean(
    chave &&
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

async function listarSaquesAdmin(status) {
  const parametros = [];
  let filtro = "";

  if (texto(status)) {
    parametros.push(
      texto(status).toUpperCase()
    );

    filtro = "WHERE s.status = $1";
  }

  const resultado = await pool.query(
    `
    SELECT
      s.id,
      s.usuario_id,
      s.pontos,
      s.valor,
      s.valor_jogador,
      s.valor_plataforma,
      s.tipo,
      s.destino,
      s.tipo_pix,
      s.status,
      s.motivo_recusa,
      s.asaas_id,
      s.asaas_status,
      s.criado_em,
      s.atualizado_em,
      s.aprovado_em,
      s.pago_em,
      u.nome AS usuario_nome,
      u.email AS usuario_email
    FROM saques s
    LEFT JOIN usuarios u
      ON u.id = s.usuario_id
    ${filtro}
    ORDER BY s.criado_em DESC
    LIMIT 500
    `,
    parametros
  );

  return resultado.rows;
}

async function aprovarSaque(
  saqueId,
  executarAsaas = true
) {
  if (!saqueId) {
    throw new Error(
      "Saque não informado."
    );
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
      SELECT
        s.*,
        u.nome,
        u.email
      FROM saques s
      JOIN usuarios u
        ON u.id = s.usuario_id
      WHERE s.id = $1
      FOR UPDATE
      `,
      [saqueId]
    );

    if (!resultado.rows.length) {
      throw new Error(
        "Saque não encontrado."
      );
    }

    const saque = resultado.rows[0];

    if (saque.status !== "PENDENTE") {
      throw new Error(
        `Este saque já está ${saque.status}.`
      );
    }

    await cliente.query(
      `
      UPDATE saques
      SET
        status = 'APROVADO',
        aprovado_em = CURRENT_TIMESTAMP,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [saqueId]
    );

    await cliente.query("COMMIT");

    if (
      executarAsaas &&
      saque.tipo === "pix" &&
      ASAAS_API_KEY
    ) {
      try {
        const respostaAsaas =
          await criarTransferenciaPixAsaas(
            saque
          );

        await pool.query(
          `
          UPDATE saques
          SET
            status = 'PAGO',
            asaas_id = $2,
            asaas_status = $3,
            pago_em = CURRENT_TIMESTAMP,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [
            saqueId,
            respostaAsaas.id ||
              respostaAsaas.transferId ||
              null,
            respostaAsaas.status ||
              "TRANSFER_CREATED"
          ]
        );

        return {
          saqueId,
          status: "PAGO",
          asaas: respostaAsaas
        };
      } catch (erro) {
        await pool.query(
          `
          UPDATE saques
          SET
            status = 'APROVADO',
            asaas_status = $2,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [
            saqueId,
            `ERRO: ${erro.message}`
          ]
        );

        return {
          saqueId,
          status: "APROVADO",
          aviso:
            "Saque aprovado, mas a transferência Asaas não foi concluída.",
          erro: erro.message
        };
      }
    }

    return {
      saqueId,
      status: "APROVADO"
    };
  } catch (erro) {
    try {
      await cliente.query("ROLLBACK");
    } catch {}

    throw erro;
  } finally {
    cliente.release();
  }
}

async function recusarSaque(
  saqueId,
  motivo
) {
  if (!saqueId) {
    throw new Error(
      "Saque não informado."
    );
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
      SELECT *
      FROM saques
      WHERE id = $1
      FOR UPDATE
      `,
      [saqueId]
    );

    if (!resultado.rows.length) {
      throw new Error(
        "Saque não encontrado."
      );
    }

    const saque = resultado.rows[0];

    if (saque.status !== "PENDENTE") {
      throw new Error(
        `Este saque já está ${saque.status}.`
      );
    }

    await cliente.query(
      `
      UPDATE usuarios
      SET
        pontos = pontos + $1,
        saldo = saldo + $2,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        numero(saque.pontos),
        Number(
          (
            numero(saque.valor) / 1000
          ).toFixed(2)
        ),
        saque.usuario_id
      ]
    );

    await cliente.query(
      `
      UPDATE saques
      SET
        status = 'RECUSADO',
        motivo_recusa = $2,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [
        saqueId,
        texto(motivo) ||
          "Saque recusado pelo administrador."
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
      VALUES ($1,'SAQUE_RECUSADO',$2,$3)
      `,
      [
        saque.usuario_id,
        `Saque ${saqueId} recusado`,
        numero(saque.pontos)
      ]
    );

    await cliente.query("COMMIT");

    return {
      saqueId,
      status: "RECUSADO"
    };
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function cancelarSaqueAprovado(
  saqueId,
  motivo
) {
  if (!saqueId) {
    throw new Error(
      "Saque não informado."
    );
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
      SELECT *
      FROM saques
      WHERE id = $1
      FOR UPDATE
      `,
      [saqueId]
    );

    if (!resultado.rows.length) {
      throw new Error(
        "Saque não encontrado."
      );
    }

    const saque = resultado.rows[0];

    if (saque.status !== "APROVADO") {
      throw new Error(
        "Somente saque aprovado pode ser estornado."
      );
    }

    await cliente.query(
      `
      UPDATE usuarios
      SET
        pontos = pontos + $1,
        saldo = saldo + $2,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $3
      `,
      [
        numero(saque.pontos),
        Number(
          (
            numero(saque.valor) / 1000
          ).toFixed(2)
        ),
        saque.usuario_id
      ]
    );

    await cliente.query(
      `
      UPDATE saques
      SET
        status = 'ESTORNADO',
        motivo_recusa = $2,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [
        saqueId,
        texto(motivo) ||
          "Saque estornado."
      ]
    );

    await cliente.query("COMMIT");

    return {
      saqueId,
      status: "ESTORNADO"
    };
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

async function criarMensagemSac(dados) {
  const usuarioId =
    texto(
      dados.usuarioId ||
      dados.usuario_id
    ) || null;

  const nome = texto(dados.nome);
  const email = emailNormalizado(dados.email);

  const assunto =
    texto(dados.assunto) ||
    "Atendimento";

  const mensagem = texto(
    dados.mensagem
  );

  if (!mensagem) {
    throw new Error(
      "Digite sua mensagem."
    );
  }

  const resultado = await pool.query(
    `
    INSERT INTO mensagens
    (
      usuario_id,
      nome,
      email,
      assunto,
      mensagem
    )
    VALUES ($1,$2,$3,$4,$5)
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

async function listarMensagensAdmin(status) {
  const parametros = [];
  let filtro = "";

  if (texto(status)) {
    parametros.push(
      texto(status).toUpperCase()
    );

    filtro = "WHERE m.status = $1";
  }

  const resultado = await pool.query(
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

async function responderSac(id, resposta) {
  const textoResposta = texto(resposta);

  if (!textoResposta) {
    throw new Error(
      "Digite uma resposta."
    );
  }

  const resultado = await pool.query(
    `
    UPDATE mensagens
    SET
      resposta = $2,
      status = 'RESPONDIDO',
      respondido_em = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [id, textoResposta]
  );

  if (!resultado.rows.length) {
    throw new Error(
      "Mensagem não encontrada."
    );
  }

  return resultado.rows[0];
}

async function criarPagamentoPremium(usuarioId) {
  if (!usuarioId) {
    throw new Error(
      "Usuário não informado."
    );
  }

  const usuario =
    await buscarUsuarioPorId(usuarioId);

  if (!usuario) {
    throw new Error(
      "Usuário não encontrado."
    );
  }

  if (usuario.premium) {
    return {
      premium: true,
      mensagem:
        "Você já possui Premium."
    };
  }

  const resultado = await pool.query(
    `
    INSERT INTO pagamentos_premium
    (usuario_id, valor, status)
    VALUES ($1,$2,'PENDENTE')
    RETURNING *
    `,
    [
      usuarioId,
      CONFIG.PREMIUM_VALOR
    ]
  );

  return {
    pagamento: resultado.rows[0],
    valor: CONFIG.PREMIUM_VALOR,
    status: "PENDENTE"
  };
}

async function ativarPremium(
  usuarioId,
  dias = 30
) {
  if (!usuarioId) {
    throw new Error(
      "Usuário não informado."
    );
  }

  const quantidadeDias = Math.max(
    1,
    Math.floor(
      numero(dias, 30)
    )
  );

  const resultado = await pool.query(
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
        + ($2::text || ' days')::interval,
      atualizado_em = CURRENT_TIMESTAMP
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

  await pool.query(
    `
    UPDATE pagamentos_premium
    SET
      status = 'PAGO',
      atualizado_em = CURRENT_TIMESTAMP
    WHERE usuario_id = $1
      AND status = 'PENDENTE'
    `,
    [usuarioId]
  );

  return resultado.rows[0];
}

async function statusSistema() {
  let banco = false;

  try {
    await pool.query("SELECT 1");
    banco = true;
  } catch {}

  return {
    ok: banco,
    banco: banco
      ? "PostgreSQL conectado"
      : "PostgreSQL indisponível",
    asaas: ASAAS_API_KEY
      ? "Configurado"
      : "Não configurado",
    ambienteAsaas: ASAAS_ENV,
    plataformaPercentual:
      CONFIG.PERCENTUAL_PLATAFORMA,
    limiteSaquesDia:
      CONFIG.LIMITE_SAQUES_DIA,
    planosSaque: CONFIG.SAQUES,
    premium: CONFIG.PREMIUM_VALOR
  };
}

function validarWebhookAsaas(req) {
  if (!ASAAS_WEBHOOK_TOKEN) {
    return true;
  }

  const token = texto(
    req.headers["asaas-access-token"]
  );

  return token === ASAAS_WEBHOOK_TOKEN;
}

async function processarWebhookAsaas(evento) {
  const tipo = texto(evento?.event);

  const pagamento =
    evento?.payment ||
    evento?.transfer ||
    evento?.data ||
    {};

  const id = texto(
    pagamento.id ||
    pagamento.transferId
  );

  if (!id) {
    return {
      recebido: true
    };
  }

  const status = texto(
    pagamento.status
  );

  await pool.query(
    `
    UPDATE saques
    SET
      asaas_status = $1,
      atualizado_em = CURRENT_TIMESTAMP
    WHERE asaas_id = $2
       OR id::text = $2
    `,
    [
      status || tipo || "WEBHOOK",
      id
    ]
  );

  const eventosPagos = [
    "TRANSFER_CREATED",
    "TRANSFER_PENDING",
    "TRANSFER_DONE",
    "TRANSFER_SUCCESS",
    "PIX_TRANSFER_DONE"
  ];

  if (
    eventosPagos.includes(tipo) ||
    [
      "DONE",
      "CONFIRMED",
      "RECEIVED"
    ].includes(status.toUpperCase())
  ) {
    await pool.query(
      `
      UPDATE saques
      SET
        status = 'PAGO',
        pago_em = COALESCE(
          pago_em,
          CURRENT_TIMESTAMP
        ),
        atualizado_em = CURRENT_TIMESTAMP
      WHERE asaas_id = $1
      `,
      [id]
    );
  }

  return {
    recebido: true,
    evento: tipo,
    id
  };
}

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

  const raiz = path.resolve(__dirname);

  const arquivo = path.resolve(
    raiz,
    "." + urlPath
  );

  if (
    arquivo !== raiz &&
    !arquivo.startsWith(raiz + path.sep)
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

      res.writeHead(200, {
        "Content-Type": tipo
      });

      fs.createReadStream(
        arquivo
      ).on("error", () => {
        if (!res.headersSent) {
          erroPublico(
            res,
            500,
            "Erro ao ler arquivo."
          );
        } else {
          res.destroy();
        }
      }).pipe(res);
    }
  );
}

async function processarApi(req, res) {
  let url;

  try {
    url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );
  } catch {
    return erroPublico(
      res,
      400,
      "URL inválida."
    );
  }

  const rota = url.pathname;
  const metodo = req.method;

  if (metodo === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods":
        "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Admin-Key, x-admin-key, Authorization, asaas-access-token"
    });

    return res.end();
  }

  if (
    rota === "/api/asaas/webhook" &&
    metodo === "POST"
  ) {
    if (!validarWebhookAsaas(req)) {
      return erroPublico(
        res,
        401,
        "Webhook não autorizado."
      );
    }

    try {
      const dados =
        await receberDados(req);

      const resultado =
        await processarWebhookAsaas(
          dados
        );

      return responder(
        res,
        200,
        resultado
      );
    } catch (erro) {
      console.error(
        "Erro webhook:",
        erro
      );

      return erroPublico(
        res,
        500,
        erro.message
      );
    }
  }

  if (
    rota === "/api/cadastro" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const usuario =
        await cadastrarUsuario(dados);

      return responder(
        res,
        201,
        {
          sucesso: true,
          mensagem:
            "Cadastro realizado com sucesso.",
          usuario:
            usuarioPublico(usuario)
        }
      );
    } catch (erro) {
      console.error(
        "Cadastro:",
        erro.message
      );

      return erroPublico(
        res,
        400,
        erro.message
      );
    }
  }

  if (
    rota === "/api/login" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const usuario =
        await loginUsuario(dados);

      return responder(
        res,
        200,
        {
          sucesso: true,
          mensagem:
            "Login realizado com sucesso.",
          usuario:
            usuarioPublico(usuario)
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

  if (
    rota === "/api/usuario" &&
    metodo === "GET"
  ) {
    try {
      const id = texto(
        url.searchParams.get(
          "usuarioId"
        ) ||
        url.searchParams.get(
          "usuario_id"
        ) ||
        url.searchParams.get("id")
      );

      if (!id) {
        return erroPublico(
          res,
          400,
          "Usuário não informado."
        );
      }

      const usuario =
        await buscarUsuarioPorId(id);

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
            usuarioPublico(usuario)
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

  if (
    rota === "/api/pontuacao" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const usuarioId = texto(
        dados.usuarioId ||
        dados.usuario_id ||
        dados.id
      );

      const pontos =
        numero(dados.pontos);

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
            numero(usuario.pontos),
          saldo:
            Number(
              numero(
                usuario.saldo
              ).toFixed(2)
            ),
          usuario:
            usuarioPublico(usuario)
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

  if (
    rota === "/api/indicacoes" &&
    metodo === "GET"
  ) {
    try {
      const usuarioId = texto(
        url.searchParams.get(
          "usuarioId"
        ) ||
        url.searchParams.get(
          "usuario_id"
        ) ||
        url.searchParams.get("id")
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

  if (
    rota === "/api/saque" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const saque =
        await solicitarSaque(dados);

      return responder(
        res,
        201,
        {
          sucesso: true,
          mensagem:
            "Saque solicitado com sucesso e enviado para análise.",
          saque
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

  if (
    rota === "/api/saques" &&
    metodo === "GET"
  ) {
    try {
      const usuarioId = texto(
        url.searchParams.get(
          "usuarioId"
        ) ||
        url.searchParams.get(
          "usuario_id"
        ) ||
        url.searchParams.get("id")
      );

      const saques =
        await listarSaquesUsuario(
          usuarioId
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          saques
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
          atendimento: mensagem
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

  if (
    rota === "/api/admin/sac" &&
    metodo === "GET"
  ) {
    if (!exigirAdmin(req, res)) return;

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

  if (
    rota === "/api/admin/sac/responder" &&
    metodo === "POST"
  ) {
    if (!exigirAdmin(req, res)) return;

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

  if (
    rota === "/api/premium" &&
    metodo === "POST"
  ) {
    try {
      const dados =
        await receberDados(req);

      const usuarioId = texto(
        dados.usuarioId ||
        dados.usuario_id ||
        dados.id
      );

      const resultado =
        await criarPagamentoPremium(
          usuarioId
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          ...resultado
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

  if (
    rota === "/api/admin/saques" &&
    metodo === "GET"
  ) {
    if (!exigirAdmin(req, res)) return;

    try {
      const saques =
        await listarSaquesAdmin(
          url.searchParams.get(
            "status"
          )
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          saques
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

  if (
    rota === "/api/admin/saques/aprovar" &&
    metodo === "POST"
  ) {
    if (!exigirAdmin(req, res)) return;

    try {
      const dados =
        await receberDados(req);

      const saqueId = texto(
        dados.id ||
        dados.saqueId ||
        dados.saque_id
      );

      const resultado =
        await aprovarSaque(
          saqueId,
          dados.asaas !== false
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          ...resultado
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

  if (
    rota === "/api/admin/saques/recusar" &&
    metodo === "POST"
  ) {
    if (!exigirAdmin(req, res)) return;

    try {
      const dados =
        await receberDados(req);

      const saqueId = texto(
        dados.id ||
        dados.saqueId ||
        dados.saque_id
      );

      const resultado =
        await recusarSaque(
          saqueId,
          dados.motivo
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          ...resultado
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

  if (
    rota === "/api/admin/saques/estornar" &&
    metodo === "POST"
  ) {
    if (!exigirAdmin(req, res)) return;

    try {
      const dados =
        await receberDados(req);

      const saqueId = texto(
        dados.id ||
        dados.saqueId ||
        dados.saque_id
      );

      const resultado =
        await cancelarSaqueAprovado(
          saqueId,
          dados.motivo
        );

      return responder(
        res,
        200,
        {
          sucesso: true,
          ...resultado
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

  if (
    rota === "/api/admin/premium/ativar" &&
    metodo === "POST"
  ) {
    if (!exigirAdmin(req, res)) return;

    try {
      const dados =
        await receberDados(req);

      const usuarioId = texto(
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
          mensagem: "Premium ativado.",
          usuario:
            usuarioPublico(usuario)
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

  if (
    rota === "/api/admin/status" &&
    metodo === "GET"
  ) {
    if (!exigirAdmin(req, res)) return;

    try {
      const status =
        await statusSistema();

      const usuarios =
        await pool.query(`
          SELECT COUNT(*)::int AS total
          FROM usuarios
        `);

      const saques =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE status = 'PENDENTE'
            )::int AS pendentes,
            COUNT(*) FILTER (
              WHERE status = 'PAGO'
            )::int AS pagos
          FROM saques
        `);

      const sac =
        await pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (
              WHERE status = 'ABERTO'
            )::int AS abertos
          FROM mensagens
        `);

      return responder(
        res,
        200,
        {
          sucesso: true,
          sistema: status,
          usuarios:
            usuarios.rows[0],
          saques:
            saques.rows[0],
          sac:
            sac.rows[0]
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

  if (rota.startsWith("/api/")) {
    return erroPublico(
      res,
      404,
      "Rota da API não encontrada."
    );
  }

  return servirArquivo(
    req,
    res
  );
}

const servidor = http.createServer(
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

async function iniciar() {
  try {
    console.log(
      "Conectando ao PostgreSQL..."
    );

    await pool.query("SELECT 1");

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

    await testarAsaas();

    servidor.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `QuizUp funcionando na porta ${PORT}`
        );

        console.log(
          `Ambiente Asaas: ${ASAAS_ENV}`
        );

        console.log(
          "Saque: 2.000 / 6.000 / 11.000 pontos"
        );

        console.log(
          `Percentual da plataforma: ${CONFIG.PERCENTUAL_PLATAFORMA}%`
        );

        console.log(
          `Limite diário de saques: ${CONFIG.LIMITE_SAQUES_DIA}`
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

async function encerrar() {
  console.log(
    "Encerrando QuizUp..."
  );

  servidor.close(
    async () => {
      try {
        await pool.end();
      } finally {
        process.exit(0);
      }
    }
  );
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
