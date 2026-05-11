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

export interface Cirurgia extends RecordModel {
  paciente_id: string
  data_cirurgia: string
  medico_id: string
  valor_total: number
  entrada_paga: number
  saldo_restante: number
  status: 'agendada' | 'realizada' | 'cancelada'
  observacoes?: string
  expand?: {
    paciente_id?: Paciente
    medico_id?: RecordModel
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
  expand?: {
    cirurgia_id?: Cirurgia
    paciente_id?: Paciente
  }
}

export interface Pagamento extends RecordModel {
  fatura_id: string
  valor_pago: number
  data_pagamento: string
  metodo: 'cartao' | 'dinheiro' | 'transferencia'
  observacoes?: string
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
  users: {
    medicos: () => pb.collection('users').getFullList({ filter: "papel = 'medico'" }),
  },
}
