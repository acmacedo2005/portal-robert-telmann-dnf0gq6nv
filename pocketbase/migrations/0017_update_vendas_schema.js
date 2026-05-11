migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')
    col.fields.add(new DateField({ name: 'data_cirurgia' }))
    col.fields.add(new TextField({ name: 'observacoes' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('vendas')
    col.fields.removeByName('data_cirurgia')
    col.fields.removeByName('observacoes')
    app.save(col)
  },
)
