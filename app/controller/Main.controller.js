sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("sales.order.uploader.controller.Main", {
    onInit: function () {
      // refresh on init
      this._refreshData();
    },

    onRefresh: function () {
      this._refreshData();
    },

    onUpload: function () {
      var oFU = this.byId("fileUploader");
      // unified FileUploader -> use DOM input files
      var input = oFU.getFocusDomRef && oFU.getFocusDomRef();
      var file = input && input.files && input.files[0];
      if (!file) {
        MessageToast.show("Please choose a file first");
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result || "";
        var base64 = (dataUrl.split(",")[1] || "");

        // pick the correct endpoint (odata/v4)
        var url = "/odata/v4/sales/uploadSalesOrders";

        // helper to parse JSON but show raw text on non-JSON
        var parseMaybeJson = async function (res) {
          var txt = await res.text();
          try { return JSON.parse(txt); }
          catch (err) { return { __raw: txt, status: res.status, statusText: res.statusText }; }
        };

        this._setStatus("uploading...");
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileContent: base64 })
        })
        .then(async (res) => {
          var data = await parseMaybeJson(res);
          // show raw HTML in MessageToast or console for quick debugging
          if (data && data.__raw) {
            this._setError("Server returned non-JSON response. See console or debug panel.");
            console.error("RAW RESPONSE:", data.__raw);
            this._setStatus("error");
          } else {
            MessageToast.show(data.message || "Upload complete");
            this._setStatus("upload finished");
            this._refreshData();
          }
        })
        .catch(function (err) {
          console.error(err);
          this._setError("Upload failed: " + (err && err.message));
          this._setStatus("error");
        }.bind(this));
      }.bind(this);

      reader.onerror = function () {
        this._setError("File read error");
        this._setStatus("error");
      }.bind(this);

      reader.readAsDataURL(file);
    },

    _refreshData: function () {
      var that = this;
      var ordersUrl = "/odata/v4/sales/SalesOrders?$format=json";
      var itemsUrl = "/odata/v4/sales/SalesOrderItems?$format=json";

      // Orders
      fetch(ordersUrl)
        .then(res => res.json())
        .then(function (data) {
          var cnt = (data && data.value) ? data.value.length : 0;
          that._setStatus("Orders: " + cnt);
        })
        .catch(function (err) {
          console.warn("Failed to load SalesOrders:", err);
          that._setError("Failed to load Orders: " + (err && err.message || err));
        });

      // Items
      fetch(itemsUrl)
        .then(res => res.json())
        .then(function (data) {
          var cnt = (data && data.value) ? data.value.length : 0;
          // update a small status or console
          console.log("Items count:", cnt);
        })
        .catch(function (err) {
          console.warn("Failed to load SalesOrderItems:", err);
          that._setError("Failed to load Items: " + (err && err.message || err));
        });
    },

    _setStatus: function (s) {
      var t = this.byId("statusText");
      if (t) t.setText("Status: " + s);
    },

    _setError: function (s) {
      var e = this.byId("errorText");
      if (e) e.setText(s || "");
    }
  });
});
