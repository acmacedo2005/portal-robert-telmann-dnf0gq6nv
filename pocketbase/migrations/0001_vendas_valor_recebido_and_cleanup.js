migrate(
  (app) => {
    const vendasCol = app.findCollectionByNameOrId('vendas')

    if (!vendasCol.fields.getByName('valor_recebido')) {
      vendasCol.fields.add(new NumberField({ name: 'valor_recebido' }))
    }

    const statusField = vendasCol.fields.getByName('status')
    if (statusField) {
      const existing = statusField.values || []
      const required = ['Quitada', 'Parcialmente Quitada', 'Pendente']
      const merged = []
      for (let i = 0; i < existing.length; i++) {
        if (merged.indexOf(existing[i]) === -1) merged.push(existing[i])
      }
      for (let i = 0; i < required.length; i++) {
        if (merged.indexOf(required[i]) === -1) merged.push(required[i])
      }
      statusField.values = merged
    }

    app.save(vendasCol)

    try {
      const contas = app.findRecordsByFilter('contas_pagar', '', '', 10000, 0)
      for (let i = 0; i < contas.length; i++) {
        const c = contas[i]
        const lId = c.getString('lancamento_id')
        if (lId) {
          try {
            const l = app.findRecordById('lancamentos_financeiros', lId)
            if (l.getString('tipo') === 'REVENUE') {
              app.delete(c)
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  },
  (app) => {},
)
