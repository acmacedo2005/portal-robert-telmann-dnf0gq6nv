onRecordUpdateRequest((e) => {
  const auth = e.auth
  if (!auth) throw new UnauthorizedError('Não autorizado')

  const original = e.record.original()
  const role = auth.getString('papel')
  const userId = auth.id
  const createdBy = original.getString('criado_por')

  const personalFields = [
    'nome',
    'cpf',
    'email',
    'telefone',
    'whatsapp',
    'data_nascimento',
    'cep',
    'rua',
    'numero',
    'complemento',
    'cidade',
    'estado',
    'endereco',
  ]
  const changedPersonal = personalFields.some((f) => {
    return e.record.get(f) !== original.get(f)
  })

  if (changedPersonal && role !== 'admin' && createdBy !== userId && createdBy !== '') {
    throw new ForbiddenError('Apenas o admin ou o criador podem editar dados pessoais.')
  }

  const medicalFields = [
    'anamnese',
    'diagnostico',
    'observacoes_clinicas',
    'contraindicacoes',
    'alergias',
    'medicamentos_em_uso',
  ]
  const changedMedical = medicalFields.some((f) => {
    return e.record.get(f) !== original.get(f)
  })

  if (changedMedical) {
    if (role !== 'admin' && role !== 'medico') {
      throw new ForbiddenError('Apenas médicos e admins podem editar o prontuário.')
    }
  }

  e.next()
}, 'pacientes')
