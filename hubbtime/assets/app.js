(function () {
  const CONFIG = {
    dataDir: './data/',
    files: {
      employees: 'employees.csv',
      timesheets: 'timesheets.csv',
      payPeriods: 'pay_periods.csv',
      departments: 'departments.csv',
      rates: 'rates.csv'
    }
  };

  const state = {
    datasets: {},
    raw: {},
    errors: {},
    filters: {
      payPeriod: 'all',
      department: 'all',
      approved: 'all',
      search: '',
      employeeId: null
    },
    view: 'timesheets'
  };

  const elements = {
    dataSources: document.getElementById('data-source-status'),
    statusPill: document.getElementById('status-pill'),
    statusChip: document.getElementById('status-chip'),
    timesheetContainer: document.getElementById('timesheets-content'),
    employeeContainer: document.getElementById('employees-content'),
    payPeriodContainer: document.getElementById('payperiods-content'),
    filterPayPeriod: document.getElementById('filter-pay-period'),
    filterDepartment: document.getElementById('filter-department'),
    filterApproved: document.getElementById('filter-approved'),
    filterSearch: document.getElementById('filter-search'),
    exportButton: document.getElementById('export-timesheets'),
    searchEmployees: document.getElementById('search-employees'),
    clearEmployeeFilter: document.getElementById('clear-employee-filter')
  };

  function parseCSV(text) {
    if (!text) return [];
    const cleaned = text.replace(/^\uFEFF/, '');
    const rows = [];
    let current = '';
    let inQuotes = false;
    let row = [];

    function pushValue() {
      row.push(current);
      current = '';
    }

    function pushRow() {
      if (row.length === 0 || (row.length === 1 && row[0] === '')) {
        row = [];
        return;
      }
      rows.push(row);
      row = [];
    }

    for (let i = 0; i < cleaned.length; i += 1) {
      const char = cleaned[i];
      const next = cleaned[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        pushValue();
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          i += 1;
        }
        pushValue();
        pushRow();
      } else {
        current += char;
      }
    }
    pushValue();
    pushRow();

    if (!rows.length) return [];
    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const records = [];
    for (let r = 1; r < rows.length; r += 1) {
      const rowData = rows[r];
      if (!rowData || rowData.length === 0) continue;
      const record = {};
      for (let c = 0; c < headers.length; c += 1) {
        const key = headers[c];
        const value = (rowData[c] ?? '').trim();
        record[key] = value;
      }
      const hasValues = Object.values(record).some((v) => v !== '');
      if (hasValues) {
        records.push(record);
      }
    }
    return records;
  }

  function inferTypes(records) {
    return records.map((record) => {
      const inferred = {};
      Object.entries(record).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (value === '') {
          inferred[key] = '';
          return;
        }
        if (/(?:^|_)date$/.test(lowerKey)) {
          const date = new Date(value);
          inferred[key] = Number.isNaN(date.getTime()) ? value : date;
          return;
        }
        if (lowerKey.includes('hours') || lowerKey.includes('rate') || /^\d+(\.\d+)?$/.test(value)) {
          const asNumber = Number(value);
          if (!Number.isNaN(asNumber) && value !== '') {
            inferred[key] = asNumber;
            return;
          }
        }
        if (lowerKey.endsWith('_id') || lowerKey === 'approved' || lowerKey === 'code' || lowerKey === 'status') {
          inferred[key] = value;
          return;
        }
        inferred[key] = value;
      });
      return inferred;
    });
  }

  async function loadCSV(relativePath) {
    const url = `${CONFIG.dataDir}${relativePath}`;
    const startedAt = performance.now();
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      const parsed = parseCSV(text);
      const records = inferTypes(parsed);
      return {
        status: 'ok',
        records,
        raw: text,
        duration: performance.now() - startedAt
      };
    } catch (error) {
      return {
        status: 'error',
        records: [],
        raw: '',
        duration: performance.now() - startedAt,
        error: error.message
      };
    }
  }

  function updateDataSourcesUI() {
    const fragment = document.createDocumentFragment();
    const warnings = [];
    Object.entries(CONFIG.files).forEach(([key, filename]) => {
      const info = state.raw[key];
      const card = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = filename;
      card.appendChild(title);
      const statusLine = document.createElement('p');
      if (!info) {
        card.className = 'card';
        statusLine.textContent = 'Pending...';
        statusLine.className = 'muted';
      } else if (info.status === 'ok') {
        card.className = 'card';
        const ms = info.duration.toFixed(0);
        statusLine.textContent = `Loaded ${info.records.length} rows in ${ms} ms`;
      } else {
        card.className = 'notice warning';
        statusLine.textContent = `Missing or unreadable (${info.error || 'unknown error'})`;
        warnings.push(filename);
      }
      card.appendChild(statusLine);
      fragment.appendChild(card);
    });
    elements.dataSources.innerHTML = '';
    elements.dataSources.appendChild(fragment);

    if (warnings.length) {
      elements.statusPill.classList.add('warning');
      elements.statusChip.textContent = 'Check files';
      elements.statusPill.querySelector('.sr-only').textContent = `${warnings.length} warnings`;
    } else {
      elements.statusPill.classList.remove('warning');
      elements.statusChip.textContent = 'OK';
      elements.statusPill.querySelector('.sr-only').textContent = 'No warnings';
    }
  }

  function renderTimesheets() {
    const container = elements.timesheetContainer;
    const timesheets = state.datasets.timesheets;
    const employees = state.datasets.employees;
    const departments = state.datasets.departments;
    const payPeriods = state.datasets.payPeriods;

    if (!timesheets || !employees || !departments || !payPeriods) {
      container.innerHTML = '<div class="notice empty">Timesheets will appear once all required files load.</div>';
      return;
    }

    const employeeMap = new Map(employees.map((emp) => [emp.employee_id, emp]));
    const deptMap = new Map(departments.map((dept) => [dept.dept_code, dept]));

    const filtered = timesheets.filter((row) => {
      if (state.filters.payPeriod !== 'all' && row.pay_period_id !== state.filters.payPeriod) {
        return false;
      }
      if (state.filters.department !== 'all') {
        const employee = employeeMap.get(row.employee_id);
        if (!employee || employee.department !== state.filters.department) {
          return false;
        }
      }
      if (state.filters.approved !== 'all' && String(row.approved).toLowerCase() !== state.filters.approved) {
        return false;
      }
      if (state.filters.employeeId && row.employee_id !== state.filters.employeeId) {
        return false;
      }
      if (state.filters.search) {
        const employee = employeeMap.get(row.employee_id);
        const haystack = [
          row.code,
          row.notes,
          employee ? `${employee.first} ${employee.last}` : ''
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(state.filters.search.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    const sorted = filtered.slice().sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
      const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
      return dateB - dateA;
    });

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Employee</th>
        <th scope="col">Department</th>
        <th scope="col">Code</th>
        <th scope="col">Hours</th>
        <th scope="col">Approved</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    if (!sorted.length) {
      const empty = document.createElement('tr');
      empty.innerHTML = '<td colspan="6">No timesheets match the current filters.</td>';
      tbody.appendChild(empty);
    } else {
      const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
      sorted.forEach((row) => {
        const tr = document.createElement('tr');
        const employee = employeeMap.get(row.employee_id);
        const dept = employee ? deptMap.get(employee.department) : null;
        const approved = String(row.approved).toLowerCase() === 'yes';
        const cells = [
          row.date instanceof Date ? formatter.format(row.date) : formatter.format(new Date(row.date)),
          employee ? `${employee.first} ${employee.last}` : row.employee_id,
          dept ? dept.dept_name : (employee ? employee.department : '—'),
          row.code || '—',
          typeof row.hours === 'number' ? row.hours.toFixed(2) : row.hours,
          approved ? '<span class="badge">Yes</span>' : '<span class="badge negative">No</span>'
        ];
        tr.innerHTML = cells.map((cell) => `<td>${cell}</td>`).join('');
        tbody.appendChild(tr);
      });

      const totalHours = sorted.reduce((sum, row) => sum + (typeof row.hours === 'number' ? row.hours : Number(row.hours) || 0), 0);
      const summary = document.createElement('tr');
      summary.className = 'summary-row';
      summary.innerHTML = `
        <td colspan="4">Total hours</td>
        <td>${totalHours.toFixed(2)}</td>
        <td></td>
      `;
      tbody.appendChild(summary);
    }
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);

    if (state.filters.employeeId) {
      const employee = employeeMap.get(state.filters.employeeId);
      const name = employee ? `${employee.first} ${employee.last}` : state.filters.employeeId;
      elements.clearEmployeeFilter.hidden = false;
      elements.clearEmployeeFilter.textContent = `Viewing ${name} · Clear`;
    } else {
      elements.clearEmployeeFilter.hidden = true;
    }
  }

  function renderEmployees() {
    const container = elements.employeeContainer;
    const employees = state.datasets.employees;
    const departments = state.datasets.departments;
    if (!employees || !departments) {
      container.innerHTML = '<div class="notice empty">Employees list will load when data is available.</div>';
      return;
    }

    const deptMap = new Map(departments.map((dept) => [dept.dept_code, dept]));
    const filterTerm = state.filters.employeeSearch || '';
    const filtered = employees.filter((emp) => {
      if (!filterTerm) return true;
      const haystack = `${emp.first} ${emp.last} ${emp.department}`.toLowerCase();
      return haystack.includes(filterTerm.toLowerCase());
    });

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Employee</th>
          <th scope="col">Department</th>
          <th scope="col">Email</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    if (!filtered.length) {
      const empty = document.createElement('tr');
      empty.innerHTML = '<td colspan="4">No employees match the search.</td>';
      tbody.appendChild(empty);
    } else {
      filtered.forEach((emp) => {
        const tr = document.createElement('tr');
        tr.setAttribute('tabindex', '0');
        tr.dataset.employeeId = emp.employee_id;
        tr.innerHTML = `
          <td>${emp.first} ${emp.last}</td>
          <td>${deptMap.get(emp.department)?.dept_name || emp.department}</td>
          <td><a href="mailto:${emp.email}">${emp.email}</a></td>
          <td>${emp.status}</td>
        `;
        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  function renderPayPeriods() {
    const container = elements.payPeriodContainer;
    const payPeriods = state.datasets.payPeriods;
    if (!payPeriods) {
      container.innerHTML = '<div class="notice empty">Pay period data is not available.</div>';
      return;
    }
    const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Pay Period</th>
          <th scope="col">Start</th>
          <th scope="col">End</th>
          <th scope="col">Deadline</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement('tbody');
    payPeriods.forEach((period) => {
      const tr = document.createElement('tr');
      tr.dataset.payPeriodId = period.pay_period_id;
      tr.setAttribute('tabindex', '0');
      const start = period.start_date instanceof Date ? period.start_date : new Date(period.start_date);
      const end = period.end_date instanceof Date ? period.end_date : new Date(period.end_date);
      const deadline = period.deadline_date instanceof Date ? period.deadline_date : new Date(period.deadline_date);
      tr.innerHTML = `
        <td>${period.pay_period_id}</td>
        <td>${formatter.format(start)}</td>
        <td>${formatter.format(end)}</td>
        <td>${formatter.format(deadline)}</td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  function populateFilters() {
    const payPeriods = state.datasets.payPeriods || [];
    const departments = state.datasets.departments || [];

    if (payPeriods.length) {
      const currentValue = state.filters.payPeriod;
      elements.filterPayPeriod.innerHTML = '<option value="all">All</option>';
      payPeriods.forEach((period) => {
        const option = document.createElement('option');
        option.value = period.pay_period_id;
        option.textContent = period.pay_period_id;
        if (period.pay_period_id === currentValue) {
          option.selected = true;
        }
        elements.filterPayPeriod.appendChild(option);
      });
    }

    if (departments.length) {
      const currentValue = state.filters.department;
      elements.filterDepartment.innerHTML = '<option value="all">All</option>';
      departments.forEach((dept) => {
        const option = document.createElement('option');
        option.value = dept.dept_code;
        option.textContent = dept.dept_name;
        if (dept.dept_code === currentValue) {
          option.selected = true;
        }
        elements.filterDepartment.appendChild(option);
      });
    }
  }

  function exportCurrentTableToCSV() {
    const table = elements.timesheetContainer.querySelector('table');
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr'));
    const csvRows = rows.map((tr) => {
      const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) => {
        const text = cell.textContent.trim();
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      });
      return cells.join(',');
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `timesheets-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function setRoute() {
    const hash = window.location.hash.replace('#', '') || 'timesheets';
    state.view = hash;
    document.querySelectorAll('[data-view]').forEach((section) => {
      section.classList.toggle('active', section.dataset.view === hash);
    });
  }

  function attachEventListeners() {
    elements.filterPayPeriod.addEventListener('change', (event) => {
      state.filters.payPeriod = event.target.value;
      renderTimesheets();
    });

    elements.filterDepartment.addEventListener('change', (event) => {
      state.filters.department = event.target.value;
      renderTimesheets();
    });

    elements.filterApproved.addEventListener('change', (event) => {
      state.filters.approved = event.target.value;
      renderTimesheets();
    });

    elements.filterSearch.addEventListener('input', (event) => {
      state.filters.search = event.target.value;
      renderTimesheets();
    });

    elements.exportButton.addEventListener('click', exportCurrentTableToCSV);

    elements.clearEmployeeFilter.addEventListener('click', () => {
      state.filters.employeeId = null;
      renderTimesheets();
    });

    elements.searchEmployees.addEventListener('input', (event) => {
      state.filters.employeeSearch = event.target.value;
      renderEmployees();
    });

    elements.employeeContainer.addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-employee-id]');
      if (!row) return;
      state.filters.employeeId = row.dataset.employeeId;
      window.location.hash = '#timesheets';
      renderTimesheets();
    });

    elements.employeeContainer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const row = event.target.closest('tr[data-employee-id]');
        if (!row) return;
        event.preventDefault();
        state.filters.employeeId = row.dataset.employeeId;
        window.location.hash = '#timesheets';
        renderTimesheets();
      }
    });

    elements.payPeriodContainer.addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-pay-period-id]');
      if (!row) return;
      state.filters.payPeriod = row.dataset.payPeriodId;
      window.location.hash = '#timesheets';
      populateFilters();
      renderTimesheets();
    });

    elements.payPeriodContainer.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const row = event.target.closest('tr[data-pay-period-id]');
        if (!row) return;
        event.preventDefault();
        state.filters.payPeriod = row.dataset.payPeriodId;
        window.location.hash = '#timesheets';
        populateFilters();
        renderTimesheets();
      }
    });

    window.addEventListener('hashchange', setRoute);
  }

  async function init() {
    attachEventListeners();
    setRoute();

    await Promise.all(
      Object.entries(CONFIG.files).map(async ([key, filename]) => {
        const result = await loadCSV(filename).catch((error) => ({ status: 'error', error: error.message, records: [], raw: '' }));
        state.raw[key] = result;
        if (result.status === 'ok') {
          state.datasets[key] = result.records;
        } else {
          state.errors[key] = result.error;
        }
        updateDataSourcesUI();
      })
    );

    populateFilters();
    renderTimesheets();
    renderEmployees();
    renderPayPeriods();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
