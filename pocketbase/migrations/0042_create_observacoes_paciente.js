migrate(
  (app) => {
    // Update contas_pagar categorias to include faturas, contas_pagar, receita, despesa
    const contasPagar = app.findCollectionByNameOrId('contas_pagar')
    const catField = contasPagar.fields.getByName('categoria')
    if (catField && catField.values) {
      const toAdd = ['faturas', 'contas_pagar', 'receita', 'despesa']
      toAdd.forEach((val) => {
        if (catField.values.indexOf(val) === -1) {
          catField.values.push(val)
        }
      })
      app.save(contasPagar)
    }

    // Create observacoes_paciente
    const observacoes = new Collection({
      name: 'observacoes_paciente',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('pacientes').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'observacao', type: 'text', required: true },
        { name: 'data', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })

    app.save(observacoes)
  },
  (app) => {
    try {
      const obs = app.findCollectionByNameOrId('observacoes_paciente')
      app.delete(obs)
    } catch (e) {}
  },
)
