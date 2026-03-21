import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['wishify://', 'https://wishify.app'],
  config: {
    screens: {
      PublicList: {
        path: 'l/:slug',
        parse: { slug: (slug: string) => (/^[a-zA-Z0-9_-]{1,100}$/.test(slug) ? slug : '') },
      },
      App: {
        screens: {
          ListsStack: {
            screens: {
              Dashboard: 'lists',
            },
          },
        },
      },
      Auth: {
        screens: {
          OAuthCallback: {
            path: 'oauth/callback',
            parse: {
              access_token: (token: string) => token,
            },
          },
        },
      },
    },
  },
};
