// LocalStorage keys
const KEY = 'expenseai_expenses';
const SETTINGS_KEY = 'expenseai_settings';

const totalEl = document.getElementById('total');
const budgetEl = document.getElementById('budget');
const remainingEl = document.getElementById('remaining');
const expensesBody = document.getElementById('expensesBody');
const alertEl = document.getElementById('alert');
const currencySymbols = {INR: '₹', USD: '$'};

let settings = {budget:500, currency:'INR'};

function loadSettings(){
  const raw = localStorage.getItem(SETTINGS_KEY);
  if(raw) settings = JSON.parse(raw);
  // populate inputs if present
  const bIn = document.getElementById('budgetInput');
  const cSel = document.getElementById('currencySelect');
  if(bIn) bIn.value = settings.budget;
  if(cSel) cSel.value = settings.currency;
}

function saveSettings(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function load(){
  const raw = localStorage.getItem(KEY);
  const items = raw ? JSON.parse(raw) : [];
  return items;
}

function save(items){
  localStorage.setItem(KEY, JSON.stringify(items));
}

function fmt(v){
  const sym = currencySymbols[settings.currency]||'₹';
  return `${sym}${Number(v).toFixed(2)}`;
}

function render(){
  const items = load();
  const catIcons = {Food:'🍕',Transport:'🚌',Bills:'💡',Shopping:'🛍️',Other:'🔖'};
  expensesBody.innerHTML = items.map((it,idx)=>{
    const icon = catIcons[it.category] || '';
    return `<tr><td>${it.title}</td><td>${icon} ${it.category}</td><td>${fmt(it.amount)}</td><td>${it.date}</td><td><button data-idx="${idx}" class="btn-ghost">Delete</button></td></tr>`
  }).join('')||'<tr><td colspan="5" class="muted">No expenses</td></tr>';
  const total = items.reduce((s,i)=>s+Number(i.amount),0);
  totalEl.innerHTML = fmt(total);
  budgetEl.innerHTML = fmt(settings.budget);
  const remaining = settings.budget - total;
  remainingEl.innerHTML = fmt(remaining);
  if(remaining<0){
    alertEl.style.display='block';
    alertEl.textContent = 'Budget exceeded!';
  } else { alertEl.style.display='none' }

  // compute streak: consecutive days up to today where spent <= daily target
  const streakEl = document.getElementById('streak');
  if(streakEl){
    // group spend by date (YYYY-MM-DD)
    const byDate = {};
    items.forEach(i=>{ const d = i.date.split('T')[0] || i.date; byDate[d] = (byDate[d]||0) + Number(i.amount); });
    const today = new Date();
    let streak = 0;
    // daily threshold: max(5% of monthly budget / daysInMonth, 50) as a simple saver threshold
    const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
    const dailyThresh = Math.max((settings.budget * 0.05)/daysInMonth, 50);
    for(let i=0;i<365;i++){
      const d = new Date(); d.setDate(today.getDate()-i);
      const key = d.toISOString().slice(0,10);
      const spent = byDate[key] || 0;
      if(spent <= dailyThresh) streak++;
      else break;
    }
    streakEl.textContent = `🔥 You're on a ${streak}-day saving streak`;
  }
}

// add expense
const addBtn = document.getElementById('addBtn');
addBtn && addBtn.addEventListener('click', ()=>{
  const title = document.getElementById('title').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
  if(!title || !amount) return alert('Enter title and amount');
  const items = load();
  items.unshift({title,amount,category,date});
  save(items); render();
  document.getElementById('title').value=''; document.getElementById('amount').value='';
});

// delete handler
expensesBody.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-idx]');
  if(!btn) return;
  const idx = Number(btn.dataset.idx);
  const items = load(); items.splice(idx,1); save(items); render();
});

// settings save
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
if(saveSettingsBtn){
  saveSettingsBtn.addEventListener('click', ()=>{
    const bIn = document.getElementById('budgetInput');
    const cSel = document.getElementById('currencySelect');
    const newBudget = parseFloat(bIn.value) || 0;
    settings.budget = newBudget;
    settings.currency = cSel.value || 'INR';
    saveSettings(); render();
    alert('Settings saved');
  });
}

// export CSV
const exportCsvBtn = document.getElementById('exportCsvBtn');
if(exportCsvBtn){
  exportCsvBtn.addEventListener('click', ()=>{
    const items = load();
    if(!items.length) return alert('No expenses to export');
    const headers = ['Title','Category','Amount','Date'];
    const rows = items.map(i=>[i.title,i.category,i.amount,i.date]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
}

// export PDF (simple): open print window with table
const exportPdfBtn = document.getElementById('exportPdfBtn');
if(exportPdfBtn){
  exportPdfBtn.addEventListener('click', ()=>{
    const items = load();
    if(!items.length) return alert('No expenses to export');
    let html = `<html><head><title>Expenses</title><style>table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}</style></head><body><h2>ExpenseAI - Expenses</h2><table><thead><tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th></tr></thead><tbody>`;
    html += items.map(i => `<tr><td>${i.title}</td><td>${i.category}</td><td>${i.amount}</td><td>${i.date}</td></tr>`).join('');
    html += '</tbody></table></body></html>';
    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    // optional: close after printing
    // setTimeout(()=>w.close(), 500);
  });
}

// mock OCR: when a file is selected, show a placeholder detection
const receiptInput = document.getElementById('receiptInput');
const ocrResult = document.getElementById('ocrResult');
if(receiptInput && ocrResult){
  receiptInput.addEventListener('change', (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    // show a loading indicator briefly
    ocrResult.style.display='block';
    ocrResult.textContent = 'Analyzing receipt...';
    setTimeout(()=>{
      // simple random mocked detection
      const amounts = [199, 249, 350, 499, 120];
      const cats = ['Food','Transport','Food','Shopping','Bills'];
      const idx = Math.floor(Math.random()*amounts.length);
      const detectedAmount = amounts[idx];
      const detectedCat = cats[idx];
      const html = `Detected: <strong>${fmt(detectedAmount)}</strong> — <strong>${detectedCat}</strong> (Lunch). <button id="confirmOcr" class="btn" style="margin-left:8px">Confirm</button> <button id="dismissOcr" class="btn-ghost" style="margin-left:8px">Dismiss</button>`;
      ocrResult.innerHTML = html;

      document.getElementById('confirmOcr').addEventListener('click', ()=>{
        document.getElementById('amount').value = detectedAmount;
        document.getElementById('category').value = detectedCat;
        document.getElementById('title').value = detectedCat + ' (Receipt)';
        ocrResult.style.display='none';
      });
      document.getElementById('dismissOcr').addEventListener('click', ()=>{ ocrResult.style.display='none'; });
    },800);
  });
}

// initial load
loadSettings(); render();
