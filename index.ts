import _fetch, { Body, RequestInit } from 'node-fetch';
import dotenv from 'dotenv';
import PfsenseApi from './types/pfsense-api';

dotenv.config();

(async function() {
  await createOrUpdateAlias('CLOUDFLARE', await Promise.all([
    getCloudflareNetworks('4'),
    getCloudflareNetworks('6'),
  ]).then(([v4, v6]) => [...v4, ...v6]));

  const TABLE = await getBgpTable();
  const ASN_LIST = process.env.ASN_LIST.split(',').map(e => e.trim()).filter(e => e.length).map(e => e.split(' ')).map(e => e.map(e => e.trim()));

  for(const [name, ...asn] of ASN_LIST) {
    await createOrUpdateAlias(name, await getAsnNetworks(TABLE, asn));
  }
})();

async function fetch<T = any>(url: string, options: RequestInit = {}, contentType: KeyOfType<Body, Function> = 'json', authorizationEnabled: boolean = true): Promise<T> {
  options.headers = Object.assign({}, options.headers, {
    'User-Agent': `${process.env.NAME} ${process.env.EMAIL}`,
    'Content-Type': 'application/json',
  });
  if(authorizationEnabled) {
    options.headers = Object.assign({}, options.headers, {
      Authorization: `${process.env.CLIENT_ID} ${process.env.CLIENT_TOKEN}`,
    });
  }
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
    await fetch(`${process.env.API_URL}/api/v1/firewall/alias/entry`, {
      method: 'DELETE',
      body: JSON.stringify({
        apply: true,
        name,
        address: toRemove,
      }),
    });
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

async function getBgpTable(): Promise<Map<string, string[]>> {
  const content = await fetch('https://bgp.tools/table.txt', {}, 'text', false);
  const lines = content.split('\n');
  const table = new Map<string, string[]>();

  for (const line of lines) {
    const [prefix, asn] = line.split(' ');

    if(table.has(asn)) {
      table.get(asn).push(prefix);
    } else {
      table.set(asn, [prefix]);
    }
  }

  return table;
}

async function getAsnNetworks(table: Map<string, string[]>, asns: string[]): Promise<string[]> {
  const networks: string[] = [];

  for (const asn of asns) {
    if (table.has(asn)) {
      networks.push(...table.get(asn));
    }
  }

  return networks;
}
