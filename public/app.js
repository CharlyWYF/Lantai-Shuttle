import {stationNames,special,minute,chinaNow,automaticMode,departuresFor,upcoming,morningCycle,upcomingCycle} from './schedule.js';
import {locateStation} from './location.js';
const $=selector=>document.querySelector(selector);
const pad=n=>String(n).padStart(2,'0');
let station=0,preference='auto',lastView='';
try {
  const savedStation=localStorage.getItem('lantai-direction');
  if(['0','1','2'].includes(savedStation))station=Number(savedStation);
  const saved=localStorage.getItem('lantai-mode');
  if(['auto','work','holiday'].includes(saved))preference=saved;
} catch {}
function persist() {
  try {
    localStorage.setItem('lantai-direction',String(station));
    localStorage.setItem('lantai-mode',preference);
  } catch {}
}
const routesHtml=trips=>trips.map(trip=>`<span class="trip-route ${trip.kind==='jizhong'?'via-jizhong':''}">${trip.kind==='jizhong'?'<span class="route-marker">纪忠楼线</span>':''}<span>${trip.route}</span></span>`).join('');
function render() {
  const now=chinaNow(),mode=preference==='auto'?automaticMode(now.day,now.date):preference;
  $('#date').textContent=`${now.date} / ${['周日','周一','周二','周三','周四','周五','周六'][now.day]}`;
  $('#clock').textContent=`${pad(now.hour)}:${pad(now.min)}:${pad(now.sec)}`;
  const viewKey=`${now.date}/${Math.floor(now.minutes)}/${mode}/${preference}/${station}`;
  if(viewKey===lastView)return;
  lastView=viewKey;
  const departures=departuresFor(mode,station),future=upcoming(mode,station,now.minutes),next=future[0];
  const cycle=upcomingCycle(mode,station,now.minutes),morning=morningCycle(mode,station);
  const origin=stationNames[station],destination=station===0?'北门':'兰台';
  const noTimetable=station===2&&mode==='holiday';
  $('#mode-note').textContent=preference==='auto'?`自动使用${mode==='work'?'工作日':'节假日'}表 · ${now.date.startsWith('2026.')?'含 2026 法定假日与调休':'按星期判断，法定假日需手动切换'}，学校安排可手动调整。`:`已选择${mode==='work'?'工作日':'节假日'}表 · 本设备将记住你的选择。`;
  document.querySelectorAll('[data-station]').forEach(button=>{
    const selected=Number(button.dataset.station)===station;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  document.querySelectorAll('[data-mode]').forEach(button=>{
    const selected=button.dataset.mode===preference;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  $('#day-tag').textContent=mode==='work'?'工作日':'节假日';
  $('#departure-origin').textContent=`${origin}发车`;
  $('#following-direction').textContent=`${origin}发车`;
  $('#next-label').textContent=cycle?'早间段':noTimetable?'原表未列班次':next?(next.trips.length>1?`下一班 · ${next.trips.length} 条线路`:'下一班'):'今日班次已结束';
  $('#countdown-label').textContent=cycle?'循环时段':'距发车还有';
  $('#next-time').classList.toggle('cycle-service',Boolean(cycle));
  $('#next-time').textContent=cycle?'循环发车':next?next.time.padStart(5,'0'):'—';
  $('#trip-routes').innerHTML=cycle?`<span class="trip-route">${cycle.route}</span>`:noTimetable?'':next?routesHtml(next.trips):`<span class="trip-route">${origin} → ${destination}</span>`;
  const left=next?Math.max(0,minute(next.time)-Math.floor(now.minutes)):null;
  $('#countdown').classList.toggle('text-status',!cycle&&(left===null||left===0));
  $('#countdown').classList.toggle('cycle-range',Boolean(cycle));
  $('#countdown').innerHTML=cycle?`${cycle.start.padStart(5,'0')}–${cycle.end.padStart(5,'0')}`:left===null?(noTimetable?'未列出':'休息中'):left===0?'即将发车':left>=60?`${Math.floor(left/60)}<small>小时</small> ${left%60}<small>分</small>`:`${left}<small>分钟</small>`;
  $('#status').textContent=cycle?(cycle.active?`请在${origin}候车。`:`${cycle.start.padStart(5,'0')} 开始循环发车。`):noTimetable?'节假日表未提供纪忠楼发车时间。':next?(left===0?`已到表定时间，请在${origin}留意车辆。`:`请在${origin}候车，前往${destination}。`):'明日首班请根据当日时刻表查看。';
  $('#following-title').textContent=cycle?'循环时段后':'再往后几班';
  $('#upcoming').innerHTML=future.slice(cycle?0:1,cycle?3:4).map(departure=>`<div class="bus-card"><div class="bus-card-time"><strong>${departure.time.padStart(5,'0')}</strong><span>${Math.max(0,minute(departure.time)-Math.floor(now.minutes))} 分钟后</span></div><div class="bus-card-routes">${routesHtml(departure.trips)}</div></div>`).join('')||(noTimetable?'<p class="empty">节假日表未列纪忠楼班次，可查看原始时刻表或切换工作日。</p>':'<p class="empty">今天没有更多明确列出的班次。</p>');
  $('#morning-summary').hidden=!morning;
  $('#morning-summary').innerHTML=morning?`<strong>循环发车</strong><span>${morning.start.padStart(5,'0')}–${morning.end.padStart(5,'0')}</span>`:'';
  $('#total').textContent=noTimetable?'原表未列':`${departures.length} 个发车时间`;
  $('#route-legend').textContent=station===2?'经北门返回兰台':'经北门前往纪忠楼';
  $('#times').innerHTML=departures.map(departure=>`<div class="time-cell ${minute(departure.time)+1<=now.minutes?'past':departure.time===next?.time?'next':''}"><strong>${departure.time.padStart(5,'0')}</strong><div class="time-cell-routes">${departure.trips.map(trip=>`<span class="${trip.kind==='jizhong'?'time-jizhong':''}">${trip.kind==='jizhong'?(station===2?'经北门 → 兰台':'经北门 → 纪忠楼'):`${origin} → ${destination}`}</span>`).join('')}</div></div>`).join('');
  const notes=[];
  const eveningStart=mode==='work'?1185:1175,eveningEnd=mode==='work'?1305:1295;
  if(station===0&&next&&minute(next.time)>=eveningStart&&minute(next.time)<=eveningEnd)notes.push('晚间南师附中下课时段，兰台回北门时间可能浮动。');
  $('#notice').hidden=!notes.length;$('#notice').textContent=notes.join(' ');
}
let locationRequest=0;
const locationStatus=$('#location-status');
function showLocationStatus(message) {
  locationStatus.textContent=message;locationStatus.hidden=!message;
}
async function selectNearbyStation() {
  if(!window.isSecureContext||!navigator.geolocation)return;
  const request=++locationRequest;
  try {
    const result=await locateStation(navigator.geolocation);
    if(request!==locationRequest||result.status!=='selected')return;
    station=result.station;persist();render();showLocationStatus(`附近 · ${stationNames[station]}`);
  } catch {
    // Keep the saved station when permission is denied or no reliable fix is available.
  }
}
document.querySelectorAll('[data-station]').forEach(button=>button.addEventListener('click',()=>{
  // Ignore a late GPS response after the user has explicitly chosen a station.
  locationRequest++;showLocationStatus('');
  station=Number(button.dataset.station);persist();render();
}));
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  preference=button.dataset.mode;persist();render();
}));
$('#special-out').textContent=special[0].join('  ');$('#special-back').textContent=special[1].join('  ');
render();selectNearbyStation();setInterval(render,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
