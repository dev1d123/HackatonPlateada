export type PdfToImageResult = {
  base64: string;
  mimeType: string;
  pageNumber: number;
};

function stripDataUrlPrefix(value: string) {
  const idx = value.indexOf(',');
  if (idx < 0) return value;
  return value.slice(idx + 1);
}

export async function convertPdfFirstPageToImage(pdfUri: string): Promise<PdfToImageResult> {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  const pdfData = await fetch(pdfUri).then((res) => res.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: pdfData });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);

  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo crear el canvas para convertir el PDF.');
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  const first = canvas.toDataURL('image/png');
  if (!first || typeof first !== 'string') {
    throw new Error('No se pudo convertir el PDF a imagen.');
  }

  return {
    base64: stripDataUrlPrefix(first),
    mimeType: 'image/png',
    pageNumber: 1,
  };
}