/**
 * DocuGrid Enhancer - Smart Auto-Grid Engine
 * Analyzes document & image dimensions (length, width, aspect ratio) and item count
 * to automatically determine the optimal reading grid layout.
 */
class GridEngine {
  /**
   * Calculates optimal grid layout configuration based on items metadata
   * @param {Array<{width: number, height: number, aspectRatio: number}>} items 
   * @returns {{gridClass: string, columns: number, badgeText: string, dominantOrientation: string, avgAspectRatio: number}}
   */
  calculateAutoGrid(items = []) {
    if (!items || items.length === 0) {
      return {
        gridClass: 'grid-mode-auto',
        columns: 3,
        badgeText: 'Auto: Ready for Uploads',
        dominantOrientation: 'unknown',
        avgAspectRatio: 1.0
      };
    }

    const count = items.length;
    let sumAspectRatio = 0;
    let portraitCount = 0;
    let landscapeCount = 0;
    let squareCount = 0;

    items.forEach(item => {
      const ar = item.aspectRatio || (item.width && item.height ? item.width / item.height : 1.0);
      sumAspectRatio += ar;

      if (ar < 0.88) {
        portraitCount++;
      } else if (ar > 1.15) {
        landscapeCount++;
      } else {
        squareCount++;
      }
    });

    const avgAR = sumAspectRatio / count;
    let dominantOrientation = 'square';
    if (portraitCount > landscapeCount && portraitCount > squareCount) {
      dominantOrientation = 'portrait';
    } else if (landscapeCount > portraitCount && landscapeCount > squareCount) {
      dominantOrientation = 'landscape';
    }

    let recommendedCols = 3;
    let gridClass = 'grid-mode-cols-3';
    let badgeText = '';

    // Logic based on file count and aspect ratio / orientation
    if (count === 1) {
      recommendedCols = 1;
      gridClass = 'grid-mode-cols-1';
      badgeText = 'Auto: 1 Column (Full Window Reader)';
    } else if (count === 2) {
      recommendedCols = 2;
      gridClass = 'grid-mode-cols-2';
      badgeText = 'Auto: 2 Columns (Side-by-Side View)';
    } else if (dominantOrientation === 'portrait') {
      // Portrait documents (A4/PDFs) look best in 3 or 4 columns
      if (count <= 4) {
        recommendedCols = 2;
        gridClass = 'grid-mode-cols-2';
        badgeText = `Auto: 2 Cols (${count} Portrait Documents)`;
      } else if (count <= 9) {
        recommendedCols = 3;
        gridClass = 'grid-mode-cols-3';
        badgeText = `Auto: 3 Cols (${count} Portrait Documents)`;
      } else {
        recommendedCols = 4;
        gridClass = 'grid-mode-cols-4';
        badgeText = `Auto: 4 Cols (${count} Documents)`;
      }
    } else if (dominantOrientation === 'landscape') {
      // Landscape images look best in 2 or 3 wide columns
      if (count <= 4) {
        recommendedCols = 2;
        gridClass = 'grid-mode-cols-2';
        badgeText = `Auto: 2 Wide Cols (${count} Landscape Images)`;
      } else {
        recommendedCols = 3;
        gridClass = 'grid-mode-cols-3';
        badgeText = `Auto: 3 Cols (${count} Landscape Images)`;
      }
    } else {
      // Mixed / Square
      if (count <= 6) {
        recommendedCols = 3;
        gridClass = 'grid-mode-cols-3';
        badgeText = `Auto: 3 Cols (${count} Mixed Items)`;
      } else {
        recommendedCols = 4;
        gridClass = 'grid-mode-cols-4';
        badgeText = `Auto: 4 Cols (${count} Items)`;
      }
    }

    return {
      gridClass,
      columns: recommendedCols,
      badgeText,
      dominantOrientation,
      avgAspectRatio: Math.round(avgAR * 100) / 100
    };
  }
}

// Expose singleton instance
window.gridEngine = new GridEngine();
