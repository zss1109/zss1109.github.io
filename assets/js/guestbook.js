/* --------------------------------------------------------------------------
   留言板：提交留言写入云数据库 guestbook 表，并读取最新留言展示
   依赖：assets/vendor/workbuddy-cloud-sdk.global.js（全局 WorkBuddyCloud）
        assets/js/cloud-config.js（publicConfig）
   -------------------------------------------------------------------------- */
(function () {
  "use strict";

  var form = document.getElementById("gb-form");
  if (!form) return;

  var alertBox = document.getElementById("gb-alert");
  var submitBtn = document.getElementById("gb-submit");
  var counter = document.getElementById("gb-counter");
  var wall = document.getElementById("gb-wall");
  var msgInput = document.getElementById("gb-message");

  var cloud = null;

  function showAlert(kind, text) {
    if (!alertBox) return;
    alertBox.className = "alert show " + kind;
    alertBox.textContent = text;
  }

  function hideAlert() {
    if (!alertBox) return;
    alertBox.className = "alert";
    alertBox.textContent = "";
  }

  function initCloud() {
    if (cloud) return cloud;
    var cfg = window.WB_CLOUD_CONFIG || {};
    if (!window.WorkBuddyCloud || !window.WorkBuddyCloud.createWorkBuddyCloud) {
      throw new Error("SDK_UNLOADED");
    }
    if (!cfg.endpoint || !cfg.publishableKey) {
      throw new Error("CONFIG_MISSING");
    }
    cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
      endpoint: cfg.endpoint,
      publishableKey: cfg.publishableKey
    });
    return cloud;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtTime(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function renderWall(rows) {
    if (!wall) return;
    if (!rows || !rows.length) {
      wall.innerHTML = '<div class="wall-empty">还没有留言，来写下第一句吧～</div>';
      return;
    }
    wall.innerHTML = rows.map(function (r) {
      var name = escapeHtml(r.name || "访客");
      var initial = escapeHtml((r.name || "访").trim().slice(0, 1));
      return '<article class="msg">' +
        '<div class="msg-top">' +
          '<span class="avatar" aria-hidden="true">' + initial + "</span>" +
          "<div>" +
            '<div class="msg-name">' + name + "</div>" +
            '<div class="msg-meta">' + fmtTime(r.created_at) + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="msg-body">' + escapeHtml(r.message) + "</div>" +
      "</article>";
    }).join("");
  }

  function loadWall() {
    if (!wall) return;
    wall.innerHTML = '<div class="wall-empty">留言加载中…</div>';
    initCloud().database
      .rpc("guestbook_recent", { max_rows: 20 })
      .then(function (res) {
        if (res && res.error) {
          wall.innerHTML = '<div class="wall-empty">留言列表暂时加载不出来，稍后再试试～</div>';
          return;
        }
        renderWall(res && res.data);
      })
      .catch(function () {
        wall.innerHTML = '<div class="wall-empty">留言列表暂时加载不出来，稍后再试试～</div>';
      });
  }

  function friendlyError(err) {
    var code = err && err.code;
    var msg = (err && (err.message || err.error_description)) || "";
    if (code === "23514") return "内容长度或格式不符合要求，请调整后再提交。";
    if (code === "42501") return "当前没有提交权限，请联系站长处理。";
    if (code === "42P01") return "留言数据表尚未就绪，请联系站长处理。";
    if (code === "23505") return "这条留言已经提交过了。";
    if (/Failed to fetch|NetworkError|load failed/i.test(msg)) {
      return "网络连接失败，请检查网络后重试。";
    }
    return "提交失败：" + (msg || "未知错误，请稍后再试。");
  }

  function submit(payload) {
    submitBtn.disabled = true;
    submitBtn.textContent = "提交中…";
    initCloud().database
      .from("guestbook")
      .insert(payload)
      .then(function (res) {
        if (res && res.error) {
          showAlert("err", friendlyError(res.error));
          return;
        }
        showAlert("ok", "留言提交成功，谢谢你的留言！");
        form.reset();
        if (counter) counter.textContent = "0 / 1000";
        loadWall();
      })
      .catch(function (err) {
        showAlert("err", friendlyError(err));
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "提交留言";
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    hideAlert();

    var name = (form.elements["name"].value || "").trim();
    var email = (form.elements["email"].value || "").trim();
    var message = (form.elements["message"].value || "").trim();
    var genderEl = form.querySelector('input[name="gender"]:checked');
    var gender = genderEl ? genderEl.value : "";

    if (!name) { showAlert("err", "请填写昵称。"); return; }
    if (name.length > 40) { showAlert("err", "昵称最多 40 个字。"); return; }
    if (!message) { showAlert("err", "请填写留言内容。"); return; }
    if (message.length > 1000) { showAlert("err", "留言内容最多 1000 个字。"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("err", "邮箱格式看起来不太对，请检查一下。");
      return;
    }

    var payload = { name: name, message: message };
    if (gender) payload.gender = gender;
    if (email) payload.email = email;

    try {
      submit(payload);
    } catch (err) {
      var kind = err && err.message === "SDK_UNLOADED" ? "留言功能的脚本没有加载成功，请刷新页面重试。" :
                 err && err.message === "CONFIG_MISSING" ? "留言功能配置缺失，请联系站长处理。" :
                 "提交失败，请稍后再试。";
      showAlert("err", kind);
    }
  });

  if (msgInput && counter) {
    counter.textContent = (msgInput.value || "").length + " / 1000";
    msgInput.addEventListener("input", function () {
      counter.textContent = msgInput.value.length + " / 1000";
    });
  }

  // 首次进入即拉取留言列表
  try {
    loadWall();
  } catch (err) {
    if (wall) wall.innerHTML = '<div class="wall-empty">留言列表暂时加载不出来，稍后再试试～</div>';
  }
})();