const SORTADMIN = {
  USER: {
    name: ["name_asc", "name_desc"],
    username: ["username_asc", "username_desc"],
    email: ["email_asc", "email_desc"],
    phone: ["phone_asc", "phone_desc"],
    role: ["role_asc", "role_desc"],
    emailVerified: ["email_verified_asc", "email_verified_desc"],
    phoneVerified: ["phone_verified_asc", "phone_verified_desc"],
    status: ["status_asc", "status_desc"],
    created: ["oldest", "newest"],
  }
} as const;
// type SortKey = (typeof SORT)[keyof typeof SORT][number];

export { SORTADMIN };
// export type { SortKey };