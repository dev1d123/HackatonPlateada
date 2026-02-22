export type PdfToImageResult = {
  base64: string;
  mimeType: string;
  pageNumber: number;
};

export async function convertPdfFirstPageToImage(_pdfUri: string): Promise<PdfToImageResult> {
  throw new Error('La conversión de PDF a imagen está disponible por ahora en web para este build.');
}