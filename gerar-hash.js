const bcrypt = require("bcrypt");

async function gerarHash() {
  const senha = "39d8a0#0p!A"; // Substitua pela senha que criou no Workbench
  const hash = await bcrypt.hash(senha, 10); // 10 é o número de rounds do salt
  console.log("Hash gerado:", hash);
}

gerarHash();
