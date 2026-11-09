/**
 * Pesan konfirmasi WhatsApp.
 * Dipisah dari komponen supaya bisa diuji tanpa browser.
 * Format WhatsApp: *teks* = tebal, \n = baris baru.
 */
export type WaConfirmInput = {
  shopName: string;
  code: string;
  name: string;
  serviceName: string;
  barberName: string;
  dateLabel: string;
  time: string;
  priceLabel: string;
  pax?: number;
  note?: string;
};

export function waConfirmation(i: WaConfirmInput) {
  const lines = [
    `Halo ${i.shopName}, saya mau konfirmasi booking:`,
    "",
    `*Kode:* ${i.code}`,
    `*Nama:* ${i.name}`,
    `*Layanan:* ${i.serviceName}`,
    ...(i.pax && i.pax > 1 ? [`*Jumlah:* ${i.pax} orang`] : []),
    `*Barber:* ${i.barberName}`,
    `*Perkiraan jam:* ${i.dateLabel}, ± ${i.time} WIB`,
  ];
  const note = i.note?.trim();
  if (note) lines.push(`*Catatan:* ${note}`);
  lines.push(`*Total:* ${i.priceLabel} (bayar di tempat)`);
  lines.push("", "Mohon dikonfirmasi, terima kasih.");
  return lines.join("\n");
}
