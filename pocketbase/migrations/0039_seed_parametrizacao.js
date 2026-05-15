migrate(
  (app) => {
    // 1. Update users deleteRule so admins can delete users
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.deleteRule = "@request.auth.papel = 'admin' || id = @request.auth.id"
    app.save(usersCol)

    // 2. Seed Users
    const seedUsers = [
      {
        email: 'vend1@telmann.com',
        papel: 'vendedor',
        nome: 'Ana Silva',
        especialidade: 'vendedor',
        comissao_padrao: 10,
        ativo: true,
      },
      {
        email: 'vend2@telmann.com',
        papel: 'vendedor',
        nome: 'Carlos Souza',
        especialidade: 'vendedor',
        comissao_padrao: 12,
        ativo: true,
      },
      {
        email: 'admin1@telmann.com',
        papel: 'administrativo',
        nome: 'Admin Principal',
        especialidade: 'administrativo',
        ativo: true,
      },
      {
        email: 'fin1@telmann.com',
        papel: 'financeiro',
        nome: 'Fernanda Costa',
        especialidade: 'financeiro',
        ativo: true,
      },
      {
        email: 'med1@telmann.com',
        papel: 'medico',
        nome: 'Dr. Roberto Telmann',
        especialidade: 'medico',
        ativo: true,
      },
    ]
    for (const u of seedUsers) {
      try {
        app.findAuthRecordByEmail('users', u.email)
      } catch (_) {
        const record = new Record(usersCol)
        record.setEmail(u.email)
        record.setPassword('Skip@Pass123')
        record.setVerified(true)
        record.set('papel', u.papel)
        record.set('nome', u.nome)
        record.set('especialidade', u.especialidade)
        if (u.comissao_padrao) record.set('comissao_padrao', u.comissao_padrao)
        record.set('ativo', u.ativo)
        app.save(record)
      }
    }

    // 3. Categorias Financeiras
    const catCol = app.findCollectionByNameOrId('categorias_financeiras')
    const cats = ['aluguel', 'fornecedores', 'salarios', 'utilitarios', 'taxas_cartao', 'outros']
    for (const c of cats) {
      try {
        app.findFirstRecordByData('categorias_financeiras', 'nome', c)
      } catch (_) {
        const record = new Record(catCol)
        record.set('nome', c)
        record.set('ativo', true)
        app.save(record)
      }
    }

    // 4. Formas de Pagamento
    const formCol = app.findCollectionByNameOrId('formas_pagamento')
    const formas = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'permuta']
    for (const f of formas) {
      try {
        app.findFirstRecordByData('formas_pagamento', 'nome', f)
      } catch (_) {
        const record = new Record(formCol)
        record.set('nome', f)
        record.set('ativo', true)
        app.save(record)
      }
    }

    // 5. Servicos
    const servCol = app.findCollectionByNameOrId('servicos')
    const servs = [
      { nome: 'Cirurgia FUE', valor_padrao: 15000 },
      { nome: 'PRP', valor_padrao: 350 },
      { nome: 'Mesoterapia', valor_padrao: 250 },
      { nome: 'Retoque', valor_padrao: 0 },
      { nome: 'Consulta', valor_padrao: 300 },
    ]
    for (const s of servs) {
      try {
        app.findFirstRecordByData('servicos', 'nome', s.nome)
      } catch (_) {
        const record = new Record(servCol)
        record.set('nome', s.nome)
        record.set('valor_padrao', s.valor_padrao)
        record.set('ativo', true)
        app.save(record)
      }
    }

    // 6. Configuracoes Gerais
    const confCol = app.findCollectionByNameOrId('configuracoes_gerais')
    const totalConf = app.countRecords('configuracoes_gerais')
    if (totalConf === 0) {
      const record = new Record(confCol)
      record.set('comissao_padrao', 10)
      record.set('taxa_cartao_padrao', 2.5)
      record.set('intervalo_parcelas_padrao', 30)
      record.set('max_parcelas', 12)
      app.save(record)
    }
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.deleteRule = 'id = @request.auth.id'
    app.save(usersCol)
  },
)
