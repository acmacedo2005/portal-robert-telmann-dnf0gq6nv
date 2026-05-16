migrate(
  (app) => {
    // Clear all mock data to prepare the environment for the real data import
    // as per the requirement to sanitize and remove demonstration data.
    const tablesToClear = [
      'pacientes_logs',
      'arquivos_paciente',
      'saldo_tratamentos',
      'comissoes_vendedor',
      'parcelas_venda',
      'pagamentos',
      'faturas',
      'contas_pagar',
      'vendas',
      'agendamentos',
      'retornos_automaticos',
      'tratamentos',
      'cirurgias',
      'pacientes',
    ]

    for (const table of tablesToClear) {
      try {
        if (app.hasTable(table)) {
          app.db().newQuery(`DELETE FROM ${table}`).execute()
        }
      } catch (e) {
        console.log(`Failed to clear table ${table}`, e)
      }
    }
  },
  (app) => {
    // No down migration - data deletion is destructive
  },
)
