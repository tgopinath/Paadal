"use client";
/**
 * Native app looks. Inside the Android app the shell switches to Material Design 3 (Kolam M3 kit:
 * top app bar, navigation bar, Back); inside the iOS app to Apple's HIG look (Kolam iOS kit: large
 * titles, Liquid Glass tab bar, back + centred title). In any browser both kits stay off, init returns
 * a stub / null, and the website's own header, sidebar and bottom bar are used as before.
 * The kits are plain scripts on `window`, loaded in the root layout from the Kolam design system.
 */
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MOBILE_TABS, NAV_SECTIONS, isActive } from "./nav";

type M3 = { enabled: boolean; setTitle(t: string): void; setActive(id: string): void; setBack(b: boolean | string): void };
type KitWindow = Window & {
  KolamM3?: { isAndroid: boolean; init(o: object): M3 };
  KolamIOS?: {
    init(o: object): unknown;
    navBar: { set(o: object): void };
    tabBar: { select(id: string): void };
    enhance(el?: Element | null): void;
  };
};

const TABS = [
  { id: "home", href: "/", label: "Home", m3: "dashboard", ios: "house" },
  { id: "products", href: "/products", label: "Discover", m3: "manage_search", ios: "square.grid.2x2" },
  { id: "trending", href: "/trending", label: "Trends", m3: "trending_up", ios: "chart" },
  { id: "watchlist", href: "/watchlist", label: "Watchlist", m3: "star", ios: "star" },
  { id: "profile", href: "/profile", label: "More", m3: "account_circle", ios: "person" },
];
const CHART =
  '<svg class="ios-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5h16"/><path d="M4 15.5 9 10l4 3.5 7-8"/><path d="M15.5 5.5H20V10"/></svg>';
const ALL = NAV_SECTIONS.flatMap((s) => s.items);
const PROFILE_SECTIONS = ALL.filter((i) => !MOBILE_TABS.some((t) => t.href === i.href));

function tabFor(pathname: string) {
  const t = TABS.find((x) => isActive(pathname, x.href));
  if (t) return t.id;
  if (PROFILE_SECTIONS.some((s) => isActive(pathname, s.href))) return "profile";
  return "home";
}
const isRoot = (pathname: string) => TABS.some((t) => t.href === pathname);
function titleFor(pathname: string) {
  const tab = TABS.find((t) => t.href === pathname);
  if (tab) return pathname === "/" ? "Amazon Pulse" : tab.href === "/profile" ? "More" : (ALL.find((i) => i.href === pathname)?.label ?? tab.label);
  const section = ALL.find((i) => i.href === pathname);
  if (section) return section.label;
  const h1 = document.querySelector("#main h1");
  return h1?.textContent?.trim() || document.title.replace(/ · Amazon Pulse$/, "") || "Amazon Pulse";
}

/** Search lives in the website header, which the apps hide: open Discover and focus its search field. */
function focusSearch(go: (href: string) => void) {
  const find = () => document.querySelector<HTMLInputElement>('#main input[type="search"], #main input[name="q"]');
  if (location.pathname !== "/products") go("/products");
  let n = 0;
  const tick = () => {
    const el = find();
    if (el && location.pathname === "/products") { el.focus(); el.scrollIntoView({ block: "center" }); }
    else if (n++ < 30) setTimeout(tick, 100);
  };
  tick();
}

export function NativeShell() {
  // usePathname() is request data: stream the shell in after the static prerender (like MobileNav).
  return (
    <Suspense fallback={null}>
      <NativeShellInner />
    </Suspense>
  );
}

function NativeShellInner() {
  const router = useRouter();
  const pathname = usePathname();
  const kit = useRef<{ ios: boolean; m3: M3 | null } | null>(null);

  useEffect(() => {
    if (kit.current) return;
    const w = window as KitWindow;
    const go = (href: string) => router.push(href);
    const search = { id: "pulseSearch", label: "Search products", onClick: () => focusSearch(go) };
    // iOS wins if both kits would switch on.
    const ios = w.KolamIOS?.init({
      appName: "Amazon Pulse",
      uaTokens: ["AmazonPulse-iOS"],
      tint: { light: "#1D4ED8", dark: "#6EA8FF" },
      tabs: TABS.map((t) => ({ id: t.id, label: t.label, icon: t.ios === "chart" ? CHART : t.ios, href: t.href })),
      currentTab: tabFor(location.pathname),
      onTabSelect: (id: string) => {
        go(TABS.find((t) => t.id === id)!.href);
        return false;
      },
      content: "#main",
      navBar: { title: titleFor(location.pathname), large: isRoot(location.pathname), actions: [{ ...search, icon: "magnifyingglass" }] },
    });
    if (ios) {
      document.documentElement.classList.remove("k-android", "k-app");
      kit.current = { ios: true, m3: null };
      return;
    }
    const m3 = w.KolamM3?.init({
      primary: "#2563eb",
      title: "Amazon Pulse",
      home: "/",
      destinations: TABS.map((t) => ({ id: t.id, label: t.label, icon: t.m3, onSelect: () => go(t.href) })),
      actions: [{ ...search, icon: "search" }],
      isRoot: () => isRoot(location.pathname),
      back: "history",
    });
    kit.current = { ios: false, m3: m3?.enabled ? m3 : null };
  }, [router]);

  useEffect(() => {
    const k = kit.current;
    if (!k || (!k.ios && !k.m3)) return;
    // The kits reset their per-screen state on navigation, and the page title streams in: set ours just after.
    const apply = () => {
      const w = window as KitWindow;
      const title = titleFor(pathname), root = isRoot(pathname), tab = tabFor(pathname);
      if (k.ios && w.KolamIOS) {
        w.KolamIOS.tabBar.select(tab);
        const actions = [{ id: "pulseSearch", icon: "magnifyingglass", label: "Search products", onClick: () => focusSearch((h) => router.push(h)) }];
        const up = TABS.find((x) => x.id === tab)!;
        if (root) w.KolamIOS.navBar.set({ title, large: true, actions, keepTitle: true });
        else w.KolamIOS.navBar.set({ title, back: { label: up.label, onClick: () => (history.length > 1 ? history.back() : router.push(up.href)) }, actions, keepTitle: true });
        w.KolamIOS.enhance(document.getElementById("main"));
      } else if (k.m3) {
        k.m3.setTitle(title);
        k.m3.setActive(tab);
        k.m3.setBack(root ? false : TABS.find((x) => x.id === tab)!.href);
      }
    };
    // Detail pages stream their heading in after the route changes: set the bars again once it is there.
    const timers = [120, 700, 1600].map((ms) => setTimeout(apply, ms));
    return () => timers.forEach(clearTimeout);
  }, [pathname, router]);

  return null;
}
