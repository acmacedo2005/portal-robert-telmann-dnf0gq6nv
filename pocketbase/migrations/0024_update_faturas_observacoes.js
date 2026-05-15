migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('faturas')
    if (!col.fields.getByName('observacoes')) {
      col.fields.add(new TextField({ name: 'observacoes' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('faturas')
    if (col.fields.getByName('observacoes')) {
      col.fields.removeByName('observacoes')
      app.save(col)
    }
  },
)
