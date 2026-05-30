migrate(
  (app) => {
    // 1. Delete contas_pagar that were incorrectly created from REVENUE records
    app
      .db()
      .newQuery(`
    DELETE FROM contas_pagar 
    WHERE lancamento_id IN (
      SELECT id FROM lancamentos_financeiros WHERE tipo = 'REVENUE'
    )
  `)
      .execute()

    // 2. Ensure every venda has a contas_receber record
    app
      .db()
      .newQuery(`
    INSERT INTO contas_receber (
      id, venda_id, paciente_id, valor_total, valor_recebido, valor_pendente, 
      status, data_vencimento, created, updated
    )
    SELECT 
      substr(lower(hex(randomblob(8))), 1, 15),
      v.id,
      v.paciente_id,
      COALESCE(v.valor_final, v.valor_total, 0),
      COALESCE(v.valor_final, v.valor_total, 0) - COALESCE(v.saldo_restante, 0),
      COALESCE(v.saldo_restante, 0),
      CASE 
        WHEN COALESCE(v.saldo_restante, 0) <= 0 THEN 'Pago'
        WHEN COALESCE(v.valor_final, v.valor_total, 0) - COALESCE(v.saldo_restante, 0) > 0 THEN 'Parcial'
        ELSE 'Pendente'
      END,
      COALESCE(v.data_venda, strftime('%Y-%m-%d %H:%M:%fZ', 'now')),
      strftime('%Y-%m-%d %H:%M:%fZ', 'now'),
      strftime('%Y-%m-%d %H:%M:%fZ', 'now')
    FROM vendas v
    WHERE v.id NOT IN (SELECT venda_id FROM contas_receber WHERE venda_id IS NOT NULL AND venda_id != '')
  `)
      .execute()

    // 3. Create missing recebimentos for existing REVENUE lancamentos
    app
      .db()
      .newQuery(`
    INSERT INTO recebimentos (
      id, contas_receber_id, lancamento_id, data_recebimento, valor_recebido, created, updated
    )
    SELECT
      substr(lower(hex(randomblob(8))), 1, 15),
      cr.id,
      lf.id,
      lf.data,
      lf.valor,
      strftime('%Y-%m-%d %H:%M:%fZ', 'now'),
      strftime('%Y-%m-%d %H:%M:%fZ', 'now')
    FROM lancamentos_financeiros lf
    JOIN contas_receber cr ON cr.venda_id = lf.venda_id
    WHERE lf.tipo = 'REVENUE' AND lf.status = 'QUITADO' AND lf.venda_id != ''
      AND lf.id NOT IN (SELECT lancamento_id FROM recebimentos WHERE lancamento_id IS NOT NULL AND lancamento_id != '')
  `)
      .execute()

    // 4. Update contas_receber valor_recebido and valor_pendente based on recebimentos
    app
      .db()
      .newQuery(`
    UPDATE contas_receber
    SET 
      valor_recebido = (
        SELECT COALESCE(SUM(valor_recebido), 0) 
        FROM recebimentos 
        WHERE contas_receber_id = contas_receber.id
      ),
      valor_pendente = MAX(0, COALESCE(valor_total, 0) - (
        SELECT COALESCE(SUM(valor_recebido), 0) 
        FROM recebimentos 
        WHERE contas_receber_id = contas_receber.id
      )),
      updated = strftime('%Y-%m-%d %H:%M:%fZ', 'now')
    WHERE id IN (
      SELECT contas_receber_id FROM recebimentos WHERE contas_receber_id IS NOT NULL AND contas_receber_id != ''
    )
  `)
      .execute()

    // 5. Update contas_receber status
    app
      .db()
      .newQuery(`
    UPDATE contas_receber
    SET status = CASE 
      WHEN valor_pendente <= 0 THEN 'Pago'
      WHEN valor_recebido > 0 THEN 'Parcial'
      ELSE 'Pendente'
    END
  `)
      .execute()

    // 6. Sync vendas saldo_restante and status
    // Exclude canceled vendas from status update
    app
      .db()
      .newQuery(`
    UPDATE vendas
    SET 
      saldo_restante = cr.valor_pendente,
      status = CASE 
        WHEN vendas.status IN ('cancelada', 'Cancelada') THEN vendas.status
        WHEN cr.valor_pendente <= 0 THEN 'finalizada'
        WHEN cr.valor_recebido > 0 THEN 'parcial'
        ELSE 'pendente'
      END,
      updated = strftime('%Y-%m-%d %H:%M:%fZ', 'now')
    FROM contas_receber cr
    WHERE vendas.id = cr.venda_id
  `)
      .execute()
  },
  (app) => {
    // Revert safely omitted
  },
)
