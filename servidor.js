const express = require("express");
const { Pool } = require("pg");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 10000;

// PostgreSQL do Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

// ================================
// TESTE DO BANCO
// ================================

async function testarBanco() {
  const resultado = await pool.query("SELECT NOW()");
  console.log("PostgreSQL conectado:", resultado.rows[0].now);
}

// ================================
// CRIAÇÃO DAS TABELAS
// ================================

async function criarTabelas() {

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS respostas (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      pergunta_id BIGINT NOT NULL,
      acertou BOOLEAN NOT NULL DEFAULT FALSE,
      pontos INTEGER NOT NULL DEFAULT 0,
      respondida_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_respostas_usuario
    ON respostas(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_respostas_pergunta
    ON respostas(pergunta_id)
  `);

  console.log("Tabelas verificadas com sucesso.");
}

// ================================
// ROTA PRINCIPAL
// ================================

app.get("/", (req, res) => {
  res.json({
    sucesso: true,
    mensagem: "QuizUp funcionando!",
    status: "online"
  });
});

// ================================
// TESTE DO BANCO
// ================================

app.get("/api/status", async (req, res) => {

  try {

    const resultado = await pool.query("SELECT NOW()");

    res.json({
      sucesso: true,
      servidor: "online",
      banco: "conectado",
      horario: resultado.rows[0].now
    });

  } catch (erro) {

    console.error("Erro no banco:", erro);

    res.status(500).json({
      sucesso: false,
      servidor: "online",
      banco: "erro"
    });

  }

});

// ================================
// LISTAR PERGUNTAS
// ================================

app.get("/api/perguntas", async (req, res) => {

  try {

    const resultado = await pool.query(`
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
      ORDER BY id
    `);

    res.json({
      sucesso: true,
      perguntas: resultado.rows
    });

  } catch (erro) {

    console.error("Erro ao buscar perguntas:", erro);

    res.status(500).json({
      sucesso: false,
      erro: "Não foi possível carregar as perguntas."
    });

  }

});

// ================================
// INICIAR SERVIDOR
// ================================

async function iniciar() {

  try {

    console.log("Iniciando QuizUp...");
    console.log("Porta configurada:", PORT);

    console.log("Testando conexão com PostgreSQL...");
    await testarBanco();

    console.log("Criando/verificando tabelas...");
    await criarTabelas();

    app.listen(PORT, "0.0.0.0", () => {

      console.log("=================================");
      console.log("QuizUp funcionando!");
      console.log(`Servidor escutando em 0.0.0.0:${PORT}`);
      console.log("=================================");

    });

  } catch (erro) {

    console.error("ERRO AO INICIAR QUIZUP:");
    console.error(erro);

    process.exit(1);

  }

}

// ================================
// ENCERRAMENTO SEGURO
// ================================

process.on("SIGTERM", async () => {

  console.log("SIGTERM recebido. Encerrando QuizUp...");

  try {
    await pool.end();
    console.log("Banco de dados desconectado.");
  } catch (erro) {
    console.error("Erro ao fechar banco:", erro);
  }

  process.exit(0);

});

process.on("SIGINT", async () => {

  console.log("SIGINT recebido. Encerrando QuizUp...");

  try {
    await pool.end();
  } catch (erro) {
    console.error(erro);
  }

  process.exit(0);

});

// ================================
// INICIAR
// ================================

iniciar();
