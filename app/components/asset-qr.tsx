"use client";

import { Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function AssetQr({ id, name }: { id: string; name: string }) {
  const url = `https://smartcare.ibtechar.com/assets/${id}`;
  return <aside className="asset-qr-card"><span className="modal-icon"><QrCode size={22}/></span><h3>QR Asset Passport</h3><p>Attach this label to the machine for instant service access.</p><div className="qr-frame compact"><QRCodeSVG value={url} size={150} level="H" marginSize={2} fgColor="#003167"/></div><strong>{id}</strong><button type="button" className="button secondary full" onClick={()=>window.print()}><Printer size={17}/> Print label</button><small>{name}</small></aside>;
}
