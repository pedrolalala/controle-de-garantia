import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCcw, PackageSearch } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  atualizarStatusProtocolo,
  finalizarProtocolo,
  listarItensDoProtocolo,
  PROTOCOLO_STATUS_ORDER,
  PROTOCOLO_STATUS_LABEL,
  DESFECHO_LABEL,
  MOTIVO_LABEL,
  type GarantiaProtocoloRow,
  type GarantiaItemRow,
  type ProtocoloStatus,
} from '@/services/garantia'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolo: GarantiaProtocoloRow | null
  onSuccess: () => void
}

// SPEC-161 Prioridade 10: "Crédito gerado em despacho" — os 6 status do
// protocolo não mudam, só ganhou uma opção nova de desfecho.
const DESFECHOS = ['peca_nova', 'conserto', 'nao_acatado', 'credito_gerado_despacho'] as const

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ModalAtualizarProtocolo({ open, onOpenChange, protocolo, onSuccess }: Props) {
  const { toast } = useToast()
  const [status, setStatus] = useState<ProtocoloStatus>('em_contato_fornecedor')
  const [desfecho, setDesfecho] = useState<(typeof DESFECHOS)[number] | ''>('')
  const [desfechoEm, setDesfechoEm] = useState(today())
  const [salvando, setSalvando] = useState(false)

  // SPEC-161 Prioridade 11 — mostrar os itens/peças agrupados no protocolo
  // ("o que que tava dentro desse protocolo? Não aparece").
  const [itens, setItens] = useState<GarantiaItemRow[]>([])
  const [carregandoItens, setCarregandoItens] = useState(false)

  useEffect(() => {
    if (!open || !protocolo) return
    setStatus(protocolo.status)
    setDesfecho((protocolo.desfecho as any) || '')
    setDesfechoEm(protocolo.desfecho_em || today())
  }, [open, protocolo])

  useEffect(() => {
    if (!open || !protocolo) {
      setItens([])
      return
    }
    setCarregandoItens(true)
    listarItensDoProtocolo(protocolo.id)
      .then(setItens)
      .catch(() => setItens([]))
      .finally(() => setCarregandoItens(false))
  }, [open, protocolo])

  if (!protocolo) return null

  const ehFinalizado = status === 'finalizado'
  const podeSalvar = !ehFinalizado || (!!desfecho && !!desfechoEm)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSalvar || !protocolo) return
    setSalvando(true)
    try {
      if (ehFinalizado) {
        await finalizarProtocolo(protocolo.id, desfecho as any, desfechoEm)
      } else {
        await atualizarStatusProtocolo(protocolo.id, status)
      }
      toast({ title: 'Protocolo atualizado' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar protocolo',
        description: err?.message ?? 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !salvando && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RefreshCcw className="w-4 h-4 text-primary" />
            Atualizar protocolo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <p className="text-xs text-slate-500">
            {protocolo.fornecedor_nome} · responsável {protocolo.responsavel_nome} ·{' '}
            {protocolo.itens_count} item(ns)
          </p>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <PackageSearch className="w-3.5 h-3.5" /> Itens deste protocolo
            </Label>
            {carregandoItens ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : itens.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">Nenhum item encontrado.</p>
            ) : (
              <div className="border border-slate-200 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-100">
                {itens.map((item) => (
                  <div key={item.id} className="px-3 py-2 text-xs">
                    <span className="font-medium text-slate-800">
                      {item.produto_descricao_livre || item.produto_nome_resolvido || 'Peça'}
                    </span>{' '}
                    <span className="text-slate-500">
                      — {MOTIVO_LABEL[item.motivo]}
                      {item.cliente_nome ? ` · ${item.cliente_nome}` : ''} · qtd {item.quantidade}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProtocoloStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROTOCOLO_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROTOCOLO_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ehFinalizado && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Desfecho *</Label>
                <Select value={desfecho} onValueChange={(v) => setDesfecho(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DESFECHOS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DESFECHO_LABEL[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Data do desfecho *</Label>
                <Input
                  type="date"
                  required
                  value={desfechoEm}
                  onChange={(e) => setDesfechoEm(e.target.value)}
                />
                <p className="text-[11px] text-slate-400">
                  Data em que o desfecho de fato aconteceu (junto com a data de abertura, permite
                  medir a duração do protocolo).
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeSalvar || salvando} className="min-w-[140px]">
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
