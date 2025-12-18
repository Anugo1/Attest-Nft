import fetch from 'node-fetch';
import FormData from 'form-data';

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
};

const normalizeGatewayBase = (value) => value.replace(/\/+$/, '');

export const getIpfsGatewayBase = () =>
  normalizeGatewayBase(process.env.IPFS_GATEWAY_BASE || 'https://gateway.pinata.cloud/ipfs');

export const toGatewayUrl = (cid) => `${getIpfsGatewayBase()}/${cid}`;
export const toIpfsUri = (cid) => `ipfs://${cid}`;

export async function pinFileToIpfs({
  buffer,
  filename,
  contentType = 'application/octet-stream',
  pinataMetadata,
}) {
  if (!buffer || !(buffer instanceof Buffer)) {
    throw new Error('pinFileToIpfs: buffer (Buffer) is required');
  }

  const jwt = requireEnv('PINATA_JWT');

  const form = new FormData();
  form.append('file', buffer, { filename, contentType });

  if (pinataMetadata) {
    form.append('pinataMetadata', JSON.stringify(pinataMetadata));
  }

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pinata pinFileToIPFS failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const cid = json?.IpfsHash;
  if (typeof cid !== 'string' || cid.length === 0) {
    throw new Error('Pinata pinFileToIPFS: missing IpfsHash');
  }

  return {
    cid,
    ipfsUri: toIpfsUri(cid),
    gatewayUrl: toGatewayUrl(cid),
  };
}

export async function pinJsonToIpfs({ json, filename, pinataMetadata }) {
  const jwt = requireEnv('PINATA_JWT');

  const body = {
    pinataContent: json,
    ...(pinataMetadata ? { pinataMetadata } : {}),
  };

  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...(filename ? { 'X-File-Name': filename } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Pinata pinJSONToIPFS failed (${res.status}): ${text}`);
  }

  const out = await res.json();
  const cid = out?.IpfsHash;
  if (typeof cid !== 'string' || cid.length === 0) {
    throw new Error('Pinata pinJSONToIPFS: missing IpfsHash');
  }

  return {
    cid,
    ipfsUri: toIpfsUri(cid),
    gatewayUrl: toGatewayUrl(cid),
  };
}
