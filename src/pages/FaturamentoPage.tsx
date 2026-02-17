import React, { useState, useMemo } from 'react';
import { useFinanceStore, formatCurrency, getBalanceteKey } from '@/store/financeStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';

const meses = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const COLORS = [
  'hsl(215, 80%, 35%)', 'hsl(200, 70%, 45%)', 'hsl(170, 60%, 40%)',
  'hsl(45, 80%, 50%)', 'hsl(340, 65%, 50%)', 'hsl(280, 60%, 50%)',
  'hsl(120, 50%, 40%)', 'hsl(30, 70%, 50%)', 'hsl(0, 60%, 50%)',
  'hsl(260, 50%, 55%)',
];

export default function FaturamentoPage() {
  const { custos, balancetes, dePara } = useFinanceStore();
  const custosKeys = Object.keys(custos).sort();
  const balanceteKeys = Object.keys(balancetes).sort();

  // Use custos data if available, otherwise fallback to balancetes
  const hasCustos = custosKeys.length > 0;

  const years = useMemo(() => {
    const keys = hasCustos ? custosKeys : balanceteKeys;
    const ySet = new Set(keys.map((k) => k.split('-')[0]));
    return Array.from(ySet).sort();
  }, [hasCustos, custosKeys, balanceteKeys]);

  const [selectedYear, setSelectedYear] = useState(years[years.length - 1] || '');

  // === CUSTOS-BASED ANALYSIS ===
  const faturamentoData = useMemo(() => {
    if (!selectedYear || !hasCustos) return [];

    return Array.from({ length: 12 }, (_, i) => {
      const key = getBalanceteKey(Number(selectedYear), i + 1);
      const items = custos[key] || [];
      
      const fatItems = items.filter((c) => c.vCodConta === '3.1.15.05.0001');
      const impostoItems = items.filter((c) => c.vCodConta.startsWith('3.2'));
      
      const faturamentoBruto = fatItems.reduce((s, c) => s + Math.abs(c.vlCusto), 0);
      const impostos = impostoItems.reduce((s, c) => s + Math.abs(c.vlCusto), 0);
      const faturamentoLiquido = faturamentoBruto - impostos;

      return {
        mes: meses[i],
        mesNum: i + 1,
        bruto: faturamentoBruto,
        impostos,
        liquido: faturamentoLiquido,
        numClientes: new Set(fatItems.map((c) => c.documento)).size,
      };
    });
  }, [selectedYear, custos, hasCustos]);

  // Client ranking for selected year
  const clientRanking = useMemo(() => {
    if (!selectedYear || !hasCustos) return [];

    const clientMap = new Map<string, { nome: string; total: number; meses: Set<string> }>();

    for (let i = 0; i < 12; i++) {
      const key = getBalanceteKey(Number(selectedYear), i + 1);
      const items = custos[key] || [];
      const fatItems = items.filter((c) => c.vCodConta === '3.1.15.05.0001');

      for (const item of fatItems) {
        const doc = item.documento;
        if (!clientMap.has(doc)) {
          clientMap.set(doc, { nome: item.clienteNome, total: 0, meses: new Set() });
        }
        const entry = clientMap.get(doc)!;
        entry.total += Math.abs(item.vlCusto);
        entry.meses.add(meses[i]);
      }
    }

    return Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [selectedYear, custos, hasCustos]);

  // Impostos breakdown
  const impostosBreakdown = useMemo(() => {
    if (!selectedYear || !hasCustos) return [];

    const map = new Map<string, number>();

    for (let i = 0; i < 12; i++) {
      const key = getBalanceteKey(Number(selectedYear), i + 1);
      const items = custos[key] || [];
      const impostoItems = items.filter((c) => c.vCodConta.startsWith('3.2'));

      for (const item of impostoItems) {
        const nome = item.nomeConta || item.vCodConta;
        map.set(nome, (map.get(nome) || 0) + Math.abs(item.vlCusto));
      }
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [selectedYear, custos, hasCustos]);

  // KPIs
  const totalBruto = faturamentoData.reduce((s, d) => s + d.bruto, 0);
  const totalImpostos = faturamentoData.reduce((s, d) => s + d.impostos, 0);
  const totalLiquido = totalBruto - totalImpostos;
  const mesesComDados = faturamentoData.filter((d) => d.bruto > 0);
  const mediaMensal = mesesComDados.length > 0 ? totalBruto / mesesComDados.length : 0;
  const totalClientes = new Set(
    custosKeys
      .filter((k) => k.startsWith(selectedYear))
      .flatMap((k) => custos[k].filter((c) => c.vCodConta === '3.1.15.05.0001').map((c) => c.documento))
  ).size;

  // Growth
  const lastMonthWithData = [...faturamentoData].reverse().find((d) => d.bruto > 0);
  const prevMonthWithData = lastMonthWithData
    ? [...faturamentoData].reverse().find((d) => d.bruto > 0 && d.mes !== lastMonthWithData.mes)
    : null;
  const crescimento = lastMonthWithData && prevMonthWithData && prevMonthWithData.bruto > 0
    ? ((lastMonthWithData.bruto - prevMonthWithData.bruto) / prevMonthWithData.bruto) * 100
    : 0;

  // Top clients for pie chart
  const topClientsPie = useMemo(() => {
    if (clientRanking.length === 0) return [];
    const top5 = clientRanking.slice(0, 5);
    const others = clientRanking.slice(5).reduce((s, c) => s + c.total, 0);
    const result = top5.map((c) => ({ name: c.nome, value: c.total }));
    if (others > 0) result.push({ name: 'Outros', value: others });
    return result;
  }, [clientRanking]);

  // === FALLBACK TO BALANCETE ===
  const balanceteFallbackData = useMemo(() => {
    if (hasCustos || !selectedYear) return [];
    const receitaDePara = dePara.find((d) => d.descricaoDestino === 'Receita operacional líquida');

    return Array.from({ length: 12 }, (_, i) => {
      const key = getBalanceteKey(Number(selectedYear), i + 1);
      const items = balancetes[key] || [];
      let receita = 0;
      if (receitaDePara) {
        const match = items.find((b) => b.conta === receitaDePara.contaOrigem);
        receita = match ? Math.abs(match.saldoAtual) : 0;
      } else {
        const match = items.find((b) => b.conta === '3.1');
        receita = match ? Math.abs(match.saldoAtual) : 0;
      }
      return { mes: meses[i], receita };
    });
  }, [selectedYear, balancetes, dePara, hasCustos]);

  if (custosKeys.length === 0 && balanceteKeys.length === 0) {
    return (
      <div>
        <ReportHeader title="Análise de Faturamento" />
        <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
          Nenhum dado carregado. Faça o upload do relatório de custos na aba "Upload Custos".
        </div>
      </div>
    );
  }

  return (
    <div>
      <ReportHeader
        title="Análise de Faturamento"
        subtitle={hasCustos ? 'Receita, impostos, ranking de clientes e evolução' : 'Receita mês a mês (dados do balancete)'}
      >
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </ReportHeader>

      {hasCustos ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KpiCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Faturamento Bruto"
              value={formatCurrency(totalBruto)}
              color="text-primary"
            />
            <KpiCard
              icon={<Percent className="w-5 h-5" />}
              label="Impostos"
              value={formatCurrency(totalImpostos)}
              sub={totalBruto > 0 ? `${((totalImpostos / totalBruto) * 100).toFixed(1)}%` : '-'}
              color="text-destructive"
            />
            <KpiCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Faturamento Líquido"
              value={formatCurrency(totalLiquido)}
              color="text-success"
            />
            <KpiCard
              icon={<Users className="w-5 h-5" />}
              label="Clientes Ativos"
              value={String(totalClientes)}
              color="text-primary"
            />
            <KpiCard
              icon={crescimento >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              label="Crescimento"
              value={`${crescimento >= 0 ? '+' : ''}${crescimento.toFixed(1)}%`}
              color={crescimento >= 0 ? 'text-success' : 'text-destructive'}
            />
          </div>

          {/* Revenue Evolution Chart */}
          <div className="bg-card rounded-lg border border-border p-5 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Evolução do Faturamento — {selectedYear}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturamentoData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'bruto' ? 'Faturamento Bruto' : name === 'impostos' ? 'Impostos' : 'Líquido',
                    ]}
                  />
                  <Legend formatter={(v) => v === 'bruto' ? 'Bruto' : v === 'impostos' ? 'Impostos' : 'Líquido'} />
                  <Bar dataKey="bruto" fill="hsl(215, 80%, 35%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="impostos" fill="hsl(0, 60%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="liquido" fill="hsl(145, 60%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Client Ranking Table */}
            <div className="bg-card rounded-lg border border-border p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">Ranking de Clientes</h2>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Cliente</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Total</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRanking.map((c, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-2 text-foreground font-medium truncate max-w-[200px]" title={c.nome}>
                          {c.nome}
                        </td>
                        <td className="py-2 px-2 text-right text-foreground">{formatCurrency(c.total)}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">
                          {totalBruto > 0 ? `${((c.total / totalBruto) * 100).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Client Distribution Pie */}
            <div className="bg-card rounded-lg border border-border p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">Distribuição por Cliente</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topClientsPie}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {topClientsPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Impostos Breakdown */}
          {impostosBreakdown.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-5 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Composição de Impostos — {selectedYear}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {impostosBreakdown.map((imp, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-sm text-foreground font-medium truncate mr-2">{imp.name}</span>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(imp.value)}</span>
                      {totalImpostos > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({((imp.value / totalImpostos) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Detail Table */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Detalhe Mensal — {selectedYear}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mês</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Bruto</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Impostos</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Líquido</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Clientes</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">% Imposto</th>
                  </tr>
                </thead>
                <tbody>
                  {faturamentoData.filter((d) => d.bruto > 0).map((d, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium text-foreground">{d.mes}</td>
                      <td className="py-2 px-3 text-right text-foreground">{formatCurrency(d.bruto)}</td>
                      <td className="py-2 px-3 text-right text-destructive">{formatCurrency(d.impostos)}</td>
                      <td className="py-2 px-3 text-right text-success font-medium">{formatCurrency(d.liquido)}</td>
                      <td className="py-2 px-3 text-right text-foreground">{d.numClientes}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {d.bruto > 0 ? `${((d.impostos / d.bruto) * 100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                  {mesesComDados.length > 0 && (
                    <tr className="border-t-2 border-border font-bold">
                      <td className="py-2 px-3 text-foreground">Total</td>
                      <td className="py-2 px-3 text-right text-foreground">{formatCurrency(totalBruto)}</td>
                      <td className="py-2 px-3 text-right text-destructive">{formatCurrency(totalImpostos)}</td>
                      <td className="py-2 px-3 text-right text-success">{formatCurrency(totalLiquido)}</td>
                      <td className="py-2 px-3 text-right text-foreground">{totalClientes}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {totalBruto > 0 ? `${((totalImpostos / totalBruto) * 100).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Fallback: balancete-based simple chart */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="stat-card">
              <p className="text-sm font-medium text-muted-foreground">Total Anual</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(balanceteFallbackData.reduce((s, d) => s + d.receita, 0))}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-sm font-medium text-muted-foreground">Média Mensal</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(
                  balanceteFallbackData.filter((d) => d.receita > 0).length > 0
                    ? balanceteFallbackData.reduce((s, d) => s + d.receita, 0) /
                        balanceteFallbackData.filter((d) => d.receita > 0).length
                    : 0
                )}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-sm font-medium text-muted-foreground">Meses Carregados</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {balanceteFallbackData.filter((d) => d.receita > 0).length}
              </p>
            </div>
          </div>
          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Faturamento Mensal — {selectedYear}</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanceteFallbackData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                  <Bar dataKey="receita" fill="hsl(215, 80%, 35%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-bold ${color} mt-1`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
