
/**
 * Calculates the distance between two points on Earth using the Haversine formula
 * @param coord1 - First coordinate point
 * @param coord2 - Second coordinate point
 * @returns Distance in kilometers
 */
export function haversineDistance(
  coord1: google.maps.LatLngLiteral,
  coord2: google.maps.LatLngLiteral
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the shortest distance from a point to a line segment
 * @param point - The point to measure distance from
 * @param lineStart - Start point of the line segment
 * @param lineEnd - End point of the line segment
 * @returns Distance in kilometers
 */
export function pointToLineDistance(
  point: google.maps.LatLngLiteral,
  lineStart: google.maps.LatLngLiteral,
  lineEnd: google.maps.LatLngLiteral
): number {
  const A = point.lat - lineStart.lat;
  const B = point.lng - lineStart.lng;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lng - lineStart.lng;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number, yy: number;

  if (param < 0) {
    xx = lineStart.lat;
    yy = lineStart.lng;
  } else if (param > 1) {
    xx = lineEnd.lat;
    yy = lineEnd.lng;
  } else {
    xx = lineStart.lat + param * C;
    yy = lineStart.lng + param * D;
  }

  return haversineDistance({ lat: xx, lng: yy }, point);
}

/**
 * Checks if movement from one point to another represents forward progress using dot product
 * @param from - Starting point
 * @param to - Destination point
 * @param target - Final target point
 * @returns True if the movement represents forward progress, false if backtracking
 */
export function dotProductForwardCheck(
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral,
  target: google.maps.LatLngLiteral
): boolean {
  const fromToTargetVector = {
    lat: target.lat - from.lat,
    lng: target.lng - from.lng
  };
  const fromToDestVector = {
    lat: to.lat - from.lat,
    lng: to.lng - from.lng
  };
  
  // Dot product to check if we're going in roughly the right direction
  const dotProduct = fromToTargetVector.lat * fromToDestVector.lat + 
                    fromToTargetVector.lng * fromToDestVector.lng;
  
  // If dot product is negative, we're going backwards
  return dotProduct >= 0;
}

/**
 * Calculates the progress ratio of movement toward a target destination
 * @param from - Starting point
 * @param to - Intermediate point
 * @param destination - Final destination
 * @returns Progress ratio (0-1), where 1 means we've reached the destination
 */
export function getRouteProgressRatio(
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral
): number {
  const currentDistance = haversineDistance(from, destination);
  const nextDistance = haversineDistance(to, destination);
  
  // Progress is how much closer we get to destination
  const progress = (currentDistance - nextDistance) / currentDistance;
  
  return progress;
} 