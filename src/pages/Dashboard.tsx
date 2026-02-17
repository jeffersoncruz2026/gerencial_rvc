import React, { useMemo, useState } from 'react';
import { useFinanceStore, formatCurrency } from '@/store/financeStore';
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, Receipt,
  ArrowUpRight, ArrowDownRight, Minus, CalendarDays, Landmark
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesesFull = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function MetricCard({
  title, value, icon, trend, subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { pct: number; label: string } | null;
  subtitle?: string;
}) {
  const isPositive = trend ? trend.pct >= 0 : true;
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{trend.pct > 0 ? '+' : ''}{trend.pct}%</span>
          <span className="text-muted-foreground font-normal ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

function ComparativeCard({
  title, currentValue, previousValue, currentLabel, previousLabel, icon,
}: {
  title: string;
  currentValue: number;
  previousValue: number;
  currentLabel: string;
  previousLabel: string;
  icon: React.ReactNode;
}) {
  const pct = previousValue !== 0 ? Math.round(((currentValue - previousValue) / Math.abs(previousValue)) * 100) : null;
  const isPositive = pct !== null ? pct >= 0 : true;
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {formatCurrency(Math.abs(currentValue))}
      </p>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{currentLabel}</span>
          <span className="font-semibold text-foreground">{formatCurrency(Math.abs(currentValue))}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{previousLabel}</span>
          <span className="font-medium text-muted-foreground">{formatCurrency(Math.abs(previousValue))}</span>
        </div>
      </div>
      {pct !== null && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          <span>{pct > 0 ? '+' : ''}{pct}%</span>
          <span className="text-muted-foreground font-normal ml-1">variação</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { balancetes } = useFinanceStore();

  const balanceteKeys = useMemo(() => Object.keys(balancetes).sort(), [balancetes]);
  const years = useMemo(() => [...new Set(balanceteKeys.map((k) => k.split('-')[0]))].sort(), [balanceteKeys]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(() =>
    balanceteKeys[balanceteKeys.length - 1] || ''
  );

  const selectedYear = selectedPeriod ? selectedPeriod.split('-')[0] : years[years.length - 1] || '';
  const previousYear = selectedYear ? String(Number(selectedYear) - 1) : '';

  const currentBal = selectedPeriod ? balancetes[selectedPeriod] || [] : [];

  // Previous month
  const prevMonthKey = useMemo(() => {
    if (!selectedPeriod) return '';
    const [y, m] = selectedPeriod.split('-').map(Number);
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    return `${py}-${String(pm).padStart(2, '0')}`;
  }, [selectedPeriod]);

  // Same month previous year
  const prevYearKey = useMemo(() => {
    if (!selectedPeriod) return '';
    const [y, m] = selectedPeriod.split('-');
    return `${Number(y) - 1}-${m}`;
  }, [selectedPeriod]);

  const prevMonthBal = prevMonthKey ? balancetes[prevMonthKey] || [] : [];
  const prevYearBal = prevYearKey ? balancetes[prevYearKey] || [] : [];

  // Helper: saldo acumulado (para contas patrimoniais)
  const getVal = (bal: typeof currentBal, conta: string) =>
    bal.find((b) => b.conta === conta)?.saldoAtual || 0;

  // Helper: movimento mensal (saldoAtual - anterior) para contas de resultado
  const getMovimento = (bal: typeof currentBal, conta: string) => {
    const item = bal.find((b) => b.conta === conta);
    if (!item) return 0;
    return item.saldoAtual - item.anterior;
  };

  // Current period values — Ativo usa acumulado, demais usam movimento mensal
  const totalAtivo = getVal(currentBal, '1');
  const receitaBruta = getMovimento(currentBal, '3.1') * -1;
  const impostos = getMovimento(currentBal, '3.2') * -1;
  const receitaLiquida = receitaBruta + impostos;
  const resultado = getMovimento(currentBal, '3') * -1;

  // Previous month values
  const receitaBrutaPrevMonth = getMovimento(prevMonthBal, '3.1') * -1;
  const totalAtivoPrev = getVal(prevMonthBal, '1');
  const impostosPrev = getMovimento(prevMonthBal, '3.2') * -1;
  const receitaLiquidaPrev = receitaBrutaPrevMonth + impostosPrev;
  const resultadoPrev = getMovimento(prevMonthBal, '3') * -1;

  // Previous year same month
  const receitaBrutaPrevYear = getMovimento(prevYearBal, '3.1') * -1;

  const calcPct = (a: number, b: number) =>
    b !== 0 ? Math.round(((a - b) / Math.abs(b)) * 100) : null;

  const hasData = currentBal.length > 0;

  // Chart data
  const chartData = useMemo(() => {
    return meses.map((label, i) => {
      const mesNum = String(i + 1).padStart(2, '0');
      const balCur = balancetes[`${selectedYear}-${mesNum}`] || [];
      const balPrv = balancetes[`${previousYear}-${mesNum}`] || [];
      const itemCur = balCur.find((b) => b.conta === '3');
      const itemPrv = balPrv.find((b) => b.conta === '3');
      const resCur = itemCur != null ? (itemCur.saldoAtual - itemCur.anterior) : null;
      const resPrv = itemPrv != null ? (itemPrv.saldoAtual - itemPrv.anterior) : null;
      return {
        mes: label,
        [selectedYear]: resCur != null ? (resCur * -1) / 1000 : null,
        [previousYear]: resPrv != null ? (resPrv * -1) / 1000 : null,
      };
    });
  }, [balancetes, selectedYear, previousYear]);

  const hasChartData = chartData.some((d) => d[selectedYear] != null || d[previousYear] != null);

  const selectedMonthIdx = selectedPeriod ? Number(selectedPeriod.split('-')[1]) - 1 : -1;

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral dos indicadores financeiros</p>
        </div>
        {balanceteKeys.length > 0 && (
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              {balanceteKeys.map((key) => {
                const [y, m] = key.split('-');
                return (
                  <SelectItem key={key} value={key}>
                    {mesesFull[Number(m) - 1]} {y}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {!hasData ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Sem dados para o período</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Selecione um período com balancete carregado ou faça upload de um novo balancete.
          </p>
        </div>
      ) : (
        <>
          {/* Comparativos de Faturamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ComparativeCard
              title="Faturamento — Mês Atual vs Anterior"
              currentValue={receitaBruta}
              previousValue={receitaBrutaPrevMonth}
              currentLabel={selectedMonthIdx >= 0 ? mesesFull[selectedMonthIdx] : 'Atual'}
              previousLabel={prevMonthKey ? `${mesesFull[Number(prevMonthKey.split('-')[1]) - 1]}` : 'Anterior'}
              icon={<CalendarDays className="w-5 h-5" />}
            />
            <ComparativeCard
              title="Faturamento — Ano Atual vs Anterior"
              currentValue={receitaBruta}
              previousValue={receitaBrutaPrevYear}
              currentLabel={selectedYear}
              previousLabel={previousYear}
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Ativo Total"
              value={formatCurrency(Math.abs(totalAtivo))}
              icon={<Landmark className="w-4.5 h-4.5" />}
              trend={calcPct(totalAtivo, totalAtivoPrev) != null ? { pct: calcPct(totalAtivo, totalAtivoPrev)!, label: 'vs mês ant.' } : null}
            />
            <MetricCard
              title="Receita Bruta"
              value={formatCurrency(Math.abs(receitaBruta))}
              icon={<DollarSign className="w-4.5 h-4.5" />}
              trend={calcPct(receitaBruta, receitaBrutaPrevMonth) != null ? { pct: calcPct(receitaBruta, receitaBrutaPrevMonth)!, label: 'vs mês ant.' } : null}
            />
            <MetricCard
              title="Impostos"
              value={formatCurrency(Math.abs(impostos))}
              subtitle={receitaBruta ? `${Math.abs(Math.round((impostos / receitaBruta) * 100))}% da receita bruta` : undefined}
              icon={<Receipt className="w-4.5 h-4.5" />}
              trend={calcPct(Math.abs(impostos), Math.abs(impostosPrev)) != null ? { pct: calcPct(Math.abs(impostos), Math.abs(impostosPrev))!, label: 'vs mês ant.' } : null}
            />
            <MetricCard
              title="Receita Líquida"
              value={formatCurrency(Math.abs(receitaLiquida))}
              icon={<TrendingUp className="w-4.5 h-4.5" />}
              trend={calcPct(receitaLiquida, receitaLiquidaPrev) != null ? { pct: calcPct(receitaLiquida, receitaLiquidaPrev)!, label: 'vs mês ant.' } : null}
            />
          </div>

          {/* Evolução do Resultado */}
          {hasChartData && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Evolução do Resultado</h2>
                  <p className="text-sm text-muted-foreground">
                    Comparativo {selectedYear} vs {previousYear} (valores em R$ mil)
                  </p>
                </div>
                {resultado !== 0 && (
                  <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    resultado >= 0
                      ? 'bg-success/10 text-success'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {resultado >= 0 ? 'Lucro' : 'Prejuízo'}: {formatCurrency(Math.abs(resultado))}
                  </div>
                )}
              </div>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(215, 80%, 35%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(215, 80%, 35%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(200, 85%, 45%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(200, 85%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 88%)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 50%)" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="hsl(220, 10%, 50%)"
                      tickFormatter={(v) => `${v.toLocaleString('pt-BR')}`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value != null ? `R$ ${(value * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '-',
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(220, 13%, 88%)',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey={selectedYear}
                      stroke="hsl(215, 80%, 35%)"
                      strokeWidth={2.5}
                      fill="url(#gradCurrent)"
                      connectNulls={false}
                      dot={{ r: 4, fill: 'hsl(215, 80%, 35%)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey={previousYear}
                      stroke="hsl(200, 85%, 45%)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#gradPrev)"
                      connectNulls={false}
                      dot={{ r: 3, fill: 'hsl(200, 85%, 45%)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
