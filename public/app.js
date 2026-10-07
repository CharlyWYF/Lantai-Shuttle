import {schedules,special,minute,chinaNow,automaticMode,upcoming} from './schedule.js';
const $=s=>document.querySelector(s);
let direction=0, preference='auto';
try{direction=localStorage.getItem('lantai-direction')==='1'?1:0;const saved=localStorage.getItem('lantai-mode');if(['auto','work','holiday'].includes(saved))preference=saved;}catch{}
function persist(){try{localStorage.setItem('lantai-direction',String(direction));localStorage.setItem('lantai-mode',preference);}catch{}}
const pad=n=>String(n).padStart(2,'0');
function render(){
 const now=chinaNow(),mode=preference==='auto'?automaticMode(now.day,now.date):preference;
 const times=schedules[mode][direction], future=upcoming(mode,direction,now.minutes), next=future[0];
 $('#date').textContent=`${now.date} / ${['周日','周一','周二','周三','周四','周五','周六'][now.day]}`;
 $('#clock').textContent=`${pad(now.hour)}:${pad(now.min)}:${pad(now.sec)}`;
 $('#mode-note').textContent=preference==='auto'?`当前自动使用${mode==='work'?'工作日':'节假日'}表 · ${now.date.startsWith('2026.')?'已包含 2026 法定假日与调休':'按星期判断，法定假日／调休需手动切换'}，学校安排可手动调整。`:`已手动选择${mode==='work'?'工作日':'节假日'}表 · 本设备将记住你的选择。`;
 document.querySelectorAll('[data-direction]').forEach(b=>{const on=+b.dataset.direction===direction;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
 document.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===preference;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
 $('#day-tag').textContent=mode==='work'?'工作日':'节假日';
 $('#origin').textContent=direction===0?'兰台研究生公寓':'北门转盘';
 $('#destination').textContent=direction===0?'北门转盘':'兰台研究生公寓';
 $('#next-label').textContent=next?'下一班发车':'今日班次已结束';
 $('#next-time').textContent=next?next.padStart(5,'0'):'—';
 const left=next?Math.max(0,Math.ceil(minute(next)-now.minutes)):null;
 $('#countdown').innerHTML=left===null?'休息中':left===0?'即将发车':left>=60?`${Math.floor(left/60)}<small>小时</small> ${left%60}<small>分</small>`:`${left}<small>分钟</small>`;
 $('#status').textContent=next?(left===0?'已到表定发车时间，请留意车辆。':'提前到站，给自己留一点余裕。'):'明日首班请根据当日时刻表查看。';
 $('#upcoming').innerHTML=future.slice(1,4).map(t=>`<div class="bus-card"><strong>${t.padStart(5,'0')}</strong><span>${Math.max(0,Math.ceil(minute(t)-now.minutes))} 分钟后</span></div>`).join('')||'<p class="empty">今天没有更多明确列出的班次。</p>';
 $('#total').textContent=`${times.length} 个明确班次`;
 $('#times').innerHTML=times.map(t=>`<div class="time-cell ${minute(t)+1<=now.minutes?'past':t===next?'next':''}">${t.padStart(5,'0')}</div>`).join('');
 const notes=[];
 if(mode==='work'&&now.minutes>=(direction?450:440)&&now.minutes<=(direction?590:580))notes.push('当前为早高峰循环发车时段。原表未列明每班间隔，首页时间仅为明确标注班次，请留意现场车辆。');
 const eveningStart=mode==='work'?1185:1175,eveningEnd=mode==='work'?1305:1295;
 if(direction===0&&next&&minute(next)>=eveningStart&&minute(next)<=eveningEnd)notes.push('晚间南师附中下课时段，兰台回北门时间可能浮动。');
 if(mode==='holiday'&&direction===0&&next==='7:40')notes.push('7:40 班经纪忠楼。');
 $('#notice').hidden=!notes.length;$('#notice').textContent=notes.join(' ');
}
document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>{direction=+b.dataset.direction;persist();render();}));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{preference=b.dataset.mode;persist();render();}));
$('#special-out').textContent=special[0].join('  ');$('#special-back').textContent=special[1].join('  ');
render();setInterval(render,1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
