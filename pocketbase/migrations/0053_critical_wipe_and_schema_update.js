migrate(
  (app) => {
    const collectionsToWipe = [
      'observacoes_paciente',
      'arquivos_paciente',
      'saldo_tratamentos',
      'faturas',
      'agendamentos',
      'vendas',
      'pacientes',
    ]

    for (const name of collectionsToWipe) {
      try {
        app
          .db()
          .newQuery('DELETE FROM ' + name)
          .execute()
      } catch (e) {
        console.log('Could not wipe ' + name + ': ' + e.message)
      }
    }
    console.log('IRREVERSIBLE OPERATION: Collections wiped for critical database reset.')

    const pacientes = app.findCollectionByNameOrId('pacientes')

    const cpfField = pacientes.fields.getByName('cpf')
    if (cpfField) {
      cpfField.name = 'cpf_cnpj'
    } else if (!pacientes.fields.getByName('cpf_cnpj')) {
      pacientes.fields.add(new TextField({ name: 'cpf_cnpj' }))
    }

    if (!pacientes.fields.getByName('tipo')) pacientes.fields.add(new TextField({ name: 'tipo' }))
    if (!pacientes.fields.getByName('tipo_pessoa'))
      pacientes.fields.add(
        new SelectField({ name: 'tipo_pessoa', values: ['F', 'J'], maxSelect: 1 }),
      )
    if (!pacientes.fields.getByName('inscricao_estadual'))
      pacientes.fields.add(new TextField({ name: 'inscricao_estadual' }))
    if (!pacientes.fields.getByName('dt_aniversario'))
      pacientes.fields.add(new DateField({ name: 'dt_aniversario' }))
    if (!pacientes.fields.getByName('fone_comercial'))
      pacientes.fields.add(new TextField({ name: 'fone_comercial' }))
    if (!pacientes.fields.getByName('fone_celular'))
      pacientes.fields.add(new TextField({ name: 'fone_celular' }))

    pacientes.removeIndex('idx_pacientes_cpf')
    pacientes.addIndex('idx_pacientes_cpf_cnpj', true, 'cpf_cnpj', "cpf_cnpj != ''")

    app.save(pacientes)

    try {
      const admin = app.findAuthRecordByEmail('users', 'acmacedo2005@gmail.com')
      admin.set('papel', 'admin')
      app.save(admin)
    } catch (e) {}
  },
  (app) => {
    // Irreversible data wipe. Schema revert not applied.
  },
)
