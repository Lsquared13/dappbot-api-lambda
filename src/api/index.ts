import PublicApi from './public';
import PrivateApi from './private';
import AuthApi from './auth';

export const Api = {
  public : PublicApi,
  private : PrivateApi,
  auth : AuthApi
}

console.log('Api at startup: ',Api);

export default Api;