const mysql = require('mysql2');      // Pacote para conectar com o banco de dados MySQL


// Configuração da conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: 'localhost',        // Host onde o MySQL está rodando
  user: 'root',             // Usuário MySQL (lembre-se de mudar se necessário)
  password: 'Frida#2017+',    // Senha do MySQL (coloque a sua senha)
  database: 'seepildb'     // Nome do banco de dados que você criou
});

// Verificando a conexão com o MySQL
db.connect((err) => {
  if (err) {
    console.log('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conectado ao MySQL com sucesso!');
});

module.exports = db;