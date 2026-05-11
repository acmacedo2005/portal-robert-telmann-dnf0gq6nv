migrate(
  (app) => {
    const pacientes = app.findCollectionByNameOrId('pacientes')

    const newFields = [
      new TextField({ name: 'whatsapp' }),
      new TextField({ name: 'cep' }),
      new TextField({ name: 'rua' }),
      new TextField({ name: 'numero' }),
      new TextField({ name: 'complemento' }),
      new EditorField({ name: 'anamnese' }),
      new EditorField({ name: 'diagnostico' }),
      new EditorField({ name: 'observacoes_clinicas' }),
      new EditorField({ name: 'contraindicacoes' }),
      new EditorField({ name: 'alergias' }),
      new EditorField({ name: 'medicamentos_em_uso' }),
      new RelationField({ name: 'criado_por', collectionId: '_pb_users_auth_', maxSelect: 1 }),
    ]

    newFields.forEach((f) => {
      if (!pacientes.fields.getByName(f.name)) {
        pacientes.fields.add(f)
      }
    })

    app.save(pacientes)

    const arquivos = new Collection({
      name: 'arquivos_paciente',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.papel = 'admin' || uploader_id = @request.auth.id",
      deleteRule: "@request.auth.papel = 'admin' || uploader_id = @request.auth.id",
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: pacientes.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 10,
          maxSize: 52428800,
          mimeTypes: [],
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['foto', 'documento'],
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: [
            'antes',
            'durante',
            'depois',
            'retorno_10d',
            'retorno_30d',
            'retorno_90d',
            'retorno_180d',
            'retorno_365d',
            'prontuario_medico',
            'contrato',
            'termo_de_consentimento',
          ],
          maxSelect: 1,
        },
        {
          name: 'uploader_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(arquivos)

    const logs = new Collection({
      name: 'pacientes_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'paciente_id',
          type: 'relation',
          required: true,
          collectionId: pacientes.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'changes', type: 'json', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(logs)
  },
  (app) => {
    try {
      const logs = app.findCollectionByNameOrId('pacientes_logs')
      app.delete(logs)
    } catch (e) {}
    try {
      const arquivos = app.findCollectionByNameOrId('arquivos_paciente')
      app.delete(arquivos)
    } catch (e) {}

    const pacientes = app.findCollectionByNameOrId('pacientes')
    const fieldsToRemove = [
      'whatsapp',
      'cep',
      'rua',
      'numero',
      'complemento',
      'anamnese',
      'diagnostico',
      'observacoes_clinicas',
      'contraindicacoes',
      'alergias',
      'medicamentos_em_uso',
      'criado_por',
    ]
    fieldsToRemove.forEach((f) => {
      pacientes.fields.removeByName(f)
    })
    app.save(pacientes)
  },
)
