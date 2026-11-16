import Link from "next/link";
import { Calendar, CheckCircle2, ChevronRight, Clock, Leaf, MapPin, Phone, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StickyCallBar from "@/components/StickyCallBar";
import MenuExplorer from "@/components/MenuExplorer";
import MenuSubscriptions from "@/components/MenuSubscriptions";
import siteData from "@/data/siteData";
import "./menu.css";

export const metadata = {
  title: `Fresh Menu & Monthly Plans | ${siteData.brand.name}`,
  description:
    "Browse Normal Sandwich, Dry Fruit Sandwich, High Protein Oats, Nightout Oats, and 30-day Monthly Subscription Plans opposite Cobra Fitness Club, Mangalore.",
};

export default function MenuPage() {
  const { brand, menu, location, contact } = siteData;
  const timingsText = location.timings.map((t) => `${t.label}: ${t.time}`).join(" • ");

  return (
    <>
      <Navbar forceScrolled />
      <main className="menupage-main">
        {/* Clean Material Tonal Header */}
        <section className="menupage-hero">
          <div className="container">
            <nav className="menupage-breadcrumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <ChevronRight size={14} aria-hidden="true" />
              <span className="current">Menu</span>
            </nav>

            <div className="menupage-hero-content">
              <span className="eyebrow">Fresh Stall Menu</span>
              <h1 className="menupage-hero-title">{menu.pageTitle || menu.title}</h1>
              <p className="menupage-hero-sub">{menu.pageSubtitle || menu.subtitle}</p>

              <div className="menupage-meta-chips">
                <span className="menupage-meta-chip">
                  <MapPin size={15} aria-hidden="true" />
                  <span>Opposite {location.gymName}, Mangalore</span>
                </span>
                <span className="menupage-meta-chip">
                  <Clock size={15} aria-hidden="true" />
                  <span>{timingsText}</span>
                </span>
                <span className="menupage-meta-chip">
                  <Leaf size={15} aria-hidden="true" />
                  <span>{menu.prepNote || "Made fresh on the spot"}</span>
                </span>
                {brand.fssai && (
                  <span className="menupage-meta-chip menupage-fssai-chip">
                    <ShieldCheck size={15} aria-hidden="true" />
                    <span>FSSAI Reg: {brand.fssai}</span>
                  </span>
                )}
                {menu.subscriptions && (
                  <a href="#subscriptions" className="menupage-meta-chip menupage-subs-jump">
                    <Calendar size={15} aria-hidden="true" />
                    <span>Monthly Subscriptions Available</span>
                  </a>
                )}
              </div>

              {menu.highlights && menu.highlights.length > 0 && (
                <div className="menupage-highlights-row" aria-label="Menu highlights">
                  {menu.highlights.map((highlight) => (
                    <span key={highlight} className="menupage-highlight-pill">
                      <CheckCircle2 size={15} aria-hidden="true" />
                      <span>{highlight}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Interactive Material Menu Explorer */}
        <section className="menupage-catalog" aria-label="Menu items">
          <div className="container">
            <MenuExplorer />
          </div>
        </section>

        {/* 30-Day Monthly Subscription Plans */}
        <MenuSubscriptions />

        {/* Pickup & Pre-order Info Strip */}
        <section className="menupage-pickup-section">
          <div className="container">
            <div className="menupage-pickup-card">
              <div className="menupage-pickup-copy">
                <span className="eyebrow">Quick Stall Pickup</span>
                <h2>Skip the wait after your workout</h2>
                <p>
                  {menu.note} Find us at {location.addressLine}.
                </p>
                <Link href="/disclaimer" className="menupage-disclaimer-link">
                  View Health &amp; Nutritional Disclaimer →
                </Link>
              </div>

              <div className="menupage-pickup-actions">
                <a href={`tel:${contact.phoneRaw}`} className="btn btn-accent">
                  <Phone size={18} />
                  <span>Call {contact.phoneDisplay}</span>
                </a>
                <a
                  href={location.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  <MapPin size={18} />
                  <span>Directions</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <StickyCallBar />
    </>
  );
}

