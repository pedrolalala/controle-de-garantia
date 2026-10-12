import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, PackagePlus, Search, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  criarGarantiaItem,
  getFornecedores,
  buscarClientes,
  buscarProdutos,
  resolverDataVenda,
  MOTIVO_LABEL,
  ATENDIMENTO_LABEL,
  DATA_VENDA_ORIGEM_LABEL,
  type Contato,
  type ProdutoBusca,
  type MotivoGarantia,
  type AtendimentoGarantia,
  type PrazoReferencia,
  type DataVendaOrigem,
} from '@/services/garantia'

// SPEC-156 Módulo 2 — qualquer usuário pode abrir um item de garantia
// ("todos podem pedir uma garantia, pois todos conversam com clientes").
// O agrupamento em protocolo com o fornecedor é feito depois, por
// Vitória/Débora, num modal separado.

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const MOTIVOS: MotivoGarantia[] = [
  'queimou',
  'sobrecarga_mau_uso',
  'envio_errado',
  'producao_errada',
  'avaria',
  'outro',
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ModalNovoItemGarantia({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast()

  const [fornecedores, setFornecedores] = useState<Contato[]>([])
  const [fornecedorId, setFornecedorId] = useState('')

  const [clienteBusca, setClienteBusca] = useState('')
  const [clientesResultado, setClientesResultado] = useState<Contato[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<Contato | null>(null)
  const [clienteNomeLivre, setClienteNomeLivre] = useState('')

  const [produtoBusca, setProdutoBusca] = useState('')
  const [produtosResultado, setProdutosResultado] = useState<ProdutoBusca[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoBusca | null>(null)
  const [produtoDescricaoLivre, setProdutoDescricaoLivre] = useState('')

  const [buscandoDataVenda, setBuscandoDataVenda] = useState(false)
  // SPEC-161 Prioridade 16: "a data, que acho que teria que vir a data de
  // hoje" — ponto de partida, não trava a busca automática nem a edição
  // manual por cima.
  const [dataVenda, setDataVenda] = useState(today())
  const [dataVendaOrigem, setDataVendaOrigem] = useState<DataVendaOrigem | null>(null)

  const [prazoAnos, setPrazoAnos] = useState('')
  const [prazoReferencia, setPrazoReferencia] = useState<PrazoReferencia>('fornecedor')
  const [motivo, setMotivo] = useState<MotivoGarantia>('queimou')
  const [atendimento, setAtendimento] = useState<AtendimentoGarantia>('imediato')
  const [adiantamento, setAdiantamento] = useState(false)
  const [quantidade, setQuantidade] = useState('1')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!open) return
    getFornecedores()
      .then(setFornecedores)
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) {
      setFornecedorId('')
      setClienteBusca('')
      setClientesResultado([])
      setClienteSelecionado(null)
      setClienteNomeLivre('')
      setProdutoBusca('')
      setProdutosResultado([])
      setProdutoSelecionado(null)
      setProdutoDescricaoLivre('')
      setDataVenda(today())
      setDataVendaOrigem(null)
      setPrazoAnos('')
      setPrazoReferencia('fornecedor')
      setMotivo('queimou')
      setAtendimento('imediato')
      setAdiantamento(false)
      setQuantidade('1')
      setObservacao('')
    }
  }, [open])

  useEffect(() => {
    if (!clienteBusca.trim() || clienteSelecionado) {
      setClientesResultado([])
      return
    }
    const timer = setTimeout(() => {
      buscarClientes(clienteBusca)
        .then(setClientesResultado)
        .catch(() => {})
    }, 350)
    return () => clearTimeout(timer)
  }, [clienteBusca, clienteSelecionado])

  useEffect(() => {
    if (!produtoBusca.trim() || produtoSelecionado) {
      setProdutosResultado([])
      return
    }
    const timer = setTimeout(() => {
      buscarProdutos(produtoBusca)
        .then(setProdutosResultado)
        .catch(() => {})
    }, 350)
    return () => clearTimeout(timer)
  }, [produtoBusca, produtoSelecionado])

  async function handleBuscarDataVenda() {
    if (!clienteSelecionado || !produtoSelecionado) return
    setBuscandoDataVenda(true)
    try {
      const res = await resolverDataVenda(clienteSelecionado.id, produtoSelecionado.id)
      if (res.data_venda) {
        setDataVenda(res.data_venda)
        setDataVendaOrigem(res.origem)
        toast({ title: `Data de venda encontrada (${DATA_VENDA_ORIGEM_LABEL[res.origem!]})` })
      } else {
        setDataVendaOrigem('manual')
        toast({
          title: 'Nenhuma venda encontrada',
          description: 'Preencha a data manualmente.',
        })
      }
    } catch {
      toast({
        title: 'Erro ao buscar data de venda',
        description: 'Preencha manualmente.',
        variant: 'destructive',
      })
    } finally {
      setBuscandoDataVenda(false)
    }
  }

  const podeSalvar =
    !!fornecedorId &&
    !!motivo &&
    (!!produtoSelecionado || !!produtoDescricaoLivre.trim()) &&
    Number(quantidade) > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSalvar) return
    setSalvando(true)
    try {
      await criarGarantiaItem({
        fornecedor_id: fornecedorId,
        produto_id: produtoSelecionado?.id ?? null,
        produto_descricao_livre: produtoSelecionado ? null : produtoDescricaoLivre,
        cliente_id: clienteSelecionado?.id ?? null,
        cliente_nome: clienteSelecionado ? null : clienteNomeLivre,
        data_venda_referencia: dataVenda || null,
        data_venda_origem: dataVenda ? dataVendaOrigem || 'manual' : null,
        prazo_garantia_anos: prazoAnos ? Number(prazoAnos) : null,
        prazo_garantia_referencia: prazoAnos ? prazoReferencia : null,
        motivo,
        atendimento,
        adiantamento,
        quantidade: Number(quantidade),
        observacao: observacao || null,
      })
      toast({ title: 'Item de garantia registrado' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar item',
        description: err?.message ?? 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !salvando && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="w-4 h-4 text-primary" />
            Novo item de garantia
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Fornecedor *</Label>
            <Select value={fornecedorId} onValueChange={setFornecedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Cliente</Label>
            {clienteSelecionado ? (
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm flex-1">{clienteSelecionado.nome}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => {
                    setClienteSelecionado(null)
                    setClienteBusca('')
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar cliente cadastrado..."
                    value={clienteBusca}
                    onChange={(e) => setClienteBusca(e.target.value)}
                  />
                </div>
                {clientesResultado.length > 0 && (
                  <div className="border border-slate-200 rounded-md max-h-32 overflow-y-auto">
                    {clientesResultado.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setClienteSelecionado(c)
                          setClientesResultado([])
                        }}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                )}
                <Input
                  placeholder="...ou nome do cliente sem cadastro"
                  value={clienteNomeLivre}
                  onChange={(e) => setClienteNomeLivre(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Peça / produto *</Label>
            {produtoSelecionado ? (
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm flex-1">
                  {produtoSelecionado.codigo_produto ? (
                    <span className="font-mono text-xs text-slate-500 mr-1.5">
                      #{produtoSelecionado.codigo_produto}
                    </span>
                  ) : null}
                  {produtoSelecionado.nome}
                  {produtoSelecionado.referencia ? ` — ${produtoSelecionado.referencia}` : ''}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => {
                    setProdutoSelecionado(null)
                    setProdutoBusca('')
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar produto cadastrado..."
                    value={produtoBusca}
                    onChange={(e) => setProdutoBusca(e.target.value)}
                  />
                </div>
                {produtosResultado.length > 0 && (
                  <div className="border border-slate-200 rounded-md max-h-32 overflow-y-auto">
                    {produtosResultado.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setProdutoSelecionado(p)
                          setProdutosResultado([])
                        }}
                      >
                        {p.codigo_produto ? (
                          <span className="font-mono text-xs text-slate-500 mr-1.5">
                            #{p.codigo_produto}
                          </span>
                        ) : null}
                        {p.nome}
                        {p.referencia ? ` — ${p.referencia}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                <Input
                  placeholder="...ou descrição da peça sem cadastro"
                  value={produtoDescricaoLivre}
                  onChange={(e) => setProdutoDescricaoLivre(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2 rounded-md border border-slate-200 p-3 bg-slate-50">
            <div className="flex items-center justify-between gap-2">
              <Label className="mb-0">Data da venda</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={!clienteSelecionado || !produtoSelecionado || buscandoDataVenda}
                onClick={handleBuscarDataVenda}
              >
                {buscandoDataVenda ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Buscar automaticamente
              </Button>
            </div>
            <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
            {dataVendaOrigem && (
              <p className="text-[11px] text-slate-500">
                Origem: {DATA_VENDA_ORIGEM_LABEL[dataVendaOrigem]}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              A busca automática exige cliente e peça selecionados (não vale nome/descrição livre).
              Se não encontrar nada, preencha a data manualmente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Prazo de garantia (anos)</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={prazoAnos}
              onChange={(e) => setPrazoAnos(e.target.value)}
              placeholder="Ex.: 5"
            />
          </div>

          <div className="space-y-2">
            <Label>Prazo referente a</Label>
            <Select
              value={prazoReferencia}
              onValueChange={(v) => setPrazoReferencia(v as PrazoReferencia)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="peca">Garantia específica da peça</SelectItem>
                <SelectItem value="fornecedor">Padrão geral do fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoGarantia)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MOTIVO_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Atendimento *</Label>
            <Select
              value={atendimento}
              onValueChange={(v) => setAtendimento(v as AtendimentoGarantia)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imediato">{ATENDIMENTO_LABEL.imediato}</SelectItem>
                <SelectItem value="analise_fornecedor">
                  {ATENDIMENTO_LABEL.analise_fornecedor}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="adiantamento"
              checked={adiantamento}
              onCheckedChange={(v) => setAdiantamento(v === true)}
            />
            <Label htmlFor="adiantamento" className="mb-0 cursor-pointer">
              Adiantamento — cliente recebeu peça nova antes de devolver a defeituosa
            </Label>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Observação</Label>
            <Textarea
              rows={2}
              className="resize-none"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <DialogFooter className="sm:col-span-2 pt-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeSalvar || salvando} className="min-w-[160px]">
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Registrar item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
