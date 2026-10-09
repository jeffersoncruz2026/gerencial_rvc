import React, { useState, useMemo } from 'react';
import { useLatestOption } from '@/hooks/useLatestOption';
import { useFinanceStore, formatCurrency, getBalanceteKey } from '@/store/financeStore';
import { exportSectionsToPDF } from '@/lib/pdfExport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import logoRvc from '@/assets/logo-rvc.png';
import { ArrowDownRight, ArrowUpRight, FileDown, FileText, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList, ReferenceLine,
} from 'recharts';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type ViewMode = 'mensal' | 'acumulado';
type ValueMap = Record<string, number>;

/**
 * receita: income line · despesa: cost/expense line (stored as negative)
 * resultado: computed subtotal
 */
type RowKind = 'receita' | 'despesa' | 'resultado';

interface DRERow {
  key: string;
  label: string;
  kind: RowKind;
  /** detail rows are indented and rendered in a softer tone */
  detail?: boolean;
  isTotal?: boolean;
  isLastTotal?: boolean;
  computed?: (values: ValueMap) => number;
}

// Values follow the accounting sign (saldo * -1): income positive, expenses negative.
const v = (m: ValueMap, k: string) => m[k] || 0;
const lucroBruto = (m: ValueMap) =>
  v(m, 'Receita operacional líquida') + v(m, '(-) Custo das vendas e serviços');
const despesasOperacionais = (m: ValueMap) =>
  v(m, 'Despesas de vendas') + v(m, 'Despesas administrativas e Gerais') + v(m, 'Outras receitas operacionais');
const resultadoOperacional = (m: ValueMap) => lucroBruto(m) + despesasOperacionais(m);
const financeirasLiquidas = (m: ValueMap) => v(m, 'Despesas financeiras') + v(m, 'Receitas financeiras');
const resultadoAntesImpostos = (m: ValueMap) => resultadoOperacional(m) + financeirasLiquidas(m);
const impostos = (m: ValueMap) =>
  v(m, 'Imposto de renda e contribuição social corrente') + v(m, 'Imposto de renda e contribuição social diferido');
const lucroLiquido = (m: ValueMap) => resultadoAntesImpostos(m) + impostos(m);

const dreStructure: DRERow[] = [
  { key: 'Receita operacional líquida', label: 'Receita operacional líquida', kind: 'receita' },
  { key: '(-) Custo das vendas e serviços', label: '(-) Custo das vendas e serviços', kind: 'despesa', detail: true },
  { key: '_lucro_bruto', label: 'Lucro bruto', kind: 'resultado', isTotal: true, computed: lucroBruto },
  { key: 'Despesas de vendas', label: 'Despesas de vendas', kind: 'despesa', detail: true },
  { key: 'Despesas administrativas e Gerais', label: 'Despesas administrativas e gerais', kind: 'despesa', detail: true },
  { key: 'Outras receitas operacionais', label: 'Outras receitas operacionais', kind: 'receita', detail: true },
  {
    key: '_resultado_antes_financeiras',
    label: 'Resultado antes das receitas (despesas) financeiras líquidas e impostos',
    kind: 'resultado',
    isTotal: true,
    computed: resultadoOperacional,
  },
  { key: 'Despesas financeiras', label: 'Despesas financeiras', kind: 'despesa', detail: true },
  { key: 'Receitas financeiras', label: 'Receitas financeiras', kind: 'receita', detail: true },
  { key: '_financeiras_liquidas', label: 'Financeiras líquidas', kind: 'resultado', isTotal: true, computed: financeirasLiquidas },
  { key: '_resultado_antes_impostos', label: 'Resultado antes dos impostos', kind: 'resultado', isTotal: true, computed: resultadoAntesImpostos },
  { key: 'Imposto de renda e contribuição social corrente', label: 'Imposto de renda e contribuição social corrente', kind: 'despesa', detail: true },
  { key: 'Imposto de renda e contribuição social diferido', label: 'Imposto de renda e contribuição social diferido', kind: 'despesa', detail: true },
  { key: '_lucro_liquido', label: 'Lucro líquido do exercício', kind: 'resultado', isTotal: true, isLastTotal: true, computed: lucroLiquido },
];

const getValue = (row: DRERow, map: ValueMap) => (row.computed ? row.computed(map) : v(map, row.key));

// ---------- Formatting ----------

function fmtVal(value: number): string {
  if (value === 0) return '–';
  return formatCurrency(value);
}

function fmtPct(value: number | null, decimals = 1): string {
  if (value === null || !isFinite(value)) return '–';
  const abs = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `(${abs}%)` : `${abs}%`;
}

/** Análise vertical: share of the period's net revenue */
function analiseVertical(value: number, receitaLiquida: number): number | null {
  if (receitaLiquida <= 0 || value === 0) return null;
  return (value / receitaLiquida) * 100;
}

interface Variacao {
  /** null = not significant (base negative or zero) */
  pct: number | null;
  /** true = improved, false = worsened, null = unchanged */
  better: boolean | null;
}

/**
 * Variation against the same period of the previous year.
 * Expenses are compared by magnitude, so an expense going from 124.757 to 281.612 is +126%.
 * Because of the sign convention, a higher value is always an improvement.
 */
function calcVariacao(cur: number, prev: number, kind: RowKind): Variacao {
  const better = cur === prev ? null : cur > prev;
  const base = kind === 'despesa' ? -prev : prev;
  const atual = kind === 'despesa' ? -cur : cur;
  if (base <= 0) return { pct: null, better };
  return { pct: ((atual - base) / base) * 100, better };
}

function fmtVariacao({ pct }: Variacao): string {
  if (pct === null) return 'n.s.';
  const rounded = Math.round(pct);
  return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString('pt-BR')}%`;
}

// ---------- Components ----------

function VariacaoBadge({ cur, prev, kind }: { cur: number; prev: number; kind: RowKind }) {
  if (cur === 0 && prev === 0) return <span className="text-muted-foreground">–</span>;
  const variacao = calcVariacao(cur, prev, kind);
  const neutral = variacao.better === null || variacao.pct === null || Math.round(variacao.pct) === 0;
  const tone = neutral
    ? 'bg-muted text-muted-foreground'
    : variacao.better
      ? 'bg-success/10 text-success'
      : 'bg-destructive/10 text-destructive';
  return (
    <span
      className={`inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      title={variacao.pct === null ? 'Não significativo: base negativa ou zero' : undefined}
    >
      {fmtVariacao(variacao)}
    </span>
  );
}

function KpiCard({
  title, cur, prev, prevLabel, margin,
}: {
  title: string;
  cur: number;
  prev: number;
  prevLabel: string;
  margin?: { label: string; value: number | null };
}) {
  const variacao = calcVariacao(cur, prev, 'resultado');
  const hasPrev = prev !== 0;
  const Icon = variacao.better === null ? Minus : variacao.better ? ArrowUpRight : ArrowDownRight;
  const tone = variacao.better === null ? 'text-muted-foreground' : variacao.better ? 'text-success' : 'text-destructive';

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground tabular-nums">{fmtVal(cur)}</p>
        {margin && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {margin.label} {fmtPct(margin.value)}
          </span>
        )}
      </div>
      {hasPrev ? (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className={`flex items-center gap-0.5 font-semibold ${tone}`}>
            <Icon className="h-3.5 w-3.5" />
            {fmtVariacao(variacao)}
          </span>
          <span className="text-muted-foreground tabular-nums">vs {prevLabel}: {fmtVal(prev)}</span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Sem dados de {prevLabel}</p>
      )}
    </div>
  );
}

// ---------- Waterfall ----------

const COLOR_TOTAL = 'hsl(215, 80%, 35%)';
const COLOR_STEP = 'hsl(220, 9%, 62%)';

interface WaterfallPoint {
  name: string;
  range: [number, number];
  value: number;
  total: boolean;
  label: string;
}

function buildWaterfall(m: ValueMap): WaterfallPoint[] {
  const steps: { name: string; value: number; total?: boolean }[] = [
    { name: 'Receita Líquida', value: v(m, 'Receita operacional líquida'), total: true },
    { name: 'Custos', value: v(m, '(-) Custo das vendas e serviços') },
    { name: 'Lucro Bruto', value: lucroBruto(m), total: true },
    { name: 'Despesas Operacionais', value: despesasOperacionais(m) },
    { name: 'Resultado Financeiro', value: financeirasLiquidas(m) },
    { name: 'Impostos', value: impostos(m) },
    { name: 'Lucro Líquido', value: lucroLiquido(m), total: true },
  ];

  let running = 0;
  return steps.map((s) => {
    let start: number;
    let end: number;
    if (s.total) {
      start = 0;
      end = s.value;
      running = s.value;
    } else {
      start = running;
      end = running + s.value;
      running = end;
    }
    const mil = Math.round(s.value / 1000).toLocaleString('pt-BR');
    return {
      name: s.name,
      range: [Math.min(start, end), Math.max(start, end)],
      value: s.value,
      total: !!s.total,
      label: s.value < 0 ? `(${mil.replace('-', '')})` : mil,
    };
  });
}

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: { payload: WaterfallPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{p.name}</p>
      <p className="tabular-nums text-muted-foreground">R$ {formatCurrency(p.value)}</p>
    </div>
  );
}

// ---------- Page ----------

export default function DREPage() {
  const { balancetes, dePara } = useFinanceStore();
  const keys = useMemo(() => Object.keys(balancetes).sort(), [balancetes]);
  const [selectedKey, setSelectedKey] = useLatestOption(keys);
  const [viewMode, setViewMode] = useState<ViewMode>('acumulado');

  const data = useMemo(() => {
    if (!selectedKey) return null;

    const current = balancetes[selectedKey] || [];
    const [y, m] = selectedKey.split('-');
    const prevKey = getBalanceteKey(Number(y) - 1, Number(m));
    const previous = balancetes[prevKey] || [];

    const dreItems = dePara.filter((d) => d.categoria === 'DRE');

    const mapValues = (items: typeof current, mode: ViewMode) => {
      const result: ValueMap = {};
      for (const dp of dreItems) {
        const match = items.find((b) => b.conta === dp.contaOrigem);
        const raw = match ? (mode === 'mensal' ? match.saldoAtual - match.anterior : match.saldoAtual) : 0;
        result[dp.descricaoDestino] = (result[dp.descricaoDestino] || 0) + raw * -1;
      }
      return result;
    };

    const abrev = meses[Number(m) - 1].substring(0, 3).toLowerCase();
    return {
      currentMap: mapValues(current, viewMode),
      prevMap: mapValues(previous, viewMode),
      mesAno: `${abrev}-${y.substring(2)}`,
      prevMesAno: `${abrev}-${String(Number(y) - 1).substring(2)}`,
      mesNome: meses[Number(m) - 1],
      ano: y,
    };
  }, [selectedKey, balancetes, dePara, viewMode]);

  const waterfall = useMemo(() => (data ? buildWaterfall(data.currentMap) : []), [data]);

  if (keys.length === 0 || !data) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Demonstração de Resultado</h1>
        </div>
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          Nenhum balancete carregado.
        </div>
      </div>
    );
  }

  const { currentMap, prevMap } = data;
  const rlCur = v(currentMap, 'Receita operacional líquida');
  const rlPrev = v(prevMap, 'Receita operacional líquida');
  const modoLabel = viewMode === 'mensal' ? 'Mensal' : 'Acumulado';

  const handleExport = () => {
    const geradoEm = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    exportSectionsToPDF(
      ['dre-pdf-resumo', 'dre-pdf-grafico'],
      `dre-${selectedKey}-${viewMode}.pdf`,
      'landscape',
      { footer: `RVC FM · Gerado em ${geradoEm}` }
    );
  };

  return (
    <div id="dre-report" className="space-y-6">
      <section id="dre-pdf-resumo" className="space-y-6 bg-background">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={logoRvc} alt="RVC FM" className="pdf-only hidden h-10 w-auto object-contain" />
            <div>
              <h1 className="page-title">Demonstração de Resultado</h1>
              <p className="page-subtitle">
                Período: {data.mesNome}/{data.ano} · {modoLabel} · Valores em R$
              </p>
            </div>
          </div>
          <div className="pdf-hide flex flex-wrap items-center gap-2 print:hidden">
            <Select value={viewMode} onValueChange={(val) => setViewMode(val as ViewMode)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="acumulado">Acumulado</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {keys.map((k) => {
                  const [y, m] = k.split('-');
                  return (
                    <SelectItem key={k} value={k}>
                      {meses[Number(m) - 1]} {y}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} title="Exportar PDF">
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Receita Líquida" cur={rlCur} prev={rlPrev} prevLabel={data.prevMesAno} />
          <KpiCard
            title="Lucro Bruto"
            cur={lucroBruto(currentMap)}
            prev={lucroBruto(prevMap)}
            prevLabel={data.prevMesAno}
            margin={{ label: 'Margem', value: analiseVertical(lucroBruto(currentMap), rlCur) }}
          />
          <KpiCard
            title="Resultado Operacional"
            cur={resultadoOperacional(currentMap)}
            prev={resultadoOperacional(prevMap)}
            prevLabel={data.prevMesAno}
          />
          <KpiCard
            title="Lucro Líquido"
            cur={lucroLiquido(currentMap)}
            prev={lucroLiquido(prevMap)}
            prevLabel={data.prevMesAno}
            margin={{ label: 'Margem', value: analiseVertical(lucroLiquido(currentMap), rlCur) }}
          />
        </div>

        {/* DRE table */}
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 text-left font-medium">Descrição</th>
                <th className="w-[13%] px-4 py-3 text-right font-medium normal-case">{data.mesAno}</th>
                <th className="w-[8%] px-4 py-3 text-right font-medium">AV%</th>
                <th className="w-[13%] px-4 py-3 text-right font-medium normal-case">{data.prevMesAno}</th>
                <th className="w-[8%] px-4 py-3 text-right font-medium">AV%</th>
                <th className="w-[11%] px-5 py-3 text-right font-medium">Variação %</th>
              </tr>
            </thead>
            <tbody>
              {dreStructure.map((row) => {
                const cur = getValue(row, currentMap);
                const prev = getValue(row, prevMap);

                const rowClass = row.isLastTotal
                  ? 'bg-primary/[0.06] text-base font-bold text-foreground border-t-2 border-b-[3px] border-double border-primary/30'
                  : row.isTotal
                    ? 'bg-muted/50 font-semibold text-foreground border-t border-border'
                    : row.detail
                      ? 'text-foreground/75'
                      : 'font-medium text-foreground';
                const pad = row.isLastTotal ? 'py-3.5' : 'py-2.5';

                return (
                  <tr key={row.key} className={`${rowClass} transition-colors hover:bg-muted/60`}>
                    <td className={`${pad} pr-4 ${row.detail ? 'pl-10' : 'pl-5'}`}>{row.label}</td>
                    <td className={`${pad} px-4 text-right`}>{fmtVal(cur)}</td>
                    <td className={`${pad} px-4 text-right text-muted-foreground font-normal text-xs`}>
                      {fmtPct(analiseVertical(cur, rlCur))}
                    </td>
                    <td className={`${pad} px-4 text-right`}>{fmtVal(prev)}</td>
                    <td className={`${pad} px-4 text-right text-muted-foreground font-normal text-xs`}>
                      {fmtPct(analiseVertical(prev, rlPrev))}
                    </td>
                    <td className={`${pad} px-5 text-right font-normal`}>
                      <VariacaoBadge cur={cur} prev={prev} kind={row.kind} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          AV%: participação sobre a receita líquida do período. Variação % em relação a {data.prevMesAno};
          verde indica melhora e vermelho piora (aumento de custo ou despesa é piora). n.s.: não significativo
          (base negativa ou zero).
        </p>
      </section>

      {/* Waterfall */}
      <section id="dre-pdf-grafico" className="bg-card rounded-xl border border-border p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Da receita ao lucro</h2>
            <p className="text-sm text-muted-foreground">
              {data.mesNome}/{data.ano} · {modoLabel} · Valores em R$ mil
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_TOTAL }} /> Totais
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_STEP }} /> Variações
            </span>
          </div>
        </div>
        {rlCur === 0 && lucroLiquido(currentMap) === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            <FileText className="mr-2 h-4 w-4" /> Sem movimentação no período.
          </div>
        ) : (
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfall} margin={{ top: 24, right: 12, left: 12, bottom: 4 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="hsl(220, 13%, 91%)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'hsl(220, 10%, 45%)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(220, 10%, 50%)' }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(val: number) => Math.round(val / 1000).toLocaleString('pt-BR')}
                />
                <ReferenceLine y={0} stroke="hsl(220, 10%, 70%)" />
                <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'hsl(220, 15%, 93%)', opacity: 0.6 }} />
                <Bar dataKey="range" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {waterfall.map((p) => (
                    <Cell key={p.name} fill={p.total ? COLOR_TOTAL : COLOR_STEP} />
                  ))}
                  <LabelList
                    dataKey="label"
                    position="top"
                    style={{ fontSize: 12, fill: 'hsl(220, 30%, 25%)', fontVariantNumeric: 'tabular-nums' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
