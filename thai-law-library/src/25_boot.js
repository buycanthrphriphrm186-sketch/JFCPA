<script>
/* ==========================================================================
   BOOT — เปิดเร็ว: ใช้ข้อมูลในอุปกรณ์ก่อน แล้วซิงก์กับ Google Sheets เบื้องหลัง
   ========================================================================== */
function showMaintenance(msg) {
  if (document.getElementById('maintPage')) return;
  ROOT.innerHTML = '<main class="auth-wrap enter" id="maintPage"><div class="auth-card wide" style="text-align:center"><div class="auth-head"><img src="' + LOGO + '" alt=""><span class="t1">THAI LAW LIBRARY</span><h2>ปิดปรับปรุงระบบชั่วคราว</h2></div><div class="prose"><p class="noindent">' + esc(msg || SYS_DOWN_TEXT) + '</p></div><div class="col" style="margin-top:16px;text-align:left">' + contactCards() + '</div><button class="btn k" style="margin-top:16px" id="mtRetry">' + ic('refresh') + ' ตรวจสอบอีกครั้ง</button></div></main>';
  $('#mtRetry').onclick = function () { api('ping', {}).then(function () { location.reload(); }).catch(function (e) { toast('ระบบยังอยู่ระหว่างปรับปรุง', e.msg || '', 'warn'); }); };
}

function applyEarlyTheme() {
  var th = store.get('theme', 'light');
  document.documentElement.setAttribute('data-theme', th);
}

var heartbeat = null;
function startHeartbeat() {
  if (heartbeat) return;
  heartbeat = setInterval(function () {
    if (!S.token || document.visibilityState !== 'visible') return;
    api('ping', {}, { noRetry: true, timeout: 15000 }).then(function () { flushOutbox(); }).catch(function () {});
  }, 5 * 60 * 1000);
  window.addEventListener('online', function () { netOk(); flushOutbox(); });
  window.addEventListener('offline', function () { S.failStreak = 3; netFail(); });
}

function boot() {
  applyEarlyTheme();
  /* ตรวจการล่มซ้ำตอนเปิด (Auto rollback ฝั่งหน้าเว็บ → Safe mode) */
  var tries = store.get('bootTry', 0) + 1; store.set('bootTry', tries);
  if (tries >= 3) { SAFE_MODE = true; store.set('safeMode', true); }
  setTimeout(function () { store.set('bootTry', 0); }, 6000);

  indexCatalog();
  if (store.get('tempSession', false)) {
    var alive = false; try { alive = sessionStorage.getItem('tll.temp') === '1'; } catch (e) {}
    if (!alive) { clearSession(); store.del('tempSession'); }
  }
  var hasSession = !!(S.token && S.member);
  if (hasSession) { loadLocalUD(); applySettings(); }
  var first = !store.get('seenSplash', false);
  var secs = BOOT.maintenance ? 1.2 : (BOOT.social ? 1 : hasSession ? 1.1 : first ? (+BOOT.splash || 15) : 2);
  store.set('seenSplash', true);

  /* โหลดล่วงหน้าระหว่างแสดงโลโก้ */
  if (!BOOT.maintenance) { loadCatalog(); if (!hasSession) loadMedia(); }

  runSplash(secs, function () {
    try {
      if (BOOT.maintenance) { showMaintenance(BOOT.maintenance); return; }
      if (BOOT.social && !(hasSession && BOOT.social.mode === 'link') && handleSocialBoot(BOOT.social)) return;
      if (BOOT.social && BOOT.social.mode === 'link') handleSocialBoot(BOOT.social);
      if (hasSession) {
        renderApp();
        nav(S.ui.view || 'home', { noAnim: true });
        bootstrap(false);
        startHeartbeat();
        setTimeout(loadTreaties, 1500);
        setTimeout(loadMedia, 3000);
      } else {
        var ps = store.get('pubScreen', 'welcome');
        if (ps === 'register' && REG && REG.step) renderRegister(); else if (ps === 'login') renderLogin(); else renderWelcome();
        if (BOOT.bootError) toast('การเชื่อมต่อฐานข้อมูลขัดข้อง', SYS_DOWN_TEXT, 'warn', { life: 9000 });
      }
    } catch (err) {
      reportError('boot', err);
      ROOT.innerHTML = '<main class="auth-wrap"><div class="auth-card" style="text-align:center"><div class="auth-head"><img src="' + LOGO + '" alt=""><h2>ระบบขัดข้องชั่วคราว</h2></div><p class="muted">' + esc(SYS_DOWN_TEXT) + '</p><button class="btn k" style="margin-top:14px" onclick="location.reload()">' + ic('refresh') + ' โหลดใหม่</button></div></main>';
    }
  });
}
var _origOnLoggedIn = onLoggedIn;
onLoggedIn = function (r, remember) { _origOnLoggedIn(r, remember); startHeartbeat(); setTimeout(loadTreaties, 1200); };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
</script>
</body>
</html>
