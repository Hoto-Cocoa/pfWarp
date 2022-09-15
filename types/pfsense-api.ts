namespace PfsenseApi {
  export interface BaseResponse<T> {
    status: string;
    code: number;
    return: number;
    message: string;
    data: T;
  }

  export interface Alias {
    name: string;
    type: string;
    address: string;
    descr: string;
    detail: string;
  }
  export interface AliasResponse extends BaseResponse<Alias> {}
  export interface AliasListResponse extends BaseResponse<Alias[]> {}
}

export default PfsenseApi;
