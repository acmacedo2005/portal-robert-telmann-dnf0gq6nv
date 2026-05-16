migrate((app) => {
  const col = app.findCollectionByNameOrId('pacientes')
  if (!col.fields.getByName('bairro')) {
    col.fields.add(new TextField({ name: 'bairro' }))
  }
  app.save(col)
})
