import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getPacientes = async (): Promise<RecordModel[]> => {
  return pb.collection('pacientes').getFullList({ sort: 'nome' })
}

export const createPaciente = async (data: any): Promise<RecordModel> => {
  return pb.collection('pacientes').create(data)
}
