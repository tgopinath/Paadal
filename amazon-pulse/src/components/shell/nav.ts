import {
  BarChart3,
  Bot,
  CalendarRange,
  Database,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Lightbulb,
  PackageSearch,
  Telescope,
  Settings,
  Shapes,
  Star,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Analyse",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/products", label: "Product Explorer", icon: PackageSearch },
      { href: "/discover", label: "Discover", icon: Telescope },
      { href: "/history", label: "Historical Analytics", icon: CalendarRange },
      { href: "/trending", label: "Trending Now", icon: TrendingUp },
      { href: "/categories", label: "Categories", icon: Shapes },
    ],
  },
  {
    label: "Decide",
    items: [
      { href: "/compare", label: "Product Comparison", icon: GitCompareArrows },
      { href: "/opportunities", label: "Opportunity Finder", icon: Lightbulb },
      { href: "/watchlist", label: "My Watchlist", icon: Star },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/ai", label: "AI Insights", icon: Bot },
    ],
  },
  {
    label: "Configure",
    items: [
      { href: "/data-sources", label: "Data Sources", icon: Database },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/products", label: "Discover", icon: PackageSearch },
  { href: "/trending", label: "Trends", icon: BarChart3 },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
