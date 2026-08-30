/**
 * DocuGrid Viewer - Main Application Controller
 * Robust file upload handling for JPG, PNG, WEBP, GIF, and PDF documents.
 */
class DocuGridApp {
  constructor() {
    this.items = []; // Array of loaded file objects
    this.customRows = 3;
    this.customCols = 5;

    this.cacheDOMElements();
    this.bindEvents();
    this.updateUIState();
  }

  cacheDOMElements() {
    this.fileInput = document.getElementById('file-input');
    this.dropzone = document.getElementById('dropzone');
    this.gridContainer = document.getElementById('grid-container');
    this.fileCounter = document.getElementById('file-counter');

    this.btnTriggerUpload = document.getElementById('btn-trigger-upload');
    this.btnDropzoneUpload = document.getElementById('btn-dropzone-upload');
    this.btnFullViewAll = document.getElementById('btn-full-view-all');
    this.btnClearAll = document.getElementById('btn-clear-all');

    // Custom Grid Controls
    this.inputRows = document.getElementById('input-rows');
    this.inputCols = document.getElementById('input-cols');
    this.presetChips = document.querySelectorAll('.chip-sm');
  }

  bindEvents() {
    // Explicit Upload Button Triggers
    const triggerFilePicker = () => {
      this.fileInput.value = ''; // Reset to ensure change event fires even if picking same file
      this.fileInput.click();
    };

    if (this.btnTriggerUpload) {
      this.btnTriggerUpload.addEventListener('click', triggerFilePicker);
    }
    if (this.btnDropzoneUpload) {
      this.btnDropzoneUpload.addEventListener('click', triggerFilePicker);
    }

    // Reset file input value on click
    this.fileInput.addEventListener('click', (e) => {
      e.target.value = '';
    });

    // File Input Upload Change Handler
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFileSelect(e.target.files);
      }
    });

    // Drag & Drop Handling
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, (e) => e.preventDefault());
      document.body.addEventListener(eventName, (e) => e.preventDefault());
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, () => this.dropzone.classList.add('drag-over'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, () => this.dropzone.classList.remove('drag-over'));
    });

    this.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        this.handleFileSelect(dt.files);
      }
    });

    // Custom Grid Live Inputs
    const updateCustomGrid = () => {
      this.customRows = parseInt(this.inputRows.value, 10) || 1;
      this.customCols = parseInt(this.inputCols.value, 10) || 1;
      this.updateGridLayout();
    };

    [this.inputRows, this.inputCols].forEach(input => {
      input.addEventListener('input', updateCustomGrid);
    });

    // Quick Grid Presets
    this.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.inputRows.value = chip.dataset.r;
        this.inputCols.value = chip.dataset.c;
        updateCustomGrid();
      });
    });

    // Header Actions
    this.btnFullViewAll.addEventListener('click', () => {
      if (this.items.length > 0) {
        window.lightboxViewer.openAllSeamless(this.items);
      }
    });

    this.btnClearAll.addEventListener('click', () => this.clearAll());
  }

  /**
   * Processes selected files (Image or PDF) asynchronously with robust type detection
   */
  async handleFileSelect(files) {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.name || '';
      const mimeType = file.type || '';
      const ext = filename.includes('.') ? filename.toLowerCase().slice(filename.lastIndexOf('.')) : '';

      try {
        if (mimeType === 'application/pdf' || ext === '.pdf') {
          await this.processPDFFile(file);
        } else {
          // Process image file (JPG, PNG, WEBP, GIF, BMP, etc.)
          await this.processImageFile(file);
        }
      } catch (err) {
        console.error(`Error processing file "${filename}":`, err);
        alert(`Failed to load "${filename}": ${err.message}`);
      }
    }

    this.updateUIState();
  }

  /**
   * Processes a standard image file (JPG, PNG, WEBP, GIF, etc.)
   */
  processImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error('Could not read image file'));
      };

      reader.onload = (e) => {
        const img = new Image();

        img.onerror = () => {
          reject(new Error('Invalid image file format'));
        };

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const item = {
            id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: file.name,
            type: 'IMAGE',
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
            canvas: canvas
          };

          this.items.push(item);
          resolve();
        };

        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Processes PDF document file using pdfLoader engine
   */
  async processPDFFile(file) {
    const pagesData = await window.pdfLoader.renderAllPDFPages(file, 2.0);
    pagesData.forEach((page, idx) => {
      const item = {
        id: Date.now() + `_pdf_p${idx + 1}_` + Math.random().toString(36).substring(2, 6),
        name: `${file.name} (Page ${page.pageNum} of ${page.numPages})`,
        type: 'PDF',
        width: page.width,
        height: page.height,
        aspectRatio: page.width / page.height,
        canvas: page.canvas
      };
      this.items.push(item);
    });
  }

  /**
   * Updates state, applies custom grid layout, and renders cards
   */
  updateUIState() {
    const hasItems = this.items.length > 0;
    this.dropzone.classList.toggle('hidden', hasItems);
    this.gridContainer.classList.toggle('hidden', !hasItems);
    this.btnClearAll.disabled = !hasItems;
    this.btnFullViewAll.disabled = !hasItems;

    this.fileCounter.textContent = `${this.items.length} ${this.items.length === 1 ? 'Item' : 'Items'}`;

    if (hasItems) {
      this.updateGridLayout();
      this.renderGridCards();
    } else {
      this.gridContainer.innerHTML = '';
      this.gridContainer.removeAttribute('style');
    }
  }

  /**
   * Applies the exact custom grid column layout in real time
   */
  updateGridLayout() {
    this.gridContainer.style.setProperty('grid-template-columns', `repeat(${this.customCols}, 1fr)`, 'important');
  }

  /**
   * Renders item cards inside grid container
   */
  renderGridCards() {
    this.gridContainer.innerHTML = '';

    this.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'file-card';

      card.innerHTML = `
        <div class="card-preview-wrapper" title="Click to view in full screen reader view">
          <span class="card-type-badge">
            <i class="fa-solid ${item.type === 'PDF' ? 'fa-file-pdf' : 'fa-file-image'}"></i> ${item.type}
          </span>
          <div class="card-overlay-actions">
            <button class="btn btn-primary btn-sm btn-card-view" title="Open Full Screen View">
              <i class="fa-solid fa-expand"></i> Full View
            </button>
          </div>
        </div>

        <div class="card-info">
          <div class="card-filename" title="${item.name}">${item.name}</div>
          <div class="card-metadata">
            <span class="meta-tag">${item.width} × ${item.height} px</span>
            <div class="card-action-icons">
              <button class="btn-icon btn-card-download" title="Download Image"><i class="fa-solid fa-download"></i></button>
              <button class="btn-icon btn-card-remove" title="Remove"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;

      // Attach Canvas Preview
      const previewWrapper = card.querySelector('.card-preview-wrapper');
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'card-canvas';
      thumbCanvas.width = item.canvas.width;
      thumbCanvas.height = item.canvas.height;
      const ctx = thumbCanvas.getContext('2d');
      ctx.drawImage(item.canvas, 0, 0);
      previewWrapper.appendChild(thumbCanvas);

      // Card Action Listeners
      previewWrapper.addEventListener('click', () => {
        window.lightboxViewer.open(this.items, index, 'single');
      });

      card.querySelector('.btn-card-download').addEventListener('click', (e) => {
        e.stopPropagation();
        this.downloadItem(item);
      });
      card.querySelector('.btn-card-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        this.items.splice(index, 1);
        this.updateUIState();
      });

      this.gridContainer.appendChild(card);
    });
  }

  downloadItem(item) {
    const link = document.createElement('a');
    link.download = `file_${item.name.replace(/\.[^/.]+$/, '')}.png`;
    link.href = item.canvas.toDataURL('image/png');
    link.click();
  }

  /**
   * Completely clears all loaded files and resets state 100%
   */
  clearAll() {
    this.items = [];
    this.fileInput.value = '';
    this.gridContainer.innerHTML = '';
    this.gridContainer.removeAttribute('style');
    this.gridContainer.className = 'grid-container hidden';
    this.dropzone.classList.remove('hidden');
    this.fileCounter.textContent = '0 Items';
    this.btnClearAll.disabled = true;
    this.btnFullViewAll.disabled = true;
  }
}

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  window.docuGridApp = new DocuGridApp();
});
