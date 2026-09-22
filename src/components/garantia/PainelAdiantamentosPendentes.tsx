import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, PackageCheck, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  listarItens,
  marcarPecaAntigaDevolvida,
  MOTIVO_LABEL,
  type GarantiaItemRow,
} from '@/services/garantia'

// SPEC-156 Módulo 2 — "adiantamento de garantia": cliente recebeu peça
// nova antes de devolver a defeituosa. Painel manual de conferência (sem
// notificação automática nesta fase — usuário não pediu isso
// explicitamente).

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PainelAdiantamentosPendentes() {
  const { toast } = useToast()
  const [itens, setItens] = useState<GarantiaItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [datas, setDatas] = useState<Record<string, string>>({})
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listarItens({ adiantamentoPendente: true })
      setItens(data)
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar adiantamentos pendentes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function handleMarcarDevolvida(id: string) {
    const data = datas[id] || today()
    setSalvandoId(id)
    try {
      await marcarPecaAntigaDevolvida(id, data)
      toast({ title: 'Peça antiga marcada como devolvida' })
      load()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message ?? 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
      </div>
    )
  }

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center text-slate-400 py-12">
        <PackageCheck className="w-10 h-10 mb-3 text-slate-300" />
        <p className="text-slate-600 font-medium">Nenhum adiantamento pendente</p>
        <p className="text-sm mt-1">Todas as peças antigas já foram devolvidas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Cliente já recebeu a peça nova — cobrar a devolução da peça defeituosa antiga.
      </p>
      {itens.map((item) => (
        <div
          key={item.id}
          className="flex flex-col sm:flex-row sm:items-center gap-2 border border-slate-200 rounded-md px-3 py-2"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">
              {item.produto_descricao_livre || item.produto_nome_resolvido || 'Peça'}
            </p>
            <p className="text-xs text-slate-500">
              {item.fornecedor_nome} · {MOTIVO_LABEL[item.motivo]}
              {item.cliente_nome ? ` · ${item.cliente_nome}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-8 w-[150px]"
              value={datas[item.id] || today()}
              onChange={(e) => setDatas((prev) => ({ ...prev, [item.id]: e.target.value }))}
            />
            <Button
              size="sm"
              className="h-8"
              disabled={salvandoId === item.id}
              onClick={() => handleMarcarDevolvida(item.id)}
            >
              {salvandoId === item.id ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : null}
              Marcar devolvida
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
