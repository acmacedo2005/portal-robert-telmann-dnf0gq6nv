migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('agendamentos')

    col.fields.add(new TextField({ name: 'pk' }))
    col.fields.add(new NumberField({ name: 'patient_id' }))
    col.fields.add(new NumberField({ name: 'physician_id' }))
    col.fields.add(new TextField({ name: 'physician_name' }))
    col.fields.add(new DateField({ name: 'date' }))
    col.fields.add(new TextField({ name: 'start_time' }))
    col.fields.add(new TextField({ name: 'end_time' }))
    col.fields.add(new TextField({ name: 'procedure_pack' }))
    col.fields.add(new TextField({ name: 'observation' }))
    col.fields.add(new DateField({ name: 'date_added' }))
    col.fields.add(new DateField({ name: 'updated_at' }))

    const statusField = col.fields.getByName('status')
    if (statusField && !statusField.values.includes('concluido')) {
      statusField.values.push('concluido')
    }

    // Make relations not strictly required to avoid import failures for unlinked legacy data
    const pacienteField = col.fields.getByName('paciente_id')
    if (pacienteField) pacienteField.required = false

    const profissionalField = col.fields.getByName('profissional_id')
    if (profissionalField) profissionalField.required = false

    const tipoField = col.fields.getByName('tipo')
    if (tipoField) tipoField.required = false

    const dataField = col.fields.getByName('data_agendamento')
    if (dataField) dataField.required = false

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('agendamentos')

    col.fields.removeByName('pk')
    col.fields.removeByName('patient_id')
    col.fields.removeByName('physician_id')
    col.fields.removeByName('physician_name')
    col.fields.removeByName('date')
    col.fields.removeByName('start_time')
    col.fields.removeByName('end_time')
    col.fields.removeByName('procedure_pack')
    col.fields.removeByName('observation')
    col.fields.removeByName('date_added')
    col.fields.removeByName('updated_at')

    const statusField = col.fields.getByName('status')
    if (statusField) {
      statusField.values = statusField.values.filter((v) => v !== 'concluido')
    }

    const pacienteField = col.fields.getByName('paciente_id')
    if (pacienteField) pacienteField.required = true

    const profissionalField = col.fields.getByName('profissional_id')
    if (profissionalField) profissionalField.required = true

    const tipoField = col.fields.getByName('tipo')
    if (tipoField) tipoField.required = true

    const dataField = col.fields.getByName('data_agendamento')
    if (dataField) dataField.required = true

    app.save(col)
  },
)
