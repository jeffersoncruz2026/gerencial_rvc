import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

const MARGIN = 10;
const FOOTER_SPACE = 8;

interface PDFOptions {
  /** Text printed at the bottom of every page */
  footer?: string;
}

async function captureElement(element: HTMLElement) {
  // Hide all selects, buttons, and print:hidden elements before capture
  const hideTargets = element.querySelectorAll<HTMLElement>('select, button, .pdf-hide');
  const origDisplay: string[] = [];
  hideTargets.forEach((el, i) => {
    origDisplay[i] = el.style.display;
    el.style.display = 'none';
  });
  element.classList.add('pdf-exporting');

  try {
    return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
  } finally {
    element.classList.remove('pdf-exporting');
    hideTargets.forEach((el, i) => {
      el.style.display = origDisplay[i];
    });
  }
}

/**
 * Exports each element as its own PDF page, scaled to fit the page.
 */
export async function exportSectionsToPDF(
  elementIds: string[],
  filename: string,
  orientation: 'portrait' | 'landscape' = 'landscape',
  options: PDFOptions = {}
) {
  const elements = elementIds
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (elements.length === 0) return;

  const pdf = new jsPDF(orientation, 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - MARGIN * 2;
  const maxHeight = pageHeight - MARGIN * 2 - (options.footer ? FOOTER_SPACE : 0);

  for (let i = 0; i < elements.length; i++) {
    const canvas = await captureElement(elements[i]);
    if (i > 0) pdf.addPage();

    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const width = canvas.width * scale;
    const height = canvas.height * scale;
    const xOffset = (pageWidth - width) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, MARGIN, width, height);

    if (options.footer) {
      pdf.setDrawColor(220, 223, 228);
      pdf.line(MARGIN, pageHeight - MARGIN - 5, pageWidth - MARGIN, pageHeight - MARGIN - 5);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(110, 116, 128);
      pdf.text(options.footer, MARGIN, pageHeight - MARGIN);
      if (elements.length > 1) {
        pdf.text(`${i + 1}/${elements.length}`, pageWidth - MARGIN, pageHeight - MARGIN, { align: 'right' });
      }
    }
  }

  pdf.save(filename);
}

export async function exportToPDF(
  elementId: string,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'landscape',
  options: PDFOptions = {}
) {
  return exportSectionsToPDF([elementId], filename, orientation, options);
}
