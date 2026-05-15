migrate(
  (app) => {
    const contas = app.findCollectionByNameOrId('contas_pagar')
    const data = [
      {
        descricao: 'Aluguel da clínica',
        fornecedor: 'Imobiliária Central',
        valor: 5000,
        status: 'paga',
        categoria: 'aluguel',
        data_vencimento: '2026-05-10 12:00:00.000Z',
        data_pagamento: '2026-05-09 12:00:00.000Z',
        valor_pago: 5000,
        metodo_pagamento: 'transferencia',
      },
      {
        descricao: 'Conta de Luz',
        fornecedor: 'Enel',
        valor: 1200,
        status: 'pendente',
        categoria: 'utilitarios',
        data_vencimento: '2026-05-20 12:00:00.000Z',
      },
      {
        descricao: 'Materiais Cirúrgicos',
        fornecedor: 'MedSupply',
        valor: 8500,
        status: 'pendente',
        categoria: 'fornecedores',
        data_vencimento: '2026-05-25 12:00:00.000Z',
      },
      {
        descricao: 'Internet e Telefone',
        fornecedor: 'Vivo Empresas',
        valor: 350,
        status: 'vencida',
        categoria: 'utilitarios',
        data_vencimento: '2026-05-05 12:00:00.000Z',
      },
      {
        descricao: 'Folha de Pagamento',
        fornecedor: 'Funcionários',
        valor: 15000,
        status: 'pendente',
        categoria: 'salarios',
        data_vencimento: '2026-06-05 12:00:00.000Z',
      },
      {
        descricao: 'Marketing Digital',
        fornecedor: 'Agência Digital',
        valor: 2000,
        status: 'paga',
        categoria: 'outros',
        data_vencimento: '2026-05-15 12:00:00.000Z',
        data_pagamento: '2026-05-14 12:00:00.000Z',
        valor_pago: 2000,
        metodo_pagamento: 'transferencia',
      },
      {
        descricao: 'Produtos de Limpeza',
        fornecedor: 'LimpBem',
        valor: 600,
        status: 'pendente',
        categoria: 'fornecedores',
        data_vencimento: '2026-05-22 12:00:00.000Z',
      },
      {
        descricao: 'Manutenção Ar Condicionado',
        fornecedor: 'ClimaTech',
        valor: 800,
        status: 'vencida',
        categoria: 'outros',
        data_vencimento: '2026-04-30 12:00:00.000Z',
      },
    ]

    for (const item of data) {
      try {
        app.findFirstRecordByData('contas_pagar', 'descricao', item.descricao)
      } catch (_) {
        const record = new Record(contas)
        Object.entries(item).forEach(([k, v]) => record.set(k, v))
        app.save(record)
      }
    }
  },
  (app) => {
    // optionally remove mock data
  },
)
