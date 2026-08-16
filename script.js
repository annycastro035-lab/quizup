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
    opcoes: ["São Paulo", "Brasília", "Rio de Janeiro", "Salvador"],
    correta: 1
  },
  {
    nivel: "FÁCIL",
    pergunta: "Quanto é 2 + 2?",
    opcoes: ["3", "4", "5", "6"],
    correta: 1
  },
  {
    nivel: "FÁCIL",
    pergunta: "Qual planeta é conhecido como Planeta Vermelho?",
    opcoes: ["Terra", "Marte", "Júpiter", "Saturno"],
    correta: 1
  },
  {
    nivel: "FÁCIL",
    pergunta: "Quantos dias tem uma semana?",
    opcoes: ["5", "6", "7", "8"],
    correta: 2
  },
  {
    nivel: "FÁCIL",
    pergunta: "Qual animal é conhecido como rei da selva?",
    opcoes: ["Tigre", "Leão", "Elefante", "Lobo"],
    correta: 1
  },
  {
    nivel: "MÉDIO",
    pergunta: "Qual é o maior planeta do Sistema Solar?",
    opcoes: ["Terra", "Marte", "Júpiter", "Netuno"],
    correta: 2
  },
  {
    nivel: "MÉDIO",
    pergunta: "Qual é o maior oceano do mundo?",
    opcoes: ["Atlântico", "Índico", "Pacífico", "Ártico"],
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
    opcoes: ["Ouro", "Oxigênio", "Ósmio", "Ozônio"],
    correta: 1
  },
  {
    nivel: "DIFÍCIL",
    pergunta: "Qual é a raiz quadrada de 144?",
    opcoes: ["10", "11", "12", "14"],
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
    opcoes: ["Coração", "Fígado", "Pele", "Pulmão"],
    correta: 2
  }
];


/* =========================
   TELAS
========================= */

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  const tela = document.getElementById(id);

  if (tela) {
    tela.classList.add("ativa");
  }
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


/* =========================
   CADASTRO
========================= */

async function cadastrar() {

  const nome =
    document.getElementById("cadNome").value.trim();

  const cpf =
    document.getElementById("cadCpf").value.trim();

  const email =
    document.getElementById("cadEmail").value.trim();

  const senha =
    document.getElementById("cadSenha").value;

  const codigo =
    document.getElementById("cadCodigo").value.trim();

  const erro =
    document.getElementById("erroCadastro");

  erro.textContent = "";


  if (!nome || !cpf || !email || !senha) {

    erro.textContent =
      "Preencha todos os campos obrigatórios.";

    return;
  }


  if (senha.length < 6) {

    erro.textContent =
      "A senha deve ter pelo menos 6 caracteres.";

    return;
  }


  try {

    const resposta =
      await fetch("/api/cadastro", {

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


    const dados =
      await resposta.json();


    if (!resposta.ok) {

      erro.textContent =
        dados.erro ||
        "Não foi possível cadastrar.";

      return;
    }


    let mensagem =
      "Cadastro realizado com sucesso!";


    if (dados.codigoIndicacao) {

      mensagem +=
        `\n\nSeu código de indicação é: ${dados.codigoIndicacao}`;

    }


    alert(mensagem);


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


/* =========================
   LOGIN
========================= */

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

    const resposta =
      await fetch("/api/login", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          senha
        })

      });


    const dados =
      await resposta.json();


    if (!resposta.ok) {

      erro.textContent =
        dados.erro ||
        "Login inválido.";

      return;
    }


    usuarioAtual =
      dados.usuario;


    pontos =
      Number(
        usuarioAtual.pontos || 0
      );


    saldo =
      Number(
        usuarioAtual.saldo || pontos
      );


    document.getElementById(
      "nomeUsuario"
    ).textContent =
      usuarioAtual.nome;


    atualizarTela();


    atualizarDadosIndicacao();


    mostrarTela("telaJogo");


  } catch (e) {

    erro.textContent =
      "Erro de conexão com o servidor.";

  }
}


/* =========================
   INDICAÇÕES
========================= */

function atualizarDadosIndicacao() {

  if (!usuarioAtual) {
    return;
  }


  const codigo =
    usuarioAtual.codigoIndicacao ||
    "--------";


  const elementoCodigo =
    document.getElementById(
      "meuCodigoIndicacao"
    );


  if (elementoCodigo) {

    elementoCodigo.textContent =
      codigo;

  }


  const plano =
    usuarioAtual.plano ||
    "GRATUITO";


  const elementoPlano =
    document.getElementById(
      "planoAtual"
    );


  if (elementoPlano) {

    elementoPlano.textContent =
      plano;

  }


  const premiumPlano =
    document.getElementById(
      "premiumPlano"
    );


  if (premiumPlano) {

    premiumPlano.textContent =
      plano;

  }


  carregarIndicacoes();
}


async function carregarIndicacoes() {

  if (!usuarioAtual) {
    return;
  }


  try {

    const resposta =
      await fetch("/api/indicacoes", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          email:
            usuarioAtual.email

        })

      });


    const dados =
      await resposta.json();


    if (!resposta.ok) {
      return;
    }


    usuarioAtual.codigoIndicacao =
      dados.codigoIndicacao ||
      usuarioAtual.codigoIndicacao;


    pontos =
      Number(
        dados.pontos ||
        usuarioAtual.pontos ||
        0
      );


    saldo =
      Number(
        dados.saldo ||
        usuarioAtual.saldo ||
        0
      );


    usuarioAtual.indicacoes =
      dados.indicacoes || [];


    atualizarTela();


    renderizarIndicacoes();


  } catch (e) {

    console.log(
      "Não foi possível carregar as indicações."
    );

  }
}


function renderizarIndicacoes() {

  const lista =
    document.getElementById(
      "listaIndicacoes"
    );


  if (!lista) {
    return;
  }


  const indicacoes =
    usuarioAtual &&
    Array.isArray(
      usuarioAtual.indicacoes
    )
      ? usuarioAtual.indicacoes
      : [];


  lista.innerHTML = "";


  if (indicacoes.length === 0) {

    lista.innerHTML = `
      <p>
        Você ainda não possui indicações.
      </p>
    `;

    return;
  }


  indicacoes.forEach(indicacao => {

    const pontosIndicacao =
      Math.min(
        Number(indicacao.pontos || 0),
        300
      );


    const percentual =
      Math.min(
        100,
        Math.round(
          (pontosIndicacao / 300) * 100
        )
      );


    const concluido =
      indicacao.status === "CONCLUÍDO" ||
      indicacao.bonusPago === true ||
      pontosIndicacao >= 300;


    const statusTexto =
      concluido
        ? "🟢 CONCLUÍDO"
        : "🟡 EM ANDAMENTO";


    const item =
      document.createElement("div");


    item.className =
      "indicacao-item";


    item.innerHTML = `

      <div>

        <strong>
          👤 ${escaparHTML(indicacao.nome)}
        </strong>

      </div>

      <p>
        Progresso:
        <strong>
          ${pontosIndicacao} / 300 pontos
        </strong>
      </p>

      <div
        style="
          width:100%;
          height:10px;
          background:#ddd;
          border-radius:10px;
          overflow:hidden;
          margin:8px 0;
        "
      >

        <div
          style="
            width:${percentual}%;
            height:100%;
            background:#4caf50;
            border-radius:10px;
          "
        ></div>

      </div>

      <p>
        🎁 Bônus:
        <strong>
          50 pontos
        </strong>
      </p>

      <p>
        ${statusTexto}
      </p>

    `;


    lista.appendChild(item);

  });

}


function escaparHTML(texto) {

  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


async function copiarCodigoIndicacao() {

  if (!usuarioAtual) {
    return;
  }


  const codigo =
    usuarioAtual.codigoIndicacao;


  if (!codigo) {

    alert(
      "Seu código de indicação ainda não está disponível."
    );

    return;
  }


  try {

    await navigator.clipboard.writeText(
      codigo
    );


    alert(
      `Código ${codigo} copiado!`
    );


  } catch (e) {

    alert(
      `Seu código de indicação é: ${codigo}`
    );

  }
}


/* =========================
   PREMIUM
========================= */

function mostrarPremium() {

  const resultado =
    document.getElementById(
      "resultadoPremium"
    );


  if (resultado) {

    resultado.textContent = "";

  }


  const plano =
    usuarioAtual &&
    usuarioAtual.plano
      ? usuarioAtual.plano
      : "GRATUITO";


  const premiumPlano =
    document.getElementById(
      "premiumPlano"
    );


  if (premiumPlano) {

    premiumPlano.textContent =
      plano;

  }


  mostrarTela("telaPremium");
}


function assinarPremium() {

  /*
   * A tela do Premium já está
   * preparada.
   *
   * Não vamos marcar a assinatura
   * como paga automaticamente.
   *
   * O preço e a forma de pagamento
   * serão conectados quando as regras
   * originais do Premium forem
   * confirmadas.
   */

  const resultado =
    document.getElementById(
      "resultadoPremium"
    );


  if (resultado) {

    resultado.textContent =
      "O plano Premium será ativado após a configuração do pagamento.";

  }
}


/* =========================
   DADO
========================= */

function sortearDado() {

  const numero =
    Math.random();


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


  const numero =
    sortearDado();


  setTimeout(() => {

    dado.classList.remove("girando");


    dado.textContent =
      numero;


    pontosDaRodada =
      numero;


    document.getElementById(
      "pontosRodada"
    ).textContent =
      `Valendo ${numero} ponto${numero > 1 ? "s" : ""}!`;


    carregarPergunta();

  }, 800);

}


/* =========================
   PERGUNTAS
========================= */

function carregarPergunta() {

  const pergunta =
    perguntas[
      Math.floor(
        Math.random() *
        perguntas.length
      )
    ];


  respostaCorreta =
    pergunta.correta;


  perguntaAtiva =
    true;


  document.getElementById(
    "nivel"
  ).textContent =
    pergunta.nivel;


  document.getElementById(
    "pergunta"
  ).textContent =
    pergunta.pergunta;


  const respostas =
    document.getElementById(
      "respostas"
    );


  respostas.innerHTML = "";


  pergunta.opcoes.forEach(
    (opcao, indice) => {

      const botao =
        document.createElement(
          "button"
        );


      botao.textContent =
        opcao;


      botao.onclick =
        () => responder(indice);


      respostas.appendChild(
        botao
      );

    }
  );


  document.getElementById(
    "resultado"
  ).textContent = "";


  iniciarTimer();

}


/* =========================
   TIMER
========================= */

function iniciarTimer() {

  clearInterval(
    timerInterval
  );


  tempoRestante =
    5;


  document.getElementById(
    "timer"
  ).textContent =
    tempoRestante;


  timerInterval =
    setInterval(() => {

      tempoRestante--;


      document.getElementById(
        "timer"
      ).textContent =
        tempoRestante;


      if (
        tempoRestante <= 0
      ) {

        clearInterval(
          timerInterval
        );


        tempoEsgotado();

      }

    }, 1000);

}


function tempoEsgotado() {

  if (!perguntaAtiva) {
    return;
  }


  perguntaAtiva =
    false;


  pontosDaRodada =
    0;


  document.getElementById(
    "resultado"
  ).textContent =
    "⏰ Tempo esgotado! Você não ganhou os pontos.";


  bloquearRespostas();


  finalizarRodada();

}


/* =========================
   RESPONDER
========================= */

function responder(indice) {

  if (!perguntaAtiva) {
    return;
  }


  perguntaAtiva =
    false;


  clearInterval(
    timerInterval
  );


  const botoes =
    document.querySelectorAll(
      "#respostas button"
    );


  botoes.forEach(
    (botao, i) => {

      botao.disabled =
        true;


      if (
        i === respostaCorreta
      ) {

        botao.classList.add(
          "correta"
        );

      }

    }
  );


  if (
    indice === respostaCorreta
  ) {

    pontos +=
      pontosDaRodada;


    saldo +=
      pontosDaRodada;


    document.getElementById(
      "resultado"
    ).textContent =
      `✅ Acertou! +${pontosDaRodada} ponto${pontosDaRodada > 1 ? "s" : ""}.`;

  } else {

    botoes[indice].classList.add(
      "errada"
    );


    document.getElementById(
      "resultado"
    ).textContent =
      `❌ Errou! Você não ganhou os ${pontosDaRodada} pontos.`;


    pontosDaRodada =
      0;

  }


  atualizarTela();


  salvarPontuacao();


  finalizarRodada();

}


/* =========================
   RESPOSTAS
========================= */

function bloquearRespostas() {

  document
    .querySelectorAll(
      "#respostas button"
    )
    .forEach(
      botao => {

        botao.disabled =
          true;

      }
    );

}


/* =========================
   FINALIZAR RODADA
========================= */

function finalizarRodada() {

  document.getElementById(
    "botaoGirar"
  ).disabled =
    false;


  rodada++;


  document.getElementById(
    "rodada"
  ).textContent =
    rodada;

}


/* =========================
   ATUALIZAR TELA
========================= */

function atualizarTela() {

  const elementoPontos =
    document.getElementById(
      "pontos"
    );


  const elementoSaldo =
    document.getElementById(
      "saldo"
    );


  const elementoSaque =
    document.getElementById(
      "saldoSaque"
    );


  if (elementoPontos) {

    elementoPontos.textContent =
      pontos;

  }


  if (elementoSaldo) {

    elementoSaldo.textContent =
      saldo;

  }


  if (elementoSaque) {

    elementoSaque.textContent =
      saldo;

  }

}


/* =========================
   SALVAR PONTUAÇÃO
========================= */

async function salvarPontuacao() {

  if (!usuarioAtual) {
    return;
  }


  try {

    const resposta =
      await fetch(
        "/api/pontuacao",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              email:
                usuarioAtual.email,

              pontos,

              saldo

            })

        }
      );


    const dados =
      await resposta.json();


    if (resposta.ok) {

      /*
       * O servidor pode ter
       * liberado um bônus para
       * o indicador deste jogador.
       */

      if (
        dados.bonusIndicacaoPago
      ) {

        carregarIndicacoes();

      }

    }

  } catch (e) {

    console.log(
      "Não foi possível salvar pontuação."
    );

  }

}


/* =========================
   SAQUE
========================= */

function mostrarSaque() {

  atualizarTela();


  document.getElementById(
    "resultadoSaque"
  ).textContent = "";


  mostrarTela(
    "telaSaque"
  );

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
      await fetch(
        "/api/saque",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              email:
                usuarioAtual.email,

              pontos:
                valor,

              tipo,

              destino

            })

        }
      );


    const dados =
      await resposta.json();


    if (!resposta.ok) {

      resultado.textContent =
        dados.erro ||
        "Não foi possível solicitar o saque.";

      return;
    }


    saldo =
      Number(
        dados.saldo
      );


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


/* =========================
   SAC
========================= */

function mostrarSAC() {

  document.getElementById(
    "resultadoSAC"
  ).textContent = "";


  mostrarTela(
    "telaSAC"
  );

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
      await fetch(
        "/api/sac",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              email:
                usuarioAtual.email,

              mensagem

            })

        }
      );


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


/* =========================
   SAIR
========================= */

function sair() {

  clearInterval(
    timerInterval
  );


  usuarioAtual =
    null;


  pontos =
    0;


  saldo =
    0;


  rodada =
    1;


  pontosDaRodada =
    0;


  perguntaAtiva =
    false;


  document.getElementById(
    "loginEmail"
  ).value = "";


  document.getElementById(
    "loginSenha"
  ).value = "";


  mostrarLogin();

  }
