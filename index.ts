import _fetch, { Body, RequestInit } from 'node-fetch';
import https from 'https';
import dotenv from 'dotenv';
import PfsenseApi from './types/pfsense-api';
import BgpviewApi from './types/bgpview-api';

dotenv.config();

const agent = new https.Agent({
  rejectUnauthorized: false,
});

(async function() {
  await createOrUpdateAlias('CLOUDFLARE', await Promise.all([
    getCloudflareNetworks('4'),
    getCloudflareNetworks('6'),
  ]).then(([v4, v6]) => [...v4, ...v6]));

  const ASN_LIST = process.env.ASN_LIST.split(',').map(e => e.trim()).filter(e => e.length).map(e => e.split(' ')).map(e => e.map(e => e.trim()));
  for(const [name, ...asn] of ASN_LIST) {
    const asnNetworks = (await Promise.all(asn.map(Number).filter(e => !isNaN(e)).map(asn => fetch<BgpviewApi.AsnPrefixListResponse>(`https://api.bgpview.io/asn/${asn}/prefixes`, {}, 'json')))).flatMap(r => [...r.data.ipv4_prefixes, ...r.data.ipv6_prefixes]).map(p => p.prefix).filter(e => e.length);
    await createOrUpdateAlias(name, asnNetworks);
  }
})();

async function fetch<T = any>(url: string, options: RequestInit = {}, contentType: KeyOfType<Body, Function> = 'json'): Promise<T> {
  options.headers = Object.assign({}, options.headers, {
    Authorization: `${process.env.CLIENT_ID} ${process.env.CLIENT_TOKEN}`,
    'Content-Type': 'application/json',
  });
  options.agent = agent;
  const response =  await _fetch(url, options);
  return await response[contentType]();
}

async function getCloudflareNetworks(type: '4' | '6'): Promise<string[]> {
  const response = await fetch<string>(`https://www.cloudflare.com/ips-v${type}`, {}, 'text');
  return response.split('\n');
}

async function createOrUpdateAlias(name: string, newNetworks: string[]): Promise<void> {
  const aliasList = await fetch<PfsenseApi.AliasListResponse>(`${process.env.API_URL}/api/v1/firewall/alias`);
  let alias = aliasList.data.find(a => a.name === name);
  if(!alias) {
    const response = await fetch<PfsenseApi.AliasResponse>(`${process.env.API_URL}/api/v1/firewall/alias`, {
      method: 'POST',
      body: JSON.stringify({
        apply: true,
        address: [],
        name,
        type: 'network',
      }),
    });
    alias = response.data;
  }

  const existingNetworks = alias.address.split(' ');

  const toAdd = newNetworks.filter(n => !existingNetworks.includes(n));
  const toRemove = existingNetworks.filter(n => !newNetworks.includes(n));

  console.log(`Adding to ${name}:`, toAdd);
  console.log(`Removing from ${name}:`, toRemove);

  if(toRemove.length > 0) {
    for(const network of toRemove) {
      await fetch(`${process.env.API_URL}/api/v1/firewall/alias/entry`, {
        method: 'DELETE',
        body: JSON.stringify({
          apply: true,
          name,
          address: network,
        }),
      });
    }
  }

  if(toAdd.length > 0) {
    await fetch(`${process.env.API_URL}/api/v1/firewall/alias/entry`, {
      method: 'POST',
      body: JSON.stringify({
        apply: true,
        name,
        address: toAdd,
      }),
    });
  }
}
