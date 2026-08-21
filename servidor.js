const express = require("express");
const { Pool } = require("pg");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = Number(process.env.PORT) || 10000;

// =====================================================
// POSTGRESQL
// =====================================================

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não está configurada.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =====================================================
// TESTAR BANCO
// =====================================================

async function testarBanco() {
  const resultado = await pool.query("SELECT NOW()");
  console.log(
    "PostgreSQL conectado:",
    resultado.rows[0].now
  );
}

// =====================================================
// CRIAR TABELAS
// =====================================================

async function criarTabelas() {

  console.log("Criando/verificando tabelas...");

  // -----------------------------------------------------
  // USUÁRIOS
  // -----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      pontos INTEGER NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // -----------------------------------------------------
  // PERGUNTAS
  // -----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS perguntas (
      id BIGSERIAL PRIMARY KEY,
      pergunta TEXT NOT NULL,
      opcao_a TEXT NOT NULL,
      opcao_b TEXT NOT NULL,
      opcao_c TEXT NOT NULL,
      opcao_d TEXT NOT NULL,
      resposta_correta TEXT NOT NULL,
      pontos INTEGER NOT NULL DEFAULT 10,
      ativa BOOLEAN NOT NULL DEFAULT TRUE,
      criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // -----------------------------------------------------
  // RESPOSTAS
  // -----------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS respostas (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT,
      pergunta_id BIGINT,
      acertou BOOLEAN NOT NULL DEFAULT FALSE,
      pontos INTEGER NOT NULL DEFAULT 0,
      respondida_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // -----------------------------------------------------
  // GARANTIR COLUNAS IMPORTANTES
  // -----------------------------------------------------

  await pool.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS pontos
    INTEGER NOT NULL DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE perguntas
    ADD COLUMN IF NOT EXISTS pontos
    INTEGER NOT NULL DEFAULT 10
  `);

  await pool.query(`
    ALTER TABLE perguntas
    ADD COLUMN IF NOT EXISTS ativa
    BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    ALTER TABLE respostas
    ADD COLUMN IF NOT EXISTS usuario_id TEXT
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE respostas
    ADD COLUMN IF NOT EXISTS pergunta_id BIGINT
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE respostas
    ADD COLUMN IF NOT EXISTS acertou
    BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await pool.query(`
    ALTER TABLE respostas
    ADD COLUMN IF NOT EXISTS pontos
    INTEGER NOT NULL DEFAULT 0
  `);

  // -----------------------------------------------------
  // ÍNDICES
  // -----------------------------------------------------

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_respostas_usuario
    ON respostas(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_respostas_pergunta
    ON respostas(pergunta_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_perguntas_ativa
    ON perguntas(ativa)
  `);

  console.log("Tabelas verificadas com sucesso.");
}

// =====================================================
// ROTA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {

  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      >
      <title>QuizUp</title>

      <style>

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          min-height: 100vh;
          font-family: Arial, sans-serif;
          background:
            linear-gradient(
              135deg,
              #6a11cb,
              #2575fc
            );
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .container {
          width: 100%;
          max-width: 600px;
        }

        .card {
          background: white;
          border-radius: 25px;
          padding: 30px;
          box-shadow:
            0 15px 40px
            rgba(0,0,0,0.25);
        }

        h1 {
          text-align: center;
          color: #6a11cb;
          font-size: 42px;
          margin-top: 0;
        }

        .subtitulo {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
        }

        .status {
          text-align: center;
          padding: 15px;
          border-radius: 12px;
          background: #f1f1f1;
          margin-top: 20px;
        }

        .online {
          color: green;
          font-weight: bold;
        }

        .erro {
          color: red;
          font-weight: bold;
        }

        button {
          width: 100%;
          padding: 15px;
          margin-top: 15px;
          border: 0;
          border-radius: 12px;
          background: #6a11cb;
          color: white;
          font-size: 17px;
          font-weight: bold;
          cursor: pointer;
        }

        button:hover {
          opacity: 0.9;
        }

      </style>
    </head>

    <body>

      <div class="container">

        <div class="card">

          <h1>QuizUp</h1>

          <p class="subtitulo">
            Jogo de perguntas e respostas
          </p>

          <div class="status">

            <div id="servidor">
              Verificando servidor...
            </div>

            <div id="banco">
              Verificando banco...
            </div>

          </div>

          <button onclick="testar()">
            TESTAR CONEXÃO
          </button>

        </div>

      </div>

      <script>

        async function testar() {

          const servidor =
            document.getElementById("servidor");

          const banco =
            document.getElementById("banco");

          servidor.textContent =
            "Servidor: verificando...";

          banco.textContent =
            "Banco: verificando...";

          try {

            const resposta =
              await fetch("/api/status");

            const dados =
              await resposta.json();

            if (dados.servidor === "online") {

              servidor.innerHTML =
                'Servidor: <span class="online">ONLINE</span>';

            } else {

              servidor.innerHTML =
                'Servidor: <span class="erro">ERRO</span>';

            }

            if (dados.banco === "conectado") {

              banco.innerHTML =
                'Banco: <span class="online">CONECTADO</span>';

            } else {

              banco.innerHTML =
                'Banco: <span class="erro">ERRO</span>';

            }

          } catch (erro) {

            servidor.innerHTML =
              'Servidor: <span class="erro">ERRO</span>';

            banco.innerHTML =
              'Banco: <span class="erro">ERRO</span>';

            console.error(erro);

          }

        }

        testar();

      </script>

    </body>
    </html>
  `);

});

// =====================================================
// STATUS
// =====================================================

app.get("/api/status", async (req, res) => {

  try {

    const resultado =
      await pool.query("SELECT NOW()");

    res.status(200).json({

      sucesso: true,

      servidor: "online",

      banco: "conectado",

      horario:
        resultado.rows[0].now,

      porta: PORT

    });

  } catch (erro) {

    console.error(
      "Erro ao verificar banco:",
      erro
    );

    res.status(500).json({

      sucesso: false,

      servidor: "online",

      banco: "erro"

    });

  }

});

// =====================================================
// LISTAR PERGUNTAS
// =====================================================

app.get("/api/perguntas", async (req, res) => {

  try {

    const resultado =
      await pool.query(`
        SELECT
          id,
          pergunta,
          opcao_a,
          opcao_b,
          opcao_c,
          opcao_d,
          pontos
        FROM perguntas
        WHERE ativa = TRUE
        ORDER BY id ASC
      `);

    res.status(200).json({

      sucesso: true,

      total:
        resultado.rows.length,

      perguntas:
        resultado.rows

    });

  } catch (erro) {

    console.error(
      "Erro ao buscar perguntas:",
      erro
    );

    res.status(500).json({

      sucesso: false,

      erro:
        "Não foi possível carregar as perguntas."

    });

  }

});

// =====================================================
// INICIAR SERVIDOR
// =====================================================

async function iniciar() {

  try {

    console.log("=================================");
    console.log("Iniciando QuizUp...");
    console.log("Porta configurada:", PORT);
    console.log("=================================");

    console.log(
      "Testando conexão com PostgreSQL..."
    );

    await testarBanco();

    await criarTabelas();

    const servidor =
      app.listen(
        PORT,
        "0.0.0.0",
        () => {

          console.log(
            "================================="
          );

          console.log(
            "QuizUp funcionando!"
          );

          console.log(
            `Servidor escutando em 0.0.0.0:${PORT}`
          );

          console.log(
            "================================="
          );

        }
      );

    servidor.on("error", (erro) => {

      console.error(
        "Erro no servidor:",
        erro
      );

      process.exit(1);

    });

  } catch (erro) {

    console.error(
      "================================="
    );

    console.error(
      "ERRO AO INICIAR QUIZUP:"
    );

    console.error(erro);

    console.error(
      "================================="
    );

    process.exit(1);

  }

}

// =====================================================
// ENCERRAMENTO
// =====================================================

async function encerrar() {

  console.log(
    "Encerrando QuizUp..."
  );

  try {

    await pool.end();

    console.log(
      "Banco de dados desconectado."
    );

  } catch (erro) {

    console.error(
      "Erro ao fechar banco:",
      erro
    );

  }

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

// =====================================================
// INICIAR
// =====================================================

iniciar();
