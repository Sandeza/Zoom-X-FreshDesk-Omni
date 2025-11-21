let processing = false;
let lastCallId = null;

onconnect = function (e) {
  const port = e.ports[0];

  port.onmessage = function (event) {
    const { type, callId } = event.data;

    if (processing && lastCallId === callId) {
      port.postMessage({ allow: false });
      return;
    }

    if (!processing) {
      processing = true;
      lastCallId = callId;

      // Allow only first tab
      port.postMessage({ allow: true });

      // Auto-release
      setTimeout(() => {
        processing = false;
      }, 2000);
    } else {
      port.postMessage({ allow: false });
    }
  };
};
