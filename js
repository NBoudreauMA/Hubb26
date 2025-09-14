/* =========================================================
   HubbFISCAL · Global site scripts
   - Mobile menu toggle
   - Active link sync
   - Quick search for module cards
   - Theme toggle (persisted)
   ========================================================= */
(function(){
  // Mobile nav
  const nav = document.querySelector('.main-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (toggle && nav){
    toggle.addEventListener('click', () => {
      const expanded = nav.getAttribute('aria-expanded') === 'true';
      nav.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-expanded', String(!expanded));
    });
  }

  // Active link highlighting
  try{
    const here = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
    document.querySelectorAll('.main-nav a').forEach(a => {
      const hrefLast = a.getAttribute('href').split('/').filter(Boolean).pop();
      if (hrefLast === here){ a.classList.add('active'); }
    });
  }catch(e){/* noop */}

  // Quick search (Modules grid)
  const search = document.getElementById('quickSearch');
  const grid = document.getElementById('moduleGrid');
  if (search && grid){
    const cards = Array.from(grid.querySelectorAll('.card'));
    const filter = q => {
      const needle = q.trim().toLowerCase();
      cards.forEach(card => {
        const hay = (card.innerText + ' ' + (card.dataset.tags||'')).toLowerCase();
        card.style.display = hay.includes(needle) ? '' : 'none';
      });
    };
    search.addEventListener('input', e => filter(e.target.value));
  }

  // Theme toggle (dark default)
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle){
    const KEY = 'hubbfiscal-theme';
    const root = document.documentElement;
    const apply = mode => {
      root.dataset.theme = mode;
      themeToggle.setAttribute('aria-pressed', String(mode === 'light'));
      themeToggle.textContent = mode === 'light' ? 'Dark' : 'Light';
      if (mode === 'light'){
        root.style.setProperty('--bg', '#f5faf7');
        root.style.setProperty('--panel', '#ffffff');
        root.style.setProperty('--card', '#ffffff');
        root.style.setProperty('--ink', '#14271e');
        root.style.setProperty('--muted', '#476457');
      } else {
        root.style.removeProperty('--bg');
        root.style.removeProperty('--panel');
        root.style.removeProperty('--card');
        root.style.removeProperty('--ink');
        root.style.removeProperty('--muted');
      }
      localStorage.setItem(KEY, mode);
    };
    const saved = localStorage.getItem(KEY);
    apply(saved === 'light' ? 'light' : 'dark');
    themeToggle.addEventListener('click', () => {
      const next = (root.dataset.theme === 'light') ? 'dark' : 'light';
      apply(next);
    });
  }
})();

/* =========================================================
   HubbTIME Module (namespaced; runs only on HubbTIME pages)
   Pulls GL + roster from your master upload. :contentReference[oaicite:1]{index=1}
   ========================================================= */
window.HubbTIME = (function(){
  const container = document.getElementById('hubbtimeContainer');
  const api = { addQuickTemplate: ()=>{}, addTownHallHours: ()=>{} };
  if (!container) return api;

  /********************
   * HubbTIME – Hard-coded with GL Review
   ********************/
  // --- Config ---
  var FLOW_URL = "https://prod-58.usgovtexas.logic.azure.us:443/workflows/ceefc1e6e256421c9a5a83416ff6c167/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lh1qRrhhVYUZ3ZhxuPpHYJPsdhdMmZDRSDndshkjiB0";
  var NOTIFY = ["admin@hubbardstonma.gov", "accountant@hubbardstonma.gov"];

  var currentEmployee = null;
  var currentWarrant = null;

  // --- GL Codes (from master data) ---
  var GL_CODES = {
    "Select Board": "1000-122-5100",
    "Accounting": "1000-135-5100",
    "Assessors/Land Use": "1000-141-5100",
    "Treasurer/Collector": "1000-149-5100",
    "Town Clerk": "1000-161-5100",
    "Building & Maintenance": "1000-192-5100",
    "Police/Health": "1000-210-5100",
    "Police": "1000-210-5100",
    "Fire": "1000-220-5100",
    "Land Use": "1000-241-5100",
    "Building": "1000-241-5100",
    "Public Works": "1000-420-5100",
    "COA/MART": "1000-541-5100",
    "Senior Center": "1000-541-5100",
    "Senior Center / COA": "1000-541-5100",
    "Library": "1000-610-5100"
  };

  // --- Complete Employee List (from master CSV data) ---
  var EMPLOYEES = [
    {"name":"ALBERT AFONSO","department":"COA/MART","payType":"hourly","rate":16.13,"isAdmin":false,"position":"MART Driver","id":"E017"},
    {"name":"ANNE GOEWEY","department":"Library","payType":"hourly","rate":17.57,"isAdmin":false,"position":"Library Assistant","id":"E014"},
    {"name":"BRYAN COLWELL","department":"Fire","payType":"hourly","rate":17.84,"isAdmin":false,"position":"Call Firefighter","id":"E022"},
    {"name":"CLAUDIA PROVENCAL","department":"Senior Center","payType":"hourly","rate":25.00,"isAdmin":false,"position":"COA Director","id":"E013"},
    {"name":"DAVID HORNE","department":"Building","payType":"salary","rate":42734,"isAdmin":false,"position":"Building Commissioner","id":"E009"},
    {"name":"DAVIS BOWLEY","department":"COA/MART","payType":"hourly","rate":16.13,"isAdmin":false,"position":"MART Driver","id":"E018"},
    {"name":"DENNIS HAMEL","department":"Fire","payType":"hourly","rate":23.30,"isAdmin":false,"position":"Firefighter/Paramedic","id":"E025"},
    {"name":"EDWARD GALLANT","department":"COA/MART","payType":"hourly","rate":16.13,"isAdmin":false,"position":"MART Driver","id":"E019"},
    {"name":"ERIK ARES","department":"Fire","payType":"hourly","rate":23.12,"isAdmin":false,"position":"Call LT/Paramedic","id":"E029"},
    {"name":"HUNTER YOUNG","department":"Building & Maintenance","payType":"hourly","rate":17.57,"isAdmin":false,"position":"Facilities Maintenance","id":"E012"},
    {"name":"IZAIAH GONZALEZ","department":"Fire","payType":"hourly","rate":15.93,"isAdmin":false,"position":"Call Firefighter","id":"E028"},
    {"name":"JAMES DIXSON","department":"Fire","payType":"hourly","rate":24.67,"isAdmin":false,"position":"Call LT/EMT","id":"E030"},
    {"name":"JOHN DEMALIA JR","department":"Fire","payType":"hourly","rate":18.84,"isAdmin":false,"position":"Call Firefighter/EMT","id":"E023"},
    {"name":"LEEANNE MOSES","department":"Assessors/Land Use","payType":"hourly","rate":23.38,"isAdmin":true,"position":"Administrative Services Coordinator","id":"E002"},
    {"name":"MARY LEROUX","department":"Treasurer/Collector","payType":"salary","rate":70914,"isAdmin":false,"position":"Treasurer/Collector","id":"E007"},
    {"name":"MELODY GREEN","department":"Town Clerk","payType":"hourly","rate":32.36,"isAdmin":false,"position":"Town Clerk","id":"E006"},
    {"name":"MITCHELL MABARDY","department":"Fire","payType":"hourly","rate":20.82,"isAdmin":false,"position":"Call Firefighter/Paramedic","id":"E026"},
    {"name":"NANCY PERRON","department":"Police/Health","payType":"hourly","rate":22.03,"isAdmin":true,"position":"Police Admin / BOH Clerk","id":"E004"},
    {"name":"PATRICIA LOWE","department":"Select Board","payType":"hourly","rate":23.38,"isAdmin":true,"position":"Executive Assistant / Cable Clerk","id":"E001"},
    {"name":"PAUL SWEENEY","department":"Public Works","payType":"hourly","rate":17.57,"isAdmin":false,"position":"DPW Seasonal","id":"E021"},
    {"name":"PHILLIP THERIAULT JR","department":"Fire","payType":"hourly","rate":17.80,"isAdmin":false,"position":"Call Firefighter","id":"E027"},
    {"name":"ROBERT HAYES JR","department":"Fire","payType":"salary","rate":100500,"isAdmin":false,"position":"Fire Chief","id":"E011"},
    {"name":"ROBERT M BRADY","department":"Public Works","payType":"hourly","rate":16.89,"isAdmin":false,"position":"DPW Seasonal","id":"E020"},
    {"name":"SADIE SAINT","department":"Land Use","payType":"hourly","rate":22.00,"isAdmin":true,"position":"Inspectional Services Coordinator","id":"E005"},
    {"name":"SAMANTHA CHATTERTON","department":"Accounting","payType":"salary","rate":33800,"isAdmin":false,"position":"Town Accountant","id":"E008"},
    {"name":"SARA RISH","department":"Treasurer/Collector","payType":"hourly","rate":24.01,"isAdmin":true,"position":"Assistant Treasurer Collector","id":"E015"},
    {"name":"SHARON HARDAKER","department":"COA/MART","payType":"hourly","rate":18.92,"isAdmin":false,"position":"MART Supervisor","id":"E016"},
    {"name":"TINA DIXSON","department":"Fire","payType":"hourly","rate":22.22,"isAdmin":false,"position":"Firefighter/AEMT","id":"E024"},
    {"name":"TINA WHITE","department":"Public Works","payType":"hourly","rate":22.03,"isAdmin":true,"position":"DPW Assistant","id":"E003"},
    {"name":"TRAVIS BROWN","department":"Public Works","payType":"salary","rate":94369,"isAdmin":false,"position":"DPW Director","id":"E010"}
  ];

  // --- Hard-coded Warrant periods ---
  var WARRANTS = [
    {number: 5, start: "2025-08-24", end: "2025-09-06", due: "2025-09-08", check: "2025-09-11"},
    {number: 6, start: "2025-09-07", end: "2025-09-20", due: "2025-09-22", check: "2025-09-25"},
    {number: 7, start: "2025-09-21", end: "2025-10-04", due: "2025-10-06", check: "2025-10-09"},
    {number: 8, start: "2025-10-05", end: "2025-10-18", due: "2025-10-20", check: "2025-10-23"}
  ];

  // --- Utils ---
  function $(s){ return document.querySelector(s); }
  function currency(n){ return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0)); }
  function fmt(n){ return (Number(n||0)).toFixed(2); }
  function showMessage(text, type, show){
    var msgEl = $('#systemMsg');
    if(!show){ if(msgEl) msgEl.style.display='none'; return; }
    if(!msgEl) return;
    msgEl.className = 'alert ' + (type||'info');
    msgEl.textContent = text;
    msgEl.style.display='block';
  }
  function getGLCode(emp){ return emp && emp.department ? (GL_CODES[emp.department] || '') : ''; }
  function toMinutes(hhmm){ if(!hhmm) return null; var p = hhmm.split(':'); return (parseInt(p[0],10)*60)+parseInt(p[1],10); }
  function hoursBetween(start, end){
    if(!start || !end) return 0;
    var s = toMinutes(start), e = toMinutes(end);
    if(s==null || e==null) return 0;
    if(e < s) e += 24*60;
    return Math.round(((e - s)/60)*100)/100;
  }
  function dateISO(d){ return (d instanceof Date)? d.toISOString().slice(0,10) : d; }

  // --- Build GL select widget ---
  function buildGLSelect(selectedValue){
    var sel = document.createElement('select');
    var opt = document.createElement('option'); opt.value=""; opt.textContent="Select…"; sel.appendChild(opt);
    Object.keys(GL_CODES).forEach(function(k){
      var o = document.createElement('option');
      o.value = GL_CODES[k];
      o.textContent = k + " — " + GL_CODES[k];
      if(selectedValue && selectedValue === o.value) o.selected = true;
      sel.appendChild(o);
    });
    return sel;
  }

  // --- Table row ops ---
  function addTimeRow(date, start, end, hours, type, glCode, description, insertAfterRow){
    var tbody = $('#timeBody'); if(!tbody) return null;
    var tr = document.createElement('tr');
    var glDefault = glCode || (currentEmployee ? getGLCode(currentEmployee) : "");

    tr.innerHTML = ''
      + '<td><input type="date" value="'+(date||'')+'"></td>'
      + '<td><input type="time" value="'+(start||'')+'"></td>'
      + '<td><input type="time" value="'+(end||'')+'"></td>'
      + '<td><input type="number" step="0.25" min="0" value="'+(hours||'')+'" placeholder="0.00"></td>'
      + '<td>'
        + '<select>'
          + '<option value="Regular">Regular</option>'
          + '<option value="Sick">Sick</option>'
          + '<option value="Personal">Personal</option>'
          + '<option value="Vacation">Vacation</option>'
          + '<option value="Holiday">Holiday</option>'
          + '<option value="Overtime">Overtime</option>'
        + '</select>'
      + '</td>'
      + '<td class="glcell"></td>'
      + '<td><input type="text" placeholder="Optional description" value="'+(description||'')+'"></td>'
      + '<td>'
        + '<div class="action-btns">'
          + '<button type="button" class="btn secondary btn-insert-above">Insert ↑</button>'
          + '<button type="button" class="btn secondary btn-insert-below">Insert ↓</button>'
          + '<button type="button" class="btn secondary btn-dup">Duplicate</button>'
          + '<button type="button" class="btn danger btn-del">Delete</button>'
        + '</div>'
      + '</td>';

    if(type){ tr.querySelector('td:nth-child(5) select').value = type; }

    var glCell = tr.querySelector('.glcell');
    var glSel = buildGLSelect(glDefault);
    glCell.appendChild(glSel);

    if(insertAfterRow && insertAfterRow.parentNode === tbody){
      insertAfterRow.insertAdjacentElement('afterend', tr);
    } else {
      tbody.appendChild(tr);
    }

    tr.addEventListener('input', function(){
      var s = tr.querySelector('td:nth-child(2) input').value;
      var e = tr.querySelector('td:nth-child(3) input').value;
      var hrsEl = tr.querySelector('td:nth-child(4) input');
      if(s && e){ hrsEl.value = fmt(hoursBetween(s,e)); }
      calculateTotals();
    });
    tr.querySelector('.btn-del').addEventListener('click', function(){ tr.remove(); calculateTotals(); });
    tr.querySelector('.btn-dup').addEventListener('click', function(){
      var v = getRowValues(tr);
      addTimeRow(v.date, v.start, v.end, v.hours, v.type, v.gl, v.desc, tr);
      calculateTotals();
    });
    tr.querySelector('.btn-insert-above').addEventListener('click', function(){
      addTimeRow('', '', '', '', 'Regular', glSel.value || glDefault, '', tr.previousElementSibling || null);
    });
    tr.querySelector('.btn-insert-below').addEventListener('click', function(){
      addTimeRow('', '', '', '', 'Regular', glSel.value || glDefault, '', tr);
    });

    return tr;
  }
  function getRowValues(tr){
    var tds = tr.children;
    return {
      date: tds[0].querySelector('input').value,
      start: tds[1].querySelector('input').value,
      end: tds[2].querySelector('input').value,
      hours: parseFloat(tds[3].querySelector('input').value || 0),
      type: tds[4].querySelector('select').value,
      gl: tds[5].querySelector('select').value || '',
      desc: tds[6].querySelector('input').value || ''
    };
  }
  function getAllRows(){ return Array.from(document.querySelectorAll('#timeBody tr')).map(getRowValues); }

  // --- Employee select / clear ---
  function handleEmployeeSelect(e){
    var name = e.target.value.trim();
    var emp = EMPLOYEES.find(x => x.name && x.name.toLowerCase() === name.toLowerCase());
    if(!emp) return;
    currentEmployee = emp;
    var dep = $('#department'), ptype = $('#payType'), rateEl = $('#rate');
    if(dep) dep.value = emp.department || '';
    if(ptype) ptype.value = emp.payType ? (emp.payType.charAt(0).toUpperCase()+emp.payType.slice(1)) : '';
    if(rateEl) rateEl.value = emp.payType === 'salary'
      ? (emp.rate ? (currency(emp.rate) + ' annually') : '—')
      : (emp.rate ? (currency(emp.rate) + ' per hour') : '—');

    var gl = getGLCode(emp);
    document.querySelectorAll('#timeBody tr').forEach(function(tr){
      var sel = tr.querySelector('td:nth-child(6) select');
      if(sel && !sel.value){ sel.value = gl; }
    });

    calculateTotals();
    showMessage('Selected: ' + emp.name + ' (' + (emp.department||'') + ') GL: ' + (gl||'—'), 'success', true);
  }
  function clearEmployee(){
    currentEmployee = null;
    var es = $('#employeeSearch'), d = $('#department'), p = $('#payType'), r = $('#rate');
    if(es) es.value = '';
    if(d) d.value = '';
    if(p) p.value = '';
    if(r) r.value = '';
    calculateTotals();
  }

  // --- Warrants select ---
  function handleWarrantSelect(e){
    var idx = e.target.value;
    currentWarrant = (idx === '') ? null : WARRANTS[parseInt(idx,10)];
    calculateTotals();
  }

  // --- Week key (Mon-based) for OT calc ---
  function weekKey(isoDate){
    if(!isoDate) return 'unknown';
    var d = new Date(isoDate + 'T00:00:00');
    var day = d.getDay(); // 0..6
    var diffToMon = (day === 0 ? -6 : 1 - day);
    var monday = new Date(d); monday.setDate(d.getDate() + diffToMon);
    var y = monday.getFullYear();
    var jan4 = new Date(y,0,4);
    var mondayOfWeek1 = new Date(jan4);
    var dow = jan4.getDay()||7;
    mondayOfWeek1.setDate(jan4.getDate() - dow + 1);
    var week = Math.floor((monday - mondayOfWeek1)/(7*24*3600*1000)) + 1;
    return y + '-W' + String(week).padStart(2,'0');
  }

  // --- Totals, Gross, and GL Review ---
  function calculateTotals(){
    var rows = getAllRows();

    // Sum by type (display)
    var sums = { Regular:0, Sick:0, Personal:0, Vacation:0, Holiday:0, Overtime:0 };
    rows.forEach(function(r){ if(sums[r.type]==null) sums[r.type]=0; sums[r.type] += (r.hours||0); });

    var totalHours = Object.values(sums).reduce((a,b)=>a+b,0);

    // Gross pay & OT handling
    var gross = 0;
    var rate = currentEmployee && currentEmployee.rate ? currentEmployee.rate : 0;

    // Build per-GL aggregates for review
    var glAgg = {}; // glCode -> { label, reg, sick, pers, vac, hol, otEntered, otAuto, totalHrs, cost }
    function ensureGL(glCode){
      if(!glAgg[glCode]){
        var label = Object.keys(GL_CODES).find(k => GL_CODES[k]===glCode) || 'Unknown';
        glAgg[glCode] = { label: label, gl: glCode, reg:0, sick:0, pers:0, vac:0, hol:0, otEntered:0, otAuto:0 };
      }
      return glAgg[glCode];
    }

    rows.forEach(function(r){
      var g = ensureGL(r.gl || '');
      if(r.type==='Regular') g.reg += (r.hours||0);
      else if(r.type==='Sick') g.sick += (r.hours||0);
      else if(r.type==='Personal') g.pers += (r.hours||0);
      else if(r.type==='Vacation') g.vac += (r.hours||0);
      else if(r.type==='Holiday') g.hol += (r.hours||0);
      else if(r.type==='Overtime') g.otEntered += (r.hours||0);
    });

    // Hourly: compute weekly OT and allocate proportionally per GL within each week
    if(currentEmployee && currentEmployee.payType === 'hourly'){
      var weekGLReg = {}; // week -> gl -> reg hours
      rows.forEach(function(r){
        if(r.type!=='Regular' || !r.date) return;
        var wk = weekKey(r.date);
        if(!weekGLReg[wk]) weekGLReg[wk] = {};
        var store = weekGLReg[wk];
        store[r.gl||''] = (store[r.gl||'']||0) + (r.hours||0);
      });
      Object.keys(weekGLReg).forEach(function(wk){
        var glMap = weekGLReg[wk];
        var weekTotalReg = Object.values(glMap).reduce((a,b)=>a+b,0);
        var over = Math.max(0, weekTotalReg - 40);
        if(over>0 && weekTotalReg>0){
          Object.keys(glMap).forEach(function(gl){
            var share = over * (glMap[gl] / weekTotalReg);
            ensureGL(gl).otAuto += share; // proportional reclass from regular
          });
        }
      });

      // Compute gross & per-GL cost
      var totalCost = 0;
      Object.keys(glAgg).forEach(function(gl){
        var a = glAgg[gl];
        var regForPay = Math.max(0, a.reg - a.otAuto);
        var otForPay  = a.otEntered + a.otAuto;
        var leave1x = a.sick + a.pers + a.vac + a.hol;
        a.totalHrs = a.reg + a.sick + a.pers + a.vac + a.hol + a.otEntered; // display total (entered)
        a.cost = (regForPay * rate) + (otForPay * rate * 1.5) + (leave1x * rate);
        totalCost += a.cost;
      });
      gross = totalCost;
    } else if(currentEmployee && currentEmployee.payType === 'salary'){
      // Salary: biweekly check
      var biweekly = (rate||0)/26;
      // allocate by share of hours across GLs (if no hours, show 0; gross shows full)
      var byGLHours = {};
      var totalEnteredHours = 0;
      Object.keys(glAgg).forEach(function(gl){
        var a = glAgg[gl];
        var hrs = a.reg + a.sick + a.pers + a.vac + a.hol + a.otEntered;
        byGLHours[gl] = hrs; totalEnteredHours += hrs;
        a.totalHrs = hrs;
      });
      Object.keys(glAgg).forEach(function(gl){
        var a = glAgg[gl];
        a.cost = totalEnteredHours>0 ? biweekly * (byGLHours[gl]/totalEnteredHours) : 0;
      });
      gross = biweekly;
    } else {
      gross = 0;
      Object.keys(glAgg).forEach(gl => {
        var a = glAgg[gl];
        a.totalHrs = a.reg + a.sick + a.pers + a.vac + a.hol + a.otEntered;
      });
    }

    // Render totals
    var sr = $('#sumRegular'), ss = $('#sumSick'), sp = $('#sumPersonal'),
        sv = $('#sumVacation'), sh = $('#sumHoliday'), th = $('#totalHours'), gp = $('#grossPay');
    if(sr) sr.textContent = fmt(sums.Regular);
    if(ss) ss.textContent = fmt(sums.Sick);
    if(sp) sp.textContent = fmt(sums.Personal);
    if(sv) sv.textContent = fmt(sums.Vacation);
    if(sh) sh.textContent = fmt(sums.Holiday);
    if(th) th.textContent = fmt(totalHours);
    if(gp) gp.textContent = currency(gross);

    // Render GL Review
    renderGLReview(glAgg, gross);
  }

  function renderGLReview(glAgg, gross){
    var wrap = $('#glReviewWrap'); if(!wrap) return;
    var keys = Object.keys(glAgg);
    var rows = keys.map(k => glAgg[k]).filter(a => a.totalHrs && a.totalHrs>0);
    rows.sort((a,b)=> (b.cost||0) - (a.cost||0));
    var totalCost = rows.reduce((s,a)=>s+(a.cost||0), 0) || gross || 0;

    var html = '<table><thead><tr>'
      + '<th>GL Code</th><th>Label</th>'
      + '<th style="text-align:right;">Regular</th>'
      + '<th style="text-align:right;">Sick</th>'
      + '<th style="text-align:right;">Personal</th>'
      + '<th style="text-align:right;">Vacation</th>'
      + '<th style="text-align:right;">Holiday</th>'
      + '<th style="text-align:right;">Overtime (incl. auto)</th>'
      + '<th style="text-align:right;">Total Hrs</th>'
      + '<th style="text-align:right;">Allocated Cost</th>'
      + '<th style="text-align:right;">% of Cost</th>'
      + '</tr></thead><tbody>';

    rows.forEach(function(a){
      var otTotal = a.otEntered + a.otAuto;
      var pct = totalCost>0 ? (a.cost/totalCost*100) : 0;
      html += '<tr>'
        + '<td>'+ (a.gl||'') +'</td>'
        + '<td>'+ a.label +'</td>'
        + '<td style="text-align:right;">'+ fmt(a.reg) +'</td>'
        + '<td style="text-align:right;">'+ fmt(a.sick) +'</td>'
        + '<td style="text-align:right;">'+ fmt(a.pers) +'</td>'
        + '<td style="text-align:right;">'+ fmt(a.vac) +'</td>'
        + '<td style="text-align:right;">'+ fmt(a.hol) +'</td>'
        + '<td style="text-align:right;">'+ fmt(otTotal) +'</td>'
        + '<td style="text-align:right;">'+ fmt(a.totalHrs||0) +'</td>'
        + '<td style="text-align:right; font-weight:600;">'+ currency(a.cost||0) +'</td>'
        + '<td style="text-align:right;">'+ fmt(pct) +'%</td>'
        + '</tr>';
    });

    var totals = {
      reg: rows.reduce((s,a)=>s+a.reg,0),
      sick: rows.reduce((s,a)=>s+a.sick,0),
      pers: rows.reduce((s,a)=>s+a.pers,0),
      vac: rows.reduce((s,a)=>s+a.vac,0),
      hol: rows.reduce((s,a)=>s+a.hol,0),
      ot: rows.reduce((s,a)=>s+a.otEntered+a.otAuto,0),
      hrs: rows.reduce((s,a)=>s+(a.totalHrs||0),0),
      cost: rows.reduce((s,a)=>s+(a.cost||0),0)
    };

    html += '</tbody><tfoot><tr>'
      + '<th colspan="2" style="text-align:right;">Totals:</th>'
      + '<th style="text-align:right;">'+ fmt(totals.reg) +'</th>'
      + '<th style="text-align:right;">'+ fmt(totals.sick) +'</th>'
      + '<th style="text-align:right;">'+ fmt(totals.pers) +'</th>'
      + '<th style="text-align:right;">'+ fmt(totals.vac) +'</th>'
      + '<th style="text-align:right;">'+ fmt(totals.hol) +'</th>'
      + '<th style="text-align:right;">'+ fmt(totals.ot) +'</th>'
      + '<th style="text-align:right;">'+ fmt(totals.hrs) +'</th>'
      + '<th style="text-align:right;">'+ currency(totals.cost) +'</th>'
      + '<th style="text-align:right;">'+ (totals.cost>0? '100.00%':'0.00%') +'</th>'
      + '</tr></tfoot></table>';

    wrap.innerHTML = html;
  }

  // --- Quick templates ---
  function addQuickTemplate(kind){
    var today = dateISO(new Date());
    var gl = currentEmployee ? getGLCode(currentEmployee) : '';
    if(kind==='split'){
      var r1 = addTimeRow(today,'08:00','12:00','', 'Regular', gl, 'AM shift');
      var r2 = addTimeRow(today,'13:00','17:00','', 'Regular', gl, 'PM shift');
      [r1,r2].forEach(r=>{
        var s=r.querySelector('td:nth-child(2) input').value;
        var e=r.querySelector('td:nth-child(3) input').value;
        r.querySelector('td:nth-child(4) input').value = fmt(hoursBetween(s,e));
      });
    } else if(kind==='overtime'){
      var a = addTimeRow(today,'08:00','16:00','', 'Regular', gl, 'Extended day (regular)');
      var b = addTimeRow(today,'16:00','18:00','', 'Overtime', gl, 'Extended day (OT)');
      [a,b].forEach(r=>{
        var s=r.querySelector('td:nth-child(2) input').value;
        var e=r.querySelector('td:nth-child(3) input').value;
        r.querySelector('td:nth-child(4) input').value = fmt(hoursBetween(s,e));
      });
    } else if(kind==='sick'){
      addTimeRow(today,'','',8,'Sick',gl,'Sick leave (full day)');
    } else if(kind==='vacation'){
      addTimeRow(today,'','',8,'Vacation',gl,'Vacation (full day)');
    }
    calculateTotals();
  }

  // --- Town Hall Hours (Mon–Thu 8:00–16:30, Fri 8:00–13:00) ---
  function addTownHallHours(){
    if(!currentWarrant){ showMessage('Select a Pay Period first to add Town Hall hours.', 'error', true); return; }
    var start = new Date(currentWarrant.start+'T00:00:00');
    var end   = new Date(currentWarrant.end+'T00:00:00');
    var gl = currentEmployee ? getGLCode(currentEmployee) : '';
    for(var d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
      var dow = d.getDay(), iso = dateISO(new Date(d));
      if(dow>=1 && dow<=4){
        var r = addTimeRow(iso,'08:00','16:30','', 'Regular', gl, 'Town Hall');
        r.querySelector('td:nth-child(4) input').value = fmt(hoursBetween('08:00','16:30')); // 8.5
      } else if(dow===5){
        var r2 = addTimeRow(iso,'08:00','13:00','', 'Regular', gl, 'Town Hall');
        r2.querySelector('td:nth-child(4) input').value = fmt(hoursBetween('08:00','13:00')); // 5
      }
    }
    calculateTotals();
  }

  // --- Clear all ---
  function clearAllTimeRows(){ var tb = $('#timeBody'); if(tb){ tb.innerHTML=''; } calculateTotals(); }

  // --- Submit to Flow ---
  async function handleFormSubmit(e){
    e.preventDefault();
    if(!currentEmployee){ showMessage('Please select an employee before submitting.', 'error', true); return; }
    if(!currentWarrant){ showMessage('Please select a Pay Period before submitting.', 'error', true); return; }

    var payload = {
      meta: { submittedAt: new Date().toISOString(), notify: NOTIFY },
      employee: {
        name: currentEmployee.name,
        department: currentEmployee.department,
        payType: currentEmployee.payType,
        rate: currentEmployee.rate,
        id: currentEmployee.id || null
      },
      warrant: currentWarrant,
      totals: {
        regular: parseFloat((document.getElementById('sumRegular')||{}).textContent||0),
        sick: parseFloat((document.getElementById('sumSick')||{}).textContent||0),
        personal: parseFloat((document.getElementById('sumPersonal')||{}).textContent||0),
        vacation: parseFloat((document.getElementById('sumVacation')||{}).textContent||0),
        holiday: parseFloat((document.getElementById('sumHoliday')||{}).textContent||0),
        totalHours: parseFloat((document.getElementById('totalHours')||{}).textContent||0),
        grossPay: (document.getElementById('grossPay')||{}).textContent||"$0.00"
      },
      rows: getAllRows()
    };

    try{
      var btn = document.getElementById('submitBtn'), status = document.getElementById('submitStatus');
      if(btn) btn.disabled = true;
      showMessage('Submitting timesheet…', 'info', true);
      if(status) status.textContent = 'Sending to payroll…';
      var res = await fetch(FLOW_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!res.ok) throw new Error('Submission failed with status ' + res.status);
      showMessage('Timesheet submitted successfully.', 'success', true);
      if(status) status.textContent = 'Submitted ✔';
    } catch(err){
      console.error(err);
      showMessage('Error submitting timesheet: ' + err.message, 'error', true);
      var status2 = document.getElementById('submitStatus');
      if(status2) status2.textContent = 'There was a problem submitting. Please try again.';
    } finally {
      var btn2 = document.getElementById('submitBtn');
      if(btn2) btn2.disabled = false;
    }
  }

  // --- Init ---
  window.addEventListener('DOMContentLoaded', function(){
    // Employees list <datalist id="employeeList">
    var list = document.getElementById('employeeList');
    if(list){
      EMPLOYEES.forEach(function(emp){
        var o = document.createElement('option');
        o.value = emp.name;
        list.appendChild(o);
      });
    }

    // Warrants <select id="warrant">
    var warrantSel = document.getElementById('warrant');
    if(warrantSel){
      WARRANTS.forEach(function(w, idx){
        var o = document.createElement('option');
        o.value = idx;
        o.textContent = 'Warrant #' + w.number + ' — ' + w.start + ' to ' + w.end + ' — Due ' + w.due;
        warrantSel.appendChild(o);
      });
    }

    // Bind UI
    var es = document.getElementById('employeeSearch');
    if(es) es.addEventListener('input', handleEmployeeSelect);
    var ceb = document.getElementById('clearEmployeeBtn');
    if(ceb) ceb.addEventListener('click', clearEmployee);
    if(warrantSel) warrantSel.addEventListener('change', handleWarrantSelect);
    var arb = document.getElementById('addRowBtn');
    if(arb) arb.addEventListener('click', function(){ addTimeRow(); });
    var thb = document.getElementById('townHallBtn');
    if(thb) thb.addEventListener('click', addTownHallHours);
    var cab = document.getElementById('clearAllBtn');
    if(cab) cab.addEventListener('click', clearAllTimeRows);
    var form = document.getElementById('timesheetForm');
    if(form) form.addEventListener('submit', handleFormSubmit);

    // Enter advances fields
    document.addEventListener('keydown', function(ev){
      if(ev.key === 'Enter' && ev.target.matches && ev.target.matches('#timeBody input, #timeBody select')){
        ev.preventDefault();
        var fields = Array.from(document.querySelectorAll('#timeBody input, #timeBody select'));
        var idx = fields.indexOf(ev.target);
        if(idx >= 0 && idx < fields.length - 1){ fields[idx+1].focus(); }
      }
    });

    showMessage('Select an employee and pay period to begin.', 'info', true);
  });

  // Expose for HTML buttons
  api.addQuickTemplate = addQuickTemplate;
  api.addTownHallHours = addTownHallHours;
  return api;
})();
