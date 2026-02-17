import React, { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import FileUploadZone from '@/components/FileUploadZone';
import { parseDePara } from '@/lib/excelParser';

export default function DeParaPage() {
  const { dePara, saveDePara, saveUpload } = useFinanceStore();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpload = async (file: File) => {
    try {
      const items = await parseDePara(file);
      const existing = [...dePara];
      const merged = [...existing];

      for (const item of items) {
        const idx = merged.findIndex((m) => m.contaOrigem === item.contaOrigem);
        if (idx >= 0) {
          merged[idx] = item;
        } else {
          merged.push(item);
        }
      }

      await saveDePara(merged);
      await saveUpload({
        id: Date.now().toString(),
        tipo: 'de_para',
        nomeArquivo: file.name,
        dataUpload: new Date().toISOString(),
        registros: items.length,
      });
      setStatus('success');
      setStatusMsg(`${items.length} mapeamentos carregados. Total: ${merged.length}`);
    } catch {
      setStatus('error');
      setStatusMsg('Erro ao processar. Verifique o formato do arquivo.');
    }
  };

  const balancoItems = dePara.filter((d) => d.categoria === 'balanco');
  const dreItems = dePara.filter((d) => d.categoria === 'DRE');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">De/Para</h1>
        <p className="page-subtitle">
          Mapeamento das contas do balancete para as demonstrações financeiras
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-6">
        <FileUploadZone
          onFileSelect={handleUpload}
          label="Upload do De/Para"
          description="Arquivo com mapeamento: Conta Origem | Descrição Origem | Descrição Destino | Categoria (balanco/DRE)"
          status={status}
          statusMessage={statusMsg}
        />
      </div>

      {dePara.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Balanço Patrimonial ({balancoItems.length})
            </h2>
            <div className="overflow-auto max-h-[500px]">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Conta Origem</th>
                    <th>Descrição Origem</th>
                    <th>→ Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {balancoItems.map((d, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{d.contaOrigem}</td>
                      <td className="text-xs">{d.descricaoOrigem}</td>
                      <td className="font-medium text-xs">{d.descricaoDestino}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              DRE ({dreItems.length})
            </h2>
            <div className="overflow-auto max-h-[500px]">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th>Conta Origem</th>
                    <th>Descrição Origem</th>
                    <th>→ Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {dreItems.map((d, i) => (
                    <tr key={i}>
                      <td className="font-mono text-xs">{d.contaOrigem}</td>
                      <td className="text-xs">{d.descricaoOrigem}</td>
                      <td className="font-medium text-xs">{d.descricaoDestino}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
