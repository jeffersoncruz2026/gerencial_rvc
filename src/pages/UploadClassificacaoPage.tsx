import React, { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import FileUploadZone from '@/components/FileUploadZone';
import { parseClassificacaoCustos } from '@/lib/excelParser';

export default function UploadClassificacaoPage() {
  const { saveClassificacaoCustos, classificacaoCustos } = useFinanceStore();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const handleUpload = async (file: File) => {
    try {
      const mapping = await parseClassificacaoCustos(file);
      await saveClassificacaoCustos(mapping);

      const grupos = [...new Set(Object.values(mapping))];
      setStatus('success');
      setStatusMsg(
        `${Object.keys(mapping).length} contas classificadas em ${grupos.length} grupos.`
      );
    } catch {
      setStatus('error');
      setStatusMsg('Erro ao processar o arquivo de classificação.');
    }
  };

  const currentCount = Object.keys(classificacaoCustos).length;
  const currentGroups = [...new Set(Object.values(classificacaoCustos))];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload de Classificação de Custos</h1>
        <p className="page-subtitle">
          Carregue a planilha que mapeia contas contábeis para grupos de custos
        </p>
      </div>

      <div className="bg-card rounded-lg border border-border p-5 mb-6">
        <FileUploadZone
          onFileSelect={handleUpload}
          label="Upload da Classificação de Custos"
          description="Colunas esperadas: CONTACONTABIL | Grupo"
          status={status}
          statusMessage={statusMsg}
        />
      </div>

      {currentCount > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Classificação Atual ({currentCount} contas)
          </h2>
          <div className="flex flex-wrap gap-2">
            {currentGroups.sort().map((grupo) => {
              const count = Object.values(classificacaoCustos).filter((g) => g === grupo).length;
              return (
                <div
                  key={grupo}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium"
                >
                  {grupo} ({count})
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
