import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as xlsx from 'xlsx';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface AutoTableOptions {
  head?: string[][];
  body?: (string | number)[][];
  startY?: number;
  theme?: 'striped' | 'grid' | 'plain';
  headStyles?: {
    fillColor?: number[];
    textColor?: number[];
    fontSize?: number;
    fontStyle?: string;
  };
  styles?: {
    fontSize?: number;
    cellPadding?: number;
    font?: string;
  };
  columnStyles?: Record<number, { halign?: 'left' | 'center' | 'right'; cellWidth?: number | 'auto' }>;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  didDrawPage?: (data: { pageNumber: number }) => void;
}

/**
 * Export data to Excel file
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName: string = 'Sheet1',
  columnWidths?: number[]
): void {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (columnWidths) {
    worksheet['!cols'] = columnWidths.map(w => ({ wch: w }));
  }

  xlsx.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF file
 */
export function exportToPDF(
  title: string,
  headers: string[],
  data: (string | number)[][],
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    subtitle?: string;
    dateRange?: string;
    totals?: (string | number)[];
    columnAligns?: ('left' | 'center' | 'right')[];
  }
): void {
  const doc = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  // Subtitle (date range)
  let startY = 30;
  if (options?.subtitle || options?.dateRange) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const subtitle = options?.subtitle || options?.dateRange || '';
    doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });
    startY = 35;
  }

  // Build column styles
  const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {};
  if (options?.columnAligns) {
    options.columnAligns.forEach((align, index) => {
      columnStyles[index] = { halign: align };
    });
  }

  // Add totals row if provided
  const bodyData = options?.totals 
    ? [...data, options.totals.map(v => String(v))]
    : data;

  // Table
  doc.autoTable({
    head: [headers],
    body: bodyData.map(row => row.map(cell => String(cell))),
    startY,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles,
    margin: { left: margin, right: margin },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Trang ${data.pageNumber} / ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      
      // Print date
      const printDate = new Date().toLocaleDateString('vi-VN');
      doc.text(
        `Ngày in: ${printDate}`,
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
    },
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN');
}
