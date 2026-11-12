import {
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Leaf,
  MapPin,
  PauseCircle,
  Plus,
  RefreshCw,
  Truck,
  Utensils,
} from "lucide-react";
import siteData from "@/data/siteData";
import { WhatsAppIcon } from "./SocialIcons";

const ruleIconMap = {
  Calendar,
  Utensils,
  Clock,
  PauseCircle,
  RefreshCw,
};

function buildSubscriptionWhatsAppUrl(whatsappNumber, planName, priceLabel) {
  const message = `Hi ${siteData.brand.name}, I would like to subscribe to the ${planName} (${priceLabel}) monthly plan.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export default function MenuSubscriptions() {
  const { menu, contact } = siteData;
  const subs = menu.subscriptions;
  if (!subs) return null;

  const whatsappNumber = contact.whatsappNumber || contact.phoneRaw.replace(/\D/g, "");

  return (
    <section id="subscriptions" className="menupage-subs-section" aria-labelledby="subs-heading">
      <div className="container">
        {/* Section Header */}
        <div className="menupage-subs-head">
          <span className="eyebrow">
            <Calendar size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {subs.badge}
          </span>
          <h2 id="subs-heading">{subs.title}</h2>
          <p>{subs.subtitle}</p>
        </div>

        {/* Individual Plans */}
        <div className="menupage-subs-block">
          <div className="menupage-subs-block-head">
            <span className="menupage-subs-block-pill">
              <Leaf size={15} aria-hidden="true" />
              <span>Individual Plans</span>
            </span>
            <p>{subs.individualSubtitle}</p>
          </div>

          <div className="menupage-subs-ind-grid">
            {subs.individualPlans.map((plan) => (
              <article key={plan.id} className="menupage-sub-card">
                <div className="menupage-sub-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={plan.image} alt={`${plan.name} monthly plan`} loading="lazy" />
                  <span className="menupage-sub-save">{plan.savings}</span>
                </div>

                <div className="menupage-sub-body">
                  <h3>{plan.name}</h3>
                  <div className="menupage-sub-price-row">
                    <span className="menupage-sub-price">
                      {plan.price} <small>{plan.period}</small>
                    </span>
                    {plan.originalPrice && (
                      <span className="menupage-sub-old-price">{plan.originalPrice}</span>
                    )}
                  </div>

                  <a
                    href={buildSubscriptionWhatsAppUrl(whatsappNumber, plan.name, `${plan.price}${plan.period}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-tonal btn-sm menupage-sub-btn"
                  >
                    <WhatsAppIcon size={16} />
                    <span>Join Monthly Plan</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Combo Subscription Plans */}
        <div className="menupage-subs-block">
          <div className="menupage-subs-block-head">
            <span className="menupage-subs-block-pill">
              <Layers size={15} aria-hidden="true" />
              <span>Combo Subscription Plans</span>
            </span>
            <p>{subs.comboSubtitle}</p>
          </div>

          <div className="menupage-subs-combo-grid">
            {subs.comboPlans.map((combo) => (
              <article key={combo.id} className="menupage-combo-card">
                <div className="menupage-combo-top">
                  <span
                    className={`menupage-combo-tier ${
                      combo.tier.toLowerCase().includes("premium") ? "is-premium" : "is-value"
                    }`}
                  >
                    {combo.tier}
                  </span>
                  <span className="menupage-sub-save">{combo.savings}</span>
                </div>

                <div className="menupage-combo-visuals">
                  <div className="menupage-combo-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={combo.images[0]} alt="" loading="lazy" />
                  </div>
                  <span className="menupage-combo-plus" aria-hidden="true">
                    <Plus size={16} />
                  </span>
                  <div className="menupage-combo-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={combo.images[1]} alt="" loading="lazy" />
                  </div>
                </div>

                <h3>{combo.name}</h3>

                <div className="menupage-combo-foot">
                  <span className="menupage-sub-price">
                    {combo.price} <small>{combo.period}</small>
                  </span>
                  <a
                    href={buildSubscriptionWhatsAppUrl(
                      whatsappNumber,
                      `${combo.tier} (${combo.name})`,
                      `${combo.price}${combo.period}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    <WhatsAppIcon size={16} />
                    <span>Subscribe</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Home Delivery & Membership Benefits */}
        <div className="menupage-subs-info-grid">
          <article className="menupage-subs-info-card">
            <div className="menupage-subs-info-head">
              <div className="menupage-subs-info-icon" aria-hidden="true">
                <Truck size={22} />
              </div>
              <div>
                <h3>{subs.delivery.title}</h3>
                <p>{subs.delivery.subtitle}</p>
              </div>
            </div>

            <ul className="menupage-delivery-list">
              {subs.delivery.tiers.map((tier) => (
                <li key={tier.range}>
                  <span className="menupage-delivery-range">
                    <MapPin size={15} aria-hidden="true" />
                    <span>{tier.range}</span>
                  </span>
                  <strong className="menupage-delivery-fee">{tier.fee}</strong>
                </li>
              ))}
            </ul>
          </article>

          <article className="menupage-subs-info-card">
            <div className="menupage-subs-info-head">
              <div className="menupage-subs-info-icon" aria-hidden="true">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3>Membership Benefits</h3>
                <p>Daily nutrition made effortless</p>
              </div>
            </div>

            <ul className="menupage-benefits-list">
              {subs.benefits.map((benefit) => (
                <li key={benefit}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Subscription Rules Strip */}
        <div className="menupage-rules-strip" aria-label="Subscription rules">
          <span className="menupage-rules-title">Subscription Rules</span>
          <div className="menupage-rules-grid">
            {subs.rules.map((rule) => {
              const Icon = ruleIconMap[rule.icon] || Calendar;
              return (
                <div key={rule.text} className="menupage-rule-item">
                  <Icon size={17} aria-hidden="true" />
                  <span>{rule.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

