## Implementation Steps

### 1. manifest.json
- Manifest V3 with permissions: activeTab, scripting, clipboardWrite  
- Service worker: background/service-worker.js  
- Default popup: popup/popup.html  
- No content scripts declared (injected programmatically)

---

### 2. Placeholder icons
- Generate simple colored-circle PNG icons at 16, 48, and 128px using a canvas script or create minimal SVG-to-PNGs

---

### 3. background/service-worker.js – Central orchestrator
- Listens for messages from popup: "activate-eyedropper" and "capture-screenshot"  

- On eyedropper activation: captures screenshot via chrome.tabs.captureVisibleTab, injects eyedropper.css + eyedropper.js into the active tab, then sends the screenshot data URL to the content script  

- On screenshot request: captures and returns the data URL to the popup for k-means processing  

---

### 4. content/eyedropper.css – Overlay styling
- Hides cursor, prevents scrolling while active  

---

### 5. content/eyedropper.js – Core eyedropper (~300 lines, most complex file)

**Initialization:**  
Receives screenshot data URL, decodes it onto an offscreen canvas, extracts pixel data (ImageData.data Uint8ClampedArray)

**Overlay:**  
Creates a full-viewport `<canvas>` at position: fixed; z-index: 2147483647 with cursor: none  

**DPR handling:**  
Maps CSS mouse coords to screenshot pixels via window.devicePixelRatio  

**Magnifier rendering (on each mousemove):**
- Clears canvas, draws slight dark tint overlay  
- Draws an 11×11 pixel grid inside a circular clipping path (60px radius lens)  
- Each cell shows the actual pixel color from the screenshot data  
- Subtle grid lines between cells, white crosshair on center pixel  
- White border ring with shadow around the lens  
- Below the lens: dark rounded-rect preview box with color swatch + HEX label  
- Edge-clamping so the lens stays fully visible near viewport edges  

**Click handler:**  
Reads center pixel color, converts to HEX, copies via navigator.clipboard.writeText() (with document.execCommand("copy") fallback), shows confirmation toast, then tears down overlay after ~800ms  

**Escape key:**  
Cancels and removes overlay  

**Guard:**  
window.__cColorPickerActive flag prevents double-injection  

**Cleanup:**  
Removes canvas, listeners, nulls pixel data, locks body scroll during activation  

---

### 6. popup/popup.html + popup/popup.css – Extension popup UI
- Two buttons: "Pick Color" (triggers eyedropper) and "Extract Colors" (triggers k-means)  

- Color grid section (hidden until extraction completes):  
  display: grid; grid-template-columns: repeat(4, 1fr) with 56×56px rounded swatches, HEX labels beneath each  

- Dark themed, 280px wide, clean minimal design  

- Click any swatch to copy its HEX value, status toast confirms  

---

### 7. popup/popup.js – Popup logic
- "Pick Color" click: sends "activate-eyedropper" to service worker, closes popup  

- "Extract Colors" click: sends "capture-screenshot" to service worker, receives data URL, decodes onto canvas, runs k-means, displays grid  

---

### 8. lib/kmeans.js – K-means++ clustering (~120 lines)
- Samples every 5th pixel from ImageData to keep working set manageable (~330K samples for 4K screenshot)  

- K-means++ initialization (distance-weighted centroid seeding)  

- Lloyd's algorithm: max 20 iterations or until convergence (centroid delta < 1)  

- Post-processing: deduplication of similar centroids (Euclidean distance < 25), sort by cluster population  

- Returns up to 12 dominant colors as `{ r, g, b, hex, count }` objects  

---

## Communication Flow

**Eyedropper:**  
Popup → SW (activate) → captureVisibleTab → inject scripts → SW → Content Script (screenshot)  

**Extraction:**  
Popup → SW (capture) → captureVisibleTab → SW → Popup (screenshot) → k-means locally  

---

## Verification
- Load unpacked extension in chrome://extensions  
- Click extension icon → popup appears with two buttons  
- Click "Pick Color" → popup closes, page shows magnifier lens following cursor  
- Move cursor → magnifier shows zoomed pixel grid + HEX preview  
- Click → confirmation toast, HEX value in clipboard  
- Press Escape → overlay cancels cleanly  
- Reopen popup → "Extract Colors" → grid of dominant colors appears  
- Click a swatch → HEX copied to clipboard  