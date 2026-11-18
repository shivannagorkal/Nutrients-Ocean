import Link from "next/link";
import { Phone, ArrowRight, MapPin, Sparkles, ShieldCheck } from "lucide-react";
import siteData from "@/data/siteData";
import HeroScene from "./HeroScene";

export default function Hero() {
  const { hero, location, contact, brand } = siteData;
  return (
    <section id="top" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <MapPin size={14} />
            <span>Now open opposite {location.gymName}, Mangalore</span>
          </div>

          <h1 className="hero-title">
            {hero.headlineStart} <span className="gradient-text">{hero.headlineHighlight}</span>
          </h1>

          <p className="hero-sub">{hero.subtext}</p>

          <div className="hero-actions">
            <Link className="btn btn-primary" href="/menu">
              <span>View Menu &amp; Plans</span>
              <ArrowRight size={18} />
            </Link>
            <a className="btn btn-tonal" href={`tel:${contact.phoneRaw}`}>
              <Phone size={18} />
              <span>Call to Pre-order</span>
            </a>
          </div>

          <ul className="hero-badges">
            <li>Made Fresh on the Spot</li>
            <li>High Protein Focus</li>
            <li>Quick Gym Pickup</li>
            {brand.fssai && (
              <li style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <ShieldCheck size={14} color="var(--primary)" />
                FSSAI Reg: {brand.fssai}
              </li>
            )}
          </ul>
        </div>
        <HeroScene />
      </div>
    </section>
  );
}
