migrate(
  (app) => {
    const vendedores = new Collection({
      name: 'vendedores',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'nome_completo', type: 'text', required: true },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_vendedores_nome ON vendedores (nome_completo)'],
    })
    app.save(vendedores)

    const tipos_servico = new Collection({
      name: 'tipos_servico',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          required: false,
          values: ['Cirurgia', 'Tratamento', 'Procedimento', 'Consulta'],
        },
        { name: 'ativo', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_tipos_servico_nome ON tipos_servico (nome)'],
    })
    app.save(tipos_servico)

    const seedVendedores = [
      'Bruna de Oliveira Silva',
      'Carlos Luiz',
      'Ivone Pereira',
      'Júlio César Nunes Rodrigues',
      'Micael Caitano',
      'Robert',
    ]
    for (const v of seedVendedores) {
      const record = new Record(vendedores)
      record.set('nome_completo', v)
      record.set('ativo', true)
      app.save(record)
    }

    const seedServicos = [
      { nome: 'Transplante Capilar', cat: 'Cirurgia' },
      { nome: 'Botox', cat: 'Procedimento' },
      { nome: 'Mesoterapia', cat: 'Tratamento' },
      { nome: 'PRP', cat: 'Tratamento' },
      { nome: 'Consulta', cat: 'Consulta' },
      { nome: 'Avaliação', cat: 'Consulta' },
      { nome: 'Retorno', cat: 'Consulta' },
      { nome: 'Exames', cat: 'Procedimento' },
      { nome: 'Outros', cat: 'Tratamento' },
    ]
    for (const s of seedServicos) {
      const record = new Record(tipos_servico)
      record.set('nome', s.nome)
      record.set('categoria', s.cat)
      record.set('ativo', true)
      app.save(record)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('vendedores'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('tipos_servico'))
    } catch (_) {}
  },
)
