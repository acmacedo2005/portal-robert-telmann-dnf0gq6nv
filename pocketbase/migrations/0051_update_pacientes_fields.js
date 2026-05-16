migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pacientes')

    if (!col.fields.getByName('patient_id')) col.fields.add(new NumberField({ name: 'patient_id' }))
    if (!col.fields.getByName('civil_name')) col.fields.add(new TextField({ name: 'civil_name' }))
    if (!col.fields.getByName('rg')) col.fields.add(new TextField({ name: 'rg' }))
    if (!col.fields.getByName('home_phone')) col.fields.add(new TextField({ name: 'home_phone' }))
    if (!col.fields.getByName('ativo')) col.fields.add(new BoolField({ name: 'ativo' }))

    col.addIndex('idx_pacientes_patient_id', false, 'patient_id', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pacientes')
    col.removeIndex('idx_pacientes_patient_id')

    col.fields.removeByName('patient_id')
    col.fields.removeByName('civil_name')
    col.fields.removeByName('rg')
    col.fields.removeByName('home_phone')
    col.fields.removeByName('ativo')

    app.save(col)
  },
)
