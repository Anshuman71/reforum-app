import baseX from 'base-x';

const b58 = baseX('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

type PlatformModels =
  | 'comment'
  | 'post'
  | 'secret'
  | 'category'
  | 'request'
  | 'like'
  | 'tag'
  | 'post_tag'
  | 'vote'
  | 'reaction'
  | 'group'
  | 'bookmark'
  | 'draft'
  | 'flag'
  | 'notification'
  | 'upload'
  | 'setting'
  | 'audit_log';

const prefixes: Record<string, string> = {
  // better-auth models
  user: 'usr',
  account: 'acc',
  session: 'sess',
  verification: 'ver',
  member: 'mem',
  'rate-limit': 'rl',
  jwks: 'jwks',
  organization: 'org',
  passkey: 'psk',
  'two-factor': '2fa',
  invitation: 'inv',

  // platform models
  comment: 'com',
  post: 'p',
  secret: 'secret',
  category: 'cat',
  request: 'req',
  like: 'like',
  tag: 'tag',
  post_tag: 'pt',
  vote: 'vote',
  reaction: 'react',
  group: 'grp',
  bookmark: 'bm',
  draft: 'draft',
  flag: 'flag',
  notification: 'notif',
  upload: 'upl',
  setting: 'set',
  audit_log: 'al',
} as const;

export type IdPrefixKeys = keyof typeof prefixes;

export function getPrefix(key: IdPrefixKeys) {
  return prefixes[key];
}

export function newId(key: IdPrefixKeys, size?: number) {
  const buf = crypto.getRandomValues(new Uint8Array(size || 12));

  /**
   * epoch starts more recently so that the 32-bit number space gives a
   * significantly higher useful lifetime of around 136 years
   * from 2023-11-14T22:13:20Z to 2159-12-22T04:41:36Z.
   */
  const EPOCH_TIMESTAMP_SEC = 1_700_000_000;

  const t = Math.floor(Date.now() / 1000) - EPOCH_TIMESTAMP_SEC;

  buf[0] = (t >>> 24) & 255;
  buf[1] = (t >>> 16) & 255;
  buf[2] = (t >>> 8) & 255;
  buf[3] = t & 255;

  const prefix = getPrefix(key);

  return `${prefix}_${b58.encode(buf)}` as const;
}
