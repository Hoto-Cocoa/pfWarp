namespace BgpviewApi {
  export interface BaseResponse<T> {
    status: 'ok' | string;
    status_message: string;
    '@meta': {
      api_version: number;
      time_zone: string;
      execution_time: string;
    };
    data: T;
  }

  export interface Prefix {
    prefix: string;
    ip: string;
    cidr: number;
    roa_status: 'Valid' | 'Invalid' | 'Unknown' | string;
    name: string;
    description: string;
    country_code: string;
    parent: {
      prefix: string;
      ip: string;
      cidr: number;
      rir_name: 'ARIN' | 'RIPE' | 'APNIC' | 'AfriNIC' | 'Lacnic' | string;
      allocation_status: 'unknown' | string;
    }
  }
  export interface AsnPrefixListResponse extends BaseResponse<{
    ipv4_prefixes: Prefix[];
    ipv6_prefixes: Prefix[];
  }> {}
};

export default BgpviewApi;
