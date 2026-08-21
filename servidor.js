async function criarTabelas() {
  /*
   * =====================================================
   * USUÁRIOS
   * =====================================================
   *
   * O ID dos usuários é TEXT.
   * Portanto, todas as colunas que apontam para usuarios(id)
   * também precisam ser TEXT.
   */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      codigo_indicacao TEXT UNIQUE,
      indicado_por TEXT,
      pontos INTEGER NOT NULL DEFAULT 0,
      pontos_ganhos INTEGER NOT NULL DEFAULT 0,
      premium BOOLEAN NOT NULL DEFAULT FALSE,
      premium_ate TIMESTAMP NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * Se a tabela já existia, garante que indicado_por
   * tenha o mesmo tipo do usuarios.id.
   */
  await pool.query(`
    ALTER TABLE usuarios
    ALTER COLUMN id TYPE TEXT
    USING id::TEXT
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE usuarios
    ALTER COLUMN indicado_por TYPE TEXT
    USING indicado_por::TEXT
  `).catch(() => {});

  /*
   * Cria a chave estrangeira somente se ainda não existir.
   */
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'usuarios_indicado_por_fkey'
      ) THEN
        ALTER TABLE usuarios
        ADD CONSTRAINT usuarios_indicado_por_fkey
        FOREIGN KEY (indicado_por)
        REFERENCES usuarios(id)
        ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);

  /*
   * =====================================================
   * ATIVIDADES
   * =====================================================
   */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS atividades (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT,
      tipo TEXT NOT NULL,
      descricao TEXT,
      pontos INTEGER NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * Corrige bancos antigos onde usuario_id possa ter
   * sido criado com outro tipo.
   */
  await pool.query(`
    ALTER TABLE atividades
    ALTER COLUMN usuario_id TYPE TEXT
    USING usuario_id::TEXT
  `).catch(() => {});

  /*
   * Remove uma eventual FK antiga com tipo incompatível.
   */
  await pool.query(`
    DO $$
    DECLARE
      nome_constraint TEXT;
    BEGIN
      SELECT conname
      INTO nome_constraint
      FROM pg_constraint
      WHERE conrelid = 'atividades'::regclass
        AND contype = 'f'
        AND pg_get_constraintdef(oid) LIKE '%usuario_id%usuarios%';

      IF nome_constraint IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE atividades DROP CONSTRAINT %I',
          nome_constraint
        );
      END IF;
    END
    $$;
  `).catch(() => {});

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'atividades_usuario_id_fkey'
      ) THEN
        ALTER TABLE atividades
        ADD CONSTRAINT atividades_usuario_id_fkey
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);

  /*
   * =====================================================
   * MENSAGENS
   * =====================================================
   */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mensagens (
      id BIGSERIAL PRIMARY KEY,
      usuario_id TEXT,
      nome TEXT,
      email TEXT,
      assunto TEXT,
      mensagem TEXT NOT NULL,
      resposta TEXT,
      status TEXT NOT NULL DEFAULT 'ABERTO',
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      respondido_em TIMESTAMP NULL
    )
  `);

  /*
   * Corrige a estrutura de bancos antigos.
   */
  await pool.query(`
    ALTER TABLE mensagens
    ALTER COLUMN usuario_id TYPE TEXT
    USING usuario_id::TEXT
  `).catch(() => {});

  /*
   * Remove FK antiga incompatível, se existir.
   */
  await pool.query(`
    DO $$
    DECLARE
      nome_constraint TEXT;
    BEGIN
      SELECT conname
      INTO nome_constraint
      FROM pg_constraint
      WHERE conrelid = 'mensagens'::regclass
        AND contype = 'f'
        AND pg_get_constraintdef(oid) LIKE '%usuario_id%usuarios%';

      IF nome_constraint IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE mensagens DROP CONSTRAINT %I',
          nome_constraint
        );
      END IF;
    END
    $$;
  `).catch(() => {});

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'mensagens_usuario_id_fkey'
      ) THEN
        ALTER TABLE mensagens
        ADD CONSTRAINT mensagens_usuario_id_fkey
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);

  /*
   * =====================================================
   * ÍNDICES
   * =====================================================
   *
   * Aqui está o ponto que estava causando:
   *
   * column "usuario_id" does not exist
   *
   * Os índices só são criados depois que as colunas
   * foram garantidas.
   */

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_atividades_usuario
    ON atividades(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mensagens_usuario
    ON mensagens(usuario_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_usuarios_indicado_por
    ON usuarios(indicado_por)
  `);

  console.log("Estrutura do PostgreSQL verificada com sucesso.");
}
