import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stationLocations} from '../public/location.js';

// Run the real app with a small DOM and a controlled location provider.
function app() {
  const nodes=new Map(),saved=new Map();
  function element(dataset={}){
    return {dataset,hidden:true,textContent:'',innerHTML:'',disabled:false,attributes:{},listeners:{},
      classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=value;},
      addEventListener(event,listener){this.listeners[event]=listener;},
      querySelector(){return this.label??=element();}};
  }
  const stations=[0,1,2].map(value=>element({station:String(value)}));
  const modes=['auto','work','holiday'].map(mode=>element({mode}));
  const get=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
  let success,failure;
  const context={document:{querySelector:get,querySelectorAll:selector=>selector==='[data-station]'?stations:modes,addEventListener(){}},
    window:{isSecureContext:true},navigator:{geolocation:{getCurrentPosition(ok,error){success=ok;failure=error;}}},
    localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},setInterval(){},Date};
  const source=['schedule.js','location.js','app.js'].map(file=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')).join('\n');
  vm.runInNewContext(source,context);
  return {get,stations,saved,locate:()=>get('#locate-station').listeners.click(),success:station=>success({coords:{...stationLocations[station],accuracy:15}}),failure:code=>failure({code})};
}

test('a location result updates the selected station and timetable together',async()=>{
  const ui=app(),pending=ui.locate();
  assert.equal(ui.get('#locate-station').disabled,true);
  ui.success(2);await pending;
  assert.equal(ui.stations[2].attributes['aria-pressed'],'true');
  assert.equal(ui.get('#departure-origin').textContent,'纪忠楼发车');
  assert.equal(ui.get('#location-status').textContent,'离你最近：纪忠楼');
  assert.equal(ui.saved.get('lantai-direction'),'2');
  assert.equal(ui.get('#locate-station').disabled,false);
});
test('manual station selection wins over a late location response',async()=>{
  const ui=app(),pending=ui.locate();
  ui.stations[1].listeners.click();ui.success(0);await pending;
  assert.equal(ui.get('#departure-origin').textContent,'北门发车');
  assert.equal(ui.saved.get('lantai-direction'),'1');
  assert.equal(ui.get('#location-status').hidden,true);
  assert.equal(ui.get('#locate-station').disabled,false);
});
test('denial preserves the selected station and permits another attempt',async()=>{
  const ui=app();ui.stations[1].listeners.click();
  const denied=ui.locate();ui.failure(1);await denied;
  assert.match(ui.get('#location-status').textContent,/未获定位授权/);
  assert.equal(ui.get('#departure-origin').textContent,'北门发车');
  assert.equal(ui.get('#locate-station').disabled,false);
  const retry=ui.locate();ui.success(0);await retry;
  assert.equal(ui.get('#departure-origin').textContent,'兰台发车');
});
