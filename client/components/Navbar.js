"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, X, Phone, ShoppingBag, QrCode, User } from "lucide-react";
import siteData from "@/data/siteData";
import { WhatsAppIcon } from "./SocialIcons";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/pass", label: "Daily Pass", badge: "Live QR" },
  { href: "/account", label: "My Account" },
  { href: "/why-us", label: "Why Us" },
  { href: "/#how", label: "How It Works" },
  { href: "/#supplements", label: "Supplements" },
  { href: "/#contact", label: "Contact" },
  { href: "/refund", label: "Refund Policy" },
];

export default function Navbar({ forceScrolled = false }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(forceScrolled);
  const pathname = usePathname();
  const tel = `tel:${siteData.contact.phoneRaw}`;

  const { itemCount, openCart } = useCart();
  const { isAuthenticated, openAuthModal, customer } = useCustomerAuth();

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
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={siteData.brand.logo} width="40" height="40" alt={`${siteData.brand.name} logo`} />
          <span>{siteData.brand.name}</span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          {links.map((l) => {
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
              padding: "8px 14px",
            }}
            aria-label="View Cart"
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {itemCount > 0 && (
              <span
                style={{
                  background: "#1E6B34",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: "700",
                  borderRadius: "999px",
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
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => openAuthModal()}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px" }}
            >
              <User size={16} />
              <span>Sign In</span>
            </button>
          ) : (
            <Link
              href="/account"
              className="btn btn-outline"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                textDecoration: "none",
              }}
            >
              <User size={16} />
              <span>{customer?.fullName || customer?.phone?.slice(-4) ? `Account (${customer?.phone?.slice(-4)})` : "Account"}</span>
            </Link>
          )}

          <a className="btn btn-accent nav-call" href={tel} aria-label="Call to pre-order">
            <Phone size={18} />
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
        {links.map((l) => {
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
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setOpen(false);
                openAuthModal();
              }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <User size={18} />
              Customer Sign In
            </button>
          ) : (
            <Link
              href="/account"
              className="btn btn-outline"
              onClick={() => setOpen(false)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <User size={18} />
              My Account
            </Link>
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
