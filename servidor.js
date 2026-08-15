const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORTA = process.env.PORT || 3000;

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const ADMIN_PERCENTUAL = Number(
  process.env.ADMIN_PERCENTUAL || 20
);

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const BONUS_INDICACAO = 50;
const PONTOS_META_INDICACAO = 300;

// ======================================================
// BANCO
// ======================================================

if (!DATABASE_URL) {
  console.error('ERRO: DATABASE_URL não configurada.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

// ======================================================
// UTILIDADES
// ======================================================

function responder(res, status, dados) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  });

  res.end(JSON.stringify(dados));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';

    req.on('data', parte => {
      corpo += parte;

      if (corpo.length > 1024 * 1024) {
        reject(new Error('Requisição muito grande.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!corpo) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(corpo));
      } catch (erro) {
        reject(new Error('JSON inválido.'));
      }
    });

    req.on('error', reject);
  });
}

function escaparHTML(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hash(valor) {
  return crypto
    .createHash('sha256')
    .update(String(valor || ''))
    .digest('hex');
}

function gerarCodigoIndicacao() {
  const parte = crypto
    .randomBytes(5)
    .toString('hex')
    .toUpperCase();

  return `QU${parte}`;
}

// ======================================================
// CÓDIGO DE INDICAÇÃO ÚNICO
// ======================================================

async function gerarCodigoIndicacaoUnico(cliente = pool) {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const codigo = gerarCodigoIndicacao();

    const resultado = await cliente.query(
      `
        SELECT id
        FROM jogadores
        WHERE codigo_indicacao = $1
        LIMIT 1
      `,
      [codigo]
    );

    if (resultado.rows.length === 0) {
      return codigo;
    }
  }

  throw new Error(
    'Não foi possível gerar um código de indicação único.'
  );
}

// ======================================================
// INICIALIZAR BANCO
// ======================================================

async function inicializarBanco() {
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL não configurada.'
    );
  }

  // ----------------------------------------------------
  // JOGADORES
  // ----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS jogadores (
      id SERIAL PRIMARY KEY,

      nome TEXT NOT NULL,

      cpf TEXT,

      email TEXT UNIQUE NOT NULL,

      senha TEXT NOT NULL,

      codigo_indicacao TEXT UNIQUE,

      pontos_jogo INTEGER NOT NULL DEFAULT 0,

      pontos_patrocinado INTEGER NOT NULL DEFAULT 0,

      acertos INTEGER NOT NULL DEFAULT 0,

      erros INTEGER NOT NULL DEFAULT 0,

      tentativas_saque INTEGER NOT NULL DEFAULT 0,

      saques_aprovados INTEGER NOT NULL DEFAULT 0,

      saques_recusados INTEGER NOT NULL DEFAULT 0,

      total_sacado_centavos INTEGER NOT NULL DEFAULT 0,

      indicador_id INTEGER,

      indicacao_concluida BOOLEAN NOT NULL DEFAULT FALSE,

      bonus_indicacao_recebido BOOLEAN NOT NULL DEFAULT FALSE,

      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ----------------------------------------------------
  // SAQUES
  // ----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saques (
      id SERIAL PRIMARY KEY,

      jogador_id INTEGER NOT NULL
        REFERENCES jogadores(id)
        ON DELETE CASCADE,

      email TEXT NOT NULL,

      pontos INTEGER NOT NULL,

      valor_centavos INTEGER NOT NULL,

      metodo TEXT NOT NULL,

      chave TEXT NOT NULL,

      status TEXT NOT NULL DEFAULT 'PENDENTE',

      motivo_recusa TEXT,

      admin_percentual NUMERIC(5,2)
        NOT NULL DEFAULT 20,

      valor_admin_centavos INTEGER
        NOT NULL DEFAULT 0,

      valor_jogador_centavos INTEGER
        NOT NULL DEFAULT 0,

      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      analisado_em TIMESTAMP
    );
  `);

  // ----------------------------------------------------
  // ATIVIDADES
  // ----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS atividades (
      id SERIAL PRIMARY KEY,

      jogador_id INTEGER
        REFERENCES jogadores(id)
        ON DELETE CASCADE,

      tipo TEXT NOT NULL,

      pontos INTEGER NOT NULL DEFAULT 0,

      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ----------------------------------------------------
  // INDICAÇÕES
  // ----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS indicacoes (
      id SERIAL PRIMARY KEY,

      indicador_id INTEGER NOT NULL
        REFERENCES jogadores(id)
        ON DELETE CASCADE,

      indicado_id INTEGER NOT NULL
        REFERENCES jogadores(id)
        ON DELETE CASCADE,

      pontos_indicado INTEGER NOT NULL DEFAULT 0,

      status TEXT NOT NULL DEFAULT 'PENDENTE',

      bonus INTEGER NOT NULL DEFAULT 50,

      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      concluido_em TIMESTAMP
    );
  `);

  // ----------------------------------------------------
  // ATUALIZAÇÕES DE BANCO ANTIGO
  // ----------------------------------------------------

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS codigo_indicacao TEXT;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS pontos_patrocinado INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS tentativas_saque INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS saques_aprovados INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS saques_recusados INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS total_sacado_centavos INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS indicador_id INTEGER;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS indicacao_concluida BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS bonus_indicacao_recebido BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE indicacoes
    ADD COLUMN IF NOT EXISTS pontos_indicado INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE indicacoes
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDENTE';
  `);

  await pool.query(`
    ALTER TABLE indicacoes
    ADD COLUMN IF NOT EXISTS bonus INTEGER NOT NULL DEFAULT 50;
  `);

  // ----------------------------------------------------
  // ÍNDICES
  // ----------------------------------------------------

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_jogadores_codigo_indicacao
    ON jogadores(codigo_indicacao)
    WHERE codigo_indicacao IS NOT NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_jogadores_email
    ON jogadores(email);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_saques_status
    ON saques(status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_indicacoes_indicador
    ON indicacoes(indicador_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS
    idx_indicacoes_indicado
    ON indicacoes(indicado_id);
  `);

  // ----------------------------------------------------
  // CORRIGIR BÔNUS
  // ----------------------------------------------------

  await pool.query(`
    UPDATE indicacoes
    SET bonus = 50
    WHERE bonus IS NULL OR bonus <> 50;
  `);

  // ----------------------------------------------------
  // GERAR CÓDIGOS PARA JOGADORES ANTIGOS
  // ----------------------------------------------------

  const jogadoresSemCodigo = await pool.query(`
    SELECT id
    FROM jogadores
    WHERE codigo_indicacao IS NULL
  `);

  for (const jogador of jogadoresSemCodigo.rows) {
    const codigo = await gerarCodigoIndicacaoUnico();

    await pool.query(
      `
        UPDATE jogadores
        SET
          codigo_indicacao = $1,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [codigo, jogador.id]
    );
  }

  console.log('Banco de dados QuizUp preparado.');
}

// ======================================================
// BUSCAR JOGADOR
// ======================================================

async function buscarJogadorPorEmail(email) {
  const resultado = await pool.query(
    `
      SELECT *
      FROM jogadores
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  return resultado.rows[0] || null;
}

async function buscarJogadorPorCodigo(codigo) {
  const resultado = await pool.query(
    `
      SELECT *
      FROM jogadores
      WHERE UPPER(codigo_indicacao) = UPPER($1)
      LIMIT 1
    `,
    [codigo]
  );

  return resultado.rows[0] || null;
}

// ======================================================
// CRIAR CONTA
// ======================================================

async function criarJogador(dados) {
  const nome = String(dados.nome || '').trim();

  const cpf = String(dados.cpf || '').trim();

  const email = String(dados.email || '')
    .trim()
    .toLowerCase();

  const senha = String(dados.senha || '');

  const codigoIndicacao = String(
    dados.codigoIndicacao ||
    dados.codigo ||
    ''
  )
    .trim()
    .toUpperCase();

  if (!nome || !email || !senha) {
    throw new Error(
      'Nome, e-mail e senha são obrigatórios.'
    );
  }

  const existente =
    await buscarJogadorPorEmail(email);

  if (existente) {
    throw new Error(
      'Este e-mail já possui uma conta.'
    );
  }

  let indicadorId = null;

  if (codigoIndicacao) {
    const indicador =
      await buscarJogadorPorCodigo(
        codigoIndicacao
      );

    if (!indicador) {
      throw new Error(
        'Código de indicação inválido.'
      );
    }

    indicadorId = indicador.id;
  }

  const codigoNovoJogador =
    await gerarCodigoIndicacaoUnico();

  const senhaHash = hash(senha);

  const resultado = await pool.query(
    `
      INSERT INTO jogadores
      (
        nome,
        cpf,
        email,
        senha,
        codigo_indicacao,
        indicador_id
      )

      VALUES
      ($1,$2,$3,$4,$5,$6)

      RETURNING
        id,
        nome,
        email,
        codigo_indicacao,
        pontos_jogo,
        pontos_patrocinado,
        acertos,
        erros
    `,
    [
      nome,
      cpf,
      email,
      senhaHash,
      codigoNovoJogador,
      indicadorId
    ]
  );

  const jogador = resultado.rows[0];

  if (indicadorId) {
    await pool.query(
      `
        INSERT INTO indicacoes
        (
          indicador_id,
          indicado_id,
          pontos_indicado,
          status,
          bonus
        )

        VALUES
        ($1,$2,0,'PENDENTE',$3)
      `,
      [
        indicadorId,
        jogador.id,
        BONUS_INDICACAO
      ]
    );
  }

  return jogador;
}

// ======================================================
// REGISTRAR RESULTADO
// ======================================================

async function registrarResultado(dados) {
  const email = String(dados.email || '')
    .trim()
    .toLowerCase();

  const acertou = Boolean(dados.acertou);

  const pontos = Math.max(
    0,
    Math.floor(
      Number(dados.pontos || 0)
    )
  );

  const jogador =
    await buscarJogadorPorEmail(email);

  if (!jogador) {
    throw new Error(
      'Jogador não encontrado.'
    );
  }

  const pontosGanhos =
    acertou ? pontos : 0;

  const resultado = await pool.query(
    `
      UPDATE jogadores

      SET
        pontos_jogo = pontos_jogo + $1,

        acertos = acertos + $2,

        erros = erros + $3,

        atualizado_em = CURRENT_TIMESTAMP

      WHERE id = $4

      RETURNING *
    `,
    [
      pontosGanhos,
      acertou ? 1 : 0,
      acertou ? 0 : 1,
      jogador.id
    ]
  );

  await pool.query(
    `
      INSERT INTO atividades
      (
        jogador_id,
        tipo,
        pontos
      )

      VALUES
      ($1,$2,$3)
    `,
    [
      jogador.id,
      acertou ? 'ACERTO' : 'ERRO',
      pontosGanhos
    ]
  );

  await verificarIndicacao(jogador.id);

  return resultado.rows[0];
}

// ======================================================
// VERIFICAR INDICAÇÃO
// ======================================================

async function verificarIndicacao(indicadoId) {
  const resultado = await pool.query(
    `
      SELECT
        i.id AS indicacao_id,
        i.indicador_id,
        i.indicado_id,
        i.status,
        i.bonus,
        j.pontos_jogo

      FROM indicacoes i

      INNER JOIN jogadores j
        ON j.id = i.indicado_id

      WHERE
        i.indicado_id = $1
        AND i.status = 'PENDENTE'

      ORDER BY i.id ASC

      LIMIT 1
    `,
    [indicadoId]
  );

  if (resultado.rows.length === 0) {
    return;
  }

  const indicacao = resultado.rows[0];

  const pontosAtual =
    Number(indicacao.pontos_jogo);

  await pool.query(
    `
      UPDATE indicacoes

      SET pontos_indicado = $1

      WHERE id = $2
      AND status = 'PENDENTE'
    `,
    [
      Math.min(
        pontosAtual,
        PONTOS_META_INDICACAO
      ),
      indicacao.indicacao_id
    ]
  );

  if (pontosAtual < PONTOS_META_INDICACAO) {
    return;
  }

  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const verificacao =
      await cliente.query(
        `
          SELECT
            id,
            indicador_id,
            indicado_id,
            status,
            bonus

          FROM indicacoes

          WHERE id = $1

          FOR UPDATE
        `,
        [indicacao.indicacao_id]
      );

    if (
      verificacao.rows.length === 0 ||
      verificacao.rows[0].status !== 'PENDENTE'
    ) {
      await cliente.query('ROLLBACK');
      return;
    }

    const indicacaoAtual =
      verificacao.rows[0];

    const bonus = Number(
      indicacaoAtual.bonus ||
      BONUS_INDICACAO
    );

    await cliente.query(
      `
        UPDATE indicacoes

        SET
          status = 'CONCLUIDA',

          pontos_indicado = $1,

          concluido_em = CURRENT_TIMESTAMP

        WHERE id = $2
      `,
      [
        PONTOS_META_INDICACAO,
        indicacaoAtual.id
      ]
    );

    const indicadorAtualizado =
      await cliente.query(
        `
          UPDATE jogadores

          SET
            pontos_jogo =
              pontos_jogo + $1,

            bonus_indicacao_recebido =
              TRUE,

            atualizado_em =
              CURRENT_TIMESTAMP

          WHERE id = $2

          RETURNING id
        `,
        [
          bonus,
          indicacaoAtual.indicador_id
        ]
      );

    if (
      indicadorAtualizado.rows.length === 0
    ) {
      throw new Error(
        'Indicador não encontrado.'
      );
    }

    await cliente.query(
      `
        UPDATE jogadores

        SET
          indicacao_concluida = TRUE,

          atualizado_em =
            CURRENT_TIMESTAMP

        WHERE id = $1
      `,
      [indicacaoAtual.indicado_id]
    );

    await cliente.query(
      `
        INSERT INTO atividades
        (
          jogador_id,
          tipo,
          pontos
        )

        VALUES
        ($1,'BONUS_INDICACAO',$2)
      `,
      [
        indicacaoAtual.indicador_id,
        bonus
      ]
    );

    await cliente.query('COMMIT');

    console.log(
      `Indicação ${indicacaoAtual.id} concluída. ` +
      `Indicador recebeu +${bonus} pontos.`
    );

  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

// ======================================================
// PONTOS PATROCINADOS
// ======================================================

async function registrarPontosPatrocinados(dados) {
  const email = String(dados.email || '')
    .trim()
    .toLowerCase();

  const pontos = Number(dados.pontos || 0);

  if (
    !email ||
    !Number.isFinite(pontos) ||
    pontos <= 0
  ) {
    throw new Error(
      'Dados inválidos.'
    );
  }

  const jogador =
    await buscarJogadorPorEmail(email);

  if (!jogador) {
    throw new Error(
      'Jogador não encontrado.'
    );
  }

  const pontosInteiros =
    Math.floor(pontos);

  const resultado =
    await pool.query(
      `
        UPDATE jogadores

        SET
          pontos_patrocinado =
            pontos_patrocinado + $1,

          atualizado_em =
            CURRENT_TIMESTAMP

        WHERE id = $2

        RETURNING *
      `,
      [
        pontosInteiros,
        jogador.id
      ]
    );

  await pool.query(
    `
      INSERT INTO atividades
      (
        jogador_id,
        tipo,
        pontos
      )

      VALUES
      ($1,'PATROCINADO',$2)
    `,
    [
      jogador.id,
      pontosInteiros
    ]
  );

  return resultado.rows[0];
}

// ======================================================
// REGRAS DE SAQUE
// ======================================================

function regraSaque(pontos) {
  const valor = Number(pontos);

  if (valor === 2000) {
    return {
      pontos: 2000,
      valorCentavos: 100
    };
  }

  if (valor === 6000) {
    return {
      pontos: 6000,
      valorCentavos: 500
    };
  }

  if (valor === 11000) {
    return {
      pontos: 11000,
      valorCentavos: 1000
    };
  }

  return null;
}

// ======================================================
// SOLICITAR SAQUE
// ======================================================

async function solicitarSaque(dados) {
  const email = String(dados.email || '')
    .trim()
    .toLowerCase();

  const pontos = Number(dados.pontos || 0);

  const metodo =
    String(dados.metodo || '').trim();

  const chave =
    String(dados.chave || '').trim();

  if (
    !email ||
    !pontos ||
    !metodo ||
    !chave
  ) {
    throw new Error(
      'Preencha todos os dados do saque.'
    );
  }

  const regra = regraSaque(pontos);

  if (!regra) {
    throw new Error(
      'Valor de saque inválido. ' +
      'Escolha 2.000, 6.000 ou 11.000 pontos.'
    );
  }

  const jogador =
    await buscarJogadorPorEmail(email);

  if (!jogador) {
    throw new Error(
      'Jogador não encontrado.'
    );
  }

  if (
    Number(jogador.pontos_jogo) <
    regra.pontos
  ) {
    throw new Error(
      'Você não possui pontos suficientes no jogo.'
    );
  }

  if (
    Number(jogador.pontos_patrocinado) <
    regra.pontos
  ) {
    throw new Error(
      'Você ainda não possui pontos patrocinados suficientes para este saque.'
    );
  }

  const limite = await pool.query(
    `
      SELECT
        COUNT(*)::integer AS total

      FROM saques

      WHERE jogador_id = $1

      AND criado_em >= CURRENT_DATE

      AND criado_em <
        CURRENT_DATE + INTERVAL '1 day'
    `,
    [jogador.id]
  );

  if (
    Number(limite.rows[0].total) >= 2
  ) {
    throw new Error(
      'Limite de 2 solicitações de saque por dia atingido.'
    );
  }

  const valorJogador =
    regra.valorCentavos;

  const valorAdmin =
    Math.round(
      valorJogador *
      (ADMIN_PERCENTUAL / 100)
    );

  const resultado =
    await pool.query(
      `
        INSERT INTO saques
        (
          jogador_id,
          email,
          pontos,
          valor_centavos,
          metodo,
          chave,
          admin_percentual,
          valor_admin_centavos,
          valor_jogador_centavos
        )

        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)

        RETURNING *
      `,
      [
        jogador.id,
        jogador.email,
        regra.pontos,
        regra.valorCentavos,
        metodo,
        chave,
        ADMIN_PERCENTUAL,
        valorAdmin,
        valorJogador
      ]
    );

  await pool.query(
    `
      UPDATE jogadores

      SET
        tentativas_saque =
          tentativas_saque + 1,

        atualizado_em =
          CURRENT_TIMESTAMP

      WHERE id = $1
    `,
    [jogador.id]
  );

  if (
    RESEND_API_KEY &&
    ADMIN_EMAIL
  ) {
    try {
      await enviarEmailAdminSaque(
        jogador,
        resultado.rows[0]
      );
    } catch (erro) {
      console.error(
        'Erro ao enviar e-mail:',
        erro
      );
    }
  }

  return resultado.rows[0];
}

// ======================================================
// E-MAIL ADMIN
// ======================================================

async function enviarEmailAdminSaque(
  jogador,
  saque
) {
  const resposta = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        'Authorization':
          `Bearer ${RESEND_API_KEY}`,

        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        from:
          'QuizUp <onboarding@resend.dev>',

        to: [
          ADMIN_EMAIL
        ],

        subject:
          '💰 Novo pedido de saque - QuizUp',

        html: `
          <div style="
            font-family:Arial,sans-serif;
            max-width:600px;
            margin:auto;
            padding:20px;
          ">

            <h2>🎯 Novo pedido de saque</h2>

            <hr>

            <p>
              <strong>Jogador:</strong>
              ${escaparHTML(jogador.nome)}
            </p>

            <p>
              <strong>E-mail:</strong>
              ${escaparHTML(jogador.email)}
            </p>

            <p>
              <strong>Pontos do jogo:</strong>
              ${jogador.pontos_jogo}
            </p>

            <p>
              <strong>Pontos patrocinados:</strong>
              ${jogador.pontos_patrocinado}
            </p>

            <p>
              <strong>Pontos solicitados:</strong>
              ${saque.pontos}
            </p>

            <p>
              <strong>Valor:</strong>
              R$ ${(saque.valor_centavos / 100)
                .toFixed(2)
                .replace('.', ',')}
            </p>

            <p>
              <strong>Método:</strong>
              ${escaparHTML(saque.metodo)}
            </p>

            <p>
              <strong>Chave:</strong>
              ${escaparHTML(saque.chave)}
            </p>

            <p>
              <strong>Status:</strong>
              PENDENTE
            </p>

            <hr>

            <p>
              Entre no painel administrativo
              para aprovar ou recusar.
            </p>

          </div>
        `
      })
    }
  );

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(erro);
  }
}

// ======================================================
// E-MAIL JOGADOR
// ======================================================

async function enviarEmailJogador(
  email,
  assunto,
  html
) {
  const resposta = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',

      headers: {
        'Authorization':
          `Bearer ${RESEND_API_KEY}`,

        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        from:
          'QuizUp <onboarding@resend.dev>',

        to: [
          email
        ],

        subject: assunto,

        html: `
          <div style="
            font-family:Arial,sans-serif;
            max-width:600px;
            margin:auto;
            padding:20px;
          ">
            ${html}
          </div>
        `
      })
    }
  );

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(erro);
  }
}

// ======================================================
// APROVAR SAQUE
// ======================================================

async function aprovarSaque(id) {
  const saqueId = Number(id);

  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const resultado =
      await cliente.query(
        `
          SELECT
            s.*,
            j.pontos_jogo,
            j.pontos_patrocinado,
            j.nome

          FROM saques s

          INNER JOIN jogadores j
            ON j.id = s.jogador_id

          WHERE s.id = $1

          FOR UPDATE
        `,
        [saqueId]
      );

    if (resultado.rows.length === 0) {
      throw new Error(
        'Saque não encontrado.'
      );
    }

    const saque = resultado.rows[0];

    if (saque.status !== 'PENDENTE') {
      throw new Error(
        'Este saque já foi analisado.'
      );
    }

    if (
      Number(saque.pontos_jogo) <
      Number(saque.pontos)
    ) {
      throw new Error(
        'O jogador não possui mais pontos suficientes para este saque.'
      );
    }

    if (
      Number(saque.pontos_patrocinado) <
      Number(saque.pontos)
    ) {
      throw new Error(
        'O jogador não possui pontos patrocinados suficientes.'
      );
    }

    const jogadorAtualizado =
      await cliente.query(
        `
          UPDATE jogadores

          SET
            pontos_jogo =
              pontos_jogo - $1,

            pontos_patrocinado =
              pontos_patrocinado - $1,

            saques_aprovados =
              saques_aprovados + 1,

            total_sacado_centavos =
              total_sacado_centavos + $2,

            atualizado_em =
              CURRENT_TIMESTAMP

          WHERE id = $3

          AND pontos_jogo >= $1

          AND pontos_patrocinado >= $1

          RETURNING *
        `,
        [
          saque.pontos,
          saque.valor_centavos,
          saque.jogador_id
        ]
      );

    if (
      jogadorAtualizado.rows.length === 0
    ) {
      throw new Error(
        'Não foi possível retirar os pontos do jogador.'
      );
    }

    await cliente.query(
      `
        UPDATE saques

        SET
          status = 'APROVADO',

          analisado_em =
            CURRENT_TIMESTAMP

        WHERE id = $1
      `,
      [saqueId]
    );

    await cliente.query('COMMIT');

    if (
      RESEND_API_KEY &&
      saque.email
    ) {
      try {
        await enviarEmailJogador(
          saque.email,
          'Saque aprovado - QuizUp',
          `
            <h2>🎯 QuizUp</h2>

            <p>
              Seu pedido de saque foi
              <strong>APROVADO</strong>.
            </p>

            <p>
              Pontos retirados:
              <strong>${saque.pontos}</strong>
            </p>

            <p>
              Valor:
              <strong>
                R$ ${(saque.valor_centavos / 100)
                  .toFixed(2)
                  .replace('.', ',')}
              </strong>
            </p>
          `
        );
      } catch (erro) {
        console.error(
          'Erro ao enviar aviso:',
          erro
        );
      }
    }

    return {
      sucesso: true,
      mensagem:
        'Saque aprovado e pontos retirados do jogador.'
    };

  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

// ======================================================
// RECUSAR SAQUE
// ======================================================

async function recusarSaque(
  id,
  motivo
) {
  const saqueId = Number(id);

  const resultado =
    await pool.query(
      `
        SELECT *
        FROM saques
        WHERE id = $1
      `,
      [saqueId]
    );

  if (resultado.rows.length === 0) {
    throw new Error(
      'Saque não encontrado.'
    );
  }

  const saque = resultado.rows[0];

  if (saque.status !== 'PENDENTE') {
    throw new Error(
      'Este saque já foi analisado.'
    );
  }

  const motivoFinal =
    motivo ||
    'Solicitação recusada pelo administrador.';

  await pool.query(
    `
      UPDATE saques

      SET
        status = 'RECUSADO',

        motivo_recusa = $1,

        analisado_em =
          CURRENT_TIMESTAMP

      WHERE id = $2
    `,
    [
      motivoFinal,
      saqueId
    ]
  );

  await pool.query(
    `
      UPDATE jogadores

      SET
        saques_recusados =
          saques_recusados + 1,

        atualizado_em =
          CURRENT_TIMESTAMP

      WHERE id = $1
    `,
    [saque.jogador_id]
  );

  if (
    RESEND_API_KEY &&
    saque.email
  ) {
    try {
      await enviarEmailJogador(
        saque.email,
        'Saque recusado - QuizUp',
        `
          <h2>🎯 QuizUp</h2>

          <p>
            Seu pedido de saque foi
            <strong>RECUSADO</strong>.
          </p>

          <p>
            Motivo:
            ${escaparHTML(motivoFinal)}
          </p>
        `
      );
    } catch (erro) {
      console.error(
        'Erro ao enviar aviso:',
        erro
      );
    }
  }

  return {
    sucesso: true,
    mensagem:
      'Saque recusado. Os pontos do jogador não foram retirados.'
  };
}

// ======================================================
// DADOS DO JOGADOR
// ======================================================

async function dadosJogador(email) {
  const jogador =
    await buscarJogadorPorEmail(
      String(email || '')
        .trim()
        .toLowerCase()
    );

  if (!jogador) {
    throw new Error(
      'Jogador não encontrado.'
    );
  }

  const indicacoes =
    await pool.query(
      `
        SELECT
          i.id,
          i.status,
          i.pontos_indicado,
          i.bonus,
          j.nome AS indicado_nome,
          j.email AS indicado_email

        FROM indicacoes i

        INNER JOIN jogadores j
          ON j.id = i.indicado_id

        WHERE i.indicador_id = $1

        ORDER BY i.id DESC
      `,
      [jogador.id]
    );

  return {
    id: jogador.id,

    nome: jogador.nome,

    email: jogador.email,

    codigoIndicacao:
      jogador.codigo_indicacao,

    pontosJogo:
      jogador.pontos_jogo,

    pontosPatrocinado:
      jogador.pontos_patrocinado,

    acertos:
      jogador.acertos,

    erros:
      jogador.erros,

    tentativasSaque:
      jogador.tentativas_saque,

    saquesAprovados:
      jogador.saques_aprovados,

    saquesRecusados:
      jogador.saques_recusados,

    indicacaoConcluida:
      jogador.indicacao_concluida,

    indicacoes:
      indicacoes.rows
  };
}

// ======================================================
// ADMIN - JOGADORES
// ======================================================

async function listarJogadores() {
  const resultado =
    await pool.query(
      `
        SELECT
          id,
          nome,
          email,
          codigo_indicacao,
          pontos_jogo,
          pontos_patrocinado,
          acertos,
          erros,
          tentativas_saque,
          saques_aprovados,
          saques_recusados,
          total_sacado_centavos,
          criado_em,
          atualizado_em

        FROM jogadores

        ORDER BY atualizado_em DESC
      `
    );

  return resultado.rows.map(jogador => ({
    ...jogador,

    total_sacado:
      (
        Number(
          jogador.total_sacado_centavos
        ) / 100
      )
      .toFixed(2)
  }));
}

// ======================================================
// ADMIN - SAQUES
// ======================================================

async function listarSaques() {
  const resultado =
    await pool.query(
      `
        SELECT
          s.*,

          j.nome AS jogador_nome,

          j.pontos_jogo,

          j.pontos_patrocinado,

          j.acertos,

          j.erros,

          j.tentativas_saque,

          j.saques_aprovados,

          j.saques_recusados

        FROM saques s

        INNER JOIN jogadores j
          ON j.id = s.jogador_id

        ORDER BY s.criado_em DESC
      `
    );

  return resultado.rows;
}

// ======================================================
// ADMIN
// ======================================================

function verificarAdmin(req) {
  if (!ADMIN_TOKEN) {
    return false;
  }

  const token =
    req.headers['x-admin-token'];

  return Boolean(
    token &&
    token === ADMIN_TOKEN
  );
}

// ======================================================
// SERVIDOR
// ======================================================

const servidor = http.createServer(
  async (req, res) => {

    try {

      const url = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
      );

      // ==================================================
      // HEALTH
      // ==================================================

      if (
        req.method === 'GET' &&
        url.pathname === '/health'
      ) {
        responder(
          res,
          200,
          {
            sucesso: true,
            quizup: 'online'
          }
        );

        return;
      }

      // ==================================================
      // CRIAR CONTA
      // ==================================================

      if (
        req.method === 'POST' &&
        url.pathname === '/api/criar-conta'
      ) {

        const dados =
          await lerCorpo(req);

        try {

          const jogador =
            await criarJogador(dados);

          responder(
            res,
            201,
            {
              sucesso: true,
              jogador
            }
          );

        } catch (erro) {

          responder(
            res,
            400,
            {
              sucesso: false,
              mensagem: erro.message
            }
          );
        }

        return;
      }

      // ==================================================
      // LOGIN
      // ==================================================

      if (
        req.method === 'POST' &&
        url.pathname === '/api/login'
      ) {

        const dados =
          await lerCorpo(req);

        const email =
          String(dados.email || '')
            .trim()
            .toLowerCase();

        const senha =
          String(dados.senha || '');

        const jogador =
          await buscarJogadorPorEmail(
            email
          );

        const senhaHash =
          hash(senha);

        if (
          !jogador ||
          jogador.senha !== senhaHash
        ) {

          responder(
            res,
            401,
            {
              sucesso: false,
              mensagem:
                'E-mail ou senha incorretos.'
            }
          );

          return;
        }

        responder(
          res,
          200,
          {
            sucesso: true,
            jogador:
              await dadosJogador(email)
          }
        );

        return;
      }

      // ==================================================
      // DADOS DO JOGADOR
      // ==================================================

      if (
        req.method === 'GET' &&
        url.pathname === '/api/jogador'
      ) {

        const email =
          url.searchParams.get('email');

        if (!email) {
          responder(
            res,
            400,
            {
              sucesso: false,
              mensagem:
                'E-mail não informado.'
            }
          );

          return;
        }

        responder(
          res,
          200,
          {
            sucesso: true,
            jogador:
              await dadosJogador(email)
          }
        );

        return;
      }

      // ==================================================
      // RESULTADO
      // ==================================================

      if (
        req.method === 'POST' &&
        url.pathname ===
          '/api/registrar-resultado'
      ) {

        const dados =
          await lerCorpo(req);

        const jogador =
          await registrarResultado(
            dados
          );

        responder(
          res,
          200,
          {
            sucesso: true,
            jogador
          }
        );

        return;
      }

      // ==================================================
      // PATROCINADO
      // ==================================================

      if (
        req.method === 'POST' &&
        url.pathname ===
          '/api/patrocinado'
      ) {

        if (!verificarAdmin(req)) {

          responder(
            res,
            401,
            {
              sucesso: false,
              mensagem:
                'Acesso administrativo negado.'
            }
          );

          return;
        }

        const dados =
          await lerCorpo(req);

        const jogador =
          await registrarPontosPatrocinados(
            dados
          );

        responder(
          res,
          200,
          {
            sucesso: true,
            jogador
          }
        );

        return;
      }

      // ==================================================
      // SOLICITAR SAQUE
      // ==================================================

      if (
        req.method === 'POST' &&
        url.pathname ===
          '/solicitar-saque'
      ) {

        const dados =
          await lerCorpo(req);

        try {

          const saque =
            await solicitarSaque(
              dados
            );

          responder(
            res,
            200,
            {
              sucesso: true,
              mensagem:
                'Saque solicitado com sucesso. Aguarde a análise.',
              saque
            }
          );

        } catch (erro) {

          responder(
            res,
            400,
            {
              sucesso: false,
              mensagem: erro.message
            }
          );
        }

        return;
      }

      // ==================================================
      // ADMIN - JOGADORES
      // ==================================================

      if (
        req.method === 'GET' &&
        url.pathname ===
          '/admin/jogadores'
      ) {

        if (!verificarAdmin(req)) {

          responder(
            res,
            401,
            {
              sucesso: false,
              mensagem:
                'Acesso administrativo negado.'
            }
          );

          return;
        }

        const jogadores =
          await listarJogadores();

        responder(
          res,
          200,
          {
            sucesso: true,
            jogadores
          }
        );

        return;
      }

      // ==================================================
      // ADMIN - SAQUES
      // ==================================================

      if (
        req.method === 'GET' &&
        url.pathname ===
          '/admin/saques'
      ) {

        if (!verificarAdmin(req)) {

          responder(
            res,
            401,
            {
              sucesso: false,
              mensagem:
                'Acesso administrativo negado.'
            }
          );

          return;
        }

        const saques =
          await listarSaques();

        responder(
          res,
          200,
          {
            sucesso: true,
            saques
          }
        );

        return;
      }

      // ==================================================
      // ADMIN - APROVAR
      // ==================================================

      const aprovarMatch =
        url.pathname.match(
          /^\/admin\/saques\/(\d+)\/aprovar$/
        );

      if (
        req.method === 'POST' &&
        aprovarMatch
      ) {

        if (!verificarAdmin(req)) {

          responder(
            res,
            401,
            {
              sucesso: false,
              mensagem:
                'Acesso administrativo negado.'
            }
          );

          return;
        }

        const resultado =
          await aprovarSaque(
            aprovarMatch[1]
          );

        responder(
          res,
          200,
          resultado
        );

        return;
      }

      // ==================================================
      // ADMIN - RECUSAR
      // ==================================================

      const recusarMatch =
        url.pathname.match(
          /^\/admin\/saques\/(\d+)\/recusar$/
        );

      if (
        req.method === 'POST' &&
        recusarMatch
      ) {

        if (!verificarAdmin(req)) {

          responder(
            res,
            401,
            {
              sucesso: false,
              mensagem:
                'Acesso administrativo negado.'
            }
          );

          return;
        }

        const dados =
          await lerCorpo(req);

        const resultado =
          await recusarSaque(
            recusarMatch[1],
            dados.motivo
          );

        responder(
          res,
          200,
          resultado
        );

        return;
      }

      // ==================================================
      // ARQUIVOS DO SITE
      // ==================================================

      let arquivo = url.pathname;

      if (arquivo === '/') {
        arquivo = '/index.html';
      }

      arquivo = path.normalize(arquivo);

      if (
        arquivo.includes('..')
      ) {

        responder(
          res,
          403,
          {
            sucesso: false,
            mensagem:
              'Acesso negado.'
          }
        );

        return;
      }

      const caminho =
        path.join(
          __dirname,
          arquivo
        );

      fs.readFile(
        caminho,
        (erro, conteudo) => {

          if (erro) {

            res.writeHead(
              404,
              {
                'Content-Type':
                  'text/plain; charset=utf-8'
              }
            );

            res.end(
              'Arquivo não encontrado.'
            );

            return;
          }

          let tipo =
            'text/html; charset=utf-8';

          if (
            arquivo.endsWith('.css')
          ) {

            tipo =
              'text/css; charset=utf-8';

          } else if (
            arquivo.endsWith('.js')
          ) {

            tipo =
              'application/javascript; charset=utf-8';

          } else if (
            arquivo.endsWith('.json')
          ) {

            tipo =
              'application/json; charset=utf-8';

          } else if (
            arquivo.endsWith('.png')
          ) {

            tipo =
              'image/png';

          } else if (
            arquivo.endsWith('.jpg') ||
            arquivo.endsWith('.jpeg')
          ) {

            tipo =
              'image/jpeg';

          } else if (
            arquivo.endsWith('.svg')
          ) {

            tipo =
              'image/svg+xml';

          } else if (
            arquivo.endsWith('.ico')
          ) {

            tipo =
              'image/x-icon';
          }

          res.writeHead(
            200,
            {
              'Content-Type': tipo
            }
          );

          res.end(conteudo);
        }
      );

    } catch (erro) {

      console.error(
        'Erro no servidor:',
        erro
      );

      responder(
        res,
        500,
        {
          sucesso: false,
          mensagem:
            'Erro interno do servidor.'
        }
      );
    }
  }
);

// ======================================================
// INICIAR
// ======================================================

inicializarBanco()
  .then(() => {

    servidor.listen(
      PORTA,
      '0.0.0.0',
      () => {

        console.log(
          `QuizUp funcionando na porta ${PORTA}`
        );

      }
    );

  })
  .catch(erro => {

    console.error(
      'Não foi possível inicializar o banco:',
      erro
    );

    process.exit(1);
  });
