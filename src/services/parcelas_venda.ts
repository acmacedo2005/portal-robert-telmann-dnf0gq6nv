import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface ParcelaVenda extends RecordModel {
  venda_id: string
  numero_parcela: number
  valor_parcela: number
  data_vencimento: string
  forma_pagamento: string
  status: 'pendente' | 'paga'
  data_pagamento?: string
  taxa_percentual?: number
  valor_taxa?: number
  valor_liquido?: number
}

export const getParcelasByVenda = (vendaId: string) =>
  pb.collection('parcelas_venda').getFullList<ParcelaVenda>({
    filter: `venda_id='${vendaId}'`,
    sort: 'numero_parcela',
  })

export const updateParcela = (id: string, data: Partial<ParcelaVenda>) =>
  pb.collection('parcelas_venda').update<ParcelaVenda>(id, data)
