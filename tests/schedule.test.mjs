import test from 'node:test';
import assert from 'node:assert/strict';
import {departuresFor,upcoming,tripsFor,minute,automaticMode,chinaNow} from '../public/schedule.js';

test('纪忠楼去程 participates in the next departure with its full route',()=>{
  const next=upcoming('work',0,605)[0];
  assert.equal(next.time,'10:20');
  assert.deepEqual(next.trips,[{time:'10:20',route:'兰台 → 北门 → 文学院 → 纪忠楼',kind:'jizhong'}]);
});
test('simultaneous direct and Jizhong routes are both retained',()=>{
  const next=upcoming('work',0,1021)[0];
  assert.equal(next.time,'17:10');
  assert.deepEqual(next.trips.map(t=>t.kind),['direct','jizhong']);
  assert.equal(departuresFor('work',0).filter(t=>t.time==='17:10').length,1);
});
test('North Gate return does not use departures from Jizhong',()=>{
  const next=upcoming('work',1,641)[0];
  assert.equal(next.time,'11:10');
  assert.equal(next.trips[0].route,'北门 → 兰台');
  assert.ok(tripsFor('work',1).every(t=>t.kind==='direct'));
});
test('holiday 7:40 is labelled as Jizhong without adding weekday services',()=>{
  assert.equal(upcoming('holiday',0,450)[0].trips[0].kind,'jizhong');
  assert.equal(upcoming('holiday',0,601)[0].time,'10:30');
  assert.equal(upcoming('holiday',1,775)[0].time,'12:55');
});
test('the current departure remains for its minute and disappears the next minute',()=>{
  assert.equal(upcoming('work',0,620.99)[0].time,'10:20');
  assert.equal(upcoming('work',0,621)[0].time,'10:30');
  assert.deepEqual(upcoming('work',1,1351),[]);
});
test('all stations and modes remain chronologically sorted',()=>{
  for(const mode of ['work','holiday'])for(const direction of [0,1,2]){
    const departures=departuresFor(mode,direction);
    assert.ok(departures.every((d,i)=>!i||minute(d.time)>minute(departures[i-1].time)));
  }
  assert.equal(tripsFor('work',0).length,55);
});
test('Jizhong shows its own departure times and return route',()=>{
  const next=upcoming('work',2,700)[0];
  assert.equal(next.time,'11:40');
  assert.deepEqual(next.trips,[{time:'11:40',route:'纪忠楼 → 文学院 → 北门 → 兰台',kind:'jizhong'}]);
  assert.equal(departuresFor('work',2).length,11);
  assert.equal(upcoming('work',2,1301).length,0);
});
test('no Jizhong holiday timetable is invented',()=>{
  assert.deepEqual(tripsFor('holiday',2),[]);
  assert.deepEqual(upcoming('holiday',2,600),[]);
});
test('automatic calendar still honors holiday, adjusted workday and Beijing midnight',()=>{
  assert.equal(automaticMode(3,'2026.10.07'),'holiday');
  assert.equal(automaticMode(6,'2026.10.10'),'work');
  assert.equal(chinaNow(new Date('2026-10-07T16:00:00Z')).date,'2026.10.08');
});
