
export type SnowflakeType = 'stellar' | 'fern' | 'plate' | 'needle';
export type ExportFormat = 'svg' | 'stl';

export interface Snowflake {
  id: string;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  branches: SnowflakeBranch[];
  complexity: number;
  branchWidth: number;
  type: SnowflakeType;
  coreRadius: number;
}

export interface SnowflakeBranch {
  length: number;
  subBranches: {
    pos: number;
    length: number;
    angle: number;
  }[];
}

export interface GeneratorSettings {
  width: number;
  height: number;
  numFlakes: number;
  minSize: number;
  maxSize: number;
  complexity: number;
  seed: number;
  margin: number;
  holeRadius: number;
  thickness: number;
  flakeExtrusion: number; 
  minLineWidth: number; // New: Controls minimum physical width of branches
  variety: number;
  selectedType: SnowflakeType | 'random';
  exportFormat: ExportFormat;
}

export interface AIThemeResponse {
  themeName: string;
  description: string;
  suggestedSettings: Partial<GeneratorSettings>;
}
