// Lightweight CRM setup helper used by handler.js when a ringing event
// arrives. The original repository had this module; in some edits it became
// empty which caused runtime errors where the import existed but the
// function was missing. Provide a safe, idempotent implementation here so
// callers can continue to operate even if CRM integration is not present.

export async function setupCrmForCall(client, callId, phone, name) {
	try {
		// If the host app/client exposes a CRM setup method, call it. This is
		// optional — the function must be resilient when the client or method
		// is not available.
		if (client && client.request && typeof client.request.invoke === 'function') {
			try {
				// Attempt a best-effort invocation. The backend may ignore the
				// method or return method-not-allowed for tenants without CRM.
				await client.request.invoke('setupCrmForCall', { callId, phone, name });
				console.log('[crmHandler] setupCrmForCall invoked on client');
			} catch (e) {
				// Non-fatal: log for diagnostics and continue.
				console.warn('[crmHandler] setupCrmForCall invocation failed (non-fatal):', e?.message || e);
			}
		} else {
			console.log('[crmHandler] No client.request.invoke available; skipping CRM setup');
		}
	} catch (err) {
		console.warn('[crmHandler] Unexpected error in setupCrmForCall:', err);
	}
}

export default {
	setupCrmForCall
};

