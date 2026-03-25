(function(global) {
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  function distanceSq(c1, c2) {
    return (c1.r - c2.r)**2 + (c1.g - c2.g)**2 + (c1.b - c2.b)**2;
  }

  function distance(c1, c2) {
    return Math.sqrt(distanceSq(c1, c2));
  }

  function extractColors(imageDataData, k = 12) {
    const samples = [];
    const step = 5 * 4; // Sample every 5th pixel (4 bytes per pixel)
    
    // 1. Sample pixels
    for (let i = 0; i < imageDataData.length; i += step) {
      // Ignore if fully transparent
      if (imageDataData[i + 3] < 10) continue;
      
      samples.push({
        r: imageDataData[i],
        g: imageDataData[i + 1],
        b: imageDataData[i + 2]
      });
    }

    if (samples.length === 0) return [];
    
    k = Math.min(k, samples.length);

    // 2. K-means++ Initialization
    const centroids = [];
    centroids.push({ ...samples[Math.floor(Math.random() * samples.length)] });

    // Helper arrays for distance
    const dists = new Float32Array(samples.length);
    dists.fill(Infinity);

    while (centroids.length < k) {
      let sumSqDist = 0;
      const lastCentroid = centroids[centroids.length - 1];

      for (let i = 0; i < samples.length; i++) {
        const dist = distanceSq(samples[i], lastCentroid);
        if (dist < dists[i]) {
          dists[i] = dist;
        }
        sumSqDist += dists[i];
      }

      let r = Math.random() * sumSqDist;
      let selectedIdx = samples.length - 1;
      
      for (let i = 0; i < samples.length; i++) {
        r -= dists[i];
        if (r <= 0) {
          selectedIdx = i;
          break;
        }
      }
      
      centroids.push({ ...samples[selectedIdx] });
    }

    // 3. Lloyd's algorithm
    let assignments = new Int32Array(samples.length);
    let changed = true;
    let iterations = 0;
    const MAX_ITER = 20;

    while (changed && iterations < MAX_ITER) {
      changed = false;
      iterations++;

      // Assign to closest centroid
      for (let i = 0; i < samples.length; i++) {
        let minDist = Infinity;
        let minIdx = -1;
        
        for (let j = 0; j < k; j++) {
          const dist = distanceSq(samples[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            minIdx = j;
          }
        }
        
        if (assignments[i] !== minIdx) {
          assignments[i] = minIdx;
          changed = true;
        }
      }

      // Update centroids
      const sums = Array.from({ length: k }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
      
      for (let i = 0; i < samples.length; i++) {
        const cIdx = assignments[i];
        sums[cIdx].r += samples[i].r;
        sums[cIdx].g += samples[i].g;
        sums[cIdx].b += samples[i].b;
        sums[cIdx].count++;
      }

      for (let j = 0; j < k; j++) {
        if (sums[j].count > 0) {
          centroids[j].r = Math.round(sums[j].r / sums[j].count);
          centroids[j].g = Math.round(sums[j].g / sums[j].count);
          centroids[j].b = Math.round(sums[j].b / sums[j].count);
        }
      }
    }

    // 4. Post-processing: Compute final counts & remove duplicates
    const finalClusters = Array.from({ length: k }, () => ({ count: 0 }));
    for (let i = 0; i < samples.length; i++) {
      finalClusters[assignments[i]].count++;
    }

    let results = [];
    for (let j = 0; j < k; j++) {
      if (finalClusters[j].count > 0) {
        results.push({
          r: centroids[j].r,
          g: centroids[j].g,
          b: centroids[j].b,
          hex: rgbToHex(centroids[j].r, centroids[j].g, centroids[j].b),
          count: finalClusters[j].count
        });
      }
    }

    // Sort by popularity safely
    results.sort((a, b) => b.count - a.count);

    // Deduplicate similar colors (Euclidean distance < 25)
    const uniqueResults = [];
    for (const res of results) {
      let isDuplicate = false;
      for (const unq of uniqueResults) {
        if (distance(res, unq) < 25) {
          isDuplicate = true;
          unq.count += res.count; // merge counts optionally
          break;
        }
      }
      if (!isDuplicate) {
        uniqueResults.push(res);
      }
    }
    
    uniqueResults.sort((a, b) => b.count - a.count);
    return uniqueResults.slice(0, 12);
  }

  // Export
  global.extractColors = extractColors;
})(typeof window !== 'undefined' ? window : this);
