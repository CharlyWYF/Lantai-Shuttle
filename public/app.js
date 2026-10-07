import {special,minute,chinaNow,automaticMode,departuresFor,upcoming} from './schedule.js';
const $=selector=>document.querySelector(selector);
const pad=n=>String(n).padStart(2,'0');
let direction=0,preference='auto',lastView='';
try {
  direction=localStorage.getItem('lantai-direction')==='1'?1:0;
  const saved=localStorage.getItem('lantai-mode');
  if(['auto','work','holiday'].includes(saved))preference=saved;
} catch {}
function persist() {
  try {
    localStorage.setItem('lantai-direction',String(direction));
    localStorage.setItem('lantai-mode',preference);
  } catch {}
}
const routesHtml=trips=>trips.map(trip=>`<span class="trip-route ${trip.kind==='jizhong'?'via-jizhong':''}">${trip.kind==='jizhong'?'<span class="route-marker">纪忠楼线</span>':''}<span>${trip.route}</span></span>`).join('');
function render() {
  const now=chinaNow(),mode=preference==='auto'?automaticMode(now.day,now.date):preference;
  $('#date').textContent=`${now.date} / ${['周日','周一','周二','周三','周四','周五','周六'][now.day]}`;
  $('#clock').textContent=`${pad(now.hour)}:${pad(now.min)}:${pad(now.sec)}`;
  const viewKey=`${now.date}/${Math.floor(now.minutes)}/${mode}/${preference}/${direction}`;
  if(viewKey===lastView)return;
  lastView=viewKey;
  const departures=departuresFor(mode,direction),future=upcoming(mode,direction,now.minutes),next=future[0];
  const origin=direction===0?'兰台':'北门',destination=direction===0?'北门':'兰台';
  $('#mode-note').textContent=preference==='auto'?`自动使用${mode==='work'?'工作日':'节假日'}表 · ${now.date.startsWith('2026.')?'含 2026 法定假日与调休':'按星期判断，法定假日需手动切换'}，学校安排可手动调整。`:`已选择${mode==='work'?'工作日':'节假日'}表 · 本设备将记住你的选择。`;
  document.querySelectorAll('[data-direction]').forEach(button=>{
    const selected=Number(button.dataset.direction)===direction;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  document.querySelectorAll('[data-mode]').forEach(button=>{
    const selected=button.dataset.mode===preference;
    button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));
  });
  $('#day-tag').textContent=mode==='work'?'工作日':'节假日';
  $('#departure-origin').textContent=`${origin}发车`;
  $('#following-direction').textContent=`${origin}发车 → ${destination}`;
  $('#next-label').textContent=next?(next.trips.length>1?`下一班 · ${next.trips.length} 条线路`:'下一班'):'今日班次已结束';
  $('#next-time').textContent=next?next.time.padStart(5,'0'):'—';
  $('#trip-routes').innerHTML=next?routesHtml(next.trips):`<span class="trip-route">${origin} → ${destination}</span>`;
  const left=next?Math.max(0,minute(next.time)-Math.floor(now.minutes)):null;
  $('#countdown').innerHTML=left===null?'休息中':left===0?'即将发车':left>=60?`${Math.floor(left/60)}<small>小时</small> ${left%60}<small>分</small>`:`${left}<small>分钟</small>`;
  $('#status').textContent=next?(left===0?`已到表定时间，请在${origin}留意车辆。`:`请在${origin}候车，前往${destination}。`):'明日首班请根据当日时刻表查看。';
  $('#upcoming').innerHTML=future.slice(1,4).map(departure=>`<div class="bus-card"><div class="bus-card-time"><strong>${departure.time.padStart(5,'0')}</strong><span>${Math.max(0,minute(departure.time)-Math.floor(now.minutes))} 分钟后</span></div><div class="bus-card-routes">${routesHtml(departure.trips)}</div></div>`).join('')||'<p class="empty">今天没有更多明确列出的班次。</p>';
  $('#total').textContent=`${departures.length} 个发车时间`;
  $('#times').innerHTML=departures.map(departure=>`<div class="time-cell ${minute(departure.time)+1<=now.minutes?'past':departure.time===next?.time?'next':''}"><strong>${departure.time.padStart(5,'0')}</strong><div class="time-cell-routes">${departure.trips.map(trip=>`<span class="${trip.kind==='jizhong'?'time-jizhong':''}">${trip.kind==='jizhong'?'经北门 → 纪忠楼':`${origin} → ${destination}`}</span>`).join('')}</div></div>`).join('');
  const notes=[];
  if(mode==='work'&&now.minutes>=(direction?450:440)&&now.minutes<=(direction?590:580))notes.push('当前为早高峰循环发车时段。原表未列明每班间隔，请留意现场车辆。');
  const eveningStart=mode==='work'?1185:1175,eveningEnd=mode==='work'?1305:1295;
  if(direction===0&&next&&minute(next.time)>=eveningStart&&minute(next.time)<=eveningEnd)notes.push('晚间南师附中下课时段，兰台回北门时间可能浮动。');
  $('#notice').hidden=!notes.length;$('#notice').textContent=notes.join(' ');
  $('#jizhong-return').hidden=mode!=='work'||direction!==1;
  const returnTimes=special[1].filter(time=>minute(time)+1>now.minutes);
  $('#return-times').textContent=returnTimes.length?returnTimes.slice(0,3).map(time=>time.padStart(5,'0')).join('  /  '):'今日纪忠楼回程表列时间已全部结束。';
}
document.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('click',()=>{
  direction=Number(button.dataset.direction);persist();render();
}));
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  preference=button.dataset.mode;persist();render();
}));
$('#special-out').textContent=special[0].join('  ');$('#special-back').textContent=special[1].join('  ');
render();setInterval(render,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
