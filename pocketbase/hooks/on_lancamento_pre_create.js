onRecordCreate((e) => {
  const record = e.record
  const tipo = record.getString('tipo')

  if (tipo === 'REVENUE' && !record.getString('venda_id')) {
    const paciente_fornecedor = record.getString('paciente_fornecedor')
    const nome_negociador = record.getString('nome_negociador')
    const searchName = paciente_fornecedor || nome_negociador
    const valor = record.getFloat('valor')

    if (searchName) {
      try {
        const pacientes = $app.findRecordsByFilter('pacientes', 'nome~{:nome}', '-created', 10, 0, {
          nome: searchName,
        })

        for (let i = 0; i < pacientes.length; i++) {
          const p = pacientes[i]
          const vendas = $app.findRecordsByFilter(
            'vendas',
            'paciente_id={:pid}',
            '-created',
            100,
            0,
            { pid: p.id },
          )

          let matchedVenda = null
          for (let j = 0; j < vendas.length; j++) {
            const v = vendas[j]
            const total = v.getFloat('valor_final') || v.getFloat('valor_total')
            if (Math.abs(total - valor) < 1.0) {
              matchedVenda = v
              break
            }
          }

          if (!matchedVenda && vendas.length > 0) {
            for (let j = 0; j < vendas.length; j++) {
              const v = vendas[j]
              const s = v.getString('status')
              if (
                s === 'pendente' ||
                s === 'Pendente' ||
                s === 'parcial' ||
                s === 'Parcialmente Quitada'
              ) {
                matchedVenda = v
                break
              }
            }
            if (!matchedVenda) matchedVenda = vendas[0]
          }

          if (matchedVenda) {
            record.set('venda_id', matchedVenda.id)
            record.set('paciente_id', p.id)
            break
          }
        }
      } catch (err) {}
    }
  }

  e.next()
}, 'lancamentos_financeiros')
