migrate(
  (app) => {
    const collection = new Collection({
      name: 'contas_pagar',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'descricao', type: 'text', required: true },
        { name: 'fornecedor', type: 'text', required: true },
        { name: 'valor', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'vencida', 'paga'],
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['aluguel', 'fornecedores', 'salarios', 'utilitarios', 'outros'],
          maxSelect: 1,
        },
        { name: 'data_vencimento', type: 'date', required: true },
        { name: 'data_pagamento', type: 'date', required: false },
        { name: 'valor_pago', type: 'number', required: false },
        {
          name: 'metodo_pagamento',
          type: 'select',
          required: false,
          values: ['cartao', 'dinheiro', 'transferencia'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('contas_pagar')
      app.delete(collection)
    } catch (_) {}
  },
)
