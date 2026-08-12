const perguntas = [
  {
    pergunta: "Qual é a capital do Brasil?",
    opcoes: ["São Paulo", "Brasília", "Rio de Janeiro", "Salvador"],
    correta: "Brasília"
  },
  {
    pergunta: "Quanto é 5 + 5?",
    opcoes: ["8", "9", "10", "12"],
    correta: "10"
  },
  {
    pergunta: "Qual planeta é conhecido como Planeta Vermelho?",
    opcoes: ["Terra", "Marte", "Júpiter", "Saturno"],
    correta: "Marte"
  },
  {
    pergunta: "Qual é o maior oceano do mundo?",
    opcoes: ["Atlântico", "Índico", "Pacífico", "Ártico"],
    correta: "Pacífico"
  },
  {
    pergunta: "Quantos dias tem uma semana?",
    opcoes: ["5", "6", "7", "8"],
    correta: "7"
  }
];

let atual = 0;
let pontos = 0;
let respondeu = false;

const pergunta = document.getElementById("pergunta");
const opcoes = document.getElementById("opcoes");
const numero = document.getElementById("numero");
const pontuacao = document.getElementById("pontuacao");
const proxima = document.getElementById("proxima");
const quiz = document.getElementById("quiz");
const resultado = document.getElementById("resultado");
const resultadoTexto = document.getElementById("resultadoTexto");

function carregarPergunta() {
  respondeu = false;
  proxima.disabled = true;

  const p = perguntas[atual];

  numero.textContent = `Pergunta ${atual + 1} de ${perguntas.length}`;
  pontuacao.textContent = `Pontos: ${pontos}`;
  pergunta.textContent = p.pergunta;

  opcoes.innerHTML = "";

  p.opcoes.forEach(opcao => {
    const botao = document.createElement("button");

    botao.textContent = opcao;
    botao.className = "opcao";

    botao.onclick = () => responder(botao, opcao);

    opcoes.appendChild(botao);
  });
}

function responder(botao, resposta) {
  if (respondeu) return;

  respondeu = true;
  proxima.disabled = false;

  const correta = perguntas[atual].correta;

  if (resposta === correta) {
    botao.classList.add("correta");
    pontos += 10;
  } else {
    botao.classList.add("errada");

    document.querySelectorAll(".opcao").forEach(b => {
      if (b.textContent === correta) {
        b.classList.add("correta");
      }
    });
  }

  pontuacao.textContent = `Pontos: ${pontos}`;
}

function proximaPergunta() {
  atual++;

  if (atual < perguntas.length) {
    carregarPergunta();
  } else {
    finalizarQuiz();
  }
}

function finalizarQuiz() {
  quiz.classList.add("escondido");
  resultado.classList.remove("escondido");

  resultadoTexto.textContent =
    `Você fez ${pontos} pontos de ${perguntas.length * 10}!`;
}

function reiniciarQuiz() {
  atual = 0;
  pontos = 0;

  resultado.classList.add("escondido");
  quiz.classList.remove("escondido");

  carregarPergunta();
}

carregarPergunta();
