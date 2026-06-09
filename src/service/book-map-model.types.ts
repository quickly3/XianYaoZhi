export type EntityCategory =
  | 'place'
  | 'object'
  | 'creature'
  | 'person'
  | 'ethnic'
  | 'plant'
  | 'event'
  | 'ability';

export type SpatialRelationType =
  | 'traverse'
  | 'adjacent'
  | 'watersFlow'
  | 'overlooks'
  | 'locatedAt'
  | 'partOf'
  | 'lineage'
  | 'astroRef';

export interface SourceInfo {
  book: string;
  chapter: string;
  snippet: string;
  file: string;
}

export interface PlaceNode {
  id: string;
  name: string;
  category: 'place';
  type: string;
  source: SourceInfo;
  aliases?: string[];
  routeSection?: string;
  routeOrder?: number;
  containsEntity?: string[];
  notes?: string;
  uncertain?: boolean;
}

export interface SpatialEdge {
  from: string;
  to: string;
  relation: SpatialRelationType;
  snippet: string;
  source: SourceInfo;
  direction?: string;
  distanceLi?: number;
  notes?: string;
}

export interface SpatialGraph {
  metadata: {
    book: string;
    chapter: string;
    sourceFile: string;
    coordinateSystem: 'relative';
    distanceUnit: '里';
    notes: string[];
  };
  nodes: PlaceNode[];
  edges: SpatialEdge[];
}

export interface EntityRecord {
  id: string;
  name: string;
  category: Exclude<EntityCategory, 'place'>;
  type: string;
  locatedAt: string[];
  source: SourceInfo;
  description?: string;
  effects?: string[];
  uncertain?: boolean;
}

export interface MapEntityCollection {
  metadata: {
    book: string;
    chapter: string;
    sourceFile: string;
    notes: string[];
  };
  entities: EntityRecord[];
}

export interface MapModelParseResult {
  graph: SpatialGraph;
  entities: MapEntityCollection;
  summaryMarkdown: string;
}

export interface BuildMapModelOptions {
  book?: string;
  chapter?: string;
  input?: string;
  output?: string;
  sourceDir?: string;
}