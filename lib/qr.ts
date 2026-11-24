import "server-only";
import QRCode from "qrcode";

/** An SVG QR code for a URL, sized by its container. */
export async function qrSvg(text: string, dark = "#0b1c30") {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark, light: "#ffffff" } });
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
