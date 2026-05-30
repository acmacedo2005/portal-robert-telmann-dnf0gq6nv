routerAdd(
  'POST',
  '/backend/v1/import-conta-azul-batch',
  (e) => {
    const body = e.requestInfo().body
    const batch = body.batch || []

    let results = {
      processed: 0,
      receitas: 0,
      despesas: 0,
      receitasLinked: 0,
      receitasUnlinked: 0,
      contasPagarCreated: 0,
      receitasTotal: 0,
      despesasTotal: 0,
      errors: [],
    }

    $app.runInTransaction((txApp) => {
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i]
        try {
          const isReceita = row.tipo === 'Receita' || row.tipo === 'REVENUE'
          const isDespesa = row.tipo === 'Despesa' || row.tipo === 'EXPENSE'
          const valorNumber = Number(row.valor) || 0

          const lancamento = new Record(txApp.findCollectionByNameOrId('lancamentos_financeiros'))
          lancamento.set('data', row.data || new Date().toISOString())
          lancamento.set('paciente_fornecedor', row.paciente_fornecedor || '')
          lancamento.set('valor', valorNumber)
          lancamento.set('tipo', isReceita ? 'Receita' : 'Despesa')
          lancamento.set('status', row.status === 'QUITADO' ? 'QUITADO' : 'PENDENTE')
          lancamento.set('descricao', row.descricao || '')

          txApp.save(lancamento)
          results.processed++

          if (isReceita) {
            results.receitas++
            results.receitasTotal += valorNumber

            let matchFound = false
            if (row.paciente_fornecedor) {
              const pf = row.paciente_fornecedor
              const pacientes = txApp.findRecordsByFilter('pacientes', 'nome ~ {:pf}', '', 10, 0, {
                pf: pf,
              })

              for (const p of pacientes) {
                const vendas = txApp.findRecordsByFilter(
                  'vendas',
                  "paciente_id = {:pid} && status != 'cancelada' && status != 'Cancelada'",
                  '-created',
                  50,
                  0,
                  { pid: p.id },
                )

                for (const v of vendas) {
                  const diffTotal = Math.abs((v.getFloat('valor_total') || 0) - valorNumber)
                  const diffFinal = Math.abs((v.getFloat('valor_final') || 0) - valorNumber)

                  if (diffTotal < 2 || diffFinal < 2) {
                    lancamento.set('venda_id', v.id)
                    lancamento.set('cliente_id', p.id)

                    const crs = txApp.findRecordsByFilter(
                      'contas_receber',
                      'venda_id = {:vid}',
                      '-created',
                      1,
                      0,
                      { vid: v.id },
                    )

                    if (crs.length > 0) {
                      const cr = crs[0]
                      lancamento.set('conta_receber_id', cr.id)

                      const curRecebido = cr.getFloat('valor_recebido') || 0
                      const vTotal = cr.getFloat('valor_total') || 0
                      const newRecebido = curRecebido + valorNumber

                      cr.set('valor_recebido', newRecebido)
                      cr.set('valor_pendente', Math.max(0, vTotal - newRecebido))

                      if (cr.getFloat('valor_pendente') <= 0) {
                        cr.set('status', 'Pago')
                      } else {
                        cr.set('status', 'Parcial')
                      }
                      txApp.save(cr)
                    }

                    txApp.save(lancamento)
                    matchFound = true
                    results.receitasLinked++
                    break
                  }
                }
                if (matchFound) break
              }
            }

            if (!matchFound) {
              results.receitasUnlinked++
            }
          } else if (isDespesa) {
            results.despesas++
            results.despesasTotal += valorNumber

            const cp = new Record(txApp.findCollectionByNameOrId('contas_pagar'))
            cp.set('lancamento_id', lancamento.id)
            cp.set('fornecedor', row.paciente_fornecedor || 'Fornecedor Não Identificado')
            cp.set('valor', valorNumber)
            cp.set('status', row.status === 'QUITADO' ? 'paga' : 'pendente')
            cp.set('data_vencimento', row.data || new Date().toISOString())
            cp.set('descricao', row.descricao || '')
            cp.set('categoria', 'despesa')

            if (row.status === 'QUITADO') {
              cp.set('data_pagamento', row.data || new Date().toISOString())
              cp.set('valor_pago', valorNumber)
            }

            txApp.save(cp)

            lancamento.set('conta_pagar_id', cp.id)
            txApp.save(lancamento)

            results.contasPagarCreated++
          }
        } catch (err) {
          results.errors.push('Erro na linha: ' + err.message)
        }
      }
    })

    return e.json(200, results)
  },
  $apis.requireAuth(),
)
