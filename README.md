# DocuGrid Enhancer 📄🖼️

**DocuGrid Enhancer** is a modern, client-side web application for uploading, displaying, organizing, auto-formatting, and enhancing JPG/PNG images and multi-page PDF documents. It features intelligent auto-grid detection based on file length and width dimensions, customizable grid views, real-time document enhancement filters (B&W scanner, contrast stretch, sharpness boost, dark mode inversion), and a full-window reader view.

---

## 🌟 Key Features

### 1. 📂 File Upload (Single & Bulk)
- Support for **JPG, PNG, WEBP, GIF**, and multi-page **PDF** documents.
- Drag-and-drop dropzone with instant preview.
- Multi-page PDF parsing powered by **PDF.js** (renders high-DPI canvases for crisp document text).

### 2. 📐 Intelligent Auto-Detect Grid Engine
- Automatically computes aspect ratios, pixel dimensions (width & height), and orientation (portrait vs. landscape).
- Dynamic layout engine selects the optimal grid column count (e.g. 1 Col Reader, 2 Cols, 3 Cols, 4 Cols, or Masonry Grid) so content spans full window cleanly.
- Manual grid selector for quick switching.

### 3. 🪄 Real-Time Image & Document Enhancement
- **Document Scanner / Crisp B&W**: Binarization threshold filter that removes shadows and yellow paper tint for crisp black text on white paper.
- **Auto-Enhance**: Contrast stretch and histogram auto-leveling.
- **Sharpness Boost**: 3x3 spatial convolution unsharp mask filter to sharpen blurry scans.
- **Grayscale Clean**: Monochrome document filter.
- **Invert / Dark Reading Mode**: Negative reading filter for night/dark room reading.
- **Fine-Tuning Controls**: Manual sliders for Brightness, Contrast, Saturation, Sharpness, Exposure, Gamma, and B&W Threshold.
- **Batch Application**: Apply enhancement filter to a single file or bulk-apply to all files in the grid.

### 4. 🔍 Full-Window Reader Lightbox
- Accessible `<dialog>` modal view for reading documents in full window.
- Mouse wheel zooming (50% to 500%), click-and-drag panning, 90° rotation, fit-to-screen reset.
- Page/Item navigation steppers and keyboard shortcuts.

---

## 🚀 How to Run Locally

You can serve the application using any static file web server:

### Download the file and start running it locally or use it live link on Netfily

## 🔒 Privacy & Security
All file parsing, PDF rendering, and image pixel processing take place **100% locally inside your web browser**. No files are uploaded to external servers.
