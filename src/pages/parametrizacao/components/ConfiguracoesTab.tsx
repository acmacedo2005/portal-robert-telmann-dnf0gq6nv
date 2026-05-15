import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { Settings, Save } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function ConfiguracoesTab() {
  const [formData, setFormData] = useState<any>({
    comissao_padrao: 0,
    taxa_cartao_padrao: 0,
    intervalo_parcelas_padrao: 30,
    max_parcelas: 12,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    pb.collection('configuracoes_gerais')
      .getFullList()
      .then((res) => {
        if (res.length > 0) setFormData(res[0])
      })
      .catch(() => toast({ title: 'Erro ao carregar configurações', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  const handleSave = async () => {
    try {
      setSaving(true)
      if (formData.id) await pb.collection('configuracoes_gerais').update(formData.id, formData)
      else await pb.collection('configuracoes_gerais').create(formData)
      toast({ title: 'Configurações salvas com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border max-w-xl space-y-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border max-w-xl space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <Settings className="h-5 w-5 text-zinc-500" />
        <h2 className="text-lg font-semibold">Configurações Gerais do Sistema</h2>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label>Comissão Padrão do Vendedor (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.comissao_padrao || ''}
            onChange={(e) => setFormData({ ...formData, comissao_padrao: Number(e.target.value) })}
            placeholder="Ex: 10"
          />
        </div>
        <div className="grid gap-2">
          <Label>Taxa Padrão de Cartão (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.taxa_cartao_padrao || ''}
            onChange={(e) =>
              setFormData({ ...formData, taxa_cartao_padrao: Number(e.target.value) })
            }
            placeholder="Ex: 2.5"
          />
        </div>
        <div className="grid gap-2">
          <Label>Intervalo Padrão de Parcelas (dias)</Label>
          <Input
            type="number"
            value={formData.intervalo_parcelas_padrao || ''}
            onChange={(e) =>
              setFormData({ ...formData, intervalo_parcelas_padrao: Number(e.target.value) })
            }
            placeholder="Ex: 30"
          />
        </div>
        <div className="grid gap-2">
          <Label>Número Máximo de Parcelas</Label>
          <Input
            type="number"
            value={formData.max_parcelas || ''}
            onChange={(e) => setFormData({ ...formData, max_parcelas: Number(e.target.value) })}
            placeholder="Ex: 12"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-2" size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  )
}
