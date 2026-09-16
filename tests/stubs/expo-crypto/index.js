'use strict';

exports.CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
};

exports.digest = async function digest() {
  return new ArrayBuffer(32);
};
