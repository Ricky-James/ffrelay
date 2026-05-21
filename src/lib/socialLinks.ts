interface SocialConfig {
  label: string;
  urlTemplate: string;
  icon: string;
}

const SOCIAL_CONFIG: Record<string, SocialConfig> = {
  youtube: {
    label: 'YouTube',
    urlTemplate: 'https://youtube.com/@{v}',
    icon: 'simple-icons:youtube',
  },
  twitch: {
    label: 'Twitch',
    urlTemplate: 'https://twitch.tv/{v}',
    icon: 'simple-icons:twitch',
  },
};

const DISPLAY_ORDER = ['twitch', 'youtube'];

export interface SocialLink {
  key: string;
  label: string;
  url: string;
  icon: string;
}

export function getSocialLinks(personal: Record<string, string | string[]>): SocialLink[] {
  return DISPLAY_ORDER
    .filter((key) => {
      const val = personal[key];
      return typeof val === 'string' && val.trim() !== '' && SOCIAL_CONFIG[key];
    })
    .map((key) => {
      const config = SOCIAL_CONFIG[key];
      const handle = personal[key] as string;
      return {
        key,
        label: config.label,
        url: config.urlTemplate.replace('{v}', handle),
        icon: config.icon,
      };
    });
}
