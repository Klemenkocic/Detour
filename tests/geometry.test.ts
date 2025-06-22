import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  pointToLineDistance,
  dotProductForwardCheck,
  getRouteProgressRatio,
} from '../src/lib/geometry';

const PARIS = { lat: 48.8566, lng: 2.3522 };
const LONDON = { lat: 51.5074, lng: -0.1278 };

describe('geometry helpers', () => {
  it('haversineDistance: Paris → London ≈ 344 km', () => {
    const km = haversineDistance(PARIS, LONDON);
    expect(km).toBeGreaterThan(340);
    expect(km).toBeLessThan(350);
  });

  it('haversineDistance: identical points = 0 km', () => {
    expect(haversineDistance(PARIS, PARIS)).toBeCloseTo(0, 5);
  });

  it.todo('pointToLineDistance edge-cases');
  it.todo('dotProductForwardCheck & progress ratio');
}); 