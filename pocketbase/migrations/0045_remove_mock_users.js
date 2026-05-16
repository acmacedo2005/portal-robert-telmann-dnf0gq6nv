migrate(
  (app) => {
    const names = ['Ana Silva', 'Carlos Oliveira', 'Mariana Santos']
    const namesList = names.map((n) => `'${n}'`).join(',')

    // Delete dependencies first to ensure clean cascade and prevent orphaned records

    // 1. Pagamentos (depends on faturas)
    app
      .db()
      .newQuery(
        `DELETE FROM pagamentos WHERE fatura_id IN (SELECT id FROM faturas WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList})))`,
      )
      .execute()

    // 2. Parcelas Venda (depends on vendas)
    app
      .db()
      .newQuery(
        `DELETE FROM parcelas_venda WHERE venda_id IN (SELECT id FROM vendas WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList})))`,
      )
      .execute()

    // 3. Comissoes Vendedor (depends on vendas)
    app
      .db()
      .newQuery(
        `DELETE FROM comissoes_vendedor WHERE venda_id IN (SELECT id FROM vendas WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList})))`,
      )
      .execute()

    // 4. Saldo Tratamentos (depends on vendas/pacientes)
    app
      .db()
      .newQuery(
        `DELETE FROM saldo_tratamentos WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()

    // 5. Agendamentos
    app
      .db()
      .newQuery(
        `DELETE FROM agendamentos WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()

    // 6. Faturas
    app
      .db()
      .newQuery(
        `DELETE FROM faturas WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()

    // 7. Vendas
    app
      .db()
      .newQuery(
        `DELETE FROM vendas WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()

    // 8. Tratamentos
    app
      .db()
      .newQuery(
        `DELETE FROM tratamentos WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()

    // 9. Cirurgias
    app
      .db()
      .newQuery(
        `DELETE FROM cirurgias WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()

    // 10. Logs, files & observations
    app
      .db()
      .newQuery(
        `DELETE FROM pacientes_logs WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()
    app
      .db()
      .newQuery(
        `DELETE FROM arquivos_paciente WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()
    app
      .db()
      .newQuery(
        `DELETE FROM observacoes_paciente WHERE paciente_id IN (SELECT id FROM pacientes WHERE nome IN (${namesList}))`,
      )
      .execute()

    // Finally delete the patients
    app.db().newQuery(`DELETE FROM pacientes WHERE nome IN (${namesList})`).execute()
  },
  (app) => {
    // Irreversible migration
  },
)
