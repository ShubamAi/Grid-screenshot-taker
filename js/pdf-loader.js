/**
 * DocuGrid Enhancer - PDF Loader Engine (PDF.js Wrapper)
 */
class PDFLoaderEngine {
  constructor() {
    this.pdfjsLib = window.pdfjsLib || null;
    if (this.pdfjsLib) {
      // Configure PDF.js worker from CDN
      this.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  /**
   * Checks if PDF.js is ready
   */
  isAvailable() {
    return !!window.pdfjsLib;
  }

  /**
   * Renders a specific page of a PDF File/Blob onto a Canvas
   * @param {File|Blob} file 
   * @param {number} pageNum 1-indexed page number
   * @param {number} scale DPI scaling factor (default 2.0 for sharp text)
   * @returns {Promise<{canvas: HTMLCanvasElement, width: number, height: number, numPages: number, pageNum: number}>}
   */
  async renderPDFPage(file, pageNum = 1, scale = 2.0) {
    if (!this.isAvailable()) {
      throw new Error('PDF.js library is not loaded');
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    if (pageNum < 1 || pageNum > pdfDoc.numPages) {
      pageNum = 1;
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    return {
      canvas,
      width: canvas.width,
      height: canvas.height,
      originalWidth: Math.floor(viewport.width / scale),
      originalHeight: Math.floor(viewport.height / scale),
      numPages: pdfDoc.numPages,
      pageNum
    };
  }

  /**
   * Loads all pages of a PDF file
   * @param {File} file 
   * @param {number} scale 
   * @returns {Promise<Array<{canvas: HTMLCanvasElement, width: number, height: number, numPages: number, pageNum: number}>>}
   */
  async renderAllPDFPages(file, scale = 2.0) {
    if (!this.isAvailable()) {
      throw new Error('PDF.js library is not loaded');
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = this.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    const pagesData = [];

    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      pagesData.push({
        canvas,
        width: canvas.width,
        height: canvas.height,
        originalWidth: Math.floor(viewport.width / scale),
        originalHeight: Math.floor(viewport.height / scale),
        numPages: pdfDoc.numPages,
        pageNum: p
      });
    }

    return pagesData;
  }
}

// Expose singleton instance
window.pdfLoader = new PDFLoaderEngine();
