function mostrarTela(id) {

  /* LOGIN E CADASTRO */
  if (
    id === "telaLogin" ||
    id === "telaCadastro"
  ) {

    document.querySelectorAll(
      "#telaLogin, #telaCadastro, #telaJogo"
    ).forEach(function(tela) {

      tela.classList.remove("ativa");

    });

    const tela =
      document.getElementById(id);

    if (tela) {
      tela.classList.add("ativa");
    }

    return;
  }


  /* ENTRANDO NO APLICATIVO */
  const telaLogin =
    document.getElementById("telaLogin");

  const telaCadastro =
    document.getElementById("telaCadastro");

  const telaJogo =
    document.getElementById("telaJogo");


  if (telaLogin) {
    telaLogin.classList.remove("ativa");
  }

  if (telaCadastro) {
    telaCadastro.classList.remove("ativa");
  }

  if (telaJogo) {
    telaJogo.classList.add("ativa");
  }


  /* ESCONDE SOMENTE AS TELAS INTERNAS */
  document.querySelectorAll(
    "#telaJogo .conteudo > .tela"
  ).forEach(function(tela) {

    tela.classList.remove("ativa");

  });


  const telaInterna =
    document.getElementById(id);

  if (telaInterna) {
    telaInterna.classList.add("ativa");
  }
}
