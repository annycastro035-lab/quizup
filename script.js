let usuarioAtual = null;

let pontos = 0;
let saldo = 0;
let rodada = 1;

let pontosDaRodada = 0;
let respostaCorreta = 0;

let timerInterval = null;
let tempoRestante = 5;
let perguntaAtiva = false;

const perguntas = [
  {
    nivel: "FÁCIL",
    pergunta: "Qual é a capital do Brasil?",
    opcoes: [
      "São Paulo",
      "Brasília",
      "Rio de Janeiro",
      "Salvador"
    ],
    correta: 1
  },

  {
    nivel: "FÁCIL",
    pergunta: "Quanto é 2 + 2?",
    opcoes: [
      "3",
      "4",
      "5",
      "6"
    ],
    correta: 1
  },

  {
    nivel: "FÁCIL",
    pergunta: "Qual planeta é conhecido como Planeta Vermelho?",
    opcoes: [
      "Terra",
      "Marte",
      "Júpiter",
      "Saturno"
    ],
    correta: 1
  },

  {
    nivel: "FÁCIL",
    pergunta: "Quantos dias tem uma semana?",
    opcoes: [
      "5",
      "6",
      "7",
      "8"
    ],
    correta: 2
  },

  {
    nivel: "FÁCIL",
    pergunta: "Qual animal é conhecido como rei da selva?",
    opcoes: [
      "Tigre",
      "Leão",
      "Elefante",
      "Lobo"
    ],
    correta: 1
  },

  {
    nivel: "MÉDIO",
    pergunta: "Qual é o maior planeta do Sistema Solar?",
    opcoes: [
      "Terra",
      "Marte",
      "Júpiter",
      "Netuno"
    ],
    correta: 2
  },

  {
    nivel: "MÉDIO",
    pergunta: "Qual é o maior oceano do mundo?",
    opcoes: [
      "Atlântico",
      "Índico",
      "Pacífico",
      "Ártico"
    ],
    correta: 2
  },

  {
    nivel: "MÉDIO",
    pergunta: "Quem escreveu Dom Casmurro?",
    opcoes: [
      "Machado de Assis",
      "José de Alencar",
      "Carlos Drummond",
      "Monteiro Lobato"
    ],
    correta: 0
  },

  {
    nivel: "DIFÍCIL",
    pergunta: "Qual é o elemento químico representado pela letra O?",
    opcoes: [
      "Ouro",
      "Oxigênio",
      "Ósmio",
      "Ozônio"
    ],
    correta: 1
  },

  {
    nivel: "DIFÍCIL",
    pergunta: "Qual é a raiz quadrada de 144?",
    opcoes: [
      "10",
      "11",
      "12",
      "14"
    ],
    correta: 2
  },

  {
    nivel: "SUPER DIFÍCIL",
    pergunta: "Qual é a velocidade aproximada da luz no vácuo?",
    opcoes: [
      "30 mil km/s",
      "300 mil km/s",
      "3 milhões km/s",
      "3 mil km/s"
    ],
    correta: 1
  },

  {
    nivel: "SUPER DIFÍCIL",
    pergunta: "Qual é o maior órgão do corpo humano?",
    opcoes: [
      "Coração",
      "Fígado",
      "Pele",
      "Pulmão"
    ],
    correta: 2
  }
];

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  document.getElementById(id).classList.add("ativa");
}

function mostrarLogin() {
  mostrarTela("telaLogin");
}

function mostrarCadastro() {
  mostrarTela("telaCadastro");
}

function voltarJogo() {
  mostrarTela("telaJogo");
}

async function cadastrar() {

  const nome = document.getElementById("cadNome").value.trim();
  const cpf = document.getElementById("cadCpf").value.trim();
  const email = document.getElementById("cadEmail").value.trim();
  const senha = document.getElementById("cadSenha").value;
  const codigo = document.getElementById("cadCodigo").value.trim();

  const erro = document.getElementById("erroCadastro");

  erro.textContent = "";

  if (!nome || !cpf || !email || !senha || !codigo) {
    erro.textContent = "Preencha todos os campos.";
    return;
  }

  if (senha.length < 6) {
    erro.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  try {

    const resposta = await fetch("/api/cadastro", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        nome,
        cpf,
        email,
        senha,
        codigo
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      erro.textContent =
        dados.erro || "Não foi possível cadastrar.";
      return;
    }

    alert("Cadastro realizado com sucesso!");

    document.getElementById("cadNome").value = "";
    document.getElementById("cadCpf").value = "";
    document.getElementById("cadEmail").value = "";
    document.getElementById("cadSenha").value = "";
    document.getElementById("cadCodigo").value = "";

    mostrarLogin();

  } catch (e) {

    erro.textContent =
      "Erro de conexão com o servidor.";

  }
}

async function fazerLogin() {

  const email =
    document.getElementById("loginEmail").value.trim();

  const senha =
    document.getElementById("loginSenha").value;

  const erro =
    document.getElementById("erroLogin");

  erro.textContent = "";

  if (!email || !senha) {
    erro.textContent =
      "Digite o e-mail e a senha.";
    return;
  }

  try {

    const resposta = await fetch("/api/login", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        email,
        senha
      })

    });

    const dados = await resposta.json();

    if (!resposta.ok) {

      erro.textContent =
        dados.erro || "Login inválido.";

      return;
    }

    usuarioAtual = dados.usuario;

    pontos =
      Number(usuarioAtual.pontos || 0);

    saldo =
      Number(usuarioAtual.saldo || pontos);

    document.getElementById("nomeUsuario").textContent =
      usuarioAtual.nome;

    atualizarTela();

    mostrarTela("telaJogo");

  } catch (e) {

    erro.textContent =
      "Erro de conexão com o servidor.";

  }
}

function sortearDado() {

  const numero = Math.random();

  if (numero < 0.18) return 1;
  if (numero < 0.36) return 2;
  if (numero < 0.54) return 3;
  if (numero < 0.70) return 4;

  if (numero < 0.78) return 5;
  if (numero < 0.84) return 6;
  if (numero < 0.89) return 7;

  if (numero < 0.94) return 8;
  if (numero < 0.98) return 9;

  return 10;
}

function girarDado() {

  if (perguntaAtiva) {
    return;
  }

  const dado =
    document.getElementById("dado");

  const botao =
    document.getElementById("botaoGirar");

  botao.disabled = true;

  dado.classList.add("girando");

  const numero = sortearDado();

  setTimeout(() => {

    dado.classList.remove("girando");

    dado.textContent = numero;

    pontosDaRodada = numero;

    document.getElementById("pontosRodada").textContent =
      `Valendo ${numero} ponto${numero > 1 ? "s" : ""}!`;

    carregarPergunta();

  }, 800);
}

function carregarPergunta() {

  const pergunta =
    perguntas[
      Math.floor(
        Math.random() * perguntas.length
      )
    ];

  respostaCorreta =
    pergunta.correta;

  perguntaAtiva = true;

  document.getElementById("nivel").textContent =
    pergunta.nivel;

  document.getElementById("pergunta").textContent =
    pergunta.pergunta;

  const respostas =
    document.getElementById("respostas");

  respostas.innerHTML = "";

  pergunta.opcoes.forEach((opcao, indice) => {

    const botao =
      document.createElement("button");

    botao.textContent = opcao;

    botao.onclick = () =>
      responder(indice);

    respostas.appendChild(botao);

  });

  document.getElementById("resultado").textContent = "";

  iniciarTimer();
}

function iniciarTimer() {

  clearInterval(timerInterval);

  tempoRestante = 5;

  document.getElementById("timer").textContent =
    tempoRestante;

  timerInterval = setInterval(() => {

    tempoRestante--;

    document.getElementById("timer").textContent =
      tempoRestante;

    if (tempoRestante <= 0) {

      clearInterval(timerInterval);

      tempoEsgotado();

    }

  }, 1000);
}

function tempoEsgotado() {

  if (!perguntaAtiva) {
    return;
  }

  perguntaAtiva = false;

  pontosDaRodada = 0;

  document.getElementById("resultado").textContent =
    "⏰ Tempo esgotado! Você não ganhou os pontos.";

  bloquearRespostas();

  finalizarRodada();
}

function responder(indice) {

  if (!perguntaAtiva) {
    return;
  }

  perguntaAtiva = false;

  clearInterval(timerInterval);

  const botoes =
    document.querySelectorAll(
      "#respostas button"
    );

  botoes.forEach((botao, i) => {

    botao.disabled = true;

    if (i === respostaCorreta) {
      botao.classList.add("correta");
    }

  });

  if (indice === respostaCorreta) {

    pontos += pontosDaRodada;

    saldo += pontosDaRodada;

    document.getElementById("resultado").textContent =
      `✅ Acertou! +${pontosDaRodada} ponto${pontosDaRodada > 1 ? "s" : ""}.`;

  } else {

    botoes[indice].classList.add("errada");

    document.getElementById("resultado").textContent =
      `❌ Errou! Você não ganhou os ${pontosDaRodada} pontos.`;

    pontosDaRodada = 0;

  }

  atualizarTela();

  salvarPontuacao();

  finalizarRodada();
}

function bloquearRespostas() {

  document
    .querySelectorAll("#respostas button")
    .forEach(botao => {

      botao.disabled = true;

    });
}

function finalizarRodada() {

  document.getElementById(
    "botaoGirar"
  ).disabled = false;

  rodada++;

  document.getElementById(
    "rodada"
  ).textContent = rodada;
}

function atualizarTela() {

  document.getElementById(
    "pontos"
  ).textContent = pontos;

  document.getElementById(
    "saldo"
  ).textContent = saldo;

  document.getElementById(
    "saldoSaque"
  ).textContent = saldo;
}

async function salvarPontuacao() {

  if (!usuarioAtual) {
    return;
  }

  try {

    await fetch("/api/pontuacao", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        email: usuarioAtual.email,

        pontos,

        saldo

      })

    });

  } catch (e) {

    console.log(
      "Não foi possível salvar pontuação."
    );

  }
}

function mostrarSaque() {

  atualizarTela();

  document.getElementById(
    "resultadoSaque"
  ).textContent = "";

  mostrarTela("telaSaque");
}

async function solicitarSaque() {

  const valor =
    Number(
      document.getElementById(
        "valorSaque"
      ).value
    );

  const tipo =
    document.getElementById(
      "tipoSaque"
    ).value;

  const destino =
    document.getElementById(
      "destinoSaque"
    ).value.trim();

  const resultado =
    document.getElementById(
      "resultadoSaque"
    );

  resultado.textContent = "";

  if (!valor || valor <= 0) {

    resultado.textContent =
      "Digite a quantidade de pontos.";

    return;
  }

  if (valor < 1000) {

    resultado.textContent =
      "O saque mínimo é de 1.000 pontos.";

    return;
  }

  if (valor > saldo) {

    resultado.textContent =
      "Você não possui pontos suficientes.";

    return;
  }

  if (!destino) {

    resultado.textContent =
      "Informe a chave PIX ou e-mail do PayPal.";

    return;
  }

  try {

    const resposta =
      await fetch("/api/saque", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          email: usuarioAtual.email,

          pontos: valor,

          tipo,

          destino

        })

      });

    const dados =
      await resposta.json();

    if (!resposta.ok) {

      resultado.textContent =
        dados.erro ||
        "Não foi possível solicitar o saque.";

      return;
    }

    saldo -= valor;

    atualizarTela();

    resultado.textContent =
      "✅ Solicitação de saque enviada!";

    document.getElementById(
      "valorSaque"
    ).value = "";

    document.getElementById(
      "destinoSaque"
    ).value = "";

  } catch (e) {

    resultado.textContent =
      "Erro de conexão com o servidor.";

  }
}

function mostrarSAC() {

  document.getElementById(
    "resultadoSAC"
  ).textContent = "";

  mostrarTela("telaSAC");
}

async function enviarSAC() {

  const mensagem =
    document.getElementById(
      "mensagemSAC"
    ).value.trim();

  const resultado =
    document.getElementById(
      "resultadoSAC"
    );

  if (!mensagem) {

    resultado.textContent =
      "Digite sua mensagem.";

    return;
  }

  try {

    const resposta =
      await fetch("/api/sac", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          email: usuarioAtual.email,

          mensagem

        })

      });

    const dados =
      await resposta.json();

    if (!resposta.ok) {

      resultado.textContent =
        dados.erro ||
        "Não foi possível enviar.";

      return;
    }

    resultado.textContent =
      "✅ Mensagem enviada com sucesso.";

    document.getElementById(
      "mensagemSAC"
    ).value = "";

  } catch (e) {

    resultado.textContent =
      "Erro de conexão com o servidor.";

  }
}

function sair() {

  clearInterval(timerInterval);

  usuarioAtual = null;

  pontos = 0;

  saldo = 0;

  rodada = 1;

  pontosDaRodada = 0;

  perguntaAtiva = false;

  document.getElementById(
    "loginEmail"
  ).value = "";

  document.getElementById(
    "loginSenha"
  ).value = "";

  mostrarLogin();
      }
