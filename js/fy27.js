(function(){
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('nav');
  if (navToggle && nav){
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      if (expanded){
        nav.setAttribute('hidden', '');
      } else {
        nav.removeAttribute('hidden');
      }
    });

    document.addEventListener('click', (evt) => {
      if (!nav.contains(evt.target) && evt.target !== navToggle){
        navToggle.setAttribute('aria-expanded', 'false');
        nav.setAttribute('hidden', '');
      }
    });
  }

  const currentPath = (location.pathname.endsWith('/') ? location.pathname + 'index.html' : location.pathname);
  document.querySelectorAll('nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = new URL(href, location.href).pathname;
    const normalizedLink = linkPath.endsWith('/') ? linkPath + 'index.html' : linkPath;
    if (normalizedLink === currentPath){ link.classList.add('active'); }
  });
})();

// Document Center RSS → Latest Files widget
(async function(){
  const target = document.querySelector('[data-latest-files]');
  if (!target) return;
  try {
    const resp = await fetch('../assets/rss/document-center.xml');
    if (!resp.ok) throw new Error('Network error');
    const xml = new DOMParser().parseFromString(await resp.text(), 'application/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, 5);
    if (!items.length){
      target.innerHTML = '<p class="empty-state">No FY27 documents have been uploaded yet. Drafts will appear here automatically.</p>';
      return;
    }
    const list = document.createElement('ul');
    items.forEach(item => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.querySelector('link')?.textContent || '#';
      link.textContent = item.querySelector('title')?.textContent || 'FY27 document';
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      const meta = document.createElement('time');
      const pub = item.querySelector('pubDate');
      if (pub){
        const date = new Date(pub.textContent);
        meta.dateTime = date.toISOString();
        meta.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const span = document.createElement('span');
      span.className = 'status';
      const stage = item.querySelector('category')?.textContent || 'Draft';
      span.textContent = stage;
      li.append(link, meta, span);
      list.appendChild(li);
    });
    target.innerHTML = '';
    target.appendChild(list);
  } catch (err){
    target.innerHTML = '<div class="alert-error" role="status">We could not load the latest documents feed. Please refresh or view the <a href="documents.html">Documents page</a>.</div>';
    console.error(err);
  }
})();

// Agenda Center RSS → Next Hearing widget
(async function(){
  const target = document.querySelector('[data-next-hearing]');
  const listTarget = document.querySelector('[data-hearings-list]');
  if (!target && !listTarget) return;
  try {
    const resp = await fetch('../assets/rss/agenda-center.xml');
    if (!resp.ok) throw new Error('Network error');
    const xml = new DOMParser().parseFromString(await resp.text(), 'application/xml');
    const items = Array.from(xml.querySelectorAll('item'))
      .map(item => ({
        title: item.querySelector('title')?.textContent || 'Budget hearing',
        link: item.querySelector('link')?.textContent || '#',
        when: new Date(item.querySelector('event\:startdate')?.textContent || item.querySelector('pubDate')?.textContent || Date.now()),
        location: item.querySelector('event\:location')?.textContent || 'Town Hall',
        status: item.querySelector('category')?.textContent || 'Posted'
      }))
      .filter(item => item.when >= new Date(Date.now() - 86400000))
      .sort((a, b) => a.when.getTime() - b.when.getTime());

    if (!items.length){
      if (target){
        target.innerHTML = '<p class="empty-state">No upcoming hearings are scheduled. Check back after the next budget calendar update.</p>';
      }
      if (listTarget){
        listTarget.innerHTML = '<p class="empty-state">No upcoming events are on the calendar yet. Finance will post new hearings soon.</p>';
      }
      return;
    }
    const next = items[0];
    if (target){
      target.innerHTML = `
        <h3>${next.title}</h3>
        <p><time datetime="${next.when.toISOString()}">${next.when.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</time></p>
        <p>${next.location}</p>
        <p class="status">${next.status}</p>
        <p><a class="btn btn-secondary" href="${next.link}" target="_blank" rel="noopener">View agenda packet</a></p>
      `;
    }
    if (listTarget){
      const list = document.createElement('ul');
      list.className = 'timeline';
      items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <h3><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
          <p><time datetime="${item.when.toISOString()}">${item.when.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}</time> · ${item.location}</p>
          <p class="status">${item.status}</p>
        `;
        list.appendChild(li);
      });
      listTarget.innerHTML = '';
      listTarget.appendChild(list);
    }
  } catch (err){
    if (target){
      target.innerHTML = '<div class="alert-error" role="status">We were unable to load the Agenda Center feed. Visit the <a href="hearings.html">hearings calendar</a> for the latest schedule.</div>';
    }
    if (listTarget){
      listTarget.innerHTML = '<div class="alert-error" role="status">Agenda Center data is unavailable right now. Please retry in a few minutes.</div>';
    }
    console.error(err);
  }
})();

// Notify Me subscription (local persistence)
(function(){
  const form = document.querySelector('[data-subscribe-form]');
  if (!form) return;
  const list = JSON.parse(localStorage.getItem('fy27-subscribers') || '[]');
  const alert = form.querySelector('[data-subscribe-alert]');
  form.addEventListener('submit', evt => {
    evt.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const sms = (fd.get('sms') || '').toString().trim();
    if (!name || (!email && !sms)){
      alert.className = 'alert-error';
      alert.textContent = 'Please share your name and at least one delivery method (email or SMS).';
      alert.hidden = false;
      return;
    }
    list.push({ name, email, sms, ts: Date.now() });
    localStorage.setItem('fy27-subscribers', JSON.stringify(list));
    alert.className = 'alert-success';
    alert.textContent = 'Subscription confirmed! You will receive Budget FY27 alerts as they post.';
    alert.hidden = false;
    form.reset();
  });
})();

// Contact form simulation
(function(){
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const alert = form.querySelector('[data-contact-alert]');
  form.addEventListener('submit', evt => {
    evt.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    Object.keys(payload).forEach(key => { payload[key] = (payload[key] || '').toString().trim(); });
    if (!payload.name || !payload.email || !payload.topic || !payload.message){
      alert.className = 'alert-error';
      alert.textContent = 'All fields are required so the Finance Team can respond.';
      alert.hidden = false;
      return;
    }
    const history = JSON.parse(sessionStorage.getItem('fy27-contact-history') || '[]');
    history.push({ ...payload, submitted: new Date().toISOString() });
    sessionStorage.setItem('fy27-contact-history', JSON.stringify(history));
    alert.className = 'alert-success';
    alert.textContent = 'Thank you for contacting the Finance Team. Expect a reply within two business days.';
    alert.hidden = false;
    form.reset();
  });
})();

// FAQ accordion enhancements
(function(){
  document.querySelectorAll('.accordion details').forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (detail.open){
        document.querySelectorAll('.accordion details').forEach(other => {
          if (other !== detail) other.open = false;
        });
      }
    });
  });
})();

// Dashboard tab switcher (if present)
(function(){
  const tabs = document.querySelectorAll('[data-dashboard-tab]');
  if (!tabs.length) return;
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const target = tab.dataset.dashboardTab;
    document.querySelectorAll('[data-dashboard-panel]').forEach(panel => {
      panel.hidden = panel.id !== target;
    });
    tabs.forEach(t => t.classList.toggle('active', t === tab));
  }));
})();
