"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  X,
  CreditCard,
  Loader2,
  Sparkles,
} from "lucide-react";
import siteData from "@/data/siteData";
import { WhatsAppIcon } from "./SocialIcons";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import api from "@/lib/api";

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
  const router = useRouter();
  const { menu, contact } = siteData;
  const subs = menu.subscriptions;
  const whatsappNumber = contact.whatsappNumber || contact.phoneRaw.replace(/\D/g, "");

  const { isAuthenticated, openAuthModal, refreshProfile } = useCustomerAuth();

  const [dbPlans, setDbPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("MORNING");
  const [selectedFlavor, setSelectedFlavor] = useState("Strawberry");
  const [fulfillmentType, setFulfillmentType] = useState("PICKUP");
  const [deliveryBracket, setDeliveryBracket] = useState("M0_500");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api
      .getSubscriptions()
      .then((plans) => {
        if (isMounted && Array.isArray(plans)) {
          setDbPlans(plans);
        }
      })
      .catch((err) => {
        console.warn("Could not load backend subscriptions, using static data", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!subs) return null;

  const handleOpenSubscribe = (plan) => {
    setSelectedPlan(plan);
    setError(null);
  };

  const handleCompleteSubscription = async () => {
    if (!selectedPlan) return;
    setError(null);

    if (fulfillmentType === "DELIVERY" && !deliveryAddress.trim()) {
      setError("Please enter your delivery address");
      return;
    }

    if (!isAuthenticated) {
      openAuthModal(() => {
        // Callback will resume
      });
      return;
    }

    // Match with dbPlan ID
    let matchedDbPlan = dbPlans.find((p) => {
      const pName = p.name.toLowerCase();
      const sName = selectedPlan.name.toLowerCase();
      return pName.includes(sName.split(" ")[0]);
    });

    if (!matchedDbPlan && dbPlans.length > 0) {
      matchedDbPlan = dbPlans[0];
    }

    const planId = matchedDbPlan ? matchedDbPlan.id : selectedPlan.id;

    setIsSubmitting(true);
    try {
      const subPayload = {
        planId,
        flavor: selectedFlavor,
        collectionSlot: selectedSlot,
        fulfillmentType,
        deliveryBracket: fulfillmentType === "DELIVERY" ? deliveryBracket : "NONE",
        deliveryAddress: fulfillmentType === "DELIVERY" ? deliveryAddress : null,
        startDate: new Date().toISOString().slice(0, 10),
      };

      const result = await api.createSubscriptionOrder(subPayload);

      // Verify payment (auto-simulated for test/dev)
      if (result.razorpayDetails) {
        await api.verifySubscriptionPayment({
          subscriptionId: result.subscription.id,
          razorpayPaymentId: `pay_sub_test_${Date.now()}`,
          razorpayOrderId: result.razorpayDetails.orderId,
          razorpaySignature: "sub_test_sig",
        });
      }

      await refreshProfile();
      setSelectedPlan(null);
      router.push("/account");
    } catch (err) {
      setError(err.message || "Failed to create subscription order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

                  <div className="menupage-sub-actions">
                    <button
                      type="button"
                      className="btn menupage-sub-btn-join"
                      onClick={() => handleOpenSubscribe(plan)}
                    >
                      <Sparkles size={14} />
                      <span>Join Plan</span>
                    </button>
                    <a
                      href={buildSubscriptionWhatsAppUrl(whatsappNumber, plan.name, `${plan.price}${plan.period}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn menupage-sub-btn-wa"
                      title="Enquire on WhatsApp"
                      aria-label="Enquire on WhatsApp"
                    >
                      <WhatsAppIcon size={15} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", minWidth: "220px" }}>
                    <button
                      type="button"
                      className="btn menupage-sub-btn-join"
                      onClick={() => handleOpenSubscribe(combo)}
                    >
                      <Sparkles size={14} />
                      <span>Join Plan</span>
                    </button>
                    <a
                      href={buildSubscriptionWhatsAppUrl(
                        whatsappNumber,
                        `${combo.tier} (${combo.name})`,
                        `${combo.price}${combo.period}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn menupage-sub-btn-wa"
                      title="Enquire on WhatsApp"
                      aria-label="Enquire on WhatsApp"
                    >
                      <WhatsAppIcon size={15} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
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

            <ul className="menupage-delivery-tiers">
              {subs.delivery.tiers.map((tier) => (
                <li key={tier.range} className="menupage-delivery-tier">
                  <span className="menupage-tier-range">
                    <MapPin size={14} aria-hidden="true" />
                    <span>{tier.range}</span>
                  </span>
                  <span className="menupage-tier-fee">{tier.fee}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="menupage-subs-info-card">
            <div className="menupage-subs-info-head">
              <div className="menupage-subs-info-icon" aria-hidden="true">
                <Leaf size={22} />
              </div>
              <div>
                <h3>Membership Benefits</h3>
                <p>Designed for daily fitness nutrition</p>
              </div>
            </div>

            <ul className="menupage-benefits-list">
              {subs.benefits.map((b) => (
                <li key={b} className="menupage-benefit-item">
                  <CheckCircle2 size={16} className="menupage-check-icon" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Rules Card */}
        <div className="menupage-subs-rules">
          <h3 className="menupage-rules-title">Subscription Rules & How It Works</h3>
          <div className="menupage-rules-grid">
            {subs.rules.map((rule) => {
              const IconComp = ruleIconMap[rule.icon] || Calendar;
              return (
                <div key={rule.text} className="menupage-rule-item">
                  <div className="menupage-rule-icon" aria-hidden="true">
                    <IconComp size={18} />
                  </div>
                  <span>{rule.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subscription Join Modal */}
      {selectedPlan && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPlan(null);
          }}
        >
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setSelectedPlan(null)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "#F1F5F9",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#475569",
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#0F172A", marginBottom: "4px" }}>
              Join 30-Day Plan
            </h3>
            <p style={{ fontSize: "14px", color: "#1E6B34", fontWeight: "600", marginBottom: "16px" }}>
              {selectedPlan.name} • {selectedPlan.price}
            </p>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "#FEE2E2",
                  color: "#991B1B",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Daily Collection Slot */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                  Daily Collection Slot
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot("MORNING")}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: selectedSlot === "MORNING" ? "2px solid #1E6B34" : "1px solid #CBD5E1",
                      background: selectedSlot === "MORNING" ? "#DCF4E2" : "#FFFFFF",
                      color: selectedSlot === "MORNING" ? "#082D12" : "#475569",
                      fontWeight: "600",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Clock size={14} /> Morning (6 - 11:30 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot("EVENING")}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: selectedSlot === "EVENING" ? "2px solid #1E6B34" : "1px solid #CBD5E1",
                      background: selectedSlot === "EVENING" ? "#DCF4E2" : "#FFFFFF",
                      color: selectedSlot === "EVENING" ? "#082D12" : "#475569",
                      fontWeight: "600",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Clock size={14} /> Evening (4:30 - 9:30 PM)
                  </button>
                </div>
              </div>

              {/* Flavor if oats */}
              {selectedPlan.name.toLowerCase().includes("oats") && (
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                    Preferred Flavor
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    {["Strawberry", "Chocolate"].map((flavor) => (
                      <button
                        key={flavor}
                        type="button"
                        onClick={() => setSelectedFlavor(flavor)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "8px",
                          border: selectedFlavor === flavor ? "2px solid #1E6B34" : "1px solid #CBD5E1",
                          background: selectedFlavor === flavor ? "#DCF4E2" : "#FFFFFF",
                          color: selectedFlavor === flavor ? "#082D12" : "#475569",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fulfillment Mode */}
              <div>
                <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                  Collection Mode
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("PICKUP")}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: fulfillmentType === "PICKUP" ? "2px solid #1E6B34" : "1px solid #CBD5E1",
                      background: fulfillmentType === "PICKUP" ? "#DCF4E2" : "#FFFFFF",
                      color: fulfillmentType === "PICKUP" ? "#082D12" : "#475569",
                      fontWeight: "600",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <MapPin size={14} /> Stall Pickup (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("DELIVERY")}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: fulfillmentType === "DELIVERY" ? "2px solid #1E6B34" : "1px solid #CBD5E1",
                      background: fulfillmentType === "DELIVERY" ? "#DCF4E2" : "#FFFFFF",
                      color: fulfillmentType === "DELIVERY" ? "#082D12" : "#475569",
                      fontWeight: "600",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Truck size={14} /> Daily Delivery (&lt;2km)
                  </button>
                </div>

                {fulfillmentType === "DELIVERY" && (
                  <div style={{ marginTop: "10px", background: "#F8FAFC", padding: "12px", borderRadius: "10px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter flat / house address in Mangalore"
                      style={{
                        width: "100%",
                        marginTop: "4px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #CBD5E1",
                        fontSize: "12px",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Guarantee Reassurance */}
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#166534",
                  lineHeight: "1.4",
                }}
              >
                <strong>Unlimited Freezes Included:</strong> Skip any day anytime from your account calendar without
                losing a serving! Exactly 30 servings guaranteed.
              </div>

              {/* Subscribe button */}
              <button
                type="button"
                onClick={handleCompleteSubscription}
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#1E6B34",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  fontWeight: "700",
                  border: "none",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" /> Activating Plan...
                  </>
                ) : !isAuthenticated ? (
                  "Sign In & Activate Plan"
                ) : (
                  `Pay & Start 30-Day Plan • ${selectedPlan.price}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
