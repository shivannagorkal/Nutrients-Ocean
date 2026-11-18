"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, X, Phone, ShoppingBag, QrCode, User, LogOut } from "lucide-react";
import siteData from "@/data/siteData";
import { WhatsAppIcon } from "./SocialIcons";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const desktopLinks = [
  { href: "/menu", label: "Menu & Plans" },
  { href: "/pass", label: "Daily Pass", badge: "Live QR" },
  { href: "/why-us", label: "Why Us" },
  { href: "/#contact", label: "Location" },
];

const mobileLinks = [
  { href: "/menu", label: "Menu & Plans" },
  { href: "/pass", label: "Daily Pass", badge: "Live QR" },
  { href: "/why-us", label: "Why Us" },
  { href: "/#how", label: "How It Works" },
  { href: "/#contact", label: "Stall Location" },
  { href: "/account", label: "My Account" },
  { href: "/refund", label: "Refund Policy" },
];

export default function Navbar({ forceScrolled = false }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(forceScrolled);
  const pathname = usePathname();
  const tel = `tel:${siteData.contact.phoneRaw}`;

  const { itemCount, openCart } = useCart();
  const { isAuthenticated, openAuthModal, customer, logout } = useCustomerAuth();

  useEffect(() => {
    if (forceScrolled) {
      return undefined;
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [forceScrolled]);

  const isScrolled = forceScrolled || scrolled;

  return (
    <header className={`navbar ${isScrolled ? "is-scrolled" : ""}`}>
      <div className="container navbar-inner">
        <Link href={isAuthenticated ? "/menu" : "/"} className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={siteData.brand.logo} width="40" height="40" alt={`${siteData.brand.name} logo`} />
          <span>{siteData.brand.name}</span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          {desktopLinks.map((l) => {
            const isActive = !l.href.includes("#") && pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-item-link ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{l.label}</span>
                {l.badge && <span className="nav-badge">{l.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="nav-actions">
          {/* Cart Button */}
          <button
            type="button"
            className="btn btn-tonal"
            onClick={openCart}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 14px",
              height: "40px",
              minHeight: "40px",
            }}
            aria-label="View Cart"
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {itemCount > 0 && (
              <span
                style={{
                  background: "var(--primary)",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: "700",
                  borderRadius: "9999px",
                  padding: "1px 7px",
                  marginLeft: "2px",
                }}
              >
                {itemCount}
              </span>
            )}
          </button>

          {/* User Sign In / Profile Quick Button */}
          {!isAuthenticated ? (
            <Link
              href="/login"
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 14px",
                height: "40px",
                minHeight: "40px",
                textDecoration: "none",
              }}
            >
              <User size={16} />
              <span>Sign In</span>
            </Link>
          ) : (
            <>
              <Link
                href="/account"
                className="btn btn-outline"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0 14px",
                  height: "40px",
                  minHeight: "40px",
                  textDecoration: "none",
                }}
              >
                <User size={16} />
                <span>
                  {customer?.fullName || (customer?.phone ? `Account (${customer.phone.slice(-4)})` : "Account")}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="btn btn-tonal"
                title="Sign Out"
                aria-label="Logout"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0 12px",
                  height: "40px",
                  minHeight: "40px",
                  color: "#B91C1C",
                  cursor: "pointer",
                }}
              >
                <LogOut size={16} />
                <span style={{ fontSize: "13px", fontWeight: "600" }}>Logout</span>
              </button>
            </>
          )}

          <a
            className="btn btn-primary nav-call"
            href={tel}
            aria-label="Call to pre-order"
            style={{
              height: "40px",
              minHeight: "40px",
              padding: "0 16px",
            }}
          >
            <Phone size={16} />
            <span>Call Now</span>
          </a>

          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      <div className={`mobile-panel ${open ? "open" : ""}`}>
        {mobileLinks.map((l) => {
          const isActive = !l.href.includes("#") && pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`mobile-nav-link ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              <span>{l.label}</span>
              {l.badge && <span className="nav-badge">{l.badge}</span>}
            </Link>
          );
        })}
        <div className="mobile-panel-actions">
          <button
            type="button"
            className="btn btn-tonal"
            onClick={() => {
              setOpen(false);
              openCart();
            }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <ShoppingBag size={18} />
            View Cart ({itemCount})
          </button>

          {!isAuthenticated ? (
            <>
              <Link
                href="/login"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  textDecoration: "none",
                }}
              >
                <User size={18} />
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn btn-tonal"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  textDecoration: "none",
                }}
              >
                Create Account
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/account"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  textDecoration: "none",
                }}
              >
                <User size={18} />
                <span>My Account ({customer?.fullName || customer?.phone?.slice(-4)})</span>
              </Link>
              <button
                type="button"
                className="btn btn-tonal"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "#B91C1C",
                  cursor: "pointer",
                }}
              >
                <LogOut size={18} />
                Logout
              </button>
            </>
          )}

          <a className="btn btn-accent" href={tel} onClick={() => setOpen(false)}>
            <Phone size={18} />
            Call to Pre-order
          </a>
        </div>
      </div>
    </header>
  );
}
