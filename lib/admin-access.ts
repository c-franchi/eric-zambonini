export const adminEmails = ['neifranchi@gmail.com', 'gleicifranchi@gmail.com'];

export function isAdminEmail(email: string) {
  return adminEmails.includes(email.trim().toLowerCase());
}
