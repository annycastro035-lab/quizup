const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 10000);
const HOST = "0.0.0.0";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.DB_URL;

if (!DATABASE_URL) {
  console.error("ERRO: DATABASE_URL ou DB_URL não configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5
});

const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

/* =========================================================
   RESPOSTAS
========================================================= */

function responderJSON(res, status, dados) {
  if (res.headersSent) return;

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(dados));
}

function responderTexto(
  res,
  status,
  texto,
  tipo = "text/plain; charset=utf-8"
) {
  if (res.headersSent) return;

  res.writeHead(status, {
    "Content-Type": tipo,
    "Cache-Control": "no-store"
  });

  res.end(texto);
}

/* =========================================================
   BODY
========================================================= */

function lerBody(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";
    let finalizado = false;

    req.on("data", parte => {
      corpo += parte.toString();

      if (corpo.length > 2_000_000) {
        finalizado = true;
        reject(new Error("Requisição muito grande."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (finalizado) return;

      if (!corpo.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(corpo));
      } catch (erro) {
        reject(new Error("JSON inválido."));
      }
    });

    req.on("error", erro => {
      if (!finalizado) {
        reject(erro);
      }
    });
  });
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function limparNome(nome) {
  return String(nome || "")
    .trim()
    .replace(/\s+/g, " ");
}

function senhaHash(senha) {
  return crypto
    .createHash("sha256")
    .update(String(senha))
    .digest("hex");
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizarEmail(email)
  );
}

function gerarCodigoIndicacao(nome, email) {
  const base =
    limparNome(nome) +
    normalizarEmail(email);

  const texto = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const hash = crypto
    .createHash("sha256")
    .update(
      texto +
      Date.now() +
      Math.random()
    )
    .digest("hex")
    .toUpperCase();

  const combinado = texto + hash;

  return combinado
    .slice(0, 8)
    .padEnd(8, "X");
}

function usuarioPublico(usuario) {
  if (!usuario) return null;

  return {
    id: Number(usuario.id),
    nome: usuario.nome,
    email: usuario.email,
    codigoIndicacao:
      usuario.codigo_indicacao,
    pontos: Number(usuario.pontos || 0),
    saldo: Number(usuario.saldo || 0),
    premium: Boolean(usuario.premium),
    criadoEm: usuario.criado_em
  };
}

/* =========================================================
   BANCO
========================================================= */

async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jogadores (
      id BIGSERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      codigo_indicacao TEXT UNIQUE NOT NULL,
      indicador_id BIGINT
        REFERENCES jogadores(id)
        ON DELETE SET NULL,
      pontos BIGINT NOT NULL DEFAULT 0,
      saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
      premium BOOLEAN NOT NULL DEFAULT FALSE,
      bonus_indicacao_pago BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS saques (
      id BIGSERIAL PRIMARY KEY,
      jogador_id BIGINT NOT NULL
        REFERENCES jogadores(id)
        ON DELETE CASCADE,
      pontos BIGINT NOT NULL,
      valor NUMERIC(12,2) NOT NULL,
      tipo TEXT NOT NULL,
      chave TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      valor_plataforma NUMERIC(12,2)
        NOT NULL DEFAULT 0,
      valor_usuario NUMERIC(12,2)
        NOT NULL DEFAULT 0,
      observacao TEXT,
      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS atividades (
      id BIGSERIAL PRIMARY KEY,
      jogador_id BIGINT
        REFERENCES jogadores(id)
        ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      pontos BIGINT NOT NULL DEFAULT 0,
      descricao TEXT,
      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS indicacoes (
      id BIGSERIAL PRIMARY KEY,
      indicador_id BIGINT NOT NULL
        REFERENCES jogadores(id)
        ON DELETE CASCADE,
      indicado_id BIGINT NOT NULL
        REFERENCES jogadores(id)
        ON DELETE CASCADE,
      progresso BIGINT NOT NULL DEFAULT 0,
      bonus_pago BOOLEAN NOT NULL DEFAULT FALSE,
      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),
      UNIQUE(indicador_id, indicado_id)
    );

    CREATE TABLE IF NOT EXISTS mensagens (
      id BIGSERIAL PRIMARY KEY,
      jogador_id BIGINT NOT NULL
        REFERENCES jogadores(id)
        ON DELETE CASCADE,
      assunto TEXT,
      mensagem TEXT NOT NULL,
      resposta TEXT,
      status TEXT NOT NULL DEFAULT 'ABERTA',
      criado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    );
  `);
}

/* =========================================================
   USUÁRIOS
========================================================= */

async function buscarUsuarioId(id) {
  const resultado = await pool.query(
    `
    SELECT *
    FROM jogadores
    WHERE id = $1
    `,
    [id]
  );

  return resultado.rows[0] || null;
}

async function buscarUsuarioEmail(email) {
  const resultado = await pool.query(
    `
    SELECT *
    FROM jogadores
    WHERE email = $1
    `,
    [normalizarEmail(email)]
  );

  return resultado.rows[0] || null;
}

async function buscarUsuarioCodigo(codigo) {
  const resultado = await pool.query(
    `
    SELECT *
    FROM jogadores
    WHERE codigo_indicacao = $1
    `,
    [
      String(codigo || "")
        .trim()
        .toUpperCase()
    ]
  );

  return resultado.rows[0] || null;
}

/* =========================================================
   ATIVIDADES
========================================================= */

async function registrarAtividade(
  client,
  jogadorId,
  tipo,
  pontos,
  descricao
) {
  await client.query(
    `
    INSERT INTO atividades
      (
        jogador_id,
        tipo,
        pontos,
        descricao
      )
    VALUES
      ($1, $2, $3, $4)
    `,
    [
      jogadorId,
      tipo,
      pontos || 0,
      descricao || null
    ]
  );
}

/* =========================================================
   INDICAÇÕES
========================================================= */

async function atualizarIndicacao(
  client,
  indicadoId
) {
  const resultado = await client.query(
    `
    SELECT
      i.id,
      i.indicador_id,
      i.bonus_pago,
      j.pontos
    FROM indicacoes i
    JOIN jogadores j
      ON j.id = i.indicado_id
    WHERE i.indicado_id = $1
    FOR UPDATE
    `,
    [indicadoId]
  );

  if (!resultado.rows.length) {
    return;
  }

  const indicacao = resultado.rows[0];

  const progresso = Math.min(
    Number(indicacao.pontos || 0),
    300
  );

  await client.query(
    `
    UPDATE indicacoes
    SET progresso = $1
    WHERE id = $2
    `,
    [
      progresso,
      indicacao.id
    ]
  );

  if (
    progresso >= 300 &&
    !indicacao.bonus_pago
  ) {
    await client.query(
      `
      UPDATE jogadores
      SET
        pontos = pontos + 50,
        saldo = saldo + 0.05
      WHERE id = $1
      `,
      [indicacao.indicador_id]
    );

    await client.query(
      `
      UPDATE indicacoes
      SET
        progresso = 300,
        bonus_pago = TRUE
      WHERE id = $1
      `,
      [indicacao.id]
    );

    await registrarAtividade(
      client,
      indicacao.indicador_id,
      "BONUS_INDICACAO",
      50,
      "Bônus de 50 pontos por indicação concluída."
    );
  }
}

/* =========================================================
   ADICIONAR PONTOS
========================================================= */

async function adicionarPontos(
  jogadorId,
  pontos,
  descricao = "Pontos ganhos no QuizUp"
) {
  pontos = Math.floor(
    Number(pontos)
  );

  if (
    !Number.isFinite(pontos) ||
    pontos <= 0
  ) {
    throw new Error(
      "Quantidade de pontos inválida."
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const atualizacao =
      await client.query(
        `
        UPDATE jogadores
        SET
          pontos = pontos + $1,
          saldo =
            saldo + ($1::numeric / 1000)
        WHERE id = $2
        RETURNING id
        `,
        [
          pontos,
          jogadorId
        ]
      );

    if (!atualizacao.rows.length) {
      throw new Error(
        "Usuário não encontrado."
      );
    }

    await registrarAtividade(
      client,
      jogadorId,
      "PONTOS",
      pontos,
      descricao
    );

    await atualizarIndicacao(
      client,
      jogadorId
    );

    await client.query("COMMIT");
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}

/* =========================================================
   CADASTRO
========================================================= */

async function cadastrar(req, res) {
  const dados =
    await lerBody(req);

  const nome =
    limparNome(dados.nome);

  const email =
    normalizarEmail(dados.email);

  const senha =
    String(dados.senha || "");

  const codigo =
    String(
      dados.codigo ||
      dados.codigoIndicacao ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    !nome ||
    !email ||
    !senha
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "Nome, email e senha são obrigatórios."
      }
    );
  }

  if (!emailValido(email)) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro: "Email inválido."
      }
    );
  }

  if (senha.length < 6) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "A senha deve ter pelo menos 6 caracteres."
      }
    );
  }

  const existente =
    await buscarUsuarioEmail(
      email
    );

  if (existente) {
    return responderJSON(
      res,
      409,
      {
        sucesso: false,
        erro:
          "Este email já está cadastrado."
      }
    );
  }

  let indicador = null;

  if (codigo) {
    indicador =
      await buscarUsuarioCodigo(
        codigo
      );

    if (!indicador) {
      return responderJSON(
        res,
        400,
        {
          sucesso: false,
          erro:
            "Código de indicação inválido."
        }
      );
    }
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    let novoCodigo;

    for (
      let tentativa = 0;
      tentativa < 20;
      tentativa++
    ) {
      novoCodigo =
        gerarCodigoIndicacao(
          nome,
          email + tentativa
        );

      const existe =
        await client.query(
          `
          SELECT id
          FROM jogadores
          WHERE codigo_indicacao = $1
          `,
          [novoCodigo]
        );

      if (!existe.rows.length) {
        break;
      }
    }

    const resultado =
      await client.query(
        `
        INSERT INTO jogadores
          (
            nome,
            email,
            senha,
            codigo_indicacao,
            indicador_id
          )
        VALUES
          ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          nome,
          email,
          senhaHash(senha),
          novoCodigo,
          indicador
            ? indicador.id
            : null
        ]
      );

    const novoUsuario =
      resultado.rows[0];

    if (indicador) {
      await client.query(
        `
        INSERT INTO indicacoes
          (
            indicador_id,
            indicado_id,
            progresso
          )
        VALUES
          ($1, $2, 0)
        ON CONFLICT
          (indicador_id, indicado_id)
        DO NOTHING
        `,
        [
          indicador.id,
          novoUsuario.id
        ]
      );
    }

    await client.query(
      "COMMIT"
    );

    return responderJSON(
      res,
      201,
      {
        sucesso: true,
        mensagem:
          "Cadastro realizado com sucesso.",
        usuario:
          usuarioPublico(
            novoUsuario
          )
      }
    );
  } catch (erro) {
    await client.query(
      "ROLLBACK"
    );

    throw erro;
  } finally {
    client.release();
  }
}

/* =========================================================
   LOGIN
========================================================= */

async function login(req, res) {
  const dados =
    await lerBody(req);

  const email =
    normalizarEmail(
      dados.email
    );

  const senha =
    String(
      dados.senha || ""
    );

  const usuario =
    await buscarUsuarioEmail(
      email
    );

  if (
    !usuario ||
    usuario.senha !==
      senhaHash(senha)
  ) {
    return responderJSON(
      res,
      401,
      {
        sucesso: false,
        erro:
          "Email ou senha incorretos."
      }
    );
  }

  return responderJSON(
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
}

/* =========================================================
   PONTUAÇÃO
========================================================= */

async function pontuacao(req, res) {
  const dados =
    await lerBody(req);

  const usuarioId =
    Number(
      dados.usuarioId ||
      dados.id
    );

  const pontos =
    Number(dados.pontos);

  if (
    !Number.isInteger(
      usuarioId
    ) ||
    !Number.isFinite(pontos) ||
    pontos <= 0
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "Dados de pontuação inválidos."
      }
    );
  }

  if (pontos > 100) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "Quantidade de pontos inválida."
      }
    );
  }

  const usuario =
    await buscarUsuarioId(
      usuarioId
    );

  if (!usuario) {
    return responderJSON(
      res,
      404,
      {
        sucesso: false,
        erro:
          "Usuário não encontrado."
      }
    );
  }

  await adicionarPontos(
    usuarioId,
    pontos
  );

  const atualizado =
    await buscarUsuarioId(
      usuarioId
    );

  return responderJSON(
    res,
    200,
    {
      sucesso: true,
      usuario:
        usuarioPublico(
          atualizado
        )
    }
  );
}

/* =========================================================
   INDICAÇÕES
========================================================= */

async function indicacoes(req, res) {
  const url =
    new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

  const usuarioId =
    Number(
      url.searchParams.get(
        "usuarioId"
      ) ||
      url.searchParams.get("id")
    );

  if (
    !Number.isInteger(
      usuarioId
    )
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "usuarioId inválido."
      }
    );
  }

  const usuario =
    await buscarUsuarioId(
      usuarioId
    );

  if (!usuario) {
    return responderJSON(
      res,
      404,
      {
        sucesso: false,
        erro:
          "Usuário não encontrado."
      }
    );
  }

  const resultado =
    await pool.query(
      `
      SELECT
        i.id,
        i.progresso,
        i.bonus_pago,
        j.nome,
        j.email,
        j.pontos
      FROM indicacoes i
      JOIN jogadores j
        ON j.id = i.indicado_id
      WHERE i.indicador_id = $1
      ORDER BY i.criado_em DESC
      `,
      [usuarioId]
    );

  return responderJSON(
    res,
    200,
    {
      sucesso: true,

      codigoIndicacao:
        usuario.codigo_indicacao,

      indicacoes:
        resultado.rows.map(
          item => {
            const progresso =
              Math.min(
                Number(
                  item.pontos || 0
                ),
                300
              );

            return {
              id: Number(item.id),
              nome: item.nome,
              email: item.email,

              pontos:
                Number(
                  item.pontos || 0
                ),

              progresso,

              percentual:
                Math.min(
                  100,
                  Math.round(
                    (progresso /
                      300) *
                    100
                  )
                ),

              status:
                item.bonus_pago
                  ? "CONCLUÍDO"
                  : "EM ANDAMENTO",

              bonusPago:
                Boolean(
                  item.bonus_pago
                )
            };
          }
        )
    }
  );
}

/* =========================================================
   SAQUES
   2.000 / 6.000 / 11.000
   30% PLATAFORMA
   70% USUÁRIO
========================================================= */

function calcularSaque(pontos) {
  pontos =
    Number(pontos);

  if (
    pontos >= 11000
  ) {
    return {
      pontos: 11000,
      valor: 11
    };
  }

  if (
    pontos >= 6000
  ) {
    return {
      pontos: 6000,
      valor: 6
    };
  }

  if (
    pontos >= 2000
  ) {
    return {
      pontos: 2000,
      valor: 2
    };
  }

  return null;
}

async function saquesHoje(
  usuarioId
) {
  const resultado =
    await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM saques
      WHERE jogador_id = $1
      AND criado_em >= CURRENT_DATE
      AND criado_em <
        CURRENT_DATE +
        INTERVAL '1 day'
      `,
      [usuarioId]
    );

  return Number(
    resultado.rows[0]?.total || 0
  );
}

async function saque(req, res) {
  const dados =
    await lerBody(req);

  const usuarioId =
    Number(
      dados.usuarioId ||
      dados.id
    );

  const tipo =
    String(
      dados.tipo || ""
    )
      .trim()
      .toLowerCase();

  const chave =
    String(
      dados.chave ||
      dados.pix ||
      dados.emailPaypal ||
      ""
    ).trim();

  const pontosSolicitados =
    Number(
      dados.pontos ||
      dados.valorPontos ||
      0
    );

  if (
    !Number.isInteger(
      usuarioId
    ) ||
    !chave
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "Informe usuário e chave de recebimento."
      }
    );
  }

  if (
    tipo !== "pix" &&
    tipo !== "paypal"
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "Tipo de saque deve ser Pix ou PayPal."
      }
    );
  }

  const usuario =
    await buscarUsuarioId(
      usuarioId
    );

  if (!usuario) {
    return responderJSON(
      res,
      404,
      {
        sucesso: false,
        erro:
          "Usuário não encontrado."
      }
    );
  }

  const totalHoje =
    await saquesHoje(
      usuarioId
    );

  if (totalHoje >= 2) {
    return responderJSON(
      res,
      429,
      {
        sucesso: false,
        erro:
          "Limite de 2 saques por dia atingido."
      }
    );
  }

  const saldoPontos =
    Number(
      usuario.pontos || 0
    );

  let pontosParaSaque =
    pontosSolicitados > 0
      ? Math.min(
          pontosSolicitados,
          saldoPontos
        )
      : saldoPontos;

  const calculado =
    calcularSaque(
      pontosParaSaque
    );

  if (!calculado) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "O saque mínimo é de 2.000 pontos."
      }
    );
  }

  if (
    calculado.pontos >
    saldoPontos
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "Saldo de pontos insuficiente."
      }
    );
  }

  const valorPlataforma =
    Number(
      (
        calculado.valor *
        0.30
      ).toFixed(2)
    );

  const valorUsuario =
    Number(
      (
        calculado.valor -
        valorPlataforma
      ).toFixed(2)
    );

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const bloqueado =
      await client.query(
        `
        SELECT *
        FROM jogadores
        WHERE id = $1
        FOR UPDATE
        `,
        [usuarioId]
      );

    const atual =
      bloqueado.rows[0];

    if (
      !atual ||
      Number(atual.pontos) <
        calculado.pontos
    ) {
      await client.query(
        "ROLLBACK"
      );

      return responderJSON(
        res,
        400,
        {
          sucesso: false,
          erro:
            "Saldo de pontos insuficiente."
        }
      );
    }

    await client.query(
      `
      UPDATE jogadores
      SET
        pontos =
          pontos - $1,
        saldo =
          GREATEST(
            0,
            saldo -
            ($1::numeric / 1000)
          )
      WHERE id = $2
      `,
      [
        calculado.pontos,
        usuarioId
      ]
    );

    const resultado =
      await client.query(
        `
        INSERT INTO saques
          (
            jogador_id,
            pontos,
            valor,
            tipo,
            chave,
            status,
            valor_plataforma,
            valor_usuario,
            observacao
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            'PENDENTE',
            $6,
            $7,
            $8
          )
        RETURNING *
        `,
        [
          usuarioId,
          calculado.pontos,
          calculado.valor,
          tipo,
          chave,
          valorPlataforma,
          valorUsuario,
          "Aguardando análise administrativa."
        ]
      );

    await registrarAtividade(
      client,
      usuarioId,
      "SAQUE",
      -calculado.pontos,
      "Saque solicitado."
    );

    await client.query(
      "COMMIT"
    );

    return responderJSON(
      res,
      200,
      {
        sucesso: true,

        mensagem:
          "Saque enviado para análise administrativa.",

        saque: {
          id:
            Number(
              resultado.rows[0].id
            ),

          pontos:
            calculado.pontos,

          valor:
            calculado.valor,

          valorPlataforma,

          valorUsuario,

          tipo,

          status:
            "PENDENTE"
        }
      }
    );
  } catch (erro) {
    await client.query(
      "ROLLBACK"
    );

    throw erro;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAC
========================================================= */

async function sac(req, res) {
  const dados =
    await lerBody(req);

  const usuarioId =
    Number(
      dados.usuarioId ||
      dados.id
    );

  const mensagem =
    String(
      dados.mensagem || ""
    ).trim();

  const assunto =
    String(
      dados.assunto ||
      "Atendimento"
    ).trim();

  if (
    !Number.isInteger(
      usuarioId
    ) ||
    !mensagem
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "Informe usuário e mensagem."
      }
    );
  }

  const usuario =
    await buscarUsuarioId(
      usuarioId
    );

  if (!usuario) {
    return responderJSON(
      res,
      404,
      {
        sucesso: false,
        erro:
          "Usuário não encontrado."
      }
    );
  }

  const resultado =
    await pool.query(
      `
      INSERT INTO mensagens
        (
          jogador_id,
          assunto,
          mensagem
        )
      VALUES
        ($1, $2, $3)
      RETURNING *
      `,
      [
        usuarioId,
        assunto,
        mensagem
      ]
    );

  return responderJSON(
    res,
    200,
    {
      sucesso: true,
      mensagem:
        "Mensagem enviada ao SAC.",
      atendimento:
        resultado.rows[0]
    }
  );
}

/* =========================================================
   PREMIUM
========================================================= */

async function premium(req, res) {
  const dados =
    await lerBody(req);

  const usuarioId =
    Number(
      dados.usuarioId ||
      dados.id
    );

  if (
    !Number.isInteger(
      usuarioId
    )
  ) {
    return responderJSON(
      res,
      400,
      {
        sucesso: false,
        erro:
          "usuarioId inválido."
      }
    );
  }

  const usuario =
    await buscarUsuarioId(
      usuarioId
    );

  if (!usuario) {
    return responderJSON(
      res,
      404,
      {
        sucesso: false,
        erro:
          "Usuário não encontrado."
      }
    );
  }

  /*
    ATENÇÃO:
    Esta rota apenas marca Premium como ativo.
    O pagamento real deve ser confirmado
    pelo gateway antes dessa alteração
    em produção.
  */

  await pool.query(
    `
    UPDATE jogadores
    SET premium = TRUE
    WHERE id = $1
    `,
    [usuarioId]
  );

  const atualizado =
    await buscarUsuarioId(
      usuarioId
    );

  return responderJSON(
    res,
    200,
    {
      sucesso: true,

      mensagem:
        "Premium ativado.",

      plano: {
        nome:
          "QuizUp Premium",

        valor:
          9.90,

        periodicidade:
          "mensal"
      },

      usuario:
        usuarioPublico(
          atualizado
        )
    }
  );
}

/* =========================================================
   STATUS
========================================================= */

async function status(req, res) {
  let banco = "ok";

  try {
    await pool.query(
      "SELECT 1"
    );
  } catch (erro) {
    banco = "erro";
  }

  return responderJSON(
    res,
    200,
    {
      sucesso:
        banco === "ok",

      status:
        "QuizUp funcionando",

      database:
        banco,

      port:
        PORT,

      horario:
        new Date().toISOString()
    }
  );
}

/* =========================================================
   ARQUIVOS
========================================================= */

function servirArquivo(
  req,
  res,
  pathname
) {
  let arquivo;

  try {
    arquivo =
      decodeURIComponent(
        pathname
      );
  } catch (erro) {
    return responderTexto(
      res,
      400,
      "URL inválida."
    );
  }

  if (
    arquivo === "/" ||
    arquivo === ""
  ) {
    arquivo =
      "/index.html";
  }

  const caminho =
    path.resolve(
      ROOT,
      "." + arquivo
    );

  const rootNormalizado =
    path.resolve(ROOT);

  if (
    caminho !== rootNormalizado &&
    !caminho.startsWith(
      rootNormalizado +
      path.sep
    )
  ) {
    return responderTexto(
      res,
      403,
      "Acesso negado."
    );
  }

  fs.stat(
    caminho,
    (erro, info) => {
      if (
        erro ||
        !info.isFile()
      ) {
        /*
          Rotas sem extensão podem
          retornar o index.html.
        */

        if (
          !path.extname(
            arquivo
          )
        ) {
          const index =
            path.join(
              ROOT,
              "index.html"
            );

          return fs.readFile(
            index,
            (erroIndex, dados) => {
              if (erroIndex) {
                return responderTexto(
                  res,
                  404,
                  "index.html não encontrado."
                );
              }

              if (req.method === "HEAD") {
                res.writeHead(
                  200,
                  {
                    "Content-Type":
                      MIME[".html"],
                    "Cache-Control":
                      "no-cache"
                  }
                );

                return res.end();
              }

              res.writeHead(
                200,
                {
                  "Content-Type":
                    MIME[".html"],
                  "Cache-Control":
                    "no-cache"
                }
              );

              res.end(
                dados
              );
            }
          );
        }

        return responderTexto(
          res,
          404,
          "Arquivo não encontrado."
        );
      }

      const extensao =
        path.extname(
          caminho
        ).toLowerCase();

      const tipo =
        MIME[extensao] ||
        "application/octet-stream";

      if (
        req.method === "HEAD"
      ) {
        res.writeHead(
          200,
          {
            "Content-Type":
              tipo,
            "Cache-Control":
              extensao === ".html"
                ? "no-cache"
                : "public, max-age=3600"
          }
        );

        return res.end();
      }

      res.writeHead(
        200,
        {
          "Content-Type":
            tipo,

          "Cache-Control":
            extensao === ".html"
              ? "no-cache"
              : "public, max-age=3600"
        }
      );

      fs.createReadStream(
        caminho
      ).on(
        "error",
        erroStream => {
          console.error(
            "Erro ao ler arquivo:",
            erroStream
          );

          if (
            !res.headersSent
          ) {
            responderTexto(
              res,
              500,
              "Erro ao carregar arquivo."
            );
          } else {
            res.destroy();
          }
        }
      ).pipe(res);
    }
  );
}

/* =========================================================
   API
========================================================= */

async function processarAPI(
  req,
  res,
  pathname
) {
  if (
    req.method === "POST" &&
    pathname === "/api/cadastro"
  ) {
    return cadastrar(
      req,
      res
    );
  }

  if (
    req.method === "POST" &&
    pathname === "/api/login"
  ) {
    return login(
      req,
      res
    );
  }

  if (
    req.method === "POST" &&
    pathname === "/api/pontuacao"
  ) {
    return pontuacao(
      req,
      res
    );
  }

  if (
    req.method === "GET" &&
    pathname === "/api/indicacoes"
  ) {
    return indicacoes(
      req,
      res
    );
  }

  if (
    req.method === "POST" &&
    pathname === "/api/saque"
  ) {
    return saque(
      req,
      res
    );
  }

  if (
    req.method === "POST" &&
    pathname === "/api/sac"
  ) {
    return sac(
      req,
      res
    );
  }

  if (
    req.method === "POST" &&
    pathname === "/api/premium"
  ) {
    return premium(
      req,
      res
    );
  }

  if (
    req.method === "GET" &&
    pathname === "/api/status"
  ) {
    return status(
      req,
      res
    );
  }

  return responderJSON(
    res,
    404,
    {
      sucesso: false,
      erro:
        "Rota da API não encontrada."
    }
  );
}

/* =========================================================
   SERVIDOR HTTP
========================================================= */

const servidor =
  http.createServer(
    async (req, res) => {
      try {
        const url =
          new URL(
            req.url,
            `http://${req.headers.host || "localhost"}`
          );

        const pathname =
          url.pathname;

        if (
          pathname.startsWith(
            "/api/"
          )
        ) {
          await processarAPI(
            req,
            res,
            pathname
          );

          return;
        }

        if (
          req.method !== "GET" &&
          req.method !== "HEAD"
        ) {
          return responderTexto(
            res,
            405,
            "Método não permitido."
          );
        }

        servirArquivo(
          req,
          res,
          pathname
        );
      } catch (erro) {
        console.error(
          "ERRO NA REQUISIÇÃO:",
          erro
        );

        if (
          !res.headersSent
        ) {
          responderJSON(
            res,
            500,
            {
              sucesso: false,
              erro:
                "Erro interno do servidor."
            }
          );
        }
      }
    }
  );

/* =========================================================
   ERROS DO NODE
========================================================= */

process.on(
  "unhandledRejection",
  erro => {
    console.error(
      "UnhandledRejection:",
      erro
    );
  }
);

process.on(
  "uncaughtException",
  erro => {
    console.error(
      "UncaughtException:",
      erro
    );
  }
);

/* =========================================================
   ENCERRAMENTO
========================================================= */

async function encerrarServidor(
  sinal
) {
  console.log(
    `${sinal} recebido. Encerrando QuizUp...`
  );

  servidor.close(
    async () => {
      try {
        await pool.end();

        console.log(
          "Banco de dados desconectado."
        );

        process.exit(0);
      } catch (erro) {
        console.error(
          "Erro ao encerrar:",
          erro
        );

        process.exit(1);
      }
    }
  );
}

process.on(
  "SIGTERM",
  () => encerrarServidor("SIGTERM")
);

process.on(
  "SIGINT",
  () => encerrarServidor("SIGINT")
);

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function iniciar() {
  try {
    console.log(
      "Iniciando QuizUp..."
    );

    console.log(
      `Porta configurada: ${PORT}`
    );

    console.log(
      "Testando conexão com PostgreSQL..."
    );

    await pool.query(
      "SELECT 1"
    );

    console.log(
      "Banco de dados conectado."
    );

    console.log(
      "Criando/verificando tabelas..."
    );

    await criarTabelas();

    console.log(
      "Tabelas verificadas com sucesso."
    );

    servidor.listen(
      PORT,
      HOST,
      () => {
        console.log(
          `QuizUp funcionando na porta ${PORT}`
        );

        console.log(
          `Servidor escutando em ${HOST}:${PORT}`
        );
      }
    );
  } catch (erro) {
    console.error(
      "ERRO AO INICIAR O QUIZUP:"
    );

    console.error(
      erro
    );

    try {
      await pool.end();
    } catch (_) {}

    process.exit(1);
  }
}

iniciar();
