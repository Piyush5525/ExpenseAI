const KEY = 'expenseai_expenses';
function load(){const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []}
const items = load();

// aggregate by category (all-time)
const byCat = items.reduce((acc,i)=>{acc[i.category]=(acc[i.category]||0)+Number(i.amount);return acc},{});
const labels = Object.keys(byCat);const data = labels.map(l=>byCat[l]);
// pie chart
const pieEl = document.getElementById('pieChart');
if(pieEl){
  const pieCtx = pieEl.getContext('2d');
  new Chart(pieCtx,{type:'pie',data:{labels,data: data, datasets:[{data,data: data,backgroundColor:['#0b6fa8','#16a34a','#f59e0b','#ef4444','#7c3aed']} ]}});
}

// monthly spending (group by month-year)
const monthly = {};
items.forEach(i=>{const m = new Date(i.date).toLocaleString('default',{month:'short',year:'numeric'});monthly[m]=(monthly[m]||0)+Number(i.amount)});
const barLabels = Object.keys(monthly);const barData = Object.values(monthly);
const barEl = document.getElementById('barChart');
if(barEl){
  const barCtx = barEl.getContext('2d');
  new Chart(barCtx,{type:'bar',data:{labels:barLabels,datasets:[{label:'Spent',data:barData,backgroundColor:'#0b6fa8'}]}});
}

// --- Auto-generated insights ---
const tipEl = document.getElementById('tips');
function short(num){
  if(typeof num!=='number') return '0';
  if(Math.abs(num)>=1000) return (num/1000).toFixed(1)+'k';
  return Math.round(num*100)/100;
}
function pct(diff){ return Math.round(diff*10)/10 }

if(tipEl){
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  // helper to test category matches 'Food' regardless of emoji prefix
  const isFood = (cat)=>{ if(!cat) return false; return /food/i.test(cat) || /🍕/.test(cat); };

  // items this month and last month
  const itemsThisMonth = items.filter(i=>{const d=new Date(i.date); return d.getFullYear()===curYear && d.getMonth()===curMonth});
  const itemsLastMonth = items.filter(i=>{const d=new Date(i.date); const lm = new Date(curYear,curMonth-1,1); return d.getFullYear()===lm.getFullYear() && d.getMonth()===lm.getMonth()});

  const totalThis = itemsThisMonth.reduce((s,i)=>s+Number(i.amount),0);
  const totalLast = itemsLastMonth.reduce((s,i)=>s+Number(i.amount),0);

  // weekend spending percentage this month
  const weekendTotal = itemsThisMonth.reduce((s,i)=>{const d=new Date(i.date); const day=d.getDay(); return s + ((day===0||day===6)?Number(i.amount):0)},0);
  const weekendPct = totalThis>0 ? Math.round((weekendTotal/totalThis)*100) : 0;

  // Food comparison
  const foodThis = itemsThisMonth.reduce((s,i)=> isFood(i.category) ? s+Number(i.amount) : s,0);
  const foodLast = itemsLastMonth.reduce((s,i)=> isFood(i.category) ? s+Number(i.amount) : s,0);
  let foodMsg = '';
  if(foodThis===0 && foodLast===0){ foodMsg = 'No food expenses recorded in the last two months.' }
  else if(foodLast===0 && foodThis>0){ foodMsg = `Food expenses appeared this month (${short(foodThis)}) — keep an eye on recurring costs.` }
  else {
    const diff = foodThis - foodLast;
    const sign = diff>0 ? 'increased' : (diff<0 ? 'decreased' : 'stayed the same');
    const pctDiff = foodLast>0 ? Math.round((Math.abs(diff)/foodLast)*100) : 0;
    if(pctDiff===0) foodMsg = 'Food expenses stayed about the same as last month.'
    else foodMsg = `Food expenses ${sign} by ${pctDiff}% compared to last month.`
  }

  // largest category this month
  const byCatThis = itemsThisMonth.reduce((acc,i)=>{const c=i.category||'Other'; acc[c]=(acc[c]||0)+Number(i.amount); return acc},{})
  const topCat = Object.keys(byCatThis).sort((a,b)=> (byCatThis[b]||0)-(byCatThis[a]||0))[0] || null;
  const topMsg = topCat ? `Largest spend this month: ${topCat} (${short(byCatThis[topCat])}).` : '';

  // overall monthly change
  let overallMsg = '';
  if(totalLast===0 && totalThis>0) overallMsg = `You started tracking this month with total spend ${short(totalThis)}.`
  else if(totalLast>0){
    const diff = totalThis - totalLast; const p = Math.round((Math.abs(diff)/totalLast)*100);
    overallMsg = diff>0 ? `Total spending increased by ${p}% compared to last month.` : (diff<0 ? `Total spending decreased by ${p}% compared to last month.` : 'Total spending is similar to last month.');
  } else overallMsg = 'Not enough data to compare months.';

  const insights = [];
  if(totalThis>0) insights.push(`You spent ${weekendPct}% of your ${short(totalThis)} this month on weekends.`);
  if(topMsg) insights.push(topMsg);
  insights.push(foodMsg);
  insights.push(overallMsg);

  tipEl.innerHTML = insights.map(s=>`<p style="margin:6px 0;color:var(--muted)">${s}</p>`).join('');
}

// fallback older tips kept for compatibility (if tips element missing show console hints)
else {
  const tips = [
    'You spent 40% on food this month — try cooking at home!',
    'Reduce subscriptions you do not use monthly.',
    'Consider a weekly grocery plan to cut impulse buys.',
    'Set a budget alert to notify you when you approach limits.'
  ];
  console.log('ExpenseAI tips:', tips[Math.floor(Math.random()*tips.length)]);
}
