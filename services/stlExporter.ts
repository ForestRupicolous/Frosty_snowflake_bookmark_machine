
import { Snowflake, GeneratorSettings } from '../types';

interface Point2D {
  x: number;
  y: number;
}

// --- SHARED GEOMETRY UTILS ---

function isPointInPolygon(p: Point2D, poly: Point2D[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function clipPolygon(poly: Point2D[], width: number, height: number): Point2D[] {
  const edges = [
    { test: (p: Point2D) => p.x >= 0, intersect: (p1: Point2D, p2: Point2D) => ({ x: 0, y: p1.y + (p2.y - p1.y) * (-p1.x) / (p2.x - p1.x) }) },
    { test: (p: Point2D) => p.x <= width, intersect: (p1: Point2D, p2: Point2D) => ({ x: width, y: p1.y + (p2.y - p1.y) * (width - p1.x) / (p2.x - p1.x) }) },
    { test: (p: Point2D) => p.y >= 0, intersect: (p1: Point2D, p2: Point2D) => ({ x: p1.x + (p2.x - p1.x) * (-p1.y) / (p2.y - p1.y), y: 0 }) },
    { test: (p: Point2D) => p.y <= height, intersect: (p1: Point2D, p2: Point2D) => ({ x: p1.x + (p2.x - p1.x) * (height - p1.y) / (p2.y - p1.y), y: height }) },
  ];
  let output = poly;
  for (const edge of edges) {
    const input = output;
    output = [];
    if (input.length === 0) break;
    let s = input[input.length - 1];
    for (const e of input) {
      if (edge.test(e)) {
        if (!edge.test(s)) output.push(edge.intersect(s, e));
        output.push(e);
      } else if (edge.test(s)) {
        output.push(edge.intersect(s, e));
      }
      s = e;
    }
  }
  return output;
}

function generateSnowflakePolygons(settings: GeneratorSettings, snowflakes: Snowflake[], baseThickness: number): Point2D[][] {
  const polys: Point2D[][] = [];
  const minWidth = settings.minLineWidth;

  snowflakes.forEach(flake => {
    const { x, y, rotation, branches, coreRadius, branchWidth } = flake;
    const actualWidthMultiplier = (baseThickness / 1.2);
    const actualBaseWidth = branchWidth * actualWidthMultiplier;
    
    const getTaperedPoly = (x1: number, y1: number, x2: number, y2: number, sw: number, ew: number): Point2D[] => {
      // Clamping for printability
      const finalSW = Math.max(minWidth, sw);
      const finalEW = Math.max(minWidth, ew);
      
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const p = angle + Math.PI / 2;
      return [
        { x: x1 + (finalSW/2)*Math.cos(p), y: y1 + (finalSW/2)*Math.sin(p) },
        { x: x1 - (finalSW/2)*Math.cos(p), y: y1 - (finalSW/2)*Math.sin(p) },
        { x: x2 - (finalEW/2)*Math.cos(p), y: y2 - (finalEW/2)*Math.sin(p) },
        { x: x2 + (finalEW/2)*Math.cos(p), y: y2 + (finalEW/2)*Math.sin(p) },
      ];
    };

    if (coreRadius > 0.5) {
      const hex: Point2D[] = [];
      for (let i=0; i<6; i++) {
        const a = rotation + (i * Math.PI)/3;
        hex.push({ x: x + coreRadius * Math.cos(a), y: y + coreRadius * Math.sin(a) });
      }
      const clipped = clipPolygon(hex, settings.width, settings.height);
      if (clipped.length >= 3) polys.push(clipped);
    }

    for (let i=0; i<6; i++) {
      const ba = rotation + (i * Math.PI)/3;
      const mLen = branches[0].length;
      const stem = getTaperedPoly(x, y, x + mLen * Math.cos(ba), y + mLen * Math.sin(ba), actualBaseWidth, actualBaseWidth * 0.4);
      const cStem = clipPolygon(stem, settings.width, settings.height);
      if (cStem.length >= 3) polys.push(cStem);
      
      branches[0].subBranches.forEach(sb => {
        const sx = x + (sb.pos * mLen) * Math.cos(ba), sy = y + (sb.pos * mLen) * Math.sin(ba);
        const sbStartWidth = actualBaseWidth * (1 - sb.pos * 0.4) * 0.75;
        [sb.angle, -sb.angle].forEach(ao => {
          const fa = ba + ao;
          const sbp = getTaperedPoly(sx, sy, sx + sb.length * Math.cos(fa), sy + sb.length * Math.sin(fa), sbStartWidth, sbStartWidth * 0.5);
          const csbp = clipPolygon(sbp, settings.width, settings.height);
          if (csbp.length >= 3) polys.push(csbp);
        });
      });
    }
  });
  return polys;
}

// --- ROBUST VOXEL / HEIGHTMAP ENGINE (Watertight) ---

const generateVoxelSTL = (settings: GeneratorSettings, snowflakes: Snowflake[]): string => {
  const RESOLUTION = 0.1; 
  const cols = Math.ceil(settings.width / RESOLUTION);
  const rows = Math.ceil(settings.height / RESOLUTION);
  const baseThickness = settings.thickness;
  const extrusion = settings.flakeExtrusion; 
  const carvedHeight = Math.max(0.2, baseThickness + extrusion);

  const grid = new Float32Array(cols * rows).fill(0);

  // 1. Rasterize Base
  const cornerR = 4;
  const hX = settings.width / 2, hY = 12, hR = settings.holeRadius;
  for (let y = 0; y < rows; y++) {
    const py = y * RESOLUTION;
    for (let x = 0; x < cols; x++) {
      const px = x * RESOLUTION;
      let inside = true;
      if (px < cornerR) {
        if (py < cornerR && (cornerR-px)**2 + (cornerR-py)**2 > cornerR**2) inside = false;
        else if (py > settings.height-cornerR && (cornerR-px)**2 + (py-(settings.height-cornerR))**2 > cornerR**2) inside = false;
      } else if (px > settings.width-cornerR) {
        if (py < cornerR && (px-(settings.width-cornerR))**2 + (cornerR-py)**2 > cornerR**2) inside = false;
        else if (py > settings.height-cornerR && (px-(settings.width-cornerR))**2 + (py-(settings.height-cornerR))**2 > cornerR**2) inside = false;
      }
      if (inside && (px - hX)**2 + (py - hY)**2 < hR**2) inside = false;
      if (inside) grid[y * cols + x] = baseThickness;
    }
  }

  // 2. Carve Snowflakes
  const polys = generateSnowflakePolygons(settings, snowflakes, baseThickness);
  polys.forEach(poly => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    poly.forEach(p => { 
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); 
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); 
    });
    const startX = Math.max(0, Math.floor(minX / RESOLUTION));
    const startY = Math.max(0, Math.floor(minY / RESOLUTION));
    const endX = Math.min(cols, Math.ceil(maxX / RESOLUTION));
    const endY = Math.min(rows, Math.ceil(maxY / RESOLUTION));
    for (let y = startY; y < endY; y++) {
      const py = y * RESOLUTION + RESOLUTION/2;
      for (let x = startX; x < endX; x++) {
        const idx = y * cols + x;
        if (grid[idx] > 0) {
           const px = x * RESOLUTION + RESOLUTION/2;
           if (isPointInPolygon({x: px, y: py}, poly)) grid[idx] = carvedHeight;
        }
      }
    }
  });

  // 3. Generate Manifold Mesh
  const facets: string[] = [];
  const addTriangle = (p1: [number, number, number], p2: [number, number, number], p3: [number, number, number], nx: number, ny: number, nz: number) => {
    facets.push(`facet normal ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}\n  outer loop\n` +
      `    vertex ${p1[0].toFixed(4)} ${p1[1].toFixed(4)} ${p1[2].toFixed(4)}\n` +
      `    vertex ${p2[0].toFixed(4)} ${p2[1].toFixed(4)} ${p2[2].toFixed(4)}\n` +
      `    vertex ${p3[0].toFixed(4)} ${p3[1].toFixed(4)} ${p3[2].toFixed(4)}\n` +
      `  endloop\nendfacet\n`);
  };

  // Greedy Scanline Meshing for X-axis reduction
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const h = grid[y * cols + x];
      if (h <= 0) continue;
      
      let endX = x;
      while (endX < cols - 1 && grid[y * cols + (endX + 1)] === h) endX++;

      const x1 = x * RESOLUTION, x2 = (endX + 1) * RESOLUTION;
      const y1 = y * RESOLUTION, y2 = (y + 1) * RESOLUTION;

      // Top Surface
      addTriangle([x1, y1, h], [x2, y1, h], [x2, y2, h], 0, 0, 1);
      addTriangle([x1, y1, h], [x2, y2, h], [x1, y2, h], 0, 0, 1);
      // Bottom Surface
      addTriangle([x1, y1, 0], [x1, y2, 0], [x2, y2, 0], 0, 0, -1);
      addTriangle([x1, y1, 0], [x2, y2, 0], [x2, y1, 0], 0, 0, -1);

      // Vertical stitching
      // Y- walls
      for (let sx = x; sx <= endX; sx++) {
        const nh = y > 0 ? grid[(y-1)*cols+sx] : 0;
        if (nh < h) {
          const sx1 = sx * RESOLUTION, sx2 = (sx+1) * RESOLUTION;
          addTriangle([sx1, y1, nh], [sx2, y1, nh], [sx2, y1, h], 0, -1, 0);
          addTriangle([sx1, y1, nh], [sx2, y1, h], [sx1, y1, h], 0, -1, 0);
        }
      }
      // Y+ walls
      for (let sx = x; sx <= endX; sx++) {
        const nh = y < rows-1 ? grid[(y+1)*cols+sx] : 0;
        if (nh < h) {
          const sx1 = sx * RESOLUTION, sx2 = (sx+1) * RESOLUTION;
          addTriangle([sx1, y2, h], [sx2, y2, h], [sx2, y2, nh], 0, 1, 0);
          addTriangle([sx1, y2, h], [sx2, y2, nh], [sx1, y2, nh], 0, 1, 0);
        }
      }
      // X- wall (only start of run)
      const lh = x > 0 ? grid[y*cols+(x-1)] : 0;
      if (lh < h) {
        addTriangle([x1, y1, h], [x1, y2, h], [x1, y2, lh], -1, 0, 0);
        addTriangle([x1, y1, h], [x1, y2, lh], [x1, y1, lh], -1, 0, 0);
      }
      // X+ wall (only end of run)
      const rh = endX < cols-1 ? grid[y*cols+(endX+1)] : 0;
      if (rh < h) {
        addTriangle([x2, y1, h], [x2, y1, rh], [x2, y2, rh], 1, 0, 0);
        addTriangle([x2, y1, h], [x2, y2, rh], [x2, y2, h], 1, 0, 0);
      }

      x = endX;
    }
  }

  return `solid FrostForge_Bookmark\n${facets.join("")}endsolid FrostForge_Bookmark`;
};

// --- ROBUST VECTOR ENGINE (Watertight) ---

const generateVectorSTL = (settings: GeneratorSettings, snowflakes: Snowflake[]): string => {
  let facets: string[] = [];
  const baseThickness = settings.thickness;
  const extrusion = settings.flakeExtrusion;
  const zFlakeTop = baseThickness + extrusion;

  const addTriangle = (p1: [number, number, number], p2: [number, number, number], p3: [number, number, number], nx: number, ny: number, nz: number) => {
    facets.push(`facet normal ${nx.toFixed(4)} ${ny.toFixed(4)} ${nz.toFixed(4)}\n  outer loop\n` +
      `    vertex ${p1[0].toFixed(4)} ${p1[1].toFixed(4)} ${p1[2].toFixed(4)}\n` +
      `    vertex ${p2[0].toFixed(4)} ${p2[1].toFixed(4)} ${p2[2].toFixed(4)}\n` +
      `    vertex ${p3[0].toFixed(4)} ${p3[1].toFixed(4)} ${p3[2].toFixed(4)}\n` +
      `  endloop\nendfacet\n`);
  };

  const addPrism = (poly: Point2D[], zB: number, zT: number) => {
    if (poly.length < 3) return;
    // Bottom
    for (let i = 1; i < poly.length - 1; i++) addTriangle([poly[0].x, poly[0].y, zB], [poly[i+1].x, poly[i+1].y, zB], [poly[i].x, poly[i].y, zB], 0, 0, -1);
    // Top
    for (let i = 1; i < poly.length - 1; i++) addTriangle([poly[0].x, poly[0].y, zT], [poly[i].x, poly[i].y, zT], [poly[i+1].x, poly[i+1].y, zT], 0, 0, 1);
    // Sides
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], n = poly[(i+1)%poly.length];
      const dx = n.x - p.x, dy = n.y - p.y;
      const nx = dy, ny = -dx; 
      addTriangle([p.x, p.y, zB], [n.x, n.y, zB], [n.x, n.y, zT], nx, ny, 0);
      addTriangle([p.x, p.y, zB], [n.x, n.y, zT], [p.x, p.y, zT], nx, ny, 0);
    }
  };

  // Base
  const cornerR = 4, cSegs = 8;
  const getRoundedRectPoints = (w: number, h: number, r: number): Point2D[] => {
    const pts: Point2D[] = [];
    const cs = [{cx:w-r, cy:r, s:270}, {cx:w-r, cy:h-r, s:0}, {cx:r, cy:h-r, s:90}, {cx:r, cy:r, s:180}];
    cs.forEach(c => { for (let i=0; i<=cSegs; i++) { const a = ((c.s + (i/cSegs)*90) * Math.PI) / 180; pts.push({ x: c.cx + r*Math.cos(a), y: c.cy + r*Math.sin(a) }); } });
    return pts;
  };
  const outer = getRoundedRectPoints(settings.width, settings.height, cornerR);
  const hX = settings.width/2, hY = 12, hR = settings.holeRadius, hSegs = 16;
  const hole: Point2D[] = [];
  for (let i=0; i<hSegs; i++) { const a = (i * Math.PI * 2) / hSegs; hole.push({ x: hX + hR * Math.cos(-a), y: hY + hR * Math.sin(-a) }); }

  const triangulateWithHole = (o: Point2D[], ih: Point2D[], z: number, flip: boolean) => {
    ih.forEach((p, i) => {
      const n = ih[(i + 1) % ih.length];
      let b1 = 0, b2 = 0, d1 = Infinity, d2 = Infinity;
      o.forEach((ov, idx) => {
        const di1 = (ov.x-p.x)**2 + (ov.y-p.y)**2; if (di1 < d1) { d1 = di1; b1 = idx; }
        const di2 = (ov.x-n.x)**2 + (ov.y-n.y)**2; if (di2 < d2) { d2 = di2; b2 = idx; }
      });
      if (flip) {
        addTriangle([p.x, p.y, z], [n.x, n.y, z], [o[b1].x, o[b1].y, z], 0, 0, 1);
        addTriangle([n.x, n.y, z], [o[b2].x, o[b2].y, z], [o[b1].x, o[b1].y, z], 0, 0, 1);
      } else {
        addTriangle([p.x, p.y, z], [o[b1].x, o[b1].y, z], [n.x, n.y, z], 0, 0, -1);
        addTriangle([n.x, n.y, z], [o[b1].x, o[b1].y, z], [o[b2].x, o[b2].y, z], 0, 0, -1);
      }
      let cur = b1; while (cur !== b2) {
        const nextIdx = (cur + 1) % o.length;
        if (flip) addTriangle([n.x, n.y, z], [o[cur].x, o[cur].y, z], [o[nextIdx].x, o[nextIdx].y, z], 0, 0, 1);
        else addTriangle([n.x, n.y, z], [o[nextIdx].x, o[nextIdx].y, z], [o[cur].x, o[cur].y, z], 0, 0, -1);
        cur = nextIdx;
      }
    });
  };

  triangulateWithHole(outer, hole, 0, false);
  triangulateWithHole(outer, hole, baseThickness, true);

  // Outer Walls
  for (let i = 0; i < outer.length; i++) {
    const p = outer[i], n = outer[(i + 1) % outer.length];
    addTriangle([p.x, p.y, 0], [n.x, n.y, 0], [n.x, n.y, baseThickness], 0, 0, 0);
    addTriangle([p.x, p.y, 0], [n.x, n.y, baseThickness], [p.x, p.y, baseThickness], 0, 0, 0);
  }
  // Hole Walls
  for (let i = 0; i < hole.length; i++) {
    const p = hole[i], n = hole[(i + 1) % hole.length];
    addTriangle([p.x, p.y, 0], [n.x, n.y, baseThickness], [n.x, n.y, 0], 0, 0, 0);
    addTriangle([p.x, p.y, 0], [p.x, p.y, baseThickness], [n.x, n.y, baseThickness], 0, 0, 0);
  }

  const polys = generateSnowflakePolygons(settings, snowflakes, baseThickness);
  polys.forEach(p => addPrism(p, baseThickness, zFlakeTop));

  return `solid FrostForge_Bookmark\n${facets.join("")}endsolid FrostForge_Bookmark`;
};

export const generateSTL = (settings: GeneratorSettings, snowflakes: Snowflake[]): string => {
  return (settings.flakeExtrusion >= 0) ? generateVectorSTL(settings, snowflakes) : generateVoxelSTL(settings, snowflakes);
};
