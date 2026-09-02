"use client";

import Image from "next/image";
import { ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuDropdownProps {
  name: string;
  email: string;
  initials: string;
  photo: { url: string; alt: string | null } | null;
}

/**
 * The topbar's account control. Trigger mirrors the identity block the
 * old static <UserMenu> used to render directly, now on a dark
 * (bg-primary) topbar instead of a light one — see the hover/text color
 * comments below for what that flips.
 *
 * Client component because DropdownMenu needs interactivity; the identity
 * itself is fetched server-side in <UserMenu> and handed down as plain,
 * serializable props.
 */
export function UserMenuDropdown({ name, email, initials, photo }: UserMenuDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* group: the ChevronDown below needs to react to *this* element's
            data-state, which Radix sets on the trigger via asChild — a
            bare data-[state=open]: on the icon itself would never match,
            since that attribute lives here, not on the icon. */}
        <button
          type="button"
          className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-card/10"
        >
          <div className="hidden text-right sm:block">
            {/* text-card/70, not text-muted-foreground: that token is a
                muted green tuned for light surfaces and is nearly
                unreadable on this bg-primary bar. */}
            <p className="text-sm font-medium leading-none text-card">{name}</p>
            <p className="mt-1.5 text-xs text-card/70">{email}</p>
          </div>
          {photo ? (
            <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-card/10">
              <Image src={photo.url} alt={photo.alt ?? name} fill className="object-cover" sizes="36px" />
            </div>
          ) : (
            <Avatar className="size-9">
              {/* Flipped from the old bg-primary/text-card (a dark circle
                  popping against a light bar) to a light circle popping
                  against this dark one. Not bg-accent: accent is already
                  spent once on <PageTitle>'s "current location" signal —
                  doubling it here would dilute that into decoration. */}
              <AvatarFallback className="bg-card text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
          <ChevronDown className="size-4 shrink-0 text-card/70 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* asChild + a <form action={logout}>: the same server-action
            pattern the sidebar's old LogoutButton used, just re-homed —
            logout now lives only here, not duplicated in the rail. */}
        <DropdownMenuItem asChild>
          <form action={logout} className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="size-4" />
              Keluar
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
