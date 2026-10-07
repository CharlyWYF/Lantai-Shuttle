import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stationLocations} from '../public/location.js';

// Run the real app with a small DOM and a controlled location provider.
function app({savedStation,secure=true,geolocation=true}={}) {
  const nodes=new Map(),saved=new Map();
  if(savedStation!==undefined)saved.set('lantai-direction',String(savedStation));
  function element(dataset={}){
    return {dataset,hidden:true,textContent:'',innerHTML:'',disabled:false,attributes:{},listeners:{},
      classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=value;},
      addEventListener(event,listener){this.listeners[event]=listener;},
      querySelector(){return this.label??=element();}};
  }
  const stations=[0,1,2].map(value=>element({station:String(value)}));
  const modes=['auto','work','holiday'].map(mode=>element({mode}));
  const get=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
  let success,failure,requests=0;
  const context={document:{querySelector:get,querySelectorAll:selector=>selector==='[data-station]'?stations:modes,addEventListener(){}},
    window:{isSecureContext:secure},navigator:{geolocation:geolocation?{getCurrentPosition(ok,error){requests++;success=ok;failure=error;}}:undefined},
    localStorage:{getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)},setInterval(){},Date};
  const source=['schedule.js','location.js','app.js'].map(file=>readFileSync(new URL('../public/'+file,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')).join('\n');
  vm.runInNewContext(source,context);
  return {get,stations,saved,requests:()=>requests,success:station=>success({coords:{...stationLocations[station],accuracy:15}}),failure:code=>failure({code})};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('page load requests location and updates the station and timetable together',async()=>{
  const ui=app();
  assert.equal(ui.requests(),1);
  ui.success(2);await settle();
  assert.equal(ui.stations[2].attributes['aria-pressed'],'true');
  assert.equal(ui.get('#departure-origin').textContent,'纪忠楼发车');
  assert.equal(ui.get('#location-status').textContent,'附近 · 纪忠楼');
  assert.equal(ui.saved.get('lantai-direction'),'2');
});
test('manual station selection wins over a late location response',async()=>{
  const ui=app();
  ui.stations[1].listeners.click();ui.success(0);await settle();
  assert.equal(ui.get('#departure-origin').textContent,'北门发车');
  assert.equal(ui.saved.get('lantai-direction'),'1');
  assert.equal(ui.get('#location-status').hidden,true);
});
test('denial or timeout silently preserves the saved station',async()=>{
  for(const code of [1,2,3]){
    const ui=app({savedStation:1});ui.failure(code);await settle();
    assert.equal(ui.get('#departure-origin').textContent,'北门发车');
    assert.equal(ui.get('#location-status').hidden,true);
    assert.equal(ui.requests(),1);
  }
});
test('unsupported or insecure browsers keep the saved station without requesting location',()=>{
  for(const options of [{secure:false},{geolocation:false}]){
    const ui=app({...options,savedStation:2});
    assert.equal(ui.requests(),0);
    assert.equal(ui.get('#departure-origin').textContent,'纪忠楼发车');
  }
});
