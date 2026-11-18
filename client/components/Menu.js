import Link from "next/link";
import { Phone, ArrowRight, Check } from "lucide-react";
import siteData from "@/data/siteData";
import Reveal from "./Reveal";

export default function Menu() {
  const { menu, contact } = siteData;
  const tel = `tel:${contact.phoneRaw}`;
  return (
    <section id="menu" className="section section-tonal">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Fresh Stall Menu</p>
          <h2 className="section-title">{menu.title}</h2>
          <p className="section-sub">{menu.subtitle}</p>
        </Reveal>

        <div className="menu-grid">
          {menu.items.map((item, i) => (
            <Reveal key={item.id} delay={i * 60}>
              <article className="menu-card">
                <div className="menu-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={`${item.name} from Nutrients Ocean`} loading="lazy" />
                  <span className="menu-tag">{item.tag}</span>
                  <span className="menu-price">{item.price}</span>
                </div>
                <div className="menu-body">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    {item.isVeg && (
                      <span
                        title="Pure Vegetarian"
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "1.5px solid #2E7D32",
                          borderRadius: "3px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "1px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#2E7D32",
                            display: "block",
                          }}
                        />
                      </span>
                    )}
                    <h3 style={{ margin: 0, fontSize: "19px" }}>{item.name}</h3>
                  </div>

                  <p style={{ fontSize: "14px", lineHeight: "1.5" }}>{item.description}</p>

                  <div className="menu-foot" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" }}>
                    <Link
                      href="/menu"
                      className="btn btn-primary btn-sm"
                      style={{ minHeight: "38px", height: "38px", padding: "0 10px", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      Order / Cart
                    </Link>
                    <a
                      className="btn btn-tonal btn-sm"
                      href={tel}
                      style={{ minHeight: "38px", height: "38px", padding: "0 10px", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                      aria-label={`Call to pre-order ${item.name}`}
                    >
                      <Phone size={14} />
                      <span>Pre-order</span>
                    </a>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="menu-note">{menu.note}</p>

        <Reveal delay={120} className="menu-cta-wrap">
          <Link href="/menu" className="btn btn-primary menu-explore-btn">
            <span>Explore Full Menu &amp; Customize</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/menu#subscriptions" className="btn btn-tonal">
            <span>Monthly Subscription Plans (From ₹1,199)</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
