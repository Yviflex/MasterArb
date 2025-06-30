import { setupLayout } from './layout.js'
import './style.css'

await setupLayout(
  document.querySelector('#app'),
  {
    layer: '/data/cantonsSIMPLE.geojson',
    nProp: 'n'
  }
)
