let usuarioAtual = null;

let pontos = 0;
let saldo = 0;
let rodada = 1;

let pontosDaRodada = 0;
let respostaCorreta = 0;

let timerInterval = null;
let tempoRestante = 5;
let perguntaAtiva = false;

/* =========================
   SESSÃO LOCAL
========================= */

const CHAVE_SESSAO = "quizup_sessao_v1";


function salvarSessaoLocal() {

  if (!usuarioAtual) {
    return;
  }

  try {

    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({
        usuario: usuarioAtual,
        pontos: pontos,
        saldo: saldo
      })
    );

  } catch (e) {

    console.log(
      "Não foi possível salvar a sessão local."
    );

  }

}


function carregarSessaoLocal() {

  try {

    const dadosSalvos =
      localStorage.getItem(
        CHAVE_SESSAO
      );

    if (!dadosSalvos) {
      return false;
    }

    const dados =
      JSON.parse(dadosSalvos);

    if (
      !dados ||
      !dados.usuario ||
      !dados.usuario.email
    ) {

      localStorage.removeItem(
        CHAVE_SESSAO
      );

      return false;
    }

    usuarioAtual =
      dados.usuario;

    pontos =
      Number(
        dados.pontos ??
        usuarioAtual.pontos ??
        0
      );

    saldo =
      Number(
        dados.saldo ??
        usuarioAtual.saldo ??
        pontos
      );

    usuarioAtual.pontos =
      pontos;

    usuarioAtual.saldo =
      saldo;

    const nomeUsuario =
      document.getElementById(
        "nomeUsuario"
      );

    if (nomeUsuario) {

      nomeUsuario.textContent =
        usuarioAtual.nome || "";

    }

    atualizarTela();

    atualizarDadosIndicacao();

    mostrarTela(
      "conteudoJogo"
    );

    return true;

  } catch (e) {

    console.log(
      "Sessão local inválida."
    );

    localStorage.removeItem(
      CHAVE_SESSAO
    );

    return false;
  }

}


/* =========================
   PERGUNTAS
========================= */

const perguntas = [

  {
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


/* =========================
   TELAS
========================= */

function mostrarTela(id) {

  const tela =
    document.getElementById(id);

  if (!tela) {
    return;
  }

  document.querySelectorAll(
    "body > .app > .tela"
  ).forEach(function(item) {

    item.classList.remove(
      "ativa"
    );

  });

  if (
    id === "telaPremium" ||
    id === "telaSaque" ||
    id === "telaSAC" ||
    id === "conteudoJogo" ||
    id === "conteudoIndicacoes"
  ) {

    const telaJogo =
      document.getElementById(
        "telaJogo"
      );

    if (telaJogo) {

      telaJogo.classList.add(
        "ativa"
      );

    }

    document.querySelectorAll(
      "#telaJogo .conteudo > .tela"
   
