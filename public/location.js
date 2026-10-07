// Boarding points supplied by the user from Amap (GCJ-02), in station order.
export const amapStationLocations = [
  {longitude:118.819487,latitude:31.901497}, // 兰台
  {longitude:118.823994,latitude:31.891502}, // 北门转盘
  {longitude:118.815425,latitude:31.886763}, // 纪忠楼
];

export function wgs84ToGcj02({latitude,longitude}) {
  if(longitude<72.004||longitude>137.8347||latitude<0.8293||latitude>55.8271)return {latitude,longitude};
  const x=longitude-105,y=latitude-35,pi=Math.PI;
  const wave=(value,a,b)=>(a*Math.sin(value*pi)+b*Math.sin(value*pi/3))*2/3;
  const shared=(20*Math.sin(6*x*pi)+20*Math.sin(2*x*pi))*2/3;
  let dLat=-100+2*x+3*y+.2*y*y+.1*x*y+.2*Math.sqrt(Math.abs(x))+shared+wave(y,20,40)+(160*Math.sin(y*pi/12)+320*Math.sin(y*pi/30))*2/3;
  let dLon=300+x+2*y+.1*x*x+.1*x*y+.1*Math.sqrt(Math.abs(x))+shared+wave(x,20,40)+(150*Math.sin(x*pi/12)+300*Math.sin(x*pi/30))*2/3;
  const rad=latitude*pi/180,sin=Math.sin(rad),magic=1-.00669342162296594323*sin*sin,sqrt=Math.sqrt(magic);
  dLat=dLat*180/((6378245*(1-.00669342162296594323))/(magic*sqrt)*pi);
  dLon=dLon*180/(6378245/sqrt*Math.cos(rad)*pi);
  return {latitude:latitude+dLat,longitude:longitude+dLon};
}

export function gcj02ToWgs84(point) {
  let result={...point};
  for(let i=0;i<5;i++){
    const converted=wgs84ToGcj02(result);
    result={latitude:result.latitude+point.latitude-converted.latitude,longitude:result.longitude+point.longitude-converted.longitude};
  }
  return result;
}

// Convert fixed boarding points once; each browser fix stays in WGS84.
export const stationLocations = amapStationLocations.map(gcj02ToWgs84);

export function distanceBetween(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const lat1 = radians(a.latitude), lat2 = radians(b.latitude);
  const dLat = lat2 - lat1, dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

function validCoordinates(point) {
  return point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

export function nearestStation(coords, locations = stationLocations) {
  if (locations.length !== 3 || !locations.every(validCoordinates)) return {status: 'unconfigured'};
  if (!validCoordinates(coords) || !Number.isFinite(coords.accuracy) || coords.accuracy < 0) return {status: 'unavailable'};
  const ranked = locations.map((point, station) => ({station, distance: distanceBetween(coords, point)}))
    .sort((a, b) => a.distance - b.distance);
  const nearest = ranked[0];
  if (coords.accuracy > 500) return {status: 'inaccurate'};
  if (nearest.distance > 5000) return {status: 'far'};
  // Either station could be nearer within the reported uncertainty radius.
  if (ranked[1].distance - nearest.distance <= 2 * coords.accuracy) return {status: 'ambiguous'};
  return {status: 'selected', ...nearest};
}

export function locateStation(geolocation, locations = stationLocations) {
  if (locations.length !== 3 || !locations.every(validCoordinates)) return Promise.resolve({status: 'unconfigured'});
  return new Promise((resolve, reject) => {
    try {
      geolocation.getCurrentPosition(position => resolve(nearestStation(position.coords, locations)), reject,
        {enableHighAccuracy: true, timeout: 12000, maximumAge: 0});
    } catch (error) { reject(error); }
  });
}
