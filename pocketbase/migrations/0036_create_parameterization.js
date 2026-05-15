migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const papelField = users.fields.getByName('papel')
    papelField.values = [
      'admin',
      'vendedor',
      'financeiro',
      'medico',
      'enfermagem',
      'administrativo',
      'tecnico_cirurgia',
    ]

    if (!users.fields.getByName('comissao_padrao')) {
      users.fields.add(new NumberField({ name: 'comissao_padrao' }))
    }
    if (!users.fields.getByName('telefone')) {
      users.fields.add(new TextField({ name: 'telefone' }))
    }
    if (!users.fields.getByName('especialidade')) {
      users.fields.add(
        new SelectField({
          name: 'especialidade',
          values: [
            'vendedor',
            'administrativo',
            'financeiro',
            'medico',
            'tecnico_cirurgia',
            'enfermagem',
          ],
          maxSelect: 1,
        }),
      )
    }

    // Update users rules so admin can manage team
    users.listRule =
      "@request.auth.id != '' && (@request.auth.papel = 'admin' || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.papel = 'admin' || id = @request.auth.id)"
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.papel = 'admin' || id = @request.auth.id)"
    app.save(users)

    const catFin = new Collection({
      name: 'categorias_financeiras',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(catFin)

    const formasPag = new Collection({
      name: 'formas_pagamento',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(formasPag)

    const servicos = new Collection({
      name: 'servicos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.papel = 'admin'",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'valor_padrao', type: 'number', required: true },
        { name: 'ativo', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(servicos)

    const config = new Collection({
      name: 'configuracoes_gerais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.papel = 'admin'",
      updateRule: "@request.auth.papel = 'admin'",
      deleteRule: null,
      fields: [
        { name: 'comissao_padrao', type: 'number' },
        { name: 'taxa_cartao_padrao', type: 'number' },
        { name: 'intervalo_parcelas_padrao', type: 'number' },
        { name: 'max_parcelas', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(config)

    const vendas = app.findCollectionByNameOrId('vendas')
    if (!vendas.fields.getByName('servico_id')) {
      vendas.fields.add(
        new RelationField({ name: 'servico_id', collectionId: servicos.id, maxSelect: 1 }),
      )
    }
    app.save(vendas)

    const contasPagar = app.findCollectionByNameOrId('contas_pagar')
    if (!contasPagar.fields.getByName('categoria_id')) {
      contasPagar.fields.add(
        new RelationField({ name: 'categoria_id', collectionId: catFin.id, maxSelect: 1 }),
      )
    }
    if (!contasPagar.fields.getByName('forma_pagamento_id')) {
      contasPagar.fields.add(
        new RelationField({ name: 'forma_pagamento_id', collectionId: formasPag.id, maxSelect: 1 }),
      )
    }
    app.save(contasPagar)

    const parcelasVenda = app.findCollectionByNameOrId('parcelas_venda')
    if (!parcelasVenda.fields.getByName('forma_pagamento_id')) {
      parcelasVenda.fields.add(
        new RelationField({ name: 'forma_pagamento_id', collectionId: formasPag.id, maxSelect: 1 }),
      )
    }
    app.save(parcelasVenda)
  },
  (app) => {},
)
