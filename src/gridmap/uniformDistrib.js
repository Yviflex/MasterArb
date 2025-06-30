import * as turf from "@turf/turf";

export function pointsAroundCentroid(polygon, n, radius = 5000) {
  const [cx, cy] = turf.centroid(polygon).geometry.coordinates;
  const points = [];
  for (let i = 0; i < n; i++) {
    const angle = 2 * Math.PI * i / n;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push({
      type: "Point",
      coordinates: [x, y]
    });
  }
  return points;
}
