import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getVendas = async (): Promise<RecordModel[]> => {
  return pb
    .collection('vendas')
    .getFullList({ expand: 'paciente_id,vendedor_id', sort: '-created', requestKey: null })
}

export const createVenda = async (data: any): Promise<RecordModel> => {
  return pb.collection('vendas').create(data)
}

export const updateVenda = async (id: string, data: any): Promise<RecordModel> => {
  return pb.collection('vendas').update(id, data)
}

export const deleteVenda = async (id: string): Promise<void> => {
  await pb.collection('vendas').delete(id)
}
