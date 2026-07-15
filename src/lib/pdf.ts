import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Guest, Property, Reservation, Room, RoomType } from './types';
import { CHANNEL_LABELS, RES_STATUS_LABELS, fmtDate, money, nightsBetween } from './utils';

const BRAND: [number, number, number] = [43, 106, 115];

function header(doc: jsPDF, property: Property, title: string, subtitle?: string) {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(property.name, 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${property.address} — ${property.city}/${property.state} · ${property.phone} · ${property.email}`, 14, 17);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, 36);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 42);
  }
  doc.setTextColor(30, 41, 59);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado por ReservaFlow em ${new Date().toLocaleString('pt-BR')} — página ${i}/${pages}`, 14, 290);
  }
}

export function exportVoucherPDF(
  property: Property, r: Reservation, guest: Guest | undefined,
  room: Room | undefined, rt: RoomType | undefined, paid: number
) {
  const doc = new jsPDF();
  header(doc, property, `Voucher de reserva — ${r.code}`, `Status: ${RES_STATUS_LABELS[r.status]} · Canal: ${CHANNEL_LABELS[r.channel]}`);

  autoTable(doc, {
    startY: 48,
    theme: 'grid',
    headStyles: { fillColor: BRAND },
    head: [['Campo', 'Informação']],
    body: [
      ['Hóspede', guest?.name ?? '—'],
      ['Documento', guest?.cpf || guest?.passport || '—'],
      ['Acomodação', `${rt?.name ?? ''} — ${room?.name ?? ''}`],
      ['Check-in', `${fmtDate(r.checkinDate)} a partir de ${property.checkinTime}`],
      ['Check-out', `${fmtDate(r.checkoutDate)} até ${property.checkoutTime}`],
      ['Diárias', String(nightsBetween(r.checkinDate, r.checkoutDate))],
      ['Ocupantes', `${r.adults} adulto(s), ${r.children} criança(s)`],
      ['Valor total', money(r.totalAmount)],
      ['Valor pago', money(paid)],
      ['Saldo', money(r.totalAmount - paid)],
    ],
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Política de cancelamento:', 14, y);
  doc.text(doc.splitTextToSize(property.cancellationPolicy, 180), 14, y + 5);
  footer(doc);
  doc.save(`voucher-${r.code}.pdf`);
}

export function exportReportPDF(
  property: Property, title: string, subtitle: string,
  head: string[], body: (string | number)[][], summary?: [string, string][]
) {
  const doc = new jsPDF();
  header(doc, property, title, subtitle);
  if (summary && summary.length) {
    autoTable(doc, {
      startY: 48, theme: 'plain', styles: { fontSize: 10, fontStyle: 'bold' },
      body: summary.map(([k, v]) => [k, v]),
    });
  }
  autoTable(doc, {
    startY: summary && summary.length ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6 : 48,
    theme: 'striped',
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 8.5 },
    head: [head],
    body: body.map(row => row.map(String)),
  });
  footer(doc);
  doc.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
}
