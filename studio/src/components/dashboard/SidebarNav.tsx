"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  BrainCircuit,
  Home,
  FileUp,
  BookCopy,
  Settings,
  Share2,
  PenTool,
  GitCompareArrows,
} from "lucide-react";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/upload", label: "Upload", icon: FileUp },
  { href: "/dashboard/history", label: "History", icon: BookCopy },
  { href: "/dashboard/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/dashboard/mind-map", label: "Mind Map", icon: Share2 },
  { href: "/dashboard/analysis", label: "Analysis", icon: PenTool },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
            <BrainCircuit className="w-8 h-8 text-sidebar-accent-foreground" />
            <span className="text-xl font-semibold text-sidebar-foreground">SummarAIze</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={item.label}
                asChild
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" isActive={pathname === "/dashboard/settings"} asChild>
                    <Link href="/dashboard/settings">
                        <Settings />
                        <span>Settings</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
