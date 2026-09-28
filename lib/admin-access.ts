export const adminEmails = ['neifranchi@gmail.com', 'eric.cabeleireiro@gmail.com'];

export function isAdminEmail(email: string) {
  return adminEmails.includes(email.trim().toLowerCase());
}
