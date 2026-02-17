import React from 'react';
import logoRvc from '@/assets/logo-rvc.png';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function ReportHeader({ title, subtitle, children }: ReportHeaderProps) {
  return (
    <div className="page-header flex items-center justify-between">
      {/* Spacer to balance the right side */}
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <img src={logoRvc} alt="RVC" className="h-10 w-auto object-contain" />
        <div className="text-center">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="flex-1 flex justify-end">
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
