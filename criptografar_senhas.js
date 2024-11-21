// Importa as dependências necessárias
const mysql = require('mysql');
const bcrypt = require('bcrypt');

// Configuração da conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root-frida-2017',
  database: 'seepil_database'
});

// Conecta ao banco de dados
db.connect((err) => {
  if (err) {
    return console.error('Erro ao conectar ao banco de dados:', err);
  }
  console.log('Conectado ao MySQL com sucesso!');

  // Busca todos os usuários com senhas não criptografadas
  const sql = 'SELECT id, senha FROM usuarios';
  db.query(sql, async (err, results) => {
    if (err) {
      console.error('Erro ao buscar usuários:', err);
      return db.end();
    }

    // Para cada usuário, criptografa a senha e atualiza no banco de dados
    for (let user of results) {
      // Verifica se a senha já está criptografada (opcional, caso saiba que não estão)
      const hashedPassword = await bcrypt.hash(user.senha, 10);

      // Atualiza a senha no banco de dados
      db.query(
        'UPDATE usuarios SET senha = ? WHERE id = ?',
        [hashedPassword, user.id],
        (err) => {
          if (err) {
            console.error(`Erro ao atualizar senha para o usuário com ID ${user.id}:`, err);
          } else {
            console.log(`Senha criptografada para o usuário com ID ${user.id}`);
          }
        }
      );
    }

    // Encerra a conexão com o banco de dados após a atualização
    db.end(() => {
      console.log('Conexão com o MySQL encerrada.');
    });
  });
});
