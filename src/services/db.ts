import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface Paciente extends RecordModel {
  nome: string
  telefone?: string
  email?: string
  data_nascimento?: string
  cpf?: string
  endereco?: string
  cidade?: string
  estado?: string
}

export interface Tratamento extends RecordModel {
  paciente_id: string
  tipo_tratamento: 'meso' | 'prp' | 'botox'
  data_inicio?: string
  data_fim?: string
  valor_total?: number
  sessoes_total?: number
  sessoes_realizadas?: number
  status: 'ativo' | 'concluido' | 'cancelado'
  expand?: {
    paciente_id?: Paciente
  }
}

export interface RetornoAutomatico extends RecordModel {
  cirurgia_id: string
  dias_apos: '10' | '30' | '90' | '180' | '365'
  tipo_retorno?: 'online' | 'presencial'
  profissional_tipo?: 'enfermagem' | 'medico'
  status: 'agendado' | 'realizado' | 'cancelado'
  data_agendamento_gerada?: string
  expand?: {
    cirurgia_id?: Cirurgia
  }
}

export interface Agendamento extends RecordModel {
  paciente_id: string
  tipo: 'cirurgia' | 'tratamento' | 'avaliacao' | 'retorno'
  data_agendamento: string
  hora_agendamento?: string
  profissional_id: string
  status: 'agendado' | 'realizada' | 'cancelado' | 'rascunho' | 'concluido'
  observacoes?: string
  cirurgia_id?: string
  tratamento_id?: string
  retorno_automatico_id?: string
  pk?: string
  patient_id?: number
  physician_id?: number
  physician_name?: string
  date?: string
  start_time?: string
  end_time?: string
  procedure_pack?: string
  observation?: string
  date_added?: string
  updated_at?: string
  expand?: {
    paciente_id?: Paciente
    profissional_id?: RecordModel
    cirurgia_id?: Cirurgia
    tratamento_id?: Tratamento
    retorno_automatico_id?: RetornoAutomatico
  }
}

export interface Cirurgia extends RecordModel {
  paciente_id: string
  data_cirurgia: string
  medico_id: string
  valor_total: number
  entrada_paga: number
  saldo_restante: number
  status: 'agendada' | 'realizada' | 'cancelada'
  observacoes?: string
  tratamento_pre_id?: string
  expand?: {
    paciente_id?: Paciente
    medico_id?: RecordModel
    tratamento_pre_id?: Tratamento
  }
}

export interface Fatura extends RecordModel {
  cirurgia_id: string
  paciente_id: string
  valor: number
  data_vencimento: string
  data_pagamento?: string
  status: 'pendente' | 'vencida' | 'paga'
  tipo_parcela: 'entrada' | 'saldo' | 'parcelada'
  numero_parcela?: number
  tipo?: 'cirurgia' | 'tratamento'
  tratamento_id?: string
  expand?: {
    cirurgia_id?: Cirurgia
    paciente_id?: Paciente
    tratamento_id?: Tratamento
  }
}

export interface Pagamento extends RecordModel {
  fatura_id: string
  valor_pago: number
  data_pagamento: string
  metodo: 'cartao' | 'dinheiro' | 'transferencia'
  observacoes?: string
}

export interface AcompanhamentoVendas extends RecordModel {
  mes: string
  vendedor: string
  nome_cliente: string
  valor: number
  valor_baixado: number
  valor_a_vencer: number
  valor_vencido: number
  valor_perda: number
}

export const api = {
  pacientes: {
    list: () => pb.collection<Paciente>('pacientes').getFullList({ sort: '-created' }),
    create: (data: Partial<Paciente>) => pb.collection('pacientes').create(data),
    update: (id: string, data: Partial<Paciente>) => pb.collection('pacientes').update(id, data),
    delete: (id: string) => pb.collection('pacientes').delete(id),
  },
  cirurgias: {
    list: () =>
      pb
        .collection<Cirurgia>('cirurgias')
        .getFullList({ sort: 'data_cirurgia', expand: 'paciente_id,medico_id' }),
    create: (data: Partial<Cirurgia>) => pb.collection('cirurgias').create(data),
    update: (id: string, data: Partial<Cirurgia>) => pb.collection('cirurgias').update(id, data),
  },
  faturas: {
    list: () =>
      pb
        .collection<Fatura>('faturas')
        .getFullList({ sort: 'data_vencimento', expand: 'cirurgia_id,paciente_id' }),
  },
  pagamentos: {
    create: (data: Partial<Pagamento>) => pb.collection('pagamentos').create(data),
  },
  tratamentos: {
    list: () =>
      pb
        .collection<Tratamento>('tratamentos')
        .getFullList({ sort: '-created', expand: 'paciente_id' }),
    create: (data: Partial<Tratamento>) => pb.collection('tratamentos').create(data),
    update: (id: string, data: Partial<Tratamento>) =>
      pb.collection('tratamentos').update(id, data),
  },
  agendamentos: {
    list: () =>
      pb
        .collection<Agendamento>('agendamentos')
        .getFullList({ sort: '-data_agendamento', expand: 'paciente_id,profissional_id' }),
    create: (data: Partial<Agendamento>) => pb.collection('agendamentos').create(data),
    update: (id: string, data: Partial<Agendamento>) =>
      pb.collection('agendamentos').update(id, data),
  },
  retornos_automaticos: {
    list: () =>
      pb
        .collection<RetornoAutomatico>('retornos_automaticos')
        .getFullList({ sort: '-created', expand: 'cirurgia_id' }),
  },
  users: {
    medicos: () => pb.collection('users').getFullList({ filter: "papel = 'medico'" }),
    list: () => pb.collection('users').getFullList(),
  },
  acompanhamento_vendas: {
    list: () =>
      pb
        .collection<AcompanhamentoVendas>('acompanhamento_vendas')
        .getFullList({ sort: '-created' }),
    create: (data: Partial<AcompanhamentoVendas>) =>
      pb.collection('acompanhamento_vendas').create(data),
  },
}
