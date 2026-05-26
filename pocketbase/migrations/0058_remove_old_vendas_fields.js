migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')

    let changed = false
    if (col.fields.getByName('vendedor_id')) {
      col.fields.removeByName('vendedor_id')
      changed = true
    }
    if (col.fields.getByName('servico_id')) {
      col.fields.removeByName('servico_id')
      changed = true
    }

    if (changed) {
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')

    if (!col.fields.getByName('vendedor_id')) {
      col.fields.add(
        new RelationField({ name: 'vendedor_id', collectionId: '_pb_users_auth_', maxSelect: 1 }),
      )
    }

    app.save(col)
  },
)
