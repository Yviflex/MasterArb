/**
 * Calculate the area of a simple ring using the Shoelace formula
 * @param {Array} ring - Array of [x, y] coordinates forming a closed ring
 * @returns {number} - Area in square units (e.g., square meters)
 */
function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
  }
  return Math.abs(area) / 2;
}

/**
 * Calculate the area of a polygon (with potential holes)
 * @param {Array} coordinates - Array of rings, where the first ring is the outer boundary
 *                              and subsequent rings are holes
 * @returns {number} - Area in square units
 */
function polygonArea(coordinates) {
  // Outer ring
  let area = ringArea(coordinates[0]);

  // Subtract holes if present
  for (let i = 1; i < coordinates.length; i++) {
    area -= ringArea(coordinates[i]);
  }

  return area;
}

/**
 * Calculate the (planar) area of any GeoJSON geometry with projected coordinates.
 * Don't use this for spherical coordinates (e.g., WGS84), use turf.area instead.
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {number} - Area in square units
 */
export function geomArea(geometry) {
  let totalArea = 0;

  switch (geometry.type) {
    case 'Polygon':
      totalArea = polygonArea(geometry.coordinates);
      break;

    case 'MultiPolygon':
      // Sum area of each polygon in the multi-polygon
      for (const polygonCoords of geometry.coordinates) {
        totalArea += polygonArea(polygonCoords);
      }
      break;

    case 'GeometryCollection':
      for (const geom of geometry.geometries) {
        totalArea += geomArea(geom);
      }
      break;

    default:
      console.warn(`Geometry type '${geometry.type}' doesn't have an area or is not supported`);
  }

  return totalArea;
}
