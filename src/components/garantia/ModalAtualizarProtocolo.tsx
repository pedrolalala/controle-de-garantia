import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  atualizarStatusProtocolo,
  finalizarProtocolo,
  PROTOCOLO_STATUS_ORDER,
  PROTOCOLO_STATUS_LABEL,
  DESFECHO_LABEL,
  type GarantiaProtocoloRow,
  type ProtocoloStatus,
} from '@/services/garantia'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  protocolo: GarantiaProtocoloRow | null
  onSuccess: () => void
}

const DESFECHOS = ['peca_nova', 'conserto', 'nao_acatado'] as const

export function ModalAtualizarProtocolo({ open, onOpenChange, protocolo, onSuccess }: Props) {
  const { toast } = useToast()
  const [status, setStatus] = useState<ProtocoloStatus>('em_contato_fornecedor')
  const [desfecho, setDesfecho] = useState<(typeof DESFECHOS)[number] | ''>('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open || !protocolo) return
    setStatus(protocolo.status)
    setDesfecho((protocolo.desfecho as any) || '')
  }, [open, protocolo])

  if (!protocolo) return null

  const ehFinalizado = status === 'finalizado'
  const podeSalvar = !ehFinalizado || !!desfecho

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSalvar || !protocolo) return
    setSalvando(true)
    try {
      if (ehFinalizado) {
        await finalizarProtocolo(protocolo.id, desfecho as any)
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
      <DialogContent className="sm:max-w-[440px] p-8">
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
            <div className="space-y-2">
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
