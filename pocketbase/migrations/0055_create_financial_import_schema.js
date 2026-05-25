migrate(
  (app) => {
    const lancamentos = new Collection({
      name: 'lancamentos_financeiros',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'data', type: 'date', required: true },
        { name: 'data_quitacao', type: 'date' },
        { name: 'nome_negociador', type: 'text' },
        { name: 'valor', type: 'number', required: true },
        { name: 'tipo', type: 'select', values: ['REVENUE', 'EXPENSE'], required: true },
        { name: 'descricao', type: 'text' },
        { name: 'status', type: 'select', values: ['QUITADO', 'PENDENTE'] },
        { name: 'data_vencimento', type: 'date' },
        { name: 'data_competencia', type: 'date' },
        { name: 'data_pagamento_esperada', type: 'date' },
        { name: 'metodo_pagamento', type: 'text' },
        { name: 'conta_financeira', type: 'text' },
        { name: 'categoria', type: 'text' },
        { name: 'centro_custo', type: 'text' },
        { name: 'hash', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(lancamentos)

    lancamentos.addIndex('idx_lancamentos_hash', true, 'hash', '')
    app.save(lancamentos)

    const contasReceberCol = app.findCollectionByNameOrId('contas_receber')

    const recebimentos = new Collection({
      name: 'recebimentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        {
          name: 'contas_receber_id',
          type: 'relation',
          collectionId: contasReceberCol.id,
          maxSelect: 1,
        },
        { name: 'lancamento_id', type: 'relation', collectionId: lancamentos.id, maxSelect: 1 },
        { name: 'data_recebimento', type: 'date' },
        { name: 'valor_recebido', type: 'number' },
        { name: 'metodo_pagamento', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(recebimentos)

    const contasPagar = app.findCollectionByNameOrId('contas_pagar')
    if (!contasPagar.fields.getByName('lancamento_id')) {
      contasPagar.fields.add(
        new RelationField({
          name: 'lancamento_id',
          collectionId: lancamentos.id,
          maxSelect: 1,
        }),
      )
      app.save(contasPagar)
    }
  },
  (app) => {
    try {
      const contasPagar = app.findCollectionByNameOrId('contas_pagar')
      if (contasPagar.fields.getByName('lancamento_id')) {
        contasPagar.fields.removeByName('lancamento_id')
        app.save(contasPagar)
      }
    } catch (_) {}

    try {
      const recebimentos = app.findCollectionByNameOrId('recebimentos')
      app.delete(recebimentos)
    } catch (_) {}

    try {
      const lancamentos = app.findCollectionByNameOrId('lancamentos_financeiros')
      app.delete(lancamentos)
    } catch (_) {}
  },
)
