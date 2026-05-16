export const roleNames = ['user', 'moderator', 'admin'] as const;

export type Role = (typeof roleNames)[number];

export function isRole(value: string): value is Role {
  return roleNames.includes(value as Role);
}
