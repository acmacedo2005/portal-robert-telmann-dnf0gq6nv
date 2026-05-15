migrate(
  (app) => {
    // 1. Users / Professionals
    const usersCol = app.findCollectionByNameOrId('users')

    const seedUsers = [
      {
        email: 'carlos@clinica.com',
        name: 'Carlos',
        papel: 'vendedor',
        especialidade: 'vendedor',
        comissao_padrao: 10,
        ativo: true,
      },
      {
        email: 'micael@clinica.com',
        name: 'Micael',
        papel: 'vendedor',
        especialidade: 'vendedor',
        comissao_padrao: 10,
        ativo: true,
      },
      {
        email: 'bruna@clinica.com',
        name: 'Bruna',
        papel: 'vendedor',
        especialidade: 'vendedor',
        comissao_padrao: 10,
        ativo: true,
      },
      {
        email: 'william@clinica.com',
        name: 'Dr. William',
        papel: 'medico',
        especialidade: 'medico',
        ativo: true,
      },
      {
        email: 'barbara@clinica.com',
        name: 'Dr. Barbara',
        papel: 'medico',
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
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('nome', u.name)
        record.set('name', u.name)
        record.set('papel', u.papel)
        record.set('especialidade', u.especialidade)
        record.set('ativo', u.ativo)
        if (u.comissao_padrao) record.set('comissao_padrao', u.comissao_padrao)
        app.save(record)
      }
    }

    // 2. Financial Categories
    const catCol = app.findCollectionByNameOrId('categorias_financeiras')
    const cats = ['aluguel', 'fornecedores', 'salarios', 'utilitarios', 'taxas_cartao', 'outros']
    for (const c of cats) {
      try {
        app.findFirstRecordByData('categorias_financeiras', 'nome', c)
      } catch (_) {
        const rec = new Record(catCol)
        rec.set('nome', c)
        rec.set('ativo', true)
        app.save(rec)
      }
    }

    // 3. Payment Methods
    const metCol = app.findCollectionByNameOrId('formas_pagamento')
    const metodos = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'permuta']
    for (const m of metodos) {
      try {
        app.findFirstRecordByData('formas_pagamento', 'nome', m)
      } catch (_) {
        const rec = new Record(metCol)
        rec.set('nome', m)
        rec.set('ativo', true)
        app.save(rec)
      }
    }

    // 4. Services
    const servCol = app.findCollectionByNameOrId('servicos')
    const servicos = [
      { nome: 'Cirurgia FUE', valor_padrao: 15000 },
      { nome: 'PRP', valor_padrao: 2500 },
      { nome: 'Mesoterapia', valor_padrao: 1500 },
      { nome: 'Retoque', valor_padrao: 8000 },
      { nome: 'Consulta', valor_padrao: 500 },
    ]
    for (const s of servicos) {
      try {
        app.findFirstRecordByData('servicos', 'nome', s.nome)
      } catch (_) {
        const rec = new Record(servCol)
        rec.set('nome', s.nome)
        rec.set('valor_padrao', s.valor_padrao)
        rec.set('ativo', true)
        app.save(rec)
      }
    }

    // 5. Global Configs
    const confCol = app.findCollectionByNameOrId('configuracoes_gerais')
    try {
      const total = app.countRecords('configuracoes_gerais')
      if (total === 0) {
        const rec = new Record(confCol)
        rec.set('comissao_padrao', 10)
        rec.set('taxa_cartao_padrao', 2.5)
        rec.set('intervalo_parcelas_padrao', 30)
        rec.set('max_parcelas', 12)
        app.save(rec)
      }
    } catch (_) {}

    // 6. Patients (307)
    const pacCol = app.findCollectionByNameOrId('pacientes')
    const count = app.countRecords('pacientes')

    if (count < 300) {
      const nomes = [
        'Silva',
        'Santos',
        'Oliveira',
        'Souza',
        'Rodrigues',
        'Ferreira',
        'Alves',
        'Pereira',
        'Lima',
        'Gomes',
        'Costa',
        'Ribeiro',
        'Martins',
        'Carvalho',
        'Almeida',
        'Lopes',
        'Soares',
        'Fernandes',
        'Vieira',
        'Barbosa',
      ]
      const primeirosNomesM = [
        'Jose',
        'Joao',
        'Antonio',
        'Francisco',
        'Carlos',
        'Paulo',
        'Pedro',
        'Lucas',
        'Luiz',
        'Marcos',
        'Gabriel',
        'Rafael',
        'Daniel',
        'Marcelo',
        'Bruno',
        'Eduardo',
        'Felipe',
        'Raimundo',
        'Rodrigo',
        'Manoel',
      ]
      const primeirosNomesF = [
        'Maria',
        'Ana',
        'Francisca',
        'Antonia',
        'Juliana',
        'Marcia',
        'Fernanda',
        'Patricia',
        'Aline',
        'Sandra',
        'Camila',
        'Amanda',
        'Bruna',
        'Jessica',
        'Leticia',
        'Julia',
        'Luciana',
        'Vanessa',
        'Mariana',
        'Vitoria',
      ]

      app.runInTransaction((txApp) => {
        for (let i = 1; i <= 307; i++) {
          const isMale = Math.random() > 0.5
          const pNome = isMale ? primeirosNomesM[i % 20] : primeirosNomesF[i % 20]
          const sNome = nomes[(i * 3) % 20]
          const tNome = nomes[(i * 7) % 20]
          const fullName = `${pNome} ${sNome} ${tNome} ${i}`

          const rec = new Record(pacCol)
          rec.set('nome', fullName)
          rec.set('genero', isMale ? 'Masculino' : 'Feminino')
          rec.set('email', `paciente${i}@exemplo.com`)
          rec.set('telefone', `11999${i.toString().padStart(5, '0')}`)
          rec.set('cidade', 'São Paulo')
          rec.set('estado', 'SP')
          rec.set('data_nascimento', '1980-01-01 12:00:00.000Z')
          txApp.save(rec)
        }
      })
    }
  },
  (app) => {
    // Irreversible macro seed. Do nothing on down.
  },
)
