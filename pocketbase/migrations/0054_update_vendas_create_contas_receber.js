migrate(
  (app) => {
    // 1. Update vendas collection schema
    const vendas = app.findCollectionByNameOrId('vendas')

    if (!vendas.fields.getByName('numero_venda')) {
      vendas.fields.add(new NumberField({ name: 'numero_venda' }))
    }
    if (!vendas.fields.getByName('data_cancelamento')) {
      vendas.fields.add(new DateField({ name: 'data_cancelamento' }))
    }

    const statusField = vendas.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        ...new Set([...statusField.values, 'cancelada', 'Cancelada', 'ativa', 'Ativa']),
      ]
    }

    app.save(vendas)

    // 2. Create contas_receber collection
    try {
      app.findCollectionByNameOrId('contas_receber')
    } catch (_) {
      const pacientes = app.findCollectionByNameOrId('pacientes')

      const cr = new Collection({
        name: 'contas_receber',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.papel = 'admin'",
        fields: [
          {
            name: 'venda_id',
            type: 'relation',
            required: true,
            collectionId: vendas.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'paciente_id',
            type: 'relation',
            required: true,
            collectionId: pacientes.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'valor_total', type: 'number', required: true },
          { name: 'valor_recebido', type: 'number', required: false },
          { name: 'valor_pendente', type: 'number', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Pendente', 'Pago', 'Parcial'],
          },
          { name: 'data_vencimento', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(cr)
    }
  },
  (app) => {
    try {
      const cr = app.findCollectionByNameOrId('contas_receber')
      app.delete(cr)
    } catch (_) {}

    try {
      const vendas = app.findCollectionByNameOrId('vendas')
      vendas.fields.removeByName('numero_venda')
      vendas.fields.removeByName('data_cancelamento')

      const statusField = vendas.fields.getByName('status')
      if (statusField) {
        statusField.values = ['pendente', 'paga', 'parcial']
      }

      app.save(vendas)
    } catch (_) {}
  },
)
