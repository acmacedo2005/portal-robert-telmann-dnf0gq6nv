migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pacientes')
    if (!col.fields.getByName('genero')) {
      col.fields.add(new TextField({ name: 'genero' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pacientes')
    col.fields.removeByName('genero')
    app.save(col)
  },
)
