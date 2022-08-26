import _fetch, { Body, RequestInit } from 'node-fetch';
import https from 'https';
import { AliasListResponse, AliasResponse } from './pfsense-api';

require('dotenv').config();

const agent = new https.Agent({
  rejectUnauthorized: false,
});

(async function() {
  const aliasList = await fetch<AliasListResponse>(`${process.env.API_URL}/api/v1/firewall/alias`);
  let cloudflare = aliasList.data.find(a => a.name === 'CLOUDFLARE');
  if(!cloudflare) {
    const response = await fetch<AliasResponse>(`${process.env.API_URL}/api/v1/firewall/alias`, {
      method: 'POST',
      body: JSON.stringify({
        apply: true,
        address: [],
        name: 'CLOUDFLARE',
        type: 'network',
      }),
    });
    cloudflare = response.data;
  }

  const existingNetworks = cloudflare.address.split(' ');
  const newNetworks = await Promise.all([
    getCloudflareNetworks('4'),
    getCloudflareNetworks('6'),
  ]).then(([v4, v6]) => [...v4, ...v6]);

  const toAdd = newNetworks.filter(n => !existingNetworks.includes(n));
  const toRemove = existingNetworks.filter(n => !newNetworks.includes(n));

  console.log('Adding', toAdd);
  console.log('Removing', toRemove);

  if(toRemove.length > 0) {
    for(const network of toRemove) {
      await fetch(`${process.env.API_URL}/api/v1/firewall/alias/entry`, {
        method: 'DELETE',
        body: JSON.stringify({
          apply: true,
          name: 'CLOUDFLARE',
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
        address: toAdd,
        name: 'CLOUDFLARE'
      }),
    });
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
