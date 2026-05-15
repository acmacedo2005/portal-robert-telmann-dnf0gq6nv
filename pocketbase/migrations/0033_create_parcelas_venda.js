migrate(
  (app) => {
    const col = new Collection({
      name: 'parcelas_venda',
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
          collectionId: app.findCollectionByNameOrId('vendas').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'numero_parcela', type: 'number', required: true },
        { name: 'valor_parcela', type: 'number', required: true },
        { name: 'data_vencimento', type: 'date', required: true },
        {
          name: 'forma_pagamento',
          type: 'select',
          required: true,
          values: ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'permuta'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'paga'],
          maxSelect: 1,
        },
        { name: 'data_pagamento', type: 'date' },
        { name: 'taxa_percentual', type: 'number' },
        { name: 'valor_taxa', type: 'number' },
        { name: 'valor_liquido', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('parcelas_venda')
    app.delete(col)
  },
)
