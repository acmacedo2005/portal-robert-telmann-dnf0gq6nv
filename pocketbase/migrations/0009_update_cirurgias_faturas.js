migrate(
  (app) => {
    const cirurgias = app.findCollectionByNameOrId('cirurgias')
    const tratamentos = app.findCollectionByNameOrId('tratamentos')

    if (!cirurgias.fields.getByName('tratamento_pre_id')) {
      cirurgias.fields.add(
        new RelationField({
          name: 'tratamento_pre_id',
          collectionId: tratamentos.id,
          maxSelect: 1,
        }),
      )
      app.save(cirurgias)
    }

    const faturas = app.findCollectionByNameOrId('faturas')
    if (!faturas.fields.getByName('tipo')) {
      faturas.fields.add(
        new SelectField({
          name: 'tipo',
          values: ['cirurgia', 'tratamento'],
          maxSelect: 1,
        }),
      )
    }
    if (!faturas.fields.getByName('tratamento_id')) {
      faturas.fields.add(
        new RelationField({
          name: 'tratamento_id',
          collectionId: tratamentos.id,
          maxSelect: 1,
        }),
      )
    }
    app.save(faturas)
  },
  (app) => {
    const cirurgias = app.findCollectionByNameOrId('cirurgias')
    if (cirurgias.fields.getByName('tratamento_pre_id')) {
      cirurgias.fields.removeByName('tratamento_pre_id')
      app.save(cirurgias)
    }

    const faturas = app.findCollectionByNameOrId('faturas')
    if (faturas.fields.getByName('tipo')) faturas.fields.removeByName('tipo')
    if (faturas.fields.getByName('tratamento_id')) faturas.fields.removeByName('tratamento_id')
    app.save(faturas)
  },
)
