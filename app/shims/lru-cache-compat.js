// app/shims/lru-cache-compat.js
// Minimal, Hermes-safe shim for the `lru-cache` package.
// Supports the common surface used by Digital Credentials libs:
//  - class LRUCache
//  - constructor({ max, ttl, allowStale, updateAgeOnGet })
//  - get(key[, { updateAgeOnGet }])
//  - set(key, value[, { ttl }])
//  - has(key)
//  - delete(key)   (alias: del)
//  - peek(key)
//  - clear()
//  - size (getter)
// Also exports both CJS default and named { LRUCache } to satisfy import styles.

class LRUCache {
    constructor(opts = {}) {
        const {
            max = 1000,
                ttl = 0,
                allowStale = false,
                updateAgeOnGet = false,
        } = opts;

        this.max = Number.isFinite(max) && max > 0 ? max : 1000;
        this.ttl = Number.isFinite(ttl) && ttl > 0 ? ttl : 0;
        this.allowStale = !!allowStale;
        this.updateAgeOnGet = !!updateAgeOnGet;

        // Internal storage: Map keeps insertion order.
        // We store { v: value, e: expireAtMillis (0 if no TTL) }
        this._map = new Map();
    }

    _isExpired(entry) {
        if (!entry) return true;
        if (!entry.e) return false; // 0 means no TTL
        return Date.now() > entry.e;
    }

    _expireIfNeeded(key, entry) {
        if (!entry) return true;
        if (this._isExpired(entry)) {
            this._map.delete(key);
            return true;
        }
        return false;
    }

    _bumpRecency(key, entry) {
        // move to the end to mark as most-recently-used
        this._map.delete(key);
        this._map.set(key, entry);
    }

    _trim() {
        while (this._map.size > this.max) {
            const firstKey = this._map.keys().next().value;
            this._map.delete(firstKey);
        }
    }

    set(key, value, opts = {}) {
        const perSetTtl = Number.isFinite(opts.ttl) && opts.ttl > 0 ? opts.ttl : this.ttl;
        const expireAt = perSetTtl ? (Date.now() + perSetTtl) : 0;

        const entry = { v: value, e: expireAt };
        if (this._map.has(key)) this._map.delete(key);
        this._map.set(key, entry);
        this._trim();
        return true;
    }

    get(key, opts = {}) {
        const updateAge = opts.updateAgeOnGet !== undefined ? opts.updateAgeOnGet : this.updateAgeOnGet;
        const entry = this._map.get(key);
        if (!entry) return undefined;

        if (this._expireIfNeeded(key, entry)) {
            // expired: return undefined unless allowStale
            return this.allowStale ? entry.v : undefined;
        }

        if (updateAge) {
            // Reset expiry window if a default ttl exists
            if (this.ttl) entry.e = Date.now() + this.ttl;
            this._bumpRecency(key, entry);
        }
        return entry.v;
    }

    peek(key) {
        const entry = this._map.get(key);
        if (!entry) return undefined;
        if (this._isExpired(entry)) {
            // do not mutate order on peek; just enforce expiry semantics
            if (!this.allowStale) return undefined;
        }
        return entry.v;
    }

    has(key) {
        const entry = this._map.get(key);
        if (!entry) return false;
        if (this._expireIfNeeded(key, entry)) return this.allowStale; // if allowStale, consider it present
        return true;
        // Note: real lru-cache treats stale as present if allowStale is true.
    }

    delete(key) {
        return this._map.delete(key);
    }

    // compat with older APIs
    del(key) {
        return this.delete(key);
    }

    clear() {
        this._map.clear();
    }

    get size() {
        // Count only non-expired items
        let n = 0;
        for (const [key, entry] of this._map) {
            if (!this._isExpired(entry)) n++;
        }
        return n;
    }

    // Optional: keys/values/forEach iterators (lightweight, ignore staleness by default)
    keys() {
        return this._map.keys();
    }
    values() {
        return (function*(map, self) {
            for (const [k, e] of map) {
                if (!self._isExpired(e)) yield e.v;
            }
        })(this._map, this);
    }
    forEach(cb, thisArg) {
        for (const [k, e] of this._map) {
            if (!this._isExpired(e)) cb.call(thisArg, e.v, k, this);
        }
    }
}

// Export shapes to satisfy both:
//   import LRUCache from 'lru-cache'
//   import { LRUCache } from 'lru-cache'
//   const LRU = require('lru-cache')
module.exports = LRUCache;
module.exports.LRUCache = LRUCache;
module.exports.default = LRUCache;