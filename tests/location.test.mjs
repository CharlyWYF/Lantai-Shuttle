import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceBetween,nearestStation,locateStation,stationLocations,amapStationLocations,wgs84ToGcj02,gcj02ToWgs84} from '../public/location.js';

// Synthetic points for matching tests; these are not the shuttle stop coordinates.
const stops=[{latitude:31.9,longitude:118.81},{latitude:31.89,longitude:118.82},{latitude:31.88,longitude:118.81}];
test('distance uses meters and selects each nearest station',()=>{
  assert.ok(Math.abs(distanceBetween({latitude:0,longitude:0},{latitude:0,longitude:1})-111195)<2);
  stops.forEach((point,station)=>assert.equal(nearestStation({...point,accuracy:15},stops).station,station));
});
test('uncertain, remote and invalid positions never select a station',()=>{
  assert.equal(nearestStation({...stops[0],accuracy:900},stops).status,'inaccurate');
  assert.equal(nearestStation({latitude:0,longitude:0,accuracy:10},stops).status,'far');
  assert.equal(nearestStation({latitude:31.895,longitude:118.815,accuracy:100},stops).status,'ambiguous');
  assert.equal(nearestStation({latitude:NaN,longitude:118.81,accuracy:10},stops).status,'unavailable');
  assert.equal(nearestStation({...stops[0],accuracy:10},[null,null,null]).status,'unconfigured');
});
test('requests a fresh fix with a timeout and propagates permission denial',async()=>{
  let options;
  const result=await locateStation({getCurrentPosition(success,error,settings){options=settings;success({coords:{...stops[2],accuracy:10}});}},stops);
  assert.equal(result.station,2);
  assert.deepEqual(options,{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  await assert.rejects(locateStation({getCurrentPosition(success,error){error({code:1});}},stops),error=>error.code===1);
});
test('does not request user location before station positions are configured',async()=>{
  const result=await locateStation({getCurrentPosition(){assert.fail('should not request location');}},[null,null,null]);
  assert.equal(result.status,'unconfigured');
});
test('Amap station points match GPS positions after coordinate conversion',()=>{
  // Fixed rounded WGS84 expectations also catch latitude/longitude ordering errors.
  const gps=[{latitude:31.90359,longitude:118.81432},{latitude:31.89361,longitude:118.81882},{latitude:31.88887,longitude:118.81026}];
  gps.forEach((point,station)=>{
    assert.ok(distanceBetween(point,stationLocations[station])<10);
    assert.equal(nearestStation({...point,accuracy:20}).station,station);
    assert.ok(distanceBetween(amapStationLocations[station],stationLocations[station])>400);
    assert.ok(distanceBetween(wgs84ToGcj02(stationLocations[station]),amapStationLocations[station])<.01);
  });
  assert.deepEqual(gcj02ToWgs84({latitude:0,longitude:0}),{latitude:0,longitude:0});
});
