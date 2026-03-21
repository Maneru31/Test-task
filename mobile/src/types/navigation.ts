import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OAuthCallback: { access_token: string };
};

export type ListsStackParamList = {
  Dashboard: undefined;
  ListDetail: { listId: string; title: string };
  ListSettings: { listId: string };
  AddItem: { listId: string };
  EditItem: { listId: string; itemId: string };
};

export type AppTabParamList = {
  ListsStack: NavigatorScreenParams<ListsStackParamList>;
  Profile: undefined;
};

export type PublicStackParamList = {
  PublicList: { slug: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
  PublicList: { slug: string };
};
