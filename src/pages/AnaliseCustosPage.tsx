import React, { useMemo, useState } from 'react';
import ReportHeader from '@/components/ReportHeader';
import { useFinanceStore, formatCurrency, type CustoItem } from '@/store/financeStore';
import { getGrupoCusto, gruposOrdem } from '@/lib/custosClassificacao';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

const CONTAS_EXCLUIDAS = new Set([
  '3.3.01.15.0005',
  '3.2.01.01.0004',
  '3.2.01.01.0003',
  '3.1.15.05.0001',
]);

const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

interface ProdutoData {
  produto: string;
  valor: number;
}

interface ContaData {
  vCodConta: string;
  nomeConta: string;
  valor: number;
  produtos: ProdutoData[];
}

interface GrupoData {
  grupo: string;
  total: number;
  contas: ContaData[];
}

export default function AnaliseCustosPage() {
  const custos = useFinanceStore((s) => s.custos);

  // Derive available years and centros de custo from all data
  const { anosDisponiveis, centrosCusto } = useMemo(() => {
    const anos = new Set<string>();
    const centros = new Set<string>();
    for (const [periodo, items] of Object.entries(custos)) {
      const [ano] = periodo.split('-');
      anos.add(ano);
      for (const item of items) {
        if (item.nomeCusto) centros.add(item.nomeCusto);
      }
    }
    return {
      anosDisponiveis: Array.from(anos).sort(),
      centrosCusto: Array.from(centros).sort(),
    };
  }, [custos]);

  const [ano, setAno] = useState(() => anosDisponiveis[0] || '2024');
  const [mes, setMes] = useState('01');
  const [centrosCustoSelecionados, setCentrosCustoSelecionados] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedContas, setExpandedContas] = useState<Set<string>>(new Set());

  const toggleGroup = (grupo: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(grupo)) next.delete(grupo);
      else next.add(grupo);
      return next;
    });
  };

  const toggleConta = (key: string) => {
    setExpandedContas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filter and group data
  const grupos: GrupoData[] = useMemo(() => {
    const key = `${ano}-${mes}`;
    const items = custos[key] || [];

    const filtered = items.filter((i) => {
      if (CONTAS_EXCLUIDAS.has(i.vCodConta)) return false;
      if (centrosCustoSelecionados.size > 0 && !centrosCustoSelecionados.has(i.nomeCusto)) return false;
      return true;
    });

    // Group by classification, then by conta, then by produto
    const map = new Map<string, Map<string, { nomeConta: string; valor: number; produtos: Map<string, number> }>>();

    for (const item of filtered) {
      const grupo = getGrupoCusto(item.vCodConta);
      if (!map.has(grupo)) map.set(grupo, new Map());
      const contasMap = map.get(grupo)!;
      const existing = contasMap.get(item.vCodConta);
      const produtoName = item.produto || 'Sem produto';
      if (existing) {
        existing.valor += item.vlCusto;
        existing.produtos.set(produtoName, (existing.produtos.get(produtoName) || 0) + item.vlCusto);
      } else {
        const produtos = new Map<string, number>();
        produtos.set(produtoName, item.vlCusto);
        contasMap.set(item.vCodConta, { nomeConta: item.nomeConta, valor: item.vlCusto, produtos });
      }
    }

    // Build sorted result
    const result: GrupoData[] = [];
    for (const grupo of gruposOrdem) {
      const contasMap = map.get(grupo);
      if (!contasMap) continue;
      const contas: ContaData[] = Array.from(contasMap.entries()).map(([vCodConta, { nomeConta, valor, produtos }]) => ({
        vCodConta,
        nomeConta,
        valor,
        produtos: Array.from(produtos.entries())
          .map(([produto, v]) => ({ produto, valor: v }))
          .sort((a, b) => a.produto.localeCompare(b.produto)),
      }));
      const total = contas.reduce((sum, c) => sum + c.valor, 0);
      result.push({ grupo, total, contas });
    }

    return result;
  }, [custos, ano, mes, centrosCustoSelecionados]);

  const totalGeral = useMemo(() => grupos.reduce((sum, g) => sum + g.total, 0), [grupos]);

  return (
    <div className="space-y-6">
      <ReportHeader title="Análise dos Custos">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between bg-background text-sm font-normal">
              {centrosCustoSelecionados.size === 0
                ? 'Todos os Centros'
                : `${centrosCustoSelecionados.size} selecionado(s)`}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-2 max-h-[300px] overflow-y-auto">
            <button
              className="w-full text-left text-sm px-2 py-1.5 hover:bg-muted rounded-sm text-muted-foreground"
              onClick={() => setCentrosCustoSelecionados(new Set())}
            >
              Limpar filtros
            </button>
            {centrosCusto.map((cc) => (
              <label key={cc} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded-sm cursor-pointer">
                <Checkbox
                  checked={centrosCustoSelecionados.has(cc)}
                  onCheckedChange={(checked) => {
                    setCentrosCustoSelecionados((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(cc);
                      else next.delete(cc);
                      return next;
                    });
                  }}
                />
                <span className="text-sm">{cc}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>

        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-[100px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {anosDisponiveis.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ReportHeader>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_180px] bg-primary text-primary-foreground font-semibold text-sm">
          <div className="px-4 py-3">CUSTOS</div>
          <div className="px-4 py-3 text-right">SALDO</div>
        </div>

        {/* Groups */}
        {grupos.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            Nenhum dado encontrado para o período selecionado.
          </div>
        ) : (
          <>
            {grupos.map((g, idx) => (
              <div key={g.grupo}>
                {/* Group row */}
                <button
                  onClick={() => toggleGroup(g.grupo)}
                  className={`grid grid-cols-[1fr_180px] w-full text-left text-sm font-medium hover:bg-muted/50 transition-colors ${
                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                  }`}
                >
                  <div className="px-4 py-3 flex items-center gap-2">
                    {expandedGroups.has(g.grupo) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    {g.grupo}
                  </div>
                  <div className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(g.total)}
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedGroups.has(g.grupo) && (
                  <div className="bg-muted/10">
                    {g.contas.map((c) => {
                      const contaKey = `${g.grupo}::${c.vCodConta}`;
                      return (
                        <div key={c.vCodConta}>
                          {/* Conta row - clickable to expand produtos */}
                          <button
                            onClick={() => toggleConta(contaKey)}
                            className="grid grid-cols-[1fr_180px] w-full text-left text-sm border-t border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <div className="px-4 py-2 pl-12 text-muted-foreground flex items-center gap-2">
                              {expandedContas.has(contaKey) ? (
                                <ChevronDown className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                              )}
                              {c.vCodConta} - {c.nomeConta}
                            </div>
                            <div className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                              {formatCurrency(c.valor)}
                            </div>
                          </button>

                          {/* Produtos detail */}
                          {expandedContas.has(contaKey) && (
                            <div>
                              {c.produtos.map((p) => (
                                <div
                                  key={p.produto}
                                  className="grid grid-cols-[1fr_180px] text-sm border-t border-border/30"
                                >
                                  <div className="px-4 py-1.5 pl-20 text-destructive text-xs">
                                    {p.produto}
                                  </div>
                                  <div className="px-4 py-1.5 text-right tabular-nums text-destructive text-xs">
                                    {formatCurrency(p.valor)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Total row */}
            <div className="grid grid-cols-[1fr_180px] bg-primary/10 font-bold text-sm border-t-2 border-primary">
              <div className="px-4 py-3">TOTAL</div>
              <div className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(totalGeral)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
