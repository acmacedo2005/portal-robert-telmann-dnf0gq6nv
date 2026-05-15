import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface Fatura extends RecordModel {
  paciente_id: string
  valor: number
  data_vencimento: string
  data_pagamento?: string
  status: 'pendente' | 'vencida' | 'paga'
  tipo_parcela: 'entrada' | 'saldo' | 'parcelada'
  numero_parcela?: number
  observacoes?: string
  expand?: {
    paciente_id?: {
      nome: string
    }
  }
}

export const getFaturas = async (): Promise<Fatura[]> => {
  return pb.collection('faturas').getFullList<Fatura>({
    expand: 'paciente_id',
    sort: '-created',
  })
}

export const updateFatura = async (id: string, data: Partial<Fatura>): Promise<Fatura> => {
  return pb.collection('faturas').update<Fatura>(id, data)
}
