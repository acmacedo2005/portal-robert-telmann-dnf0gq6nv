migrate(
  (app) => {
    const pacientes = new Collection({
      name: 'pacientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'data_nascimento', type: 'date' },
        { name: 'cpf', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'estado', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_pacientes_cpf ON pacientes (cpf) WHERE cpf != ''"],
    })
    app.save(pacientes)
  },
  (app) => {
    const pacientes = app.findCollectionByNameOrId('pacientes')
    app.delete(pacientes)
  },
)
