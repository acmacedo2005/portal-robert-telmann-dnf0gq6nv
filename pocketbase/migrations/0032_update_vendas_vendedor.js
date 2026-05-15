migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')
    if (!col.fields.getByName('vendedor_id')) {
      col.fields.add(
        new RelationField({
          name: 'vendedor_id',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')
    col.fields.removeByName('vendedor_id')
    app.save(col)
  },
)
