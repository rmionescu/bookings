import mapboxgl from 'mapbox-gl';

export const displayMap = locations => {
  // instantiate a map
  const map = new mapboxgl.Map({
    accessToken: mapboxAccessToken,
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    scrollZoom: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create a marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add the marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current locations
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 200,
      left: 100,
      right: 100
    }
  });

  // Blur any focused popup close button
  document.activeElement?.blur();
};
