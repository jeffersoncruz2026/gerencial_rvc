import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export async function exportToPDF(
  elementId: string,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Hide all selects, buttons, and print:hidden elements before capture
  const hideTargets = element.querySelectorAll<HTMLElement>('select, button, .pdf-hide');
  const origDisplay: string[] = [];
  hideTargets.forEach((el, i) => {
    origDisplay[i] = el.style.display;
    el.style.display = 'none';
  });

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // Restore visibility
  hideTargets.forEach((el, i) => {
    el.style.display = origDisplay[i];
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF(orientation, 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageHeight - 20) {
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
  } else {
    const scale = (pageHeight - 20) / imgHeight;
    const finalWidth = imgWidth * scale;
    const finalHeight = imgHeight * scale;
    const xOffset = (pageWidth - finalWidth) / 2;
    pdf.addImage(imgData, 'PNG', xOffset, 10, finalWidth, finalHeight);
  }

  pdf.save(filename);
}
