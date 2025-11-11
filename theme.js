// Theme toggle with animation
const toggle = document.getElementById('themeToggle');
const root = document.documentElement;

// load preference
const saved = localStorage.getItem('expenseai_theme');
if(saved === 'dark') root.classList.add('dark');

function setTheme(theme){
  // add transition class briefly
  root.classList.add('theme-transition');
  window.setTimeout(()=>root.classList.remove('theme-transition'),350);
  if(theme === 'dark'){
    root.classList.add('dark');
    toggle.textContent = '☀️';
  } else {
    root.classList.remove('dark');
    toggle.textContent = '🌙';
  }
  localStorage.setItem('expenseai_theme', theme);
}

if(toggle){
  toggle.addEventListener('click', ()=>{
    const dark = root.classList.contains('dark');
    setTheme(dark ? 'light' : 'dark');
  });
}
