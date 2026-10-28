import { CalendarPlus2, LayoutDashboard, CalendarDays, MessageCircle, Scissors, Images, Wallet, Settings, UserRound, UsersRound, ShoppingBag, Package, BadgeCheck, Palette, type LucideIcon } from 'lucide-react';
import type { adminItems } from './admin-nav';

// Key by section rather than menu position. Type checking requires every section.
export const adminIcons = {
  agendar: CalendarPlus2,
  dashboard: LayoutDashboard,
  agenda: CalendarDays,
  chat: MessageCircle,
  servicos: Scissors,
  portfolio: Images,
  financeiro: Wallet,
  configuracoes: Settings,
  perfil: UserRound,
  usuarios: UsersRound,
  loja: ShoppingBag,
  estoque: Package,
  identidade: Palette,
  assinatura: BadgeCheck,
} satisfies Record<(typeof adminItems)[number]['slug'], LucideIcon>;
