var STORAGE_KEY = 'diveLog_v1';
var SEED_VER_KEY = 'diveLog_seedVer';
var currentFilter = 'all';
var editingId = null;

function getDives() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch(e) { return []; }
}
function setDives(dives) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dives));
}

// Seed on first load OR when seed version has changed
function seed() {
  var storedVer = localStorage.getItem(SEED_VER_KEY);
  if (storedVer !== SEED_VERSION) {
    // New seed available — load it but preserve any user-added dives (id > seed count)
    var existing = getDives();
    var seedIds = {};
    for (var i = 0; i < SEED_DIVES.length; i++) seedIds[SEED_DIVES[i].id] = true;
    var userAdded = existing.filter(function(d) { return !seedIds[d.id]; });
    var merged = SEED_DIVES.concat(userAdded);
    setDives(merged);
    localStorage.setItem(SEED_VER_KEY, SEED_VERSION);
  }
}

window.onload = function() {
  seed();
  showView('log');
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
};

function showView(name) {
  var views = document.querySelectorAll('.view');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var btns = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  document.getElementById('view-' + name).classList.add('active');
  document.querySelector('[data-view="' + name + '"]').classList.add('active');
  if (name === 'log')   renderLog();
  if (name === 'stats') renderStats();
  if (name === 'add' && !editingId) resetForm();
}

function setFilter(f, el) {
  currentFilter = f;
  var chips = document.querySelectorAll('.chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
  el.classList.add('active');
  renderLog();
}

function renderLog() {
  var dives = getDives();
  var q = (document.getElementById('search').value || '').toLowerCase();
  var list = dives.slice().reverse();

  if (currentFilter !== 'all') {
    list = list.filter(function(d) {
      var c = (d.comment || '').toLowerCase();
      if (currentFilter === 'night')  return c.indexOf('night') >= 0;
      if (currentFilter === 'wreck')  return c.indexOf('wreck') >= 0;
      if (currentFilter === 'nitrox') return c.indexOf('nitrox') >= 0;
      return d.country === currentFilter;
    });
  }
  if (q) {
    list = list.filter(function(d) {
      return ((d.location||'')+(d.site||'')+(d.comment||'')+(d.country||'')+(d.course||'')).toLowerCase().indexOf(q) >= 0;
    });
  }

  var mins = dives.reduce(function(s,d){ return s+(d.time||0); }, 0);
  document.getElementById('log-sub').textContent = dives.length + ' dives · ' + (mins/60).toFixed(1) + ' hrs';

  var el = document.getElementById('log-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="big">🌊</div><h3>' +
      (dives.length ? 'No matches' : 'No dives yet') + '</h3><p>' +
      (dives.length ? 'Try another filter' : 'Tap + to log your first dive') + '</p></div>';
    return;
  }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var d = list[i];
    var c = (d.comment || '').toLowerCase();
    var isNight  = c.indexOf('night') >= 0;
    var isWreck  = c.indexOf('wreck') >= 0;
    var isNitrox = c.indexOf('nitrox') >= 0;
    var isDeep   = (d.depth || 0) >= 30;
    var cls = isNight ? 'night' : isWreck ? 'wreck' : isNitrox ? 'nitrox' : isDeep ? 'deep' : '';
    var pills = '';
    if (isNight)  pills += '<span class="pill night">🌙 Night</span>';
    if (isWreck)  pills += '<span class="pill wreck">⚓ Wreck</span>';
    if (isNitrox) pills += '<span class="pill nitrox">🟢 Nitrox</span>';
    if (isDeep)   pills += '<span class="pill deep">🔵 Deep</span>';
    var flag = {'AUS':'🇦🇺','INDO':'🇮🇩','USA':'🇺🇸'}[d.country] || '';
    html += '<div class="dive-card ' + cls + '" onclick="openDetail(' + d.id + ')">' +
      '<div class="card-num">#' + d.id + '</div>' +
      '<div class="card-body">' +
        '<div class="card-loc">' + (d.location || 'Unknown') + '</div>' +
        '<div class="card-site">' + (d.site || '') + '</div>' +
        '<div class="card-meta">' +
          '<span>📅 ' + fmtDate(d.date) + '</span>' +
          '<span>⬇️ ' + (d.depth || 0) + 'm</span>' +
          '<span>⏱ ' + (d.time || 0) + ' min</span>' +
          (flag ? '<span>' + flag + '</span>' : '') +
        '</div>' +
        (pills ? '<div class="card-tags">' + pills + '</div>' : '') +
      '</div></div>';
  }
  el.innerHTML = html;
}

function openDetail(id) {
  var dives = getDives();
  var d = null;
  for (var i = 0; i < dives.length; i++) { if (dives[i].id === id) { d = dives[i]; break; } }
  if (!d) return;
  var c = (d.comment || '').toLowerCase();
  var pills = '';
  if (c.indexOf('night') >= 0)  pills += '<span class="pill night">🌙 Night Dive</span>';
  if (c.indexOf('wreck') >= 0)  pills += '<span class="pill wreck">⚓ Wreck</span>';
  if (c.indexOf('nitrox') >= 0) pills += '<span class="pill nitrox">🟢 Nitrox</span>';
  if ((d.depth||0) >= 30)       pills += '<span class="pill deep">🔵 Deep</span>';
  if (c.indexOf('survey') >= 0) pills += '<span class="pill">📋 Survey</span>';
  if (c.indexOf('patrol') >= 0) pills += '<span class="pill">🛡️ Patrol</span>';
  var note = (d.comment||'').replace(/night dive|shipwreck|nitrox|wreck|survey|patrol dive|deep|\+/gi,'').replace(/\s+/g,' ').trim();
  var ctryMap = {'AUS':'🇦🇺 Australia','INDO':'🇮🇩 Indonesia','USA':'🇺🇸 USA','OTHER':'🌏 Other'};
  document.getElementById('detail-body').innerHTML =
    '<div class="detail-hdr">' +
      '<div><div class="detail-num">Dive #' + d.id + '</div>' +
      '<div class="detail-loc">' + (d.location || 'Unknown') + '</div>' +
      '<div class="detail-site">' + (d.site || '') + '</div></div>' +
      '<button class="detail-edit" onclick="editDive(' + d.id + ')">Edit</button>' +
    '</div>' +
    '<div class="detail-stats">' +
      '<div class="detail-stat"><div class="detail-stat-val">' + (d.depth||0) + 'm</div><div class="detail-stat-lbl">Depth</div></div>' +
      '<div class="detail-stat"><div class="detail-stat-val">' + (d.time||0) + '</div><div class="detail-stat-lbl">Minutes</div></div>' +
      '<div class="detail-stat"><div class="detail-stat-val">' + fmtDate(d.date) + '</div><div class="detail-stat-lbl">Date</div></div>' +
    '</div>' +
    '<div class="detail-rows">' +
      (d.country ? '<div class="detail-row"><span class="detail-row-lbl">Country</span><span class="detail-row-val">' + (ctryMap[d.country]||d.country) + '</span></div>' : '') +
      (d.course  ? '<div class="detail-row"><span class="detail-row-lbl">Training</span><span class="detail-row-val">' + d.course + '</span></div>' : '') +
      (note      ? '<div class="detail-row"><span class="detail-row-lbl">Notes</span><span class="detail-row-val">' + note + '</span></div>' : '') +
      (pills     ? '<div class="detail-tags">' + pills + '</div>' : '') +
    '</div>';
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('detail-sheet').classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('detail-sheet').classList.add('hidden');
}

function resetForm() {
  editingId = null;
  document.getElementById('dive-form').reset();
  document.getElementById('f-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('form-title').textContent = 'Log a Dive';
  document.getElementById('back-btn').classList.add('hidden');
  document.getElementById('delete-btn').classList.add('hidden');
  fillDataLists();
}

function editDive(id) {
  closeDetail();
  var dives = getDives();
  var d = null;
  for (var i = 0; i < dives.length; i++) { if (dives[i].id === id) { d = dives[i]; break; } }
  if (!d) return;
  editingId = id;
  showView('add');
  document.getElementById('f-date').value     = d.date || '';
  document.getElementById('f-country').value  = d.country || 'AUS';
  document.getElementById('f-location').value = d.location || '';
  document.getElementById('f-site').value     = d.site || '';
  document.getElementById('f-depth').value    = d.depth || '';
  document.getElementById('f-time').value     = d.time || '';
  document.getElementById('f-course').value   = d.course || '';
  var c = (d.comment || '').toLowerCase();
  document.getElementById('t-night').checked  = c.indexOf('night') >= 0;
  document.getElementById('t-wreck').checked  = c.indexOf('wreck') >= 0;
  document.getElementById('t-nitrox').checked = c.indexOf('nitrox') >= 0;
  document.getElementById('t-deep').checked   = (d.depth||0) >= 30;
  document.getElementById('t-survey').checked = c.indexOf('survey') >= 0;
  document.getElementById('t-patrol').checked = c.indexOf('patrol') >= 0;
  var note = (d.comment||'').replace(/night dive|shipwreck|nitrox|wreck|survey|patrol dive|deep|\+/gi,'').replace(/\s+/g,' ').trim();
  document.getElementById('f-comment').value  = note;
  document.getElementById('form-title').textContent = 'Edit Dive';
  document.getElementById('back-btn').classList.remove('hidden');
  document.getElementById('delete-btn').classList.remove('hidden');
  fillDataLists();
}

function cancelEdit() { editingId = null; resetForm(); showView('log'); }

function saveDive() {
  var date  = document.getElementById('f-date').value;
  var depth = parseFloat(document.getElementById('f-depth').value);
  var time  = parseInt(document.getElementById('f-time').value);
  if (!date || isNaN(depth) || isNaN(time)) {
    alert('Please fill in Date, Depth and Time.');
    return;
  }
  var tags = [];
  if (document.getElementById('t-night').checked)  tags.push('Night Dive');
  if (document.getElementById('t-wreck').checked)  tags.push('Shipwreck');
  if (document.getElementById('t-nitrox').checked) tags.push('Nitrox');
  if (document.getElementById('t-deep').checked)   tags.push('Deep');
  if (document.getElementById('t-survey').checked) tags.push('Survey');
  if (document.getElementById('t-patrol').checked) tags.push('Patrol Dive');
  var note = document.getElementById('f-comment').value.trim();
  if (note) tags.push(note);
  var dive = {
    date:    date,
    country: document.getElementById('f-country').value,
    location:document.getElementById('f-location').value.trim(),
    site:    document.getElementById('f-site').value.trim(),
    depth:   depth,
    time:    time,
    course:  document.getElementById('f-course').value.trim(),
    comment: tags.join(' + ')
  };
  var dives = getDives();
  if (editingId) {
    for (var i = 0; i < dives.length; i++) {
      if (dives[i].id === editingId) { dive.id = editingId; dives[i] = dive; break; }
    }
  } else {
    var maxId = 0;
    for (var i = 0; i < dives.length; i++) if ((dives[i].id||0) > maxId) maxId = dives[i].id;
    dive.id = maxId + 1;
    dives.push(dive);
  }
  setDives(dives);
  editingId = null;
  resetForm();
  showView('log');
}

function deleteDive() {
  if (!editingId) return;
  if (!confirm('Delete this dive?')) return;
  var dives = getDives().filter(function(d){ return d.id !== editingId; });
  setDives(dives);
  editingId = null;
  resetForm();
  showView('log');
}

function fillDataLists() {
  var dives = getDives();
  var locs = {}, sites = {};
  for (var i = 0; i < dives.length; i++) {
    if (dives[i].location) locs[dives[i].location] = 1;
    if (dives[i].site)     sites[dives[i].site] = 1;
  }
  var ll = document.getElementById('loc-list');
  var sl = document.getElementById('site-list');
  ll.innerHTML = '';
  sl.innerHTML = '';
  Object.keys(locs).sort().forEach(function(l){ ll.innerHTML += '<option value="' + l + '">'; });
  Object.keys(sites).sort().forEach(function(s){ sl.innerHTML += '<option value="' + s + '">'; });
}

function renderStats() {
  var dives = getDives();
  var el = document.getElementById('stats-container');
  if (!dives.length) {
    el.innerHTML = '<div class="empty"><div class="big">📊</div><h3>No data yet</h3></div>';
    return;
  }
  var totalMins=0, totalDepth=0, maxDepth=0, maxTime=0, nights=0, wrecks=0, nitrox=0, deep=0;
  var bYear={}, locCount={}, siteCount={}, ctyCount={}, dates=[];
  for (var i = 0; i < dives.length; i++) {
    var d = dives[i];
    totalMins  += d.time  || 0;
    totalDepth += d.depth || 0;
    if ((d.depth||0) > maxDepth) maxDepth = d.depth;
    if ((d.time||0)  > maxTime)  maxTime  = d.time;
    var c = (d.comment||'').toLowerCase();
    if (c.indexOf('night')  >= 0) nights++;
    if (c.indexOf('wreck')  >= 0) wrecks++;
    if (c.indexOf('nitrox') >= 0) nitrox++;
    if ((d.depth||0) >= 30) deep++;
    if (d.date) { dates.push(d.date); var yr = d.date.slice(0,4); bYear[yr] = (bYear[yr]||0)+1; }
    if (d.location) locCount[d.location.trim()] = (locCount[d.location.trim()]||0)+1;
    if (d.site)     siteCount[d.site.trim()]    = (siteCount[d.site.trim()]||0)+1;
    if (d.country)  ctyCount[d.country]         = (ctyCount[d.country]||0)+1;
  }
  dates.sort();
  var avgDepth = (totalDepth / dives.length).toFixed(1);
  var avgTime  = Math.round(totalMins / dives.length);
  var firstD   = dates.length ? fmtDate(dates[0]) : '—';
  var lastD    = dates.length ? fmtDate(dates[dates.length-1]) : '—';

  var maxYr = 0;
  Object.keys(bYear).forEach(function(k){ if (bYear[k] > maxYr) maxYr = bYear[k]; });
  var yearHtml = '';
  Object.keys(bYear).sort().forEach(function(yr) {
    var cnt = bYear[yr], pct = Math.round(cnt/maxYr*100);
    yearHtml += '<div class="yr-row"><div class="yr-lbl">' + yr + '</div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%">' +
      '<span class="bar-cnt">' + cnt + '</span></div></div></div>';
  });

  function topList(obj, n) {
    return Object.keys(obj).sort(function(a,b){ return obj[b]-obj[a]; }).slice(0,n)
      .map(function(k){ return '<div class="stat-row"><span class="stat-row-name">'+k+'</span><span class="stat-badge">'+obj[k]+'</span></div>'; }).join('');
  }
  var ctyMap = {'AUS':'🇦🇺 Australia','INDO':'🇮🇩 Indonesia','USA':'🇺🇸 USA','OTHER':'🌏 Other'};
  var ctyHtml = '';
  Object.keys(ctyCount).sort(function(a,b){ return ctyCount[b]-ctyCount[a]; }).forEach(function(k) {
    ctyHtml += '<div class="stat-row"><span class="stat-row-name">'+(ctyMap[k]||k)+'</span><span class="stat-badge">'+ctyCount[k]+'</span></div>';
  });

  el.innerHTML =
    '<div class="stat-card"><div class="stat-card-title">🌊 Overall</div><div class="stat-grid">' +
      '<div class="stat-item"><div class="stat-val big">'+dives.length+'</div><div class="stat-lbl">Total Dives</div></div>' +
      '<div class="stat-item"><div class="stat-val big">'+(totalMins/60).toFixed(1)+'</div><div class="stat-lbl">Hours Underwater</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+avgDepth+'m</div><div class="stat-lbl">Avg Depth</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+maxDepth+'m</div><div class="stat-lbl">Deepest Dive</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+avgTime+'</div><div class="stat-lbl">Avg Bottom Time (min)</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+maxTime+'</div><div class="stat-lbl">Longest Dive (min)</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+nights+'</div><div class="stat-lbl">Night Dives</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+wrecks+'</div><div class="stat-lbl">Wreck Dives</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+nitrox+'</div><div class="stat-lbl">Nitrox Dives</div></div>' +
      '<div class="stat-item"><div class="stat-val">'+deep+'</div><div class="stat-lbl">Dives ≥ 30m</div></div>' +
      '<div class="stat-item"><div class="stat-val" style="font-size:13px">'+firstD+'</div><div class="stat-lbl">First Dive</div></div>' +
      '<div class="stat-item"><div class="stat-val" style="font-size:13px">'+lastD+'</div><div class="stat-lbl">Most Recent</div></div>' +
    '</div></div>' +
    '<div class="stat-card"><div class="stat-card-title">📅 Dives per Year</div><div class="year-bars">'+yearHtml+'</div></div>' +
    '<div class="stat-card"><div class="stat-card-title">🌍 By Country</div>'+ctyHtml+'</div>' +
    '<div class="stat-card"><div class="stat-card-title">📍 Top Locations</div>'+topList(locCount,8)+'</div>' +
    '<div class="stat-card"><div class="stat-card-title">🪸 Top Dive Sites</div>'+topList(siteCount,8)+'</div>';
}

function exportCSV() {
  var dives = getDives();
  var rows = [['Dive #','Date','Depth (m)','Time (min)','Country','Location','Site','Course','Comment']];
  for (var i = 0; i < dives.length; i++) {
    var d = dives[i];
    rows.push([d.id,d.date,d.depth,d.time,d.country,d.location,d.site,d.course,d.comment]);
  }
  var csv = rows.map(function(r){
    return r.map(function(v){ return '"'+(v||'').toString().replace(/"/g,'""')+'"'; }).join(',');
  }).join('\n');
  var a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'dive-log-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}

function fmtDate(s) {
  if (!s) return '—';
  var p = s.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function(){});
}
