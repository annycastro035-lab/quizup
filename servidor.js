const express = require("express");

const app = express();

app.use(express.json());

const PORT = Number(process.env.PORT) || 10000;

app.get("/", (req, res) => {
  res.status(200).send(`
    <h1>QuizUp</h1>
    <p>Servidor funcionando!</p>
    <p>Porta: ${PORT}</p>
  `);
});

app.get("/api/status", (req, res) => {
  res.json({
    sucesso: true,
    servidor: "online",
    porta: PORT
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================");
  console.log("QUIZUP ONLINE");
  console.log("Porta:", PORT);
  console.log("Servidor: 0.0.0.0");
  console.log("=================================");
});
