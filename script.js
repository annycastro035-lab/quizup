/* =========================
ANÚNCIO YTRGT
========================= */

function mostrarAnuncioVideo(callback) {

  /*
  Remove anúncio anterior
  */
  const anuncioAnterior =
    document.getElementById(
      "quizupAnuncioVideo"
    );

  if (anuncioAnterior) {
    anuncioAnterior.remove();
  }

  /*
  Cria o cartão da publicidade
  */
  const card =
    document.createElement("div");

  card.id =
    "quizupAnuncioVideo";

  card.style.cssText = `
    background:#ffffff;
    border-radius:18px;
    padding:15px;
    margin:15px 0;
    text-align:center;
    box-shadow:0 4px 15px rgba(0,0,0,.08);
    position:relative;
    z-index:10;
    width:100%;
    box-sizing:border-box;
  `;

  card.innerHTML = `
    <div style="
      font-size:14px;
      font-weight:bold;
      color:#666;
      margin-bottom:10px;
    ">
      📺 PUBLICIDADE
    </div>

    <div
      id="ytrgt-3f4eb03345194e7a912e6645b56ab9fc"
      style="
        width:100%;
        min-height:200px;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        border-radius:12px;
        background:#f5f5f5;
      "
    ></div>

    <div id="quizupStatusAnuncio" style="
      font-size:12px;
      color:#999;
      margin-top:10px;
    ">
      Carregando publicidade...
    </div>
  `;

  /*
  Procura a área principal do jogo
  */
  const conteudo =
    document.querySelector(".conteudo");

  if (!conteudo) {

    console.log(
      "QuizUp: área .conteudo não encontrada."
    );

    if (callback) {
      callback();
    }

    return;
  }

  /*
  Coloca o anúncio no topo do conteúdo
  */
  conteudo.insertBefore(
    card,
    conteudo.firstChild
  );

  /*
  ID utilizado exatamente pela plataforma
  */
  const idContainer =
    "ytrgt-3f4eb03345194e7a912e6645b56ab9fc";

  const seletor =
    "#" + idContainer;

  const container =
    document.getElementById(
      idContainer
    );

  if (!container) {

    console.log(
      "QuizUp: container YTRGT não encontrado."
    );

    if (callback) {
      callback();
    }

    return;
  }

  /*
  =====================================================
  YTRGT
  CARREGAMENTO NO MESMO FORMATO DO CÓDIGO ORIGINAL
  =====================================================
  */

  (function(
    w,
    d,
    s,
    o,
    f,
    js,
    fjs
  ) {

    /*
    Cria a função/fila antes do script externo
    */
    w[o] =
      w[o] ||
      function() {

        (
          w[o].q =
          w[o].q || []
        ).push(arguments);

      };

    w[o].q =
      w[o].q || [];

    /*
    Cria o script
    */
    js =
      d.createElement(s);

    /*
    Carregamento assíncrono
    */
    js.async =
      true;

    /*
    URL EXATA fornecida pela plataforma
    */
    js.src =
      f;

    /*
    Coloca o script antes do primeiro script existente
    */
    fjs =
      d.getElementsByTagName(s)[0];

    if (fjs) {

      fjs.parentNode.insertBefore(
        js,
        fjs
      );

    } else {

      d.head.appendChild(
        js
      );

    }

  })(
    window,
    document,
    "script",
    "ytrgt",
    "https://static.servestatic.net/js/ytrgt.js"
  );

  /*
  Chamada YTRGT
  */

  try {

    ytrgt(
      "hb:load",
      seletor,
      {
        endpoint:
          "https://collect.rtb.events/hb",

        publisherId:
          "3f4eb03345194e7a912e6645b56ab9fc",

        video: {

          mimes: [
            "video/mp4"
          ],

          protocols: [
            2,
            3,
            5,
            6
          ]

        },

        videoOptions: {

          muted:
            "auto",

          skipDelay:
            5,

          replay:
            true

        },

        tmax:
          1000,

        showAdMark:
          true

      }
    );

    console.log(
      "QuizUp: solicitação YTRGT enviada."
    );

    const status =
      document.getElementById(
        "quizupStatusAnuncio"
      );

    if (status) {

      status.textContent =
        "Publicidade carregando...";

    }

  } catch (erro) {

    console.error(
      "QuizUp: erro ao iniciar YTRGT:",
      erro
    );

    const status =
      document.getElementById(
        "quizupStatusAnuncio"
      );

    if (status) {

      status.textContent =
        "Publicidade indisponível no momento.";

    }

  }

  /*
  =====================================================
  LIBERA A PRÓXIMA RODADA
  =====================================================

  Não deixamos o jogo travado caso a plataforma
  não tenha anúncio disponível.

  */
  setTimeout(
    function() {

      if (callback) {
        callback();
      }

    },
    7000
  );

}
