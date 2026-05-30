class SpotScout {
  // Known constants for night overlay correction
  // The zombs.io day-night cycle uses: background: rgba(17, 8, 56, 0.4) with varying element opacity
  static DAYTIME_BG = [110, 140, 70];
  static OVERLAY_RGB = [17, 8, 56];

  /**
   * Sample the dominant background color from image data via sparse histogram.
   * The background is always the most frequent color (~75-81% of pixels).
   * @param {Uint8ClampedArray} data Raw pixel data
   * @param {number} width Image width
   * @param {number} height Image height
   * @returns {{ r: number, g: number, b: number }}
   */
  static sampleBackground(data, width, height) {
    const colorCounts = {};
    const step = 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) << 2;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        // Quantize to 5-value buckets for tight clustering
        const qr = Math.round(r / 5) * 5;
        const qg = Math.round(g / 5) * 5;
        const qb = Math.round(b / 5) * 5;
        const key = (qr << 16) | (qg << 8) | qb;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
      }
    }

    let maxCount = 0, dominant = 0;
    for (const [key, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = +key;
      }
    }

    return {
      r: (dominant >> 16) & 0xFF,
      g: (dominant >> 8) & 0xFF,
      b: dominant & 0xFF
    };
  }

  /**
   * Estimate the effective night overlay alpha from the dominant background color.
   * Uses least-squares fit: minimize sum((bg_i - (orig_i*(1-a) + ov_i*a))^2) over RGB channels.
   * Solution: a = sum((orig_i - bg_i)*(orig_i - ov_i)) / sum((orig_i - ov_i)^2)
   * @param {number} bgR Sampled background red
   * @param {number} bgG Sampled background green
   * @param {number} bgB Sampled background blue
   * @returns {number} Estimated effective alpha (0 = daytime, ~0.4 = full night)
   */
  static estimateNightAlpha(bgR, bgG, bgB) {
    const [oR, oG, oB] = SpotScout.DAYTIME_BG;
    const [vR, vG, vB] = SpotScout.OVERLAY_RGB;

    const num = (oR - bgR) * (oR - vR) + (oG - bgG) * (oG - vG) + (oB - bgB) * (oB - vB);
    const den = (oR - vR) ** 2 + (oG - vG) ** 2 + (oB - vB) ** 2;

    // Clamp to valid range: max effective alpha is ~0.45 (0.4 * opacity where opacity <= 1)
    return Math.max(0, Math.min(0.45, num / den));
  }

  /**
   * Detect Tree, Stone, and NeutralCamp nodes from raw ImageData with merging and edge-clipped detection.
   * Automatically compensates for the in-game day-night overlay by estimating the tint
   * from the background color and applying the inverse transformation before classification.
   * @param {ImageData} imageData Object with { data, width, height }
   * @returns {Array} List of detected nodes: { x, y, type, size, touchesEdge }
   */
  static detectNodes(imageData) {
    const { data, width, height } = imageData;

    // Step 1: Estimate night overlay alpha from background color
    const bg = SpotScout.sampleBackground(data, width, height);
    const nightAlpha = SpotScout.estimateNightAlpha(bg.r, bg.g, bg.b);

    // Precompute inverse overlay constants for pixel normalization
    // Formula: original = (observed - overlay * a) / (1 - a)
    const [vR, vG, vB] = SpotScout.OVERLAY_RGB;
    const inv = nightAlpha > 0.01 ? 1 / (1 - nightAlpha) : 1;
    const offsetR = nightAlpha > 0.01 ? vR * nightAlpha : 0;
    const offsetG = nightAlpha > 0.01 ? vG * nightAlpha : 0;
    const offsetB = nightAlpha > 0.01 ? vB * nightAlpha : 0;
    const needsNormalization = nightAlpha > 0.01;

    const visited = new Uint8Array(width * height);
    const nodes = [];

    // Helper for fast Euclidean distance
    function colorDist(r1, g1, b1, r2, g2, b2) {
      return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
    }

    // Classify pixel colors based on standard Zombs resource palettes.
    // Pixels are first normalized to remove the night overlay before comparison.
    function classifyPixel(r, g, b) {
      // Normalize pixel to daytime colors if night overlay is present
      if (needsNormalization) {
        r = Math.max(0, Math.min(255, (r - offsetR) * inv));
        g = Math.max(0, Math.min(255, (g - offsetG) * inv));
        b = Math.max(0, Math.min(255, (b - offsetB) * inv));
      }

      if (colorDist(r, g, b, 179, 179, 179) < 22) return "Stone";
      if (colorDist(r, g, b, 201, 201, 201) < 22) return "Stone";
      if (colorDist(r, g, b, 186, 54, 63) < 30) return "NeutralCamp";
      if (colorDist(r, g, b, 78, 100, 55) < 22) return "Tree";
      if (colorDist(r, g, b, 88, 123, 58) < 18) return "Tree";
      return null;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;

        const pi = idx << 2;
        const type = classifyPixel(data[pi], data[pi + 1], data[pi + 2]);
        if (!type) continue;

        const queue = [x, y];
        visited[idx] = 1;

        let sx = 0, sy = 0, cnt = 0, qh = 0;
        let minX = x, maxX = x, minY = y, maxY = y;

        while (qh < queue.length) {
          const cx = queue[qh++];
          const cy = queue[qh++];
          sx += cx;
          sy += cy;
          cnt++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1]
          ];

          for (let i = 0; i < neighbors.length; i++) {
            const nx = neighbors[i][0];
            const ny = neighbors[i][1];

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const ni = ny * width + nx;
              if (!visited[ni]) {
                const npi = ni << 2;
                if (classifyPixel(data[npi], data[npi + 1], data[npi + 2]) === type) {
                  visited[ni] = 1;
                  queue.push(nx, ny);
                }
              }
            }
          }
        }

        // Blob size constraints: filter noise, keep actual game nodes
        if (cnt >= 200 && cnt < 20000) {
          // Blob shape validation: reject elongated blobs (grid lines, UI artifacts)
          const blobW = maxX - minX + 1;
          const blobH = maxY - minY + 1;
          const aspectRatio = Math.max(blobW, blobH) / Math.max(1, Math.min(blobW, blobH));
          const compactness = cnt / (blobW * blobH);

          // Resources are roughly circular: aspect ratio < 3 and compactness > 0.2
          if (aspectRatio > 3.0 || compactness < 0.2) continue;

          const edgeMargin = 3;
          const touchesEdge = (minX <= edgeMargin || maxX >= width - 1 - edgeMargin ||
                               minY <= edgeMargin || maxY >= height - 1 - edgeMargin);
          nodes.push({
            x: sx / cnt,
            y: sy / cnt,
            type,
            size: cnt,
            minX, maxX, minY, maxY,
            touchesEdge
          });
        }
      }
    }

    // Merge nearby same-type nodes (e.g. duplicate segmented resource artifacts)
    const merged = [];
    const used = new Set();
    for (let i = 0; i < nodes.length; i++) {
      if (used.has(i)) continue;
      let n = { ...nodes[i] };
      let w = n.size;

      for (let j = i + 1; j < nodes.length; j++) {
        if (used.has(j) || nodes[j].type !== n.type) continue;
        const dist = Math.sqrt((nodes[j].x - n.x) ** 2 + (nodes[j].y - n.y) ** 2);
        if (dist < 40) {
          const wj = nodes[j].size;
          n.x = (n.x * w + nodes[j].x * wj) / (w + wj);
          n.y = (n.y * w + nodes[j].y * wj) / (w + wj);
          n.size += wj;
          w += wj;
          n.touchesEdge = n.touchesEdge || nodes[j].touchesEdge;
          n.minX = Math.min(n.minX, nodes[j].minX);
          n.maxX = Math.max(n.maxX, nodes[j].maxX);
          n.minY = Math.min(n.minY, nodes[j].minY);
          n.maxY = Math.max(n.maxY, nodes[j].maxY);
          used.add(j);
        }
      }
      merged.push(n);
    }

    return merged;
  }

  /**
   * Find matching server spot from the database for the given screen nodes.
   * Uses O(N) geometric min-cost pair hashing with early exit consensus. Runs in < 15ms in browser.
   * @param {Array} detectedNodes Nodes detected from screenshot
   * @param {Object} serverspots Predefined server spots database
   * @returns {Object} Solver result: { success, serverId, spawnPoint, confidence, scale }
   */
  static solve(detectedNodes, serverspots) {
    if (detectedNodes.length < 3) {
      return {
        success: false,
        reason: "Need at least 3 detected resource nodes to uniquely identify map position."
      };
    }

    // Reference center of screen points
    const centerX = detectedNodes.reduce((acc, n) => acc + n.x, 0) / detectedNodes.length;
    const centerY = detectedNodes.reduce((acc, n) => acc + n.y, 0) / detectedNodes.length;

    // Sort detected nodes by proximity to center (more likely to be fully visible and clear)
    const sortedNodes = [...detectedNodes].sort((a, b) => {
      const distA = (a.x - centerX) ** 2 + (a.y - centerY) ** 2;
      const distB = (b.x - centerX) ** 2 + (b.y - centerY) ** 2;
      return distA - distB;
    });

    // Filter out edge-clipped nodes for generating reference pairs (centroids might be distorted)
    const interiorNodes = sortedNodes.filter(n => !n.touchesEdge);
    const refPool = interiorNodes.length >= 2 ? interiorNodes : sortedNodes;

    // Pre-decode server spot layouts for matching and pre-group by resource type
    const parsedSpots = {};
    const decodeFn = window.decodeSpotJSON || (global && global.window && global.window.decodeSpotJSON);
    if (!decodeFn) {
      return { success: false, reason: "Server spot decoder function is not initialized." };
    }

    for (const [serverId, info] of Object.entries(serverspots)) {
      if (info.spotEncoded) {
        if (!info.spotDecodedCache) {
          const decoded = Object.values(decodeFn(info.spotEncoded));
          const byType = { Tree: [], Stone: [], NeutralCamp: [] };
          for (const g of decoded) {
            if (byType[g.model]) byType[g.model].push(g);
          }
          info.spotDecodedCache = decoded;
          info.spotDecodedByType = byType;
        }
        parsedSpots[serverId] = {
          nodes: info.spotDecodedCache,
          byType: info.spotDecodedByType
        };
      }
    }

    // Rank reference pairs by their rarity cost to minimize candidate loop iterations
    // (e.g. Stone/Camp pairs are much rarer than Tree/Tree, yielding 10-100x fewer candidate iterations)
    const TYPE_COSTS = { NeutralCamp: 1, Stone: 5, Tree: 20 };
    const pairsPool = [];
    const maxRef = Math.min(refPool.length, 6);

    for (let ri = 0; ri < maxRef - 1; ri++) {
      for (let si = ri + 1; si < maxRef; si++) {
        const pRef = refPool[ri];
        const pSec = refPool[si];
        const dxScreen = pSec.x - pRef.x;
        const dyScreen = pSec.y - pRef.y;
        if (Math.abs(dxScreen) < 10 && Math.abs(dyScreen) < 10) continue;

        const cost = TYPE_COSTS[pRef.type] * TYPE_COSTS[pSec.type];
        pairsPool.push({ pRef, pSec, dxScreen, dyScreen, cost });
      }
    }

    // Sort pairs by cost ascending so we process rare/efficient reference pairs first
    pairsPool.sort((a, b) => a.cost - b.cost);

    const TOLERANCE = 40;        // Tighter: 40 game units
    const EDGE_TOLERANCE = 80;   // Looser for edge-clipped nodes

    let bestMatch = null;
    let secondBestMatch = null;
    let highestScore = 0;
    let secondHighestScore = 0;

    for (const pair of pairsPool) {
      const { pRef, pSec, dxScreen, dyScreen } = pair;

      for (const [serverId, spotData] of Object.entries(parsedSpots)) {
        const gRefs = spotData.byType[pRef.type];
        const gSecs = spotData.byType[pSec.type];

        for (let i = 0; i < gRefs.length; i++) {
          const gRef = gRefs[i];
          for (let j = 0; j < gSecs.length; j++) {
            const gSec = gSecs[j];
            if (gRef.uid === gSec.uid) continue;

            const dxGlobal = gSec.position.x - gRef.position.x;
            const dyGlobal = gSec.position.y - gRef.position.y;

            // 1. Sign check: since scale is positive and screenshot is axis-aligned, signs must match
            if ((dxScreen > 0.1 && dxGlobal < -0.1) || (dxScreen < -0.1 && dxGlobal > 0.1)) continue;
            if ((dyScreen > 0.1 && dyGlobal < -0.1) || (dyScreen < -0.1 && dyGlobal > 0.1)) continue;

            // 2. Compute scale and verify cross-axis consistency
            let scale = 0;
            if (Math.abs(dxScreen) > Math.abs(dyScreen)) {
              scale = dxGlobal / dxScreen;
              if (scale < 0.5 || scale > 15) continue;
              const expectedDy = scale * dyScreen;
              if (Math.abs(dyGlobal - expectedDy) > 60) continue;
            } else {
              scale = dyGlobal / dyScreen;
              if (scale < 0.5 || scale > 15) continue;
              const expectedDx = scale * dxScreen;
              if (Math.abs(dxGlobal - expectedDx) > 60) continue;
            }

            // Calculate translation offsets
            const tx = gRef.position.x - scale * pRef.x;
            const ty = gRef.position.y - scale * pRef.y;

            // Consensus voting against other detected nodes
            let matchCount = 0;
            let totalError = 0;
            const pairs = [];
            let possibleToBeat = true;

            for (let k = 0; k < sortedNodes.length; k++) {
              // Early exit pruning if we cannot beat the current best matchesCount
              if (bestMatch && (matchCount + (sortedNodes.length - k) < bestMatch.matchesCount)) {
                possibleToBeat = false;
                break;
              }

              const pNode = sortedNodes[k];
              const gXEst = scale * pNode.x + tx;
              const gYEst = scale * pNode.y + ty;
              const tol = pNode.touchesEdge ? EDGE_TOLERANCE : TOLERANCE;
              const tol2 = tol * tol;

              let bestDist2 = Infinity, bestG = null;
              const candidates = spotData.byType[pNode.type];

              for (let c = 0; c < candidates.length; c++) {
                const g = candidates[c];
                const dxEst = g.position.x - gXEst;
                if (Math.abs(dxEst) > tol) continue;
                const dyEst = g.position.y - gYEst;
                if (Math.abs(dyEst) > tol) continue;

                const d2 = dxEst * dxEst + dyEst * dyEst;
                if (d2 < bestDist2) {
                  bestDist2 = d2;
                  bestG = g;
                }
              }

              if (bestDist2 < tol2) {
                matchCount++;
                const dist = Math.sqrt(bestDist2);
                totalError += dist;
                pairs.push({ screen: pNode, game: bestG, dist: dist, edge: pNode.touchesEdge });
              }
            }

            if (!possibleToBeat) continue;

            const confidence = matchCount / sortedNodes.length;
            if (confidence < 0.7) continue;

            // Pairwise distance verification (only on interior-matched pairs)
            const interiorPairs = pairs.filter(p => !p.edge);
            let pairwiseOk = true;
            for (let a = 0; a < interiorPairs.length && pairwiseOk; a++) {
              for (let b = a + 1; b < interiorPairs.length && pairwiseOk; b++) {
                const sd = Math.sqrt(
                  (interiorPairs[a].screen.x - interiorPairs[b].screen.x) ** 2 +
                  (interiorPairs[a].screen.y - interiorPairs[b].screen.y) ** 2
                );
                const gd = Math.sqrt(
                  (interiorPairs[a].game.position.x - interiorPairs[b].game.position.x) ** 2 +
                  (interiorPairs[a].game.position.y - interiorPairs[b].game.position.y) ** 2
                );
                if (Math.abs(gd - sd * scale) > TOLERANCE) pairwiseOk = false;
              }
            }
            if (!pairwiseOk) continue;

            const avgError = totalError / matchCount;
            const interiorMatchCount = interiorPairs.length;
            const score = interiorMatchCount * 100 + matchCount * 50 + confidence * 25 - avgError;

            if (score > highestScore) {
              if (bestMatch && bestMatch.serverId !== serverId) {
                secondHighestScore = highestScore;
                secondBestMatch = bestMatch;
              }
              highestScore = score;
              bestMatch = {
                serverId,
                scale,
                tx,
                ty,
                matchesCount: matchCount,
                totalDetected: sortedNodes.length,
                spawnPoint: { x: scale * centerX + tx, y: scale * centerY + ty },
                confidence,
                matchedPairs: pairs,
                avgError,
                score,
                interiorMatchCount
              };
            } else if (score > secondHighestScore && (!bestMatch || serverId !== bestMatch.serverId)) {
              secondHighestScore = score;
              secondBestMatch = {
                serverId,
                scale,
                confidence,
                matchesCount: matchCount,
                avgError,
                score
              };
            }

            // INSTANT return on extremely high confidence match
            if (bestMatch && bestMatch.confidence >= 0.8 && (bestMatch.interiorMatchCount >= 3 || sortedNodes.length === 3)) {
              return this.finalizeMatch(bestMatch, centerX, centerY, secondBestMatch);
            }
          }
        }
      }
    }

    if (bestMatch) {
      return this.finalizeMatch(bestMatch, centerX, centerY, secondBestMatch);
    }

    return {
      success: false,
      reason: "No layout matching this arrangement was found in the database. Please try a cleaner screenshot."
    };
  }

  /**
   * Finalize spawn point translation using least-squares refinement on interior pairs.
   */
  static finalizeMatch(bestMatch, centerX, centerY, secondBestMatch) {
    const interiorPairs = bestMatch.matchedPairs.filter(p => !p.edge);
    if (interiorPairs.length >= 2) {
      let sumTx = 0, sumTy = 0;
      for (let i = 0; i < interiorPairs.length; i++) {
        const p = interiorPairs[i];
        sumTx += p.game.position.x - bestMatch.scale * p.screen.x;
        sumTy += p.game.position.y - bestMatch.scale * p.screen.y;
      }
      const refinedTx = sumTx / interiorPairs.length;
      const refinedTy = sumTy / interiorPairs.length;
      bestMatch.spawnPoint = {
        x: bestMatch.scale * centerX + refinedTx,
        y: bestMatch.scale * centerY + refinedTy
      };
      bestMatch.tx = refinedTx;
      bestMatch.ty = refinedTy;

      for (let i = 0; i < bestMatch.matchedPairs.length; i++) {
        const p = bestMatch.matchedPairs[i];
        const estX = bestMatch.scale * p.screen.x + refinedTx;
        const estY = bestMatch.scale * p.screen.y + refinedTy;
        p.refinedDist = Math.sqrt(
          (p.game.position.x - estX) ** 2 + (p.game.position.y - estY) ** 2
        );
      }
    }

    return {
      success: true,
      ...bestMatch,
      secondBest: secondBestMatch ? {
        serverId: secondBestMatch.serverId,
        score: secondBestMatch.score,
        confidence: secondBestMatch.confidence
      } : null
    };
  }
}

export default SpotScout;
