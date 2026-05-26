migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')

    if (col.fields.getByName('vendedor_id')) {
      col.fields.removeByName('vendedor_id')
    }
    if (col.fields.getByName('servico_id')) {
      col.fields.removeByName('servico_id')
    }

    const vendedoresCol = app.findCollectionByNameOrId('vendedores')
    const tiposServicoCol = app.findCollectionByNameOrId('tipos_servico')

    col.fields.add(
      new RelationField({ name: 'vendedor_id', collectionId: vendedoresCol.id, maxSelect: 1 }),
    )
    col.fields.add(
      new RelationField({
        name: 'tipo_servico_id',
        collectionId: tiposServicoCol.id,
        maxSelect: 1,
      }),
    )
    col.fields.add(new NumberField({ name: 'valor_desconto' }))
    col.fields.add(
      new SelectField({
        name: 'forma_pagamento',
        values: [
          'Dinheiro',
          'Cartão de Crédito',
          'Cartão de Débito',
          'PIX',
          'Boleto',
          'Transferência',
          'Cheque',
          'Não informado',
        ],
      }),
    )
    col.fields.add(new NumberField({ name: 'quantidade_tratamento_total' }))
    col.fields.add(new NumberField({ name: 'quantidade_prp' }))
    col.fields.add(new NumberField({ name: 'quantidade_mesoterapia' }))
    col.fields.add(new NumberField({ name: 'entrada' }))
    col.fields.add(new NumberField({ name: 'valor_parcela' }))

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')
    col.fields.removeByName('vendedor_id')
    col.fields.removeByName('tipo_servico_id')
    col.fields.removeByName('valor_desconto')
    col.fields.removeByName('forma_pagamento')
    col.fields.removeByName('quantidade_tratamento_total')
    col.fields.removeByName('quantidade_prp')
    col.fields.removeByName('quantidade_mesoterapia')
    col.fields.removeByName('entrada')
    col.fields.removeByName('valor_parcela')

    col.fields.add(
      new RelationField({ name: 'vendedor_id', collectionId: '_pb_users_auth_', maxSelect: 1 }),
    )
    col.fields.add(
      new RelationField({ name: 'servico_id', collectionId: 'servicos', maxSelect: 1 }),
    )
    app.save(col)
  },
)
