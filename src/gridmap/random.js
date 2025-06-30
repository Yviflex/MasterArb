import * as turf from '@turf/turf'

/**
 * @param {Geometry} polygon A GeoJSON polygon
 * @returns a random point inside the polygon
 * @description Generates a random point inside a polygon using a naive sampling method.
 */
export function randomPointInPolygon (polygon) {
  const bbox = turf.bbox(polygon)
  const xMin = bbox[0]
  const yMin = bbox[1]
  const xMax = bbox[2]
  const yMax = bbox[3]

  let point
  do {
    const x = Math.random() * (xMax - xMin) + xMin
    const y = Math.random() * (yMax - yMin) + yMin
    point = turf.point([x, y])
  } while (!turf.booleanPointInPolygon(point, polygon))

  return point.geometry
}
