import { GridMap } from './gridmap/gridmap.js'

export async function setupLayout(elem, geom_options) {
  elem.innerHTML = `
    <div style="text-align: center; padding: 50px 20px;">
      Loading...
    </div>
  `
  // Load the data first
  const geojson = await fetch(geom_options.layer)
    .then(response => response.json())
    .catch(error => {
      console.error('Error loading data:', error)
      elem.innerHTML = `
        <div style="text-align: center; padding: 50px 20px;">
          <h1>Error loading data</h1>
          <p>${error.message}</p>
        </div>
      `
    })

  const grid = new GridMap(geojson, geom_options.nProp)
  grid.render(elem)
}
