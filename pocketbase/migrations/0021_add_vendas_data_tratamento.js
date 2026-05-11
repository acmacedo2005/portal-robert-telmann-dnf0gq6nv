migrate((app) => {
  const col = app.findCollectionByNameOrId('vendas')
  col.fields.add(new DateField({ name: 'data_inicio_tratamento', required: false }))
  app.save(col)
})
