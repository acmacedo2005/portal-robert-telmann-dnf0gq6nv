import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import pb from '@/lib/pocketbase/client'

export default function ConfiguracoesTab() {
  const [formData, setFormData] = useState<any>({
    comissao_padrao: 0,
    taxa_cartao_padrao: 0,
    intervalo_parcelas_padrao: 30,
    max_parcelas: 12,
  })
  const { toast } = useToast()

  useEffect(() => {
    pb.collection('configuracoes_gerais')
      .getFullList()
      .then((res) => {
        if (res.length > 0) setFormData(res[0])
      })
  }, [])

  const handleSave = async () => {
    try {
      if (formData.id) await pb.collection('configuracoes_gerais').update(formData.id, formData)
      else await pb.collection('configuracoes_gerais').create(formData)
      toast({ title: 'Configurações salvas com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border max-w-xl space-y-6">
      <h2 className="text-lg font-semibold border-b pb-2">Configurações Gerais</h2>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Comissão Padrão do Vendedor (%)</Label>
          <Input
            type="number"
            value={formData.comissao_padrao}
            onChange={(e) => setFormData({ ...formData, comissao_padrao: Number(e.target.value) })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Taxa Padrão de Cartão (%)</Label>
          <Input
            type="number"
            value={formData.taxa_cartao_padrao}
            onChange={(e) =>
              setFormData({ ...formData, taxa_cartao_padrao: Number(e.target.value) })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label>Intervalo Padrão de Parcelas (dias)</Label>
          <Input
            type="number"
            value={formData.intervalo_parcelas_padrao}
            onChange={(e) =>
              setFormData({ ...formData, intervalo_parcelas_padrao: Number(e.target.value) })
            }
          />
        </div>
        <div className="grid gap-2">
          <Label>Número Máximo de Parcelas</Label>
          <Input
            type="number"
            value={formData.max_parcelas}
            onChange={(e) => setFormData({ ...formData, max_parcelas: Number(e.target.value) })}
          />
        </div>
        <Button onClick={handleSave} className="mt-4">
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
