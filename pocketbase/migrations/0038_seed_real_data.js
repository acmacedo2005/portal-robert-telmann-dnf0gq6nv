migrate(
  (app) => {
    // 1. Clear old mock data
    const tablesToClear = [
      'agendamentos',
      'cirurgias',
      'vendas',
      'parcelas_venda',
      'comissoes_vendedor',
      'faturas',
      'pagamentos',
      'pacientes',
      'formas_pagamento',
      'categorias_financeiras',
      'servicos',
      'contas_pagar',
    ]
    for (const table of tablesToClear) {
      app.db().newQuery(`DELETE FROM ${table}`).execute()
    }
    // Delete all users except admins and the initial seeded account
    app
      .db()
      .newQuery("DELETE FROM users WHERE papel != 'admin' AND email != 'acmacedo2005@gmail.com'")
      .execute()

    // 2. Parameterization
    const categoriasCol = app.findCollectionByNameOrId('categorias_financeiras')
    const categorias = [
      'aluguel',
      'fornecedores',
      'salarios',
      'utilitarios',
      'taxas_cartao',
      'outros',
    ]
    for (const cat of categorias) {
      const rec = new Record(categoriasCol)
      rec.set('nome', cat)
      rec.set('ativo', true)
      app.save(rec)
    }

    const formasCol = app.findCollectionByNameOrId('formas_pagamento')
    const formas = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'permuta']
    for (const f of formas) {
      const rec = new Record(formasCol)
      rec.set('nome', f)
      rec.set('ativo', true)
      app.save(rec)
    }

    const servicosCol = app.findCollectionByNameOrId('servicos')
    const servicos = [
      { nome: 'Cirurgia FUE', valor: 15000 },
      { nome: 'PRP', valor: 1500 },
      { nome: 'Mesoterapia', valor: 2000 },
      { nome: 'Retoque', valor: 5000 },
      { nome: 'Consulta', valor: 500 },
    ]
    for (const s of servicos) {
      const rec = new Record(servicosCol)
      rec.set('nome', s.nome)
      rec.set('valor_padrao', s.valor)
      rec.set('ativo', true)
      app.save(rec)
    }

    const configCol = app.findCollectionByNameOrId('configuracoes_gerais')
    app.db().newQuery('DELETE FROM configuracoes_gerais').execute()
    const cfgRec = new Record(configCol)
    cfgRec.set('comissao_padrao', 10)
    cfgRec.set('taxa_cartao_padrao', 2.5)
    cfgRec.set('intervalo_parcelas_padrao', 30)
    cfgRec.set('max_parcelas', 12)
    app.save(cfgRec)

    // 3. Sellers
    const usersCol = app.findCollectionByNameOrId('users')
    const sellers = ['Carlos', 'Micael', 'Bruna', 'Robert', 'Julio', 'Ivone', 'Caio']
    const sellerMap = {}
    for (const s of sellers) {
      const email = `${s.toLowerCase().replace(' ', '')}@clinicart.com.br`
      const rec = new Record(usersCol)
      rec.setEmail(email)
      rec.setPassword('Skip@Pass')
      rec.setVerified(true)
      rec.set('name', s)
      rec.set('nome', s)
      rec.set('papel', 'vendedor')
      rec.set('especialidade', 'vendedor')
      rec.set('comissao_padrao', 10)
      rec.set('ativo', true)
      app.save(rec)
      sellerMap[s] = rec.id
    }

    // 4. Patients
    const pacientesCol = app.findCollectionByNameOrId('pacientes')
    const patientsData = [
      {
        nome: 'João Silva',
        telefone: '11999999991',
        email: 'joao.silva@exemplo.com',
        cpf: '11111111111',
      },
      {
        nome: 'Maria Oliveira',
        telefone: '11999999992',
        email: 'maria.oli@exemplo.com',
        cpf: '22222222222',
      },
      {
        nome: 'Pedro Santos',
        telefone: '11999999993',
        email: 'pedro.santos@exemplo.com',
        cpf: '33333333333',
      },
      {
        nome: 'Lucas Costa',
        telefone: '11999999994',
        email: 'lucas.costa@exemplo.com',
        cpf: '44444444444',
      },
      {
        nome: 'Ana Pereira',
        telefone: '11999999995',
        email: 'ana.pereira@exemplo.com',
        cpf: '55555555555',
      },
      {
        nome: 'Marcos Souza',
        telefone: '11999999996',
        email: 'marcos.souza@exemplo.com',
        cpf: '66666666666',
      },
      {
        nome: 'Fernanda Lima',
        telefone: '11999999997',
        email: 'fernanda.lima@exemplo.com',
        cpf: '77777777777',
      },
    ]
    const patientMap = {}
    for (const p of patientsData) {
      const rec = new Record(pacientesCol)
      rec.set('nome', p.nome)
      rec.set('telefone', p.telefone)
      rec.set('email', p.email)
      rec.set('cpf', p.cpf)
      app.save(rec)
      patientMap[p.nome] = rec.id
    }

    // 5. Sales & Installments
    const vendasCol = app.findCollectionByNameOrId('vendas')
    const parcelasCol = app.findCollectionByNameOrId('parcelas_venda')
    const faturasCol = app.findCollectionByNameOrId('faturas')

    const salesData = [
      {
        paciente: 'João Silva',
        vendedor: 'Carlos',
        data_venda: '2023-10-01 10:00:00.000Z',
        valor_total: 15000,
        entrada_paga: 5000,
        obs: 'Cirurgia FUE',
        forma_entrada: 'pix',
        forma_parcelas: 'cartao_credito',
      },
      {
        paciente: 'Maria Oliveira',
        vendedor: 'Micael',
        data_venda: '2023-10-05 10:00:00.000Z',
        valor_total: 12000,
        entrada_paga: 12000,
        obs: 'Tratamento PRP',
        forma_entrada: 'pix',
        forma_parcelas: 'pix',
      },
      {
        paciente: 'Pedro Santos',
        vendedor: 'Bruna',
        data_venda: '2023-10-10 10:00:00.000Z',
        valor_total: 18000,
        entrada_paga: 8000,
        obs: 'Cirurgia FUT',
        forma_entrada: 'pix',
        forma_parcelas: 'cartao_credito',
      },
      {
        paciente: 'Lucas Costa',
        vendedor: 'Robert',
        data_venda: '2023-11-02 10:00:00.000Z',
        valor_total: 10000,
        entrada_paga: 2000,
        obs: 'Mesoterapia pacote',
        forma_entrada: 'dinheiro',
        forma_parcelas: 'pix',
      },
      {
        paciente: 'Ana Pereira',
        vendedor: 'Julio',
        data_venda: '2023-11-15 10:00:00.000Z',
        valor_total: 20000,
        entrada_paga: 0,
        obs: 'Cirurgia FUE VIP',
        forma_entrada: 'pix',
        forma_parcelas: 'cartao_credito',
      },
      {
        paciente: 'Marcos Souza',
        vendedor: 'Ivone',
        data_venda: '2023-12-01 10:00:00.000Z',
        valor_total: 14000,
        entrada_paga: 7000,
        obs: 'Retoque',
        forma_entrada: 'pix',
        forma_parcelas: 'dinheiro',
      },
      {
        paciente: 'Fernanda Lima',
        vendedor: 'Caio',
        data_venda: '2023-12-10 10:00:00.000Z',
        valor_total: 16000,
        entrada_paga: 1000,
        obs: 'Cirurgia FUE',
        forma_entrada: 'pix',
        forma_parcelas: 'cartao_credito',
      },
    ]

    for (const s of salesData) {
      const saldo_restante = s.valor_total - s.entrada_paga
      let status = 'pendente'
      if (saldo_restante === 0) status = 'paga'
      else if (s.entrada_paga > 0) status = 'parcial'

      const vendaRec = new Record(vendasCol)
      vendaRec.set('paciente_id', patientMap[s.paciente])
      vendaRec.set('vendedor_id', sellerMap[s.vendedor])
      vendaRec.set('data_venda', s.data_venda)
      vendaRec.set('valor_total', s.valor_total)
      vendaRec.set('valor_final', s.valor_total)
      vendaRec.set('entrada_paga', s.entrada_paga)
      vendaRec.set('saldo_restante', saldo_restante)
      vendaRec.set('status', status)
      vendaRec.set('observacoes', s.obs)
      vendaRec.set('tipo', 'cirurgia')
      app.save(vendaRec)

      let numParcela = 1
      if (s.entrada_paga > 0) {
        const pRec = new Record(parcelasCol)
        pRec.set('venda_id', vendaRec.id)
        pRec.set('numero_parcela', numParcela)
        pRec.set('valor_parcela', s.entrada_paga)
        pRec.set('data_vencimento', s.data_venda)
        pRec.set('forma_pagamento', s.forma_entrada)
        pRec.set('status', 'paga')
        pRec.set('data_pagamento', s.data_venda)
        app.save(pRec)

        // Create mirrored fatura to keep Accounts Receivable dashboards consistent
        const fRec = new Record(faturasCol)
        fRec.set('venda_id', vendaRec.id)
        fRec.set('paciente_id', patientMap[s.paciente])
        fRec.set('valor', s.entrada_paga)
        fRec.set('saldo_restante', 0)
        fRec.set('data_vencimento', s.data_venda)
        fRec.set('data_pagamento', s.data_venda)
        fRec.set('status', 'paga')
        fRec.set('tipo_parcela', 'entrada')
        fRec.set('numero_parcela', numParcela)
        app.save(fRec)

        numParcela++
      }

      if (saldo_restante > 0) {
        const parcelas = 5
        const valor_parc = saldo_restante / parcelas
        const dataVendaObj = new Date(s.data_venda)
        for (let i = 0; i < parcelas; i++) {
          const venc = new Date(dataVendaObj)
          venc.setUTCDate(venc.getUTCDate() + 30 * (i + 1))
          const vencIso = venc.toISOString().replace('T', ' ').replace('Z', '000Z')

          const pRec = new Record(parcelasCol)
          pRec.set('venda_id', vendaRec.id)
          pRec.set('numero_parcela', numParcela)
          pRec.set('valor_parcela', valor_parc)
          pRec.set('data_vencimento', vencIso)
          pRec.set('forma_pagamento', s.forma_parcelas)
          pRec.set('status', 'pendente')
          app.save(pRec)

          // Mirror for faturas
          const fRec = new Record(faturasCol)
          fRec.set('venda_id', vendaRec.id)
          fRec.set('paciente_id', patientMap[s.paciente])
          fRec.set('valor', valor_parc)
          fRec.set('saldo_restante', valor_parc)
          fRec.set('data_vencimento', vencIso)
          fRec.set('status', 'pendente')
          fRec.set('tipo_parcela', 'parcelada')
          fRec.set('numero_parcela', numParcela)
          app.save(fRec)

          numParcela++
        }
      }
    }

    // 6. Contas a Pagar
    const contasCol = app.findCollectionByNameOrId('contas_pagar')
    const contasData = [
      {
        desc: 'Aluguel Clínica',
        fornecedor: 'Imobiliária XPTO',
        valor: 5000,
        cat: 'aluguel',
        venc: '2023-11-05 12:00:00.000Z',
      },
      {
        desc: 'Materiais Cirúrgicos',
        fornecedor: 'MedSuply',
        valor: 2500,
        cat: 'fornecedores',
        venc: '2023-11-10 12:00:00.000Z',
      },
      {
        desc: 'Luz',
        fornecedor: 'Enel',
        valor: 800,
        cat: 'utilitarios',
        venc: '2023-11-15 12:00:00.000Z',
      },
    ]
    for (const c of contasData) {
      const rec = new Record(contasCol)
      rec.set('descricao', c.desc)
      rec.set('fornecedor', c.fornecedor)
      rec.set('valor', c.valor)
      rec.set('categoria', c.cat)
      rec.set('status', 'pendente')
      rec.set('data_vencimento', c.venc)
      app.save(rec)
    }
  },
  (app) => {
    // Empty down
  },
)
