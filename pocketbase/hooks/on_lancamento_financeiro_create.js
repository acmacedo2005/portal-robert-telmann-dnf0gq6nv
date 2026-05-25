onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const tipo = record.getString('tipo')
  const status = record.getString('status')
  const valor = record.getFloat('valor')
  const data = record.getString('data')
  const data_quitacao = record.getString('data_quitacao')
  const data_vencimento = record.getString('data_vencimento')
  const descricao = record.getString('descricao')
  const nome_negociador = record.getString('nome_negociador')
  const metodo_pagamento = record.getString('metodo_pagamento')
  const categoria = record.getString('categoria')

  if (tipo === 'REVENUE' && status === 'QUITADO') {
    let venda = null
    try {
      const pacientes = $app.findRecordsByFilter('pacientes', `nome ~ {:nome}`, '-created', 1, 0, {
        nome: nome_negociador,
      })
      if (pacientes.length > 0) {
        const vendas = $app.findRecordsByFilter(
          'vendas',
          `paciente_id = {:pid}`,
          '-created',
          1,
          0,
          { pid: pacientes[0].id },
        )
        if (vendas.length > 0) {
          venda = vendas[0]
        }
      }
    } catch (err) {
      $app.logger().error('Error finding venda', 'err', err.message)
    }

    if (venda) {
      try {
        const contas = $app.findRecordsByFilter(
          'contas_receber',
          `venda_id = {:vid}`,
          '-created',
          1,
          0,
          { vid: venda.id },
        )
        if (contas.length > 0) {
          const conta = contas[0]
          const current_recebido = conta.getFloat('valor_recebido')
          const valor_total = conta.getFloat('valor_total')

          const new_recebido = current_recebido + valor
          const new_pendente = Math.max(0, valor_total - new_recebido)

          conta.set('valor_recebido', new_recebido)
          conta.set('valor_pendente', new_pendente)

          if (new_pendente <= 0) {
            conta.set('status', 'Pago')
          } else {
            conta.set('status', 'Parcial')
          }

          $app.save(conta)

          const recCol = $app.findCollectionByNameOrId('recebimentos')
          const recebimento = new Record(recCol)
          recebimento.set('contas_receber_id', conta.id)
          recebimento.set('lancamento_id', record.id)
          recebimento.set('data_recebimento', data)
          recebimento.set('valor_recebido', valor)

          let met = (metodo_pagamento || '').toLowerCase()
          const validMet = [
            'cartao',
            'dinheiro',
            'transferencia',
            'pix',
            'cartao_debito',
            'cartao_credito',
          ]
          if (validMet.includes(met)) {
            recebimento.set('metodo_pagamento', met)
          } else if (met.includes('pix')) {
            recebimento.set('metodo_pagamento', 'pix')
          } else {
            recebimento.set('metodo_pagamento', 'transferencia')
          }

          recebimento.set('observacoes', descricao)

          $app.save(recebimento)
        }
      } catch (err) {
        $app.logger().error('Error processing contas_receber', 'err', err.message)
      }
    } else {
      if (!descricao.includes('[UNLINKED]')) {
        record.set('descricao', '[UNLINKED] ' + (descricao || ''))
        $app.saveNoValidate(record)
      }
    }
  } else if (tipo === 'EXPENSE') {
    try {
      const cpCol = $app.findCollectionByNameOrId('contas_pagar')
      const cp = new Record(cpCol)
      cp.set('lancamento_id', record.id)
      cp.set('fornecedor', nome_negociador || 'Desconhecido')
      cp.set('valor', valor)
      cp.set('data_vencimento', data_vencimento || data)

      const allowedCategories = [
        'aluguel',
        'fornecedores',
        'salarios',
        'utilitarios',
        'outros',
        'taxas_cartao',
        'faturas',
        'contas_pagar',
        'receita',
        'despesa',
      ]
      let cat = (categoria || '').toLowerCase()
      if (!allowedCategories.includes(cat)) {
        cat = 'outros'
      }
      cp.set('categoria', cat)

      if (status === 'QUITADO' || data_quitacao) {
        cp.set('status', 'paga')
        cp.set('data_pagamento', data_quitacao || data)
        cp.set('valor_pago', valor)
      } else {
        cp.set('status', 'pendente')
      }

      cp.set('descricao', descricao || `Lançamento ${record.id}`)

      let met = (metodo_pagamento || '').toLowerCase()
      const validMet = [
        'cartao',
        'dinheiro',
        'transferencia',
        'pix',
        'cartao_debito',
        'cartao_credito',
      ]
      if (validMet.includes(met)) {
        cp.set('metodo_pagamento', met)
      } else if (met.includes('pix')) {
        cp.set('metodo_pagamento', 'pix')
      } else {
        cp.set('metodo_pagamento', 'transferencia')
      }

      $app.save(cp)
    } catch (err) {
      $app.logger().error('Error creating contas_pagar', 'err', err.message)
    }
  }

  e.next()
}, 'lancamentos_financeiros')
