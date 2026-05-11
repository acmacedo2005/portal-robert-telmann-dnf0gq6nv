migrate((app) => {
  const cirurgias = app.findCollectionByNameOrId('cirurgias')
  cirurgias.fields.add(
    new SelectField({
      name: 'tipo',
      values: ['FUE', 'FUT', 'Outra'],
      required: false,
    }),
  )
  app.save(cirurgias)
})
