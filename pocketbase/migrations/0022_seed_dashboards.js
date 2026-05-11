migrate((app) => {
  const pacientesCol = app.findCollectionByNameOrId('pacientes')
  const cirurgiasCol = app.findCollectionByNameOrId('cirurgias')
  const tratamentosCol = app.findCollectionByNameOrId('tratamentos')
  const vendasCol = app.findCollectionByNameOrId('vendas')

  let medicoId = ''
  try {
    const m = app.findFirstRecordByData('users', 'papel', 'medico')
    medicoId = m.id
  } catch (_) {
    try {
      const ms = app.findRecordsByFilter('users', "papel = 'admin'", 'created', 1, 0)
      if (ms.length > 0) medicoId = ms[0].id
    } catch (_) {}
  }

  const mockPacientes = [
    { nome: 'João Silva', email: 'joao.s@email.com', telefone: '11988887777' },
    { nome: 'Maria Oliveira', email: 'maria.o@email.com', telefone: '11977776666' },
    { nome: 'Carlos Souza', email: 'carlos.s@email.com', telefone: '11966665555' },
    { nome: 'Ana Costa', email: 'ana.c@email.com', telefone: '11955554444' },
    { nome: 'Pedro Rocha', email: 'pedro.r@email.com', telefone: '11944443333' },
  ]

  const pIds = []
  for (const data of mockPacientes) {
    try {
      const p = app.findFirstRecordByData('pacientes', 'email', data.email)
      pIds.push(p.id)
    } catch (_) {
      const p = new Record(pacientesCol)
      p.set('nome', data.nome)
      p.set('email', data.email)
      p.set('telefone', data.telefone)
      app.save(p)
      pIds.push(p.id)
    }
  }

  try {
    app.findFirstRecordByData('vendas', 'valor_total', 15000)
  } catch (_) {
    const vendasData = [
      { pac: pIds[0], tipo: 'cirurgia', val: 15000, desc: 1000, ent: 5000, st: 'parcial' },
      { pac: pIds[1], tipo: 'tratamento', val: 2000, desc: 0, ent: 2000, st: 'paga' },
      { pac: pIds[2], tipo: 'cirurgia_tratamento', val: 18000, desc: 0, ent: 18000, st: 'paga' },
      { pac: pIds[3], tipo: 'tratamento', val: 1500, desc: 0, ent: 500, st: 'parcial' },
      { pac: pIds[4], tipo: 'cirurgia', val: 14000, desc: 500, ent: 0, st: 'pendente' },
    ]
    for (const v of vendasData) {
      const rec = new Record(vendasCol)
      rec.set('paciente_id', v.pac)
      rec.set('tipo', v.tipo)
      rec.set('valor_total', v.val)
      rec.set('desconto_cortesia', v.desc)
      rec.set('valor_final', v.val - v.desc)
      rec.set('entrada_paga', v.ent)
      rec.set('saldo_restante', Math.max(0, v.val - v.desc - v.ent))
      rec.set('status', v.st)
      rec.set('data_venda', new Date().toISOString())
      app.save(rec)
    }
  }

  try {
    app.findFirstRecordByData('tratamentos', 'sessoes_total', 5)
  } catch (_) {
    const tratData = [
      { pac: pIds[0], tipo: 'meso', ses: 5, real: 2, st: 'ativo' },
      { pac: pIds[1], tipo: 'prp', ses: 3, real: 3, st: 'concluido' },
      { pac: pIds[2], tipo: 'botox', ses: 1, real: 0, st: 'ativo' },
      { pac: pIds[3], tipo: 'meso', ses: 10, real: 5, st: 'ativo' },
      { pac: pIds[4], tipo: 'prp', ses: 4, real: 4, st: 'concluido' },
    ]
    for (const t of tratData) {
      const rec = new Record(tratamentosCol)
      rec.set('paciente_id', t.pac)
      rec.set('tipo_tratamento', t.tipo)
      rec.set('sessoes_total', t.ses)
      rec.set('sessoes_realizadas', t.real)
      rec.set('status', t.st)
      rec.set('data_inicio', new Date().toISOString())
      app.save(rec)
    }
  }

  if (medicoId) {
    try {
      app.findFirstRecordByData('cirurgias', 'valor_total', 14500)
    } catch (_) {
      const cirData = [
        { pac: pIds[0], tipo: 'FUE', val: 14500, st: 'agendada' },
        { pac: pIds[1], tipo: 'FUT', val: 12000, st: 'realizada' },
        { pac: pIds[2], tipo: 'FUE', val: 16000, st: 'agendada' },
        { pac: pIds[3], tipo: 'Outra', val: 8000, st: 'cancelada' },
        { pac: pIds[4], tipo: 'FUE', val: 15500, st: 'realizada' },
      ]
      for (const c of cirData) {
        const rec = new Record(cirurgiasCol)
        rec.set('paciente_id', c.pac)
        rec.set('medico_id', medicoId)
        rec.set('tipo', c.tipo)
        rec.set('valor_total', c.val)
        rec.set('status', c.st)
        rec.set('data_cirurgia', new Date().toISOString())
        app.save(rec)
      }
    }
  }
})
