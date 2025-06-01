export default [
    { elementType: 'geometry', stylers: [{ color: '#1d2b43' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec0ff' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2b43' }] },
  
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#283d5b' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d8e' }] },
  
    { featureType: 'poi', stylers: [{ visibility: 'off' }] } // drop POI clutter
  ];