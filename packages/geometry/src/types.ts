export type Point = { x: number; y: number };

export type Polygon = Point[];

export type Strip = {
  polygon: Polygon;
  areaSqFt: number;
  lengthFt: number;
  widthFt: number;
};

export type StripLayout = {
  rotationDeg: number;
  stripWidthFt: number;
  strips: Strip[];
  totalCoveredSqFt: number;
  totalRollSqFt: number;
  wastePct: number;
  seamCount: number;
};

export type DesignIntent = 'minimize-waste' | 'maximize-turf' | 'budget-friendly';

export type DesignIntentResult = {
  intent: DesignIntent;
  turfPolygons: Polygon[];
  rockPolygons: Polygon[];
  turfSqFt: number;
  rockSqFt: number;
  layout: StripLayout;
};
