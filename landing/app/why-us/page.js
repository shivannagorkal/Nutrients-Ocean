import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  IndianRupee,
  Leaf,
  MapPin,
  Phone,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StickyCallBar from "@/components/StickyCallBar";
import siteData from "@/data/siteData";
import "./why-us.css";

export const metadata = {
  title: `Why Us | ${siteData.brand.name}`,
  description:
    "Discover why gym-goers in Mangalore choose Nutrients Ocean: fresh whole-food ingredients, ₹49–₹99 transparent pricing, zero-wait pre-orders opposite Cobra Fitness Club.",
};

const iconMap = {
  Leaf,
  Dumbbell,
  IndianRupee,
  Phone,
  MapPin,
  ShieldCheck,
  Clock,
  Zap,
  CheckCircle2,
};

export default function WhyUsPage() {
  const { why, contact, location } = siteData;

  return (
    <>
      <Navbar forceScrolled />
      <main className="whypage-main">
        {/* Clean Material Tonal Hero */}
        <section className="whypage-hero">
          <div className="container">
            <nav className="whypage-breadcrumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <ChevronRight size={14} aria-hidden="true" />
              <span className="current">Why Us</span>
            </nav>

            <div className="whypage-hero-content">
              <span className="eyebrow">Why Choose Us</span>
              <h1 className="whypage-hero-title">{why.pageTitle || why.title}</h1>
              <p className="whypage-hero-sub">{why.pageSubtitle || why.subtitle}</p>

              {why.trustPills && why.trustPills.length > 0 && (
                <div className="whypage-trust-pills">
                  {why.trustPills.map((pill) => (
                    <span key={pill} className="whypage-trust-pill">
                      <CheckCircle2 size={15} aria-hidden="true" />
                      <span>{pill}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Core Value Pillars */}
        <section className="whypage-section">
          <div className="container">
            <div className="whypage-sec-head">
              <span className="eyebrow">Built For Everyday Training</span>
              <h2>{why.title}</h2>
              <p>{why.subtitle}</p>
            </div>

            <div className="whypage-pillars-grid">
              {why.points.map((point) => {
                const Icon = iconMap[point.icon] || Leaf;
                return (
                  <article key={point.title} className="whypage-pillar-card">
                    <div className="whypage-pillar-icon" aria-hidden="true">
                      <Icon size={24} />
                    </div>
                    <h3>{point.title}</h3>
                    <p>{point.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Comparison Table: Stall vs Delivery vs Packaged */}
        {why.comparison && (
          <section className="whypage-section whypage-section-tonal">
            <div className="container">
              <div className="whypage-sec-head">
                <span className="eyebrow">Side-by-Side Comparison</span>
                <h2>{why.comparison.title}</h2>
                <p>{why.comparison.subtitle}</p>
              </div>

              {/* Desktop Table */}
              <div className="whypage-compare-desktop">
                <table className="whypage-compare-table">
                  <thead>
                    <tr>
                      <th scope="col">What Matters</th>
                      <th scope="col" className="col-us">
                        {siteData.brand.name} Stall
                      </th>
                      <th scope="col">Delivery Apps</th>
                      <th scope="col">Packaged Bars / Snacks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {why.comparison.rows.map((row) => (
                      <tr key={row.aspect}>
                        <td className="whypage-compare-aspect">{row.aspect}</td>
                        <td className="col-us">
                          <span className="whypage-us-cell">
                            <CheckCircle2 size={16} aria-hidden="true" />
                            <span>{row.us}</span>
                          </span>
                        </td>
                        <td>{row.delivery}</td>
                        <td>{row.packaged}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Comparison Cards */}
              <div className="whypage-compare-mobile">
                {why.comparison.rows.map((row) => (
                  <article key={row.aspect} className="whypage-compare-card">
                    <h3>{row.aspect}</h3>
                    <div className="whypage-compare-list">
                      <div className="whypage-compare-row is-us">
                        <strong>{siteData.brand.name} Stall</strong>
                        <span>{row.us}</span>
                      </div>
                      <div className="whypage-compare-row">
                        <strong>Delivery Apps</strong>
                        <span>{row.delivery}</span>
                      </div>
                      <div className="whypage-compare-row">
                        <strong>Packaged Snacks</strong>
                        <span>{row.packaged}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Workout Timing Fuel Guide */}
        {why.timingGuide && (
          <section className="whypage-section">
            <div className="container">
              <div className="whypage-sec-head">
                <span className="eyebrow">Training Fuel Guide</span>
                <h2>{why.timingGuide.title}</h2>
                <p>{why.timingGuide.subtitle}</p>
              </div>

              <div className="whypage-timing-grid">
                {why.timingGuide.slots.map((slot) => (
                  <article key={slot.timing} className="whypage-timing-card">
                    <span className="whypage-timing-tag">{slot.badge}</span>
                    <h3>{slot.timing}</h3>
                    <p className="whypage-timing-pick">{slot.items}</p>
                    <p className="whypage-timing-desc">{slot.text}</p>
                    <Link href="/menu" className="whypage-timing-link">
                      <span>View on Menu</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>

              <p className="whypage-disclaimer-note">
                Looking for ingredient or allergen guidance? Read our{" "}
                <Link href="/disclaimer">Health &amp; Nutritional Disclaimer</Link>.
              </p>
            </div>
          </section>
        )}

        {/* Quality Standards & Ecosystem Links */}
        {why.standards && (
          <section className="whypage-section whypage-section-tonal">
            <div className="container">
              <div className="whypage-sec-head">
                <span className="eyebrow">Quality &amp; Trust</span>
                <h2>{why.standards.title}</h2>
                <p>{why.standards.subtitle}</p>
              </div>

              <div className="whypage-standards-grid">
                {why.standards.items.map((item) => {
                  const Icon = iconMap[item.icon] || CheckCircle2;
                  return (
                    <article key={item.title} className="whypage-standard-card">
                      <div className="whypage-standard-icon" aria-hidden="true">
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="whypage-sublinks">
                <Link href="/app" className="btn btn-outline btn-sm">
                  Explore FitMitra App
                </Link>
                <Link href="/refund" className="btn btn-outline btn-sm">
                  Refund &amp; Pickup Guarantee
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Bottom Action Card */}
        <section className="whypage-section">
          <div className="container">
            <div className="whypage-cta-card">
              <div className="whypage-cta-copy">
                <span className="eyebrow">Ready When You Are</span>
                <h2>Grab fresh protein right after your session</h2>
                <p>
                  Visit us at {location.addressLine} or call ahead so your bowl or sandwich is ready in minutes.
                </p>
              </div>

              <div className="whypage-cta-actions">
                <Link href="/menu" className="btn btn-primary">
                  <span>View Fresh Menu</span>
                  <ArrowRight size={18} />
                </Link>
                <a href={`tel:${contact.phoneRaw}`} className="btn btn-accent">
                  <Phone size={18} />
                  <span>Call {contact.phoneDisplay}</span>
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

