import React, { useState } from 'react';
import { useFinanceStore, getBalanceteKey } from '@/store/financeStore';
import FileUploadZone from '@/components/FileUploadZone';
import { parseBalancete } from '@/lib/excelParser';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function UploadBalancetePage() {
  const { saveBalancete, saveUpload, balancetes, dePara, removeBalancete } = useFinanceStore();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const handleUpload = async (file: File) => {
    try {
      const { items } = await parseBalancete(file);
      const key = getBalanceteKey(ano, mes);

      const analyticItems = items.filter((i) => !items.some((j) => j.conta !== i.conta && j.conta.startsWith(i.conta + '.')));
      const unmapped = analyticItems.filter(
        (i) => !dePara.some((d) => i.conta.startsWith(d.contaOrigem) || i.conta === d.contaOrigem)
      );

      await saveBalancete(key, items);
      await saveUpload({
        id: Date.now().toString(),
        tipo: 'balancete',
        nomeArquivo: file.name,
        dataUpload: new Date().toISOString(),
        mes,
        ano,
        registros: items.length,
      });

      if (unmapped.length > 0) {
        setStatus('success');
        setStatusMsg(
          `${items.length} registros carregados para ${meses[mes - 1]}/${ano}. ⚠️ ${unmapped.length} contas analíticas sem mapeamento no De/Para.`
        );
      } else {
        setStatus('success');
        setStatusMsg(`${items.length} registros carregados para ${meses[mes - 1]}/${ano}.`);
      }
    } catch {
      setStatus('error');
      setStatusMsg('Erro ao processar o balancete.');
    }
  };

  const existingKeys = Object.keys(balancetes).sort();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload de Balancete</h1>
        <p className="page-subtitle">Carregue o balancete mensal no formato Excel</p>
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
          label="Upload do Balancete"
          description="Colunas: Conta | Reduzido | Descrição | Anterior | Débitos | Créditos | Saldo Atual"
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
              return (
                <div
                  key={key}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium flex items-center gap-2"
                >
                  {meses[Number(m) - 1]} {y} ({balancetes[key].length} registros)
                  <button
                    onClick={async () => {
                      if (confirm(`Excluir balancete de ${meses[Number(m) - 1]} ${y}?`)) {
                        await removeBalancete(key);
                        toast.success(`Balancete de ${meses[Number(m) - 1]} ${y} excluído.`);
                      }
                    }}
                    className="text-destructive hover:text-destructive/80 ml-1"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
