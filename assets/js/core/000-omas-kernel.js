(function (global) {
  'use strict';

  var root = global.OMAS || {};

  root.version = root.version || '0.1.0';
  root.Runtime = root.Runtime || {};
  root.Workspace = root.Workspace || {};
  root.Services = root.Services || {};
  root.Repositories = root.Repositories || {};
  root.Events = root.Events || {};
  root.UI = root.UI || {};

  if (!Array.isArray(root.Runtime.bhdRows)) root.Runtime.bhdRows = [];
  if (!Array.isArray(root.Workspace.bhdDraftRows)) root.Workspace.bhdDraftRows = [];
  if (!Array.isArray(root.Runtime.invoiceRows)) root.Runtime.invoiceRows = [];
  if (!Array.isArray(root.Workspace.invoiceDraftRows)) root.Workspace.invoiceDraftRows = [];

  root.Events.emit = root.Events.emit || function (name, detail) {
    global.dispatchEvent(new CustomEvent('omas:' + name, { detail: detail || {} }));
  };

  root.Events.on = root.Events.on || function (name, handler) {
    global.addEventListener('omas:' + name, handler);
    return function () {
      global.removeEventListener('omas:' + name, handler);
    };
  };

  root.Runtime.setBhdRows = function (rows, meta) {
    root.Runtime.bhdRows = Array.isArray(rows) ? rows : [];
    root.Runtime.bhdMeta = meta || {};
    root.Events.emit('runtime-bhd-changed', {
      rows: root.Runtime.bhdRows,
      meta: root.Runtime.bhdMeta
    });
    return root.Runtime.bhdRows;
  };

  root.Workspace.setBhdDraftRows = function (rows, meta) {
    root.Workspace.bhdDraftRows = Array.isArray(rows) ? rows : [];
    root.Workspace.bhdDraftMeta = meta || {};
    root.Events.emit('workspace-bhd-changed', {
      rows: root.Workspace.bhdDraftRows,
      meta: root.Workspace.bhdDraftMeta
    });
    return root.Workspace.bhdDraftRows;
  };

  root.Workspace.clearBhdDraft = function () {
    return root.Workspace.setBhdDraftRows([], { clearedAt: new Date().toISOString() });
  };

  root.Workspace.getBhdDraftRows = function () {
    return root.Workspace.bhdDraftRows.slice();
  };

  root.Runtime.getBhdRows = function () {
    return root.Runtime.bhdRows.slice();
  };

  // Geçiş köprüsü: mevcut modülleri bozmadan eski global diziyi yalnızca okur.
  // Bu sprintte bhdRawRows davranışı değiştirilmez; sonraki sprintte kontrollü ayrıştırılır.
  root.Legacy = root.Legacy || {};
  root.Legacy.captureBhdRawRows = function (source) {
    var rows = global.bhdRawRows;
    if (!Array.isArray(rows)) return [];
    root.Runtime.setBhdRows(rows.slice(), {
      source: source || 'legacy-bhdRawRows',
      capturedAt: new Date().toISOString()
    });
    return root.Runtime.bhdRows;
  };

  global.OMAS = root;
  global.dispatchEvent(new CustomEvent('omas:kernel-ready', {
    detail: { version: root.version }
  }));
})(window);
