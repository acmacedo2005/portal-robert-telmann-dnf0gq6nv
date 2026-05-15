import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import pb from '@/lib/pocketbase/client'
import { addDays } from 'date-fns'

export default function NovaVendaDialog({ open, setOpen, onSave }: any) {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [formas, setFormas] = useState<any[]>([])
  const [config, setConfig] = useState<any>({})
  const [form, setForm] = useState<any>({
    paciente_id: '',
    vendedor_id: '',
    valor_total: 0,
    entrada: 0,
    parcelas: 1,
    intervalo: 30,
    forma_pagamento_id: '',
    observacoes: '',
  })
  const [parcelasGrid, setParcelasGrid] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      pb.collection('pacientes').getFullList().then(setPacientes)
      pb.collection('users')
        .getFullList({ filter: "especialidade='vendedor' || papel='vendedor'" })
        .then(setVendedores)
      pb.collection('formas_pagamento').getFullList({ filter: 'ativo=true' }).then(setFormas)
      pb.collection('configuracoes_gerais')
        .getFullList()
        .then((r) => setConfig(r[0] || { intervalo_parcelas_padrao: 30, comissao_padrao: 10 }))
    }
  }, [open])

  const gerarParcelas = () => {
    const p = []
    const saldo = form.valor_total - form.entrada
    if (form.entrada > 0) {
      p.push({
        numero: 1,
        valor: form.entrada,
        data_vencimento: new Date().toISOString().split('T')[0],
        forma: form.forma_pagamento_id,
      })
    }
    const numToDivide = form.entrada > 0 ? form.parcelas - 1 : form.parcelas
    const valPorParcela = numToDivide > 0 ? saldo / numToDivide : 0
    let baseDate = new Date()
    for (let i = 0; i < numToDivide; i++) {
      baseDate = addDays(baseDate, form.intervalo || config.intervalo_parcelas_padrao || 30)
      p.push({
        numero: p.length + 1,
        valor: valPorParcela,
        data_vencimento: baseDate.toISOString().split('T')[0],
        forma: form.forma_pagamento_id,
      })
    }
    setParcelasGrid(p)
  }

  const handleSave = async () => {
    try {
      const v = await pb.collection('vendas').create({
        paciente_id: form.paciente_id,
        vendedor_id: form.vendedor_id,
        valor_total: form.valor_total,
        valor_final: form.valor_total,
        entrada_paga: form.entrada,
        saldo_restante: form.valor_total - form.entrada,
        status: 'pendente',
        data_venda: new Date().toISOString(),
        parcelas: form.parcelas,
        observacoes: form.observacoes,
        tipo: 'tratamento',
      })
      for (const p of parcelasGrid) {
        await pb.collection('parcelas_venda').create({
          venda_id: v.id,
          numero_parcela: p.numero,
          valor_parcela: p.valor,
          data_vencimento: p.data_vencimento,
          forma_pagamento_id: p.forma,
          status: 'pendente',
        })
      }
      await pb.collection('comissoes_vendedor').create({
        vendedor_id: form.vendedor_id,
        venda_id: v.id,
        percentual_comissao: config.comissao_padrao || 10,
        valor_comissao: (form.valor_total * (config.comissao_padrao || 10)) / 100,
        status: 'pendente',
        data_calculo: new Date().toISOString(),
      })
      await pb.collection('faturas').create({
        paciente_id: form.paciente_id,
        valor: form.valor_total,
        data_vencimento: new Date().toISOString(),
        status: 'pendente',
        venda_id: v.id,
      })
      toast({ title: 'Operação realizada com sucesso' })
      setOpen(false)
      onSave()
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Nova Venda</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select onValueChange={(v) => setForm({ ...form, paciente_id: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Vendedor</Label>
            <Select onValueChange={(v) => setForm({ ...form, vendedor_id: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome || p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input
              type="number"
              onChange={(e) => setForm({ ...form, valor_total: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Entrada (R$)</Label>
            <Input
              type="number"
              onChange={(e) => setForm({ ...form, entrada: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Nº Parcelas</Label>
            <Input
              type="number"
              onChange={(e) => setForm({ ...form, parcelas: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select onValueChange={(v) => setForm({ ...form, forma_pagamento_id: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Button onClick={gerarParcelas} variant="secondary" className="w-full">
              Gerar Parcelas
            </Button>
          </div>
        </div>
        {parcelasGrid.length > 0 && (
          <div className="mt-4 border rounded p-2 text-sm">
            {parcelasGrid.map((p) => (
              <div key={p.numero} className="flex justify-between py-1 border-b">
                <span>
                  Parc {p.numero} - {p.data_vencimento}
                </span>
                <span>R$ {p.valor.toFixed(2)}</span>
              </div>
            ))}
            <Button onClick={handleSave} className="w-full mt-4">
              Salvar Venda
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
