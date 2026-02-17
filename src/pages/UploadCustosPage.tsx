import React, { useState } from 'react';
import { useFinanceStore, getBalanceteKey } from '@/store/financeStore';
import { Trash2 } from 'lucide-react';
import FileUploadZone from '@/components/FileUploadZone';
import { parseCustos } from '@/lib/excelParser';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function UploadCustosPage() {
  const { saveCustos, removeCustos, saveUpload, custos } = useFinanceStore();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const handleUpload = async (file: File) => {
    try {
      const { items } = await parseCustos(file);
      const key = getBalanceteKey(ano, mes);

      await saveCustos(key, items);
      await saveUpload({
        id: Date.now().toString(),
        tipo: 'custos',
        nomeArquivo: file.name,
        dataUpload: new Date().toISOString(),
        mes: mes,
        ano: ano,
        registros: items.length,
      });

      const faturamento = items.filter((i) => i.vCodConta === '3.1.15.05.0001');
      const impostos = items.filter((i) => i.vCodConta.startsWith('3.2'));

      setStatus('success');
      setStatusMsg(
        `${items.length} registros carregados para ${meses[mes - 1]}/${ano}. ` +
        `Faturamento: ${faturamento.length} lançamentos | Impostos: ${impostos.length} lançamentos.`
      );
    } catch {
      setStatus('error');
      setStatusMsg('Erro ao processar o arquivo de custos.');
    }
  };

  const existingKeys = Object.keys(custos).sort();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload de Custos / Faturamento</h1>
        <p className="page-subtitle">Carregue o relatório de custos mensal para análise de faturamento e despesas</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-6">
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {meses.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Ano</label>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background w-24 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <FileUploadZone
          onFileSelect={handleUpload}
          label="Upload do Relatório de Custos"
          description="Colunas esperadas: ROWL | CODCOLIGADA | ... | VCODCONTA | VLCUSTO | DATA"
          status={status}
          statusMessage={statusMsg}
        />
      </div>

      {existingKeys.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">Períodos Carregados</h2>
          <div className="flex flex-wrap gap-2">
            {existingKeys.map((key) => {
              const [y, m] = key.split('-');
              const items = custos[key];
              const fat = items.filter((i) => i.vCodConta === '3.1.15.05.0001').length;
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium"
                >
                  <span>{meses[Number(m) - 1]} {y} ({items.length} registros, {fat} faturamento)</span>
                  <button
                    onClick={() => removeCustos(key)}
                    className="ml-1 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
                    title="Remover período"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
