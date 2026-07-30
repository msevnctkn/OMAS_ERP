(function () {
    'use strict';

    if (!window.OMAS) {
        throw new Error("OMAS Kernel yüklenmemiş.");
    }

    // İlk açılış
    if (!Array.isArray(window.bhdRawRows)) {
        window.bhdRawRows = [];
    }

    // Runtime
    OMAS.Runtime.getBhdRows = function () {
        return OMAS.Runtime.bhdRows || [];
    };

    OMAS.Runtime.setBhdRows = function (rows) {
        OMAS.Runtime.bhdRows = Array.isArray(rows) ? rows : [];
    };

    // Workspace
    OMAS.Workspace.getBhdDraftRows = function () {
        return OMAS.Workspace.bhdDraftRows || [];
    };

    OMAS.Workspace.setBhdDraftRows = function (rows) {
        rows = Array.isArray(rows) ? rows : [];

        OMAS.Workspace.bhdDraftRows = rows;

        // Geçiş dönemi uyumluluğu
        window.bhdRawRows = rows;
    };

})();