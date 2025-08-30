let _Buffer = (typeof globalThis !== 'undefined' && globalThis.Buffer) ? globalThis.Buffer : null;
if (!_Buffer) {
    try {
        _Buffer = require('buffer').Buffer;
        if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
            globalThis.Buffer = _Buffer;
        }
    } catch (e) {
        throw new Error('[base64url-universal] Buffer is not available');
    }
}

function toBuffer(input) {
    if (input == null) return _Buffer.alloc(0);
    if (typeof input === 'string') return _Buffer.from(input, 'utf8');
    if (ArrayBuffer.isView(input)) {
        return _Buffer.from(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
    }
    if (input instanceof ArrayBuffer) return _Buffer.from(new Uint8Array(input));
    return _Buffer.from(String(input), 'utf8');
}

function encode(input) {
    const b64 = toBuffer(input).toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decode(input) {
    const norm = String(input).replace(/-/g, '+').replace(/_/g, '/');
    const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
    const b = _Buffer.from(norm + '='.repeat(pad), 'base64');
    return Uint8Array.from(b.values());
}

module.exports = { encode, decode, default: { encode, decode } };