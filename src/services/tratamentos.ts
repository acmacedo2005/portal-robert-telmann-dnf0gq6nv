import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getTratamentos = async (): Promise<RecordModel[]> => {
  return pb.collection('tratamentos').getFullList({ expand: 'paciente_id', sort: '-created' })
}

export const createTratamento = async (data: any): Promise<RecordModel> => {
  return pb.collection('tratamentos').create(data)
}

export const updateTratamento = async (id: string, data: any): Promise<RecordModel> => {
  return pb.collection('tratamentos').update(id, data)
}
