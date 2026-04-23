import * as Network from 'expo-network';

/**
 * Lightweight connectivity check.
 *
 * First asks the OS via expo-network (instant, no network traffic). If that
 * says we're connected and reachable, trust it. Otherwise fall back to a real
 * HEAD request against a small, reliable endpoint with a short timeout — this
 * catches captive-portal WiFi where `isConnected` is true but no traffic
 * actually leaves the device.
 */
export async function checkOnline(): Promise<boolean> {
    try {
        const state = await Network.getNetworkStateAsync();
        // If the OS doesn't think we're connected, bail early — no point wasting a fetch.
        if (state.isConnected === false) return false;
        // `isInternetReachable` is nullable on some Android versions; treat null as "unknown".
        if (state.isInternetReachable === false) return false;
        if (state.isConnected && state.isInternetReachable === true) return true;
    } catch {
        // fall through — expo-network unavailable (e.g. web)
    }

    // Confirm with a real HEAD to a lightweight, long-lived endpoint.
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch('https://cloudflare.com/cdn-cgi/trace', {
            method: 'HEAD',
            signal: ctrl.signal,
        });
        clearTimeout(t);
        return res.ok || res.status === 405; // 405 = HEAD not allowed, but reachable
    } catch {
        return false;
    }
}
