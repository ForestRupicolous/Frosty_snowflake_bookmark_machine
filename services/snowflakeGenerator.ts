
import { Snowflake, SnowflakeBranch, GeneratorSettings, SnowflakeType } from '../types';

class Random {
  private seed: number;
  constructor(seed: number) {
    this.seed = Math.abs(seed % 2147483647) || 12345;
  }
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
  jitter(amount: number) {
    return (this.next() - 0.5) * amount;
  }
}

export const generateBookmarkContent = (settings: GeneratorSettings): Snowflake[] => {
  const rng = new Random(settings.seed);
  const flakes: Snowflake[] = [];
  const maxAttempts = 2000; 

  for (let i = 0; i < settings.numFlakes; i++) {
    let attempts = 0;
    let placed = false;

    while (attempts < maxAttempts && !placed) {
      const radius = rng.range(settings.minSize, settings.maxSize);
      const x = rng.range(settings.margin, settings.width - settings.margin);
      const y = rng.range(settings.margin, settings.height - settings.margin);

      const distToHole = Math.sqrt(Math.pow(x - settings.width / 2, 2) + Math.pow(y - 12, 2));
      if (distToHole < settings.holeRadius + radius + 1.5) {
        attempts++;
        continue;
      }

      let collision = false;
      for (const flake of flakes) {
        const dist = Math.sqrt(Math.pow(x - flake.x, 2) + Math.pow(y - flake.y, 2));
        if (dist < (radius + flake.radius) * 1.05 + 1.0) { 
          collision = true;
          break;
        }
      }

      if (!collision) {
        flakes.push(createSnowflake(x, y, radius, rng, settings.complexity, settings.variety, settings.selectedType));
        placed = true;
      }
      attempts++;
    }
  }

  return flakes;
};

const createSnowflake = (
  x: number, 
  y: number, 
  radius: number, 
  rng: Random, 
  complexity: number, 
  variety: number,
  selectedType: SnowflakeType | 'random'
): Snowflake => {
  const id = `flake-${rng.next().toString(36).substr(2, 9)}`;
  
  // High-entropy rotation: 6-fold symmetry means 60deg (PI/3) is the repeat unit
  // We use the full range but the starting "seed" for this flake's rotation is randomized per-flake
  const rotation = rng.range(0, Math.PI * 2);
  
  let type: SnowflakeType;
  if (selectedType !== 'random') {
    type = selectedType;
  } else {
    const typePool: SnowflakeType[] = ['stellar'];
    if (variety > 1) typePool.push('fern');
    if (variety > 3) typePool.push('plate');
    if (variety > 6) typePool.push('needle');
    type = rng.pick(typePool);
  }

  let coreRadiusFactor = 0;
  let subBranchCountFactor = 1;
  let subBranchLengthFactor = 1;
  let baseWidth = rng.range(0.85, 1.1) + (complexity * 0.05);
  const subBranchAngle = rng.range(Math.PI / 6, Math.PI / 2.6); 

  switch (type) {
    case 'plate':
      coreRadiusFactor = rng.range(0.15, 0.45);
      subBranchCountFactor = rng.range(0.3, 0.7);
      subBranchLengthFactor = rng.range(0.3, 0.6);
      baseWidth *= 1.3; 
      break;
    case 'fern':
      coreRadiusFactor = rng.range(0.02, 0.15);
      subBranchCountFactor = rng.range(1.4, 2.2);
      subBranchLengthFactor = rng.range(0.9, 1.4);
      baseWidth *= 0.9;
      break;
    case 'needle':
      coreRadiusFactor = 0;
      subBranchCountFactor = rng.range(0.1, 0.4);
      radius *= rng.range(1.1, 1.3); 
      baseWidth *= 0.75;
      break;
    case 'stellar':
    default:
      coreRadiusFactor = rng.range(0.08, 0.25);
      subBranchCountFactor = rng.range(0.8, 1.3);
      subBranchLengthFactor = rng.range(0.6, 1.0);
      break;
  }

  const coreRadius = radius * coreRadiusFactor;
  const branch: SnowflakeBranch = {
    length: radius,
    subBranches: [],
  };

  const baseNum = 2 + Math.floor(complexity / 1.5);
  const numSubBranches = type === 'needle' ? (rng.next() > 0.7 ? 1 : 0) : Math.floor(rng.range(baseNum - 1, baseNum + 2) * subBranchCountFactor);

  for (let i = 0; i < numSubBranches; i++) {
    const startPos = coreRadius > 0 ? (coreRadius / radius) + 0.1 : 0.15;
    const count = Math.max(1, numSubBranches - 1);
    let pos = startPos + (i / count) * (0.85 - startPos);
    if (numSubBranches > 1) pos += rng.jitter(0.08);
    pos = Math.max(startPos, Math.min(0.9, pos));
    
    const midPointFactor = 1 - Math.abs(pos - 0.5) * 1.5;
    const subLen = radius * rng.range(0.3, 0.6) * subBranchLengthFactor * Math.max(0.2, midPointFactor);
    
    branch.subBranches.push({
      pos,
      length: subLen,
      angle: subBranchAngle + rng.jitter(0.1),
    });
  }

  return { id, x, y, radius, rotation, branches: [branch], complexity, branchWidth: baseWidth, type, coreRadius };
};
