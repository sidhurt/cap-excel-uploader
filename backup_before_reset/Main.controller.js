sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (Controller, MessageToast) {
  "use strict";

  return Controller.extend("sales.order.uploader.controller.Main", {
    onUpload: function () {
      const fu = this.byId("fileUploader");
      const dom = fu.getFocusDomRef();
      const files = dom && dom.files ? dom.files : null;
      const status = this.byId("statusText");
      if (!files || files.length === 0) {
        MessageToast.show("Please choose a file first");
        return;
      }
      const file = files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const dataUrl = e.target.result;
          const base64 = dataUrl.split(",")[1];
          status.setText("Status: uploading...");
          fetch("/sales/uploadSalesOrders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileContent: base64 })
          })
            .then(res => res.json().catch(() => ({ message: "No JSON response" })))
            .then(data => {
              const msg = data && data.message ? data.message : "Upload completed";
              status.setText("Status: " + msg);
              MessageToast.show(msg);
            })
            .catch(err => {
              console.error("Upload error:", err);
              status.setText("Status: upload failed");
              MessageToast.show("Upload failed: " + (err.message || err));
            });
        } catch (err) {
          console.error(err);
          MessageToast.show("Error reading file");
        }
      };
      reader.onerror = function (err) {
        console.error("FileReader error", err);
        MessageToast.show("File reading failed");
      };
      reader.readAsDataURL(file);
    }
  });
});
