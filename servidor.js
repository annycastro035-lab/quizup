const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos do site
app.use(express.static(__dirname));

// Status do servidor
app.get("/api/status", (req, res) => {
  res.json({
    sucesso: true,
    servidor: "online",
    status: "funcionando",
    porta: PORT
  });
});

// Verificação de saúde usada pelo Render
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error("Erro:", err);
  res.status(500).json({
    sucesso: false,
    erro: "Erro interno do servidor"
  });
});

// Inicia o servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("QUIZUP ONLINE");
  console.log("Porta:", PORT);
  console.log("Servidor: 0.0.0.0");
  console.log("=================================");
});
