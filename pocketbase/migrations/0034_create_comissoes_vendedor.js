migrate(
  (app) => {
    const col = new Collection({
      name: 'comissoes_vendedor',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        {
          name: 'vendedor_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'venda_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('vendas').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'percentual_comissao', type: 'number', required: true },
        { name: 'valor_comissao', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'paga'],
          maxSelect: 1,
        },
        { name: 'data_calculo', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('comissoes_vendedor')
    app.delete(col)
  },
)
