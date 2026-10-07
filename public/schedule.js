export const parse = s => s.split(/\s+/).filter(Boolean);
export const schedules = {
  work: [
    parse('7:30 7:40 9:30 10:00 10:30 11:00 11:20 11:40 11:55 12:10 12:20 12:40 12:50 13:05 13:20 14:00 14:20 14:40 15:00 15:20 15:40 16:00 16:30 16:50 17:10 17:20 17:40 17:50 18:00 18:20 18:30 18:40 18:50 19:10 19:30 19:45 20:05 20:25 20:45 21:05 21:25 21:45 22:05 22:15 22:25'),
    parse('10:10 10:40 11:10 11:30 11:50 12:00 12:20 12:30 12:40 13:00 13:10 13:30 14:10 14:30 14:50 15:10 15:30 15:50 16:10 16:40 17:00 17:10 17:30 17:40 17:50 18:00 18:10 18:30 18:40 18:50 19:00 19:20 19:40 20:00 20:20 20:40 21:00 21:20 21:40 22:00 22:10 22:20 22:30')
  ],
  holiday: [
    parse('7:20 7:40 8:00 8:20 8:40 9:00 9:20 9:40 10:00 10:30 10:50 11:10 11:30 11:50 12:10 12:30 12:50 13:00 13:20 13:40 14:00 14:20 14:40 15:00 15:20 15:40 16:00 16:20 16:40 17:00 17:20 17:40 18:00 18:20 18:40 19:00 19:20 19:35 19:55 20:15 20:35 20:55 21:15 21:35 21:55 22:15 22:25'),
    parse('7:30 7:50 8:10 8:30 8:50 9:10 9:30 9:50 10:10 10:40 11:00 11:20 11:40 12:00 12:20 12:40 12:55 13:10 13:30 13:50 14:10 14:30 14:50 15:10 15:30 15:50 16:10 16:30 16:50 17:10 17:30 17:50 18:10 18:30 18:50 19:10 19:30 19:50 20:10 20:30 20:50 21:10 21:30 21:50 22:10 22:20 22:30')
  ]
};
export const special = [parse('10:20 11:10 13:40 14:30 15:30 16:20 17:10 18:40 19:30 20:25'), parse('10:50 11:40 12:30 15:00 15:50 16:50 17:40 18:30 19:55 20:50 21:40')];
export const stationNames = ['兰台','北门','纪忠楼'];
export const minute = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
export function morningCycle(mode,station) {
  if(mode !== 'work')return null;
  const start=station===0?'7:20':'7:30',end=station===0?'9:40':'9:50';
  const route=['兰台 → 北门 → 纪忠楼','北门 → 兰台','纪忠楼 → 北门 → 兰台'][station];
  return {start,end,route};
}
export function upcomingCycle(mode,station,nowMinutes) {
  const cycle=morningCycle(mode,station);
  return cycle&&nowMinutes<minute(cycle.end)+1?{...cycle,active:nowMinutes>=minute(cycle.start)}:null;
}
export function chinaNow(date = new Date()) {
  const d = new Date(date.getTime()+8*3600000);
  return {minutes:d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60, hour:d.getUTCHours(),min:d.getUTCMinutes(),sec:d.getUTCSeconds(),day:d.getUTCDay(), date:`${d.getUTCFullYear()}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${String(d.getUTCDate()).padStart(2,'0')}`};
}
// 2026 State Council calendar; school-specific arrangements can be selected manually.
export const calendarSource = 'https://www.beijing.gov.cn/fuwu/bmfw/sy/jrts/202511/t20251104_4258838.html';
export function automaticMode(day,date='') {
  if(date.startsWith('2026.')){
    const key=date.slice(5).replace('.','');
    if(['0104','0214','0228','0509','0920','1010'].includes(key))return 'work';
    if([['0101','0103'],['0215','0223'],['0404','0406'],['0501','0505'],['0619','0621'],['0925','0927'],['1001','1007']].some(([a,b])=>key>=a&&key<=b))return 'holiday';
  }
  return day===0||day===6?'holiday':'work';
}
// Jizhong line times are departures at each route's origin station.
export function tripsFor(mode,direction) {
  if(direction === 2) {
    // Only the workday timetable lists Jizhong return entries.
    return mode === 'work' ? special[1].map(time=>({time,route:'纪忠楼 → 文学院 → 北门 → 兰台',kind:'jizhong'})) : [];
  }
  const directRoute = direction === 0 ? '兰台 → 北门' : '北门 → 兰台';
  const times=schedules[mode][direction].filter(time=>mode!=='work'||minute(time)>=600);
  const trips = times.map(time => {
    const viaJizhong = direction === 0 && mode === 'holiday' && time === '7:40';
    return {time, route: viaJizhong ? '兰台 → 北门 → 纪忠楼' : directRoute, kind: viaJizhong ? 'jizhong' : 'direct'};
  });
  if(mode === 'work' && direction === 0) {
    trips.push(...special[0].map(time => ({time, route:'兰台 → 北门 → 文学院 → 纪忠楼',kind:'jizhong'})));
  }
  return trips.sort((a,b)=>minute(a.time)-minute(b.time));
}
export function departuresFor(mode,direction) {
  const departures=[];
  for(const trip of tripsFor(mode,direction)) {
    const last=departures[departures.length-1];
    if(last?.time===trip.time)last.trips.push(trip);
    else departures.push({time:trip.time,trips:[trip]});
  }
  return departures;
}
export function upcoming(mode,direction,nowMinutes) { return departuresFor(mode,direction).filter(d=>minute(d.time)+1>nowMinutes); }
