export type RootStackParamList = {
  Home: undefined;
  RouteDetail: { id: string };
  Account: undefined;
  Login: undefined;
  Register: undefined;
  Verify: { token?: string } | undefined;
  Forgot: undefined;
  Reset: { token?: string } | undefined;
};
