/**
 * DocuGrid Enhancer - Full Window Reader Lightbox
 * Full-screen reader view supporting single-file inspection, seamless all-files sheet (0px gap),
 * in-view grid layout switching, and synchronous high-res screenshot capture.
 */
class LightboxViewer {
  constructor() {
    this.dialog = document.getElementById('lightbox-dialog');
    this.viewport = document.getElementById('lightbox-viewport');
    this.wrapper = document.getElementById('lightbox-canvas-wrapper');
    this.canvas = document.getElementById('lightbox-canvas');
    this.allContainer = document.getElementById('lightbox-all-container');
    this.ctx = this.canvas.getContext('2d');

    this.titleEl = document.getElementById('lightbox-title');
    this.badgeEl = document.getElementById('lightbox-badge');
    this.zoomLevelEl = document.getElementById('lb-zoom-level');
    this.pageCounterEl = document.getElementById('lb-page-counter');
    this.navControlsGroup = document.getElementById('lb-nav-controls-group');
    this.gridControlsGroup = document.getElementById('lb-grid-controls');

    // Controls
    this.btnModeSingle = document.getElementById('lb-mode-single');
    this.btnModeAll = document.getElementById('lb-mode-all');
    this.gridChips = document.querySelectorAll('.lb-grid-chip');

    this.btnZoomIn = document.getElementById('lb-btn-zoom-in');
    this.btnZoomOut = document.getElementById('lb-btn-zoom-out');
    this.btnZoomReset = document.getElementById('lb-btn-zoom-reset');
    this.btnRotate = document.getElementById('lb-btn-rotate');
    this.btnPrev = document.getElementById('lb-btn-prev');
    this.btnNext = document.getElementById('lb-btn-next');
    this.btnClose = document.getElementById('close-lightbox-dialog');

    // State
    this.items = [];
    this.currentIndex = 0;
    this.viewMode = 'single'; // 'single' | 'all'
    this.allCols = 3;
    this.scale = 1.0;
    this.rotation = 0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.initEvents();
  }

  initEvents() {
    if (!this.dialog) return;

    // View Mode Toggle inside Lightbox
    this.btnModeSingle.addEventListener('click', () => this.switchMode('single'));
    this.btnModeAll.addEventListener('click', () => this.switchMode('all'));

    // Grid Column Controls inside Lightbox
    this.gridChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.allCols = parseInt(chip.dataset.cols, 10) || 3;
        this.gridChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (this.viewMode === 'all') {
          this.renderAllItemsSeamless();
        }
      });
    });

    // Zoom & Rotate Controls
    this.btnZoomIn.addEventListener('click', () => this.zoom(0.2));
    this.btnZoomOut.addEventListener('click', () => this.zoom(-0.2));
    this.btnZoomReset.addEventListener('click', () => this.resetTransform());
    this.btnRotate.addEventListener('click', () => this.rotate());

    // Navigation Controls
    this.btnPrev.addEventListener('click', () => this.prevItem());
    this.btnNext.addEventListener('click', () => this.nextItem());
    this.btnClose.addEventListener('click', () => this.close());

    // Direct Synchronous Screenshot Trigger
    const btnScreenshot = document.getElementById('lb-btn-screenshot');
    if (btnScreenshot) {
      btnScreenshot.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.takeScreenshot();
      };
    }

    // Mouse Wheel Zooming
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      this.zoom(delta);
    }, { passive: false });

    // Drag-to-Pan Mouse Events
    this.viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.viewport-hints')) return;
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
      this.viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.dragStartX;
      this.panY = e.clientY - this.dragStartY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.viewport.style.cursor = 'grab';
      }
    });

    // Double-click to reset view
    this.viewport.addEventListener('dblclick', () => this.resetTransform());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (!this.dialog.open) return;
      if (this.viewMode === 'single') {
        if (e.key === 'ArrowLeft') this.prevItem();
        if (e.key === 'ArrowRight') this.nextItem();
      }
      if (e.key === '+' || e.key === '=') this.zoom(0.2);
      if (e.key === '-') this.zoom(-0.2);
      if (e.key === '0') this.resetTransform();
    });
  }

  /**
   * Opens the lightbox with an array of items
   * @param {Array} items 
   * @param {number} startIndex 
   * @param {'single'|'all'} mode 
   */
  open(items, startIndex = 0, mode = 'single') {
    if (!items || items.length === 0) return;
    this.items = items;
    this.currentIndex = Math.max(0, Math.min(startIndex, items.length - 1));
    this.viewMode = mode;

    this.dialog.showModal();

    requestAnimationFrame(() => {
      this.render();
    });
  }

  openAllSeamless(items) {
    this.open(items, 0, 'all');
  }

  close() {
    this.dialog.close();
  }

  switchMode(newMode) {
    this.viewMode = newMode;
    this.render();
  }

  render() {
    if (!this.items || this.items.length === 0) return;

    this.btnModeSingle.classList.toggle('active', this.viewMode === 'single');
    this.btnModeAll.classList.toggle('active', this.viewMode === 'all');

    if (this.viewMode === 'single') {
      this.canvas.classList.remove('hidden');
      this.allContainer.classList.add('hidden');
      this.navControlsGroup.classList.remove('hidden');
      this.gridControlsGroup.classList.add('hidden');
      this.renderSingleItem();
    } else {
      this.canvas.classList.add('hidden');
      this.allContainer.classList.remove('hidden');
      this.navControlsGroup.classList.add('hidden');
      this.gridControlsGroup.classList.remove('hidden');
      this.renderAllItemsSeamless();
    }
  }

  renderSingleItem() {
    const item = this.items[this.currentIndex];
    if (!item) return;

    this.titleEl.textContent = item.name;
    this.badgeEl.textContent = `${item.width} × ${item.height} px`;
    this.pageCounterEl.textContent = `Item ${this.currentIndex + 1} of ${this.items.length}`;

    const sourceCanvas = item.canvas;
    this.canvas.width = sourceCanvas.width;
    this.canvas.height = sourceCanvas.height;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(sourceCanvas, 0, 0);

    this.resetTransform();
  }

  /**
   * Renders ALL loaded items together in ONE SINGLE seamless layout with ZERO gaps!
   */
  renderAllItemsSeamless() {
    this.titleEl.textContent = `Full View All Files (${this.items.length} Items - Zero Gaps)`;
    this.badgeEl.textContent = `${this.allCols} Columns`;

    this.allContainer.innerHTML = '';
    this.allContainer.style.gridTemplateColumns = `repeat(${this.allCols}, 1fr)`;

    this.items.forEach(item => {
      const sourceCanvas = item.canvas;
      const c = document.createElement('canvas');
      c.className = 'lightbox-seamless-canvas';
      c.width = sourceCanvas.width;
      c.height = sourceCanvas.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(sourceCanvas, 0, 0);

      this.allContainer.appendChild(c);
    });

    this.resetTransform();
  }

  zoom(amount) {
    this.scale = Math.min(Math.max(0.1, this.scale + amount), 6.0);
    this.updateTransform();
  }

  rotate() {
    this.rotation = (this.rotation + 90) % 360;
    this.updateTransform();
  }

  resetTransform() {
    const vpW = (this.viewport.clientWidth || window.innerWidth) - 60;
    const vpH = (this.viewport.clientHeight || window.innerHeight) - 80;

    let cW = 800;
    let cH = 600;

    if (this.viewMode === 'single') {
      cW = this.canvas.width;
      cH = this.canvas.height;
    } else {
      cW = this.allContainer.clientWidth || 1200;
      cH = this.allContainer.clientHeight || 800;
    }

    if (cW > 0 && cH > 0 && vpW > 0 && vpH > 0) {
      const scaleW = vpW / cW;
      const scaleH = vpH / cH;
      this.scale = Math.min(scaleW, scaleH);
      if (isNaN(this.scale) || this.scale <= 0) {
        this.scale = 1.0;
      }
    } else {
      this.scale = 1.0;
    }

    this.panX = 0;
    this.panY = 0;
    this.rotation = 0;
    this.updateTransform();
  }

  updateTransform() {
    const zoomPct = Math.round(this.scale * 100);
    this.zoomLevelEl.textContent = `${zoomPct}%`;
    this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale}) rotate(${this.rotation}deg)`;
  }

  prevItem() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.render();
    }
  }

  nextItem() {
    if (this.currentIndex < this.items.length - 1) {
      this.currentIndex++;
      this.render();
    }
  }

  /**
   * Captures high-resolution screenshot of current Lightbox View and triggers synchronous PNG download
   */
  takeScreenshot() {
    try {
      let targetCanvas = null;
      let fileName = 'docugrid_screenshot.png';

      if (this.viewMode === 'single') {
        targetCanvas = this.canvas;
        const item = this.items[this.currentIndex];
        fileName = `screenshot_${item ? item.name.replace(/\.[^/.]+$/, '') : 'single'}.png`;
      } else {
        const seamlessCanvases = this.allContainer.querySelectorAll('.lightbox-seamless-canvas');
        if (!seamlessCanvases || seamlessCanvases.length === 0) {
          alert('No files available in view.');
          return;
        }

        const numCols = this.allCols;
        const numRows = Math.ceil(seamlessCanvases.length / numCols);

        let maxW = 0;
        let maxH = 0;
        seamlessCanvases.forEach(c => {
          maxW = Math.max(maxW, c.width || 800);
          maxH = Math.max(maxH, c.height || 1000);
        });

        // Cap composite dimension at max 4096px so memory stays within safe limits
        const maxTotalDim = 4096;
        let totalW = maxW * numCols;
        let totalH = maxH * numRows;
        let scale = 1.0;
        if (totalW > maxTotalDim || totalH > maxTotalDim) {
          scale = Math.min(maxTotalDim / totalW, maxTotalDim / totalH);
        }

        const cellW = Math.max(10, Math.floor(maxW * scale));
        const cellH = Math.max(10, Math.floor(maxH * scale));

        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = cellW * numCols;
        compositeCanvas.height = cellH * numRows;

        const ctx = compositeCanvas.getContext('2d');
        ctx.fillStyle = '#050811';
        ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

        seamlessCanvases.forEach((c, idx) => {
          const col = idx % numCols;
          const row = Math.floor(idx / numCols);
          const x = col * cellW;
          const y = row * cellH;

          ctx.drawImage(c, x, y, cellW, cellH);
        });

        targetCanvas = compositeCanvas;
        fileName = `unified_view_${this.allCols}col_screenshot.png`;
      }

      if (!targetCanvas || targetCanvas.width === 0 || targetCanvas.height === 0) {
        alert('No screenshot content found.');
        return;
      }

      // Synchronous download within user gesture context
      const dataUrl = targetCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = fileName;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Screenshot capture error:', err);
      alert('Could not take screenshot: ' + err.message);
    }
  }
}

// Expose singleton instance
window.lightboxViewer = new LightboxViewer();
