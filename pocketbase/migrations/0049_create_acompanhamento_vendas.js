migrate(
  (app) => {
    const collection = new Collection({
      name: 'acompanhamento_vendas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'mes', type: 'date', required: true },
        { name: 'vendedor', type: 'text', required: true },
        { name: 'nome_cliente', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        { name: 'valor_baixado', type: 'number', required: false },
        { name: 'valor_a_vencer', type: 'number', required: false },
        { name: 'valor_vencido', type: 'number', required: false },
        { name: 'valor_perda', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('acompanhamento_vendas')
    app.delete(collection)
  },
)
