"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clock, Info, Phone, Search, Utensils, X } from "lucide-react";
import siteData from "@/data/siteData";
import { WhatsAppIcon } from "./SocialIcons";

/**
 * Build a pre-filled WhatsApp order URL using the stall's WhatsApp number.
 */
function buildWhatsAppOrderUrl(whatsappNumber, item) {
  const message = `Hi ${siteData.brand.name}, I would like to pre-order: ${item.name} (${item.price}).`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Standard vegetarian food indicator dot in an M3-friendly frame.
 */
function VegMark() {
  return (
    <span className="menupage-veg-mark" title="Vegetarian" aria-label="Vegetarian">
      <span className="menupage-veg-dot" />
    </span>
  );
}

/**
 * Interactive Material Design 3 menu explorer with category chips, search, and detail sheet.
 */
export default function MenuExplorer() {
  const { menu, contact } = siteData;
  const items = useMemo(() => menu.items || [], [menu.items]);
  const whatsappNumber = contact.whatsappNumber || contact.phoneRaw.replace(/\D/g, "");
  const telHref = `tel:${contact.phoneRaw}`;

  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const categories = useMemo(() => {
    const counts = items.reduce((acc, item) => {
      if (item.tag) {
        acc[item.tag] = (acc[item.tag] || 0) + 1;
      }
      return acc;
    }, {});

    return [
      { label: "All", count: items.length },
      ...Object.entries(counts).map(([label, count]) => ({ label, count })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = activeCategory === "All" || item.tag === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const searchable = [
        item.name,
        item.tag,
        item.description,
        ...(item.ingredients || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [items, activeCategory, query]);

  useEffect(() => {
    if (!selectedItem) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedItem(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedItem]);

  const hasFilters = activeCategory !== "All" || query.trim().length > 0;

  function resetFilters() {
    setActiveCategory("All");
    setQuery("");
  }

  return (
    <div className="menupage-explorer">
      {/* Material Filter Chips & Search Bar */}
      <div className="menupage-toolbar">
        <div className="menupage-chips" role="group" aria-label="Filter menu by category">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                type="button"
                className={`menupage-chip ${isSelected ? "is-selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => setActiveCategory(cat.label)}
              >
                {isSelected && <Check size={15} className="menupage-chip-check" aria-hidden="true" />}
                <span>{cat.label}</span>
                <span className="menupage-chip-count">{cat.count}</span>
              </button>
            );
          })}
        </div>

        <div className="menupage-search-wrap">
          <Search size={18} className="menupage-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="menupage-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bowls, sandwiches, ingredients..."
            aria-label="Search menu items"
          />
          {query.length > 0 && (
            <button
              type="button"
              className="menupage-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Results Summary Row */}
      <div className="menupage-status-row">
        <p className="menupage-count-text">
          Showing <strong>{filteredItems.length}</strong> of {items.length}{" "}
          {items.length === 1 ? "item" : "items"}
        </p>
        {hasFilters && (
          <button type="button" className="menupage-reset-link" onClick={resetFilters}>
            Reset filters
          </button>
        )}
      </div>

      {/* Menu Cards Grid or Empty State */}
      {filteredItems.length === 0 ? (
        <div className="menupage-empty">
          <div className="menupage-empty-icon" aria-hidden="true">
            <Utensils size={26} />
          </div>
          <h3>No matching menu items</h3>
          <p>Try clearing your search or switching back to all categories.</p>
          <button type="button" className="btn btn-tonal btn-sm" onClick={resetFilters}>
            Show All Items
          </button>
        </div>
      ) : (
        <div className="menupage-grid">
          {filteredItems.map((item) => {
            const hasMacros = Boolean(item.protein || item.calories);
            return (
              <article key={item.id} className="menupage-card">
                <button
                  type="button"
                  className="menupage-card-media"
                  onClick={() => setSelectedItem(item)}
                  aria-label={`View details for ${item.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={`${item.name} from ${siteData.brand.name}`} loading="lazy" />
                </button>

                <div className="menupage-card-body">
                  <div className="menupage-card-meta">
                    {item.isVeg !== false && <VegMark />}
                    <span className="menupage-tag-pill">{item.tag}</span>
                    {item.prepTime && (
                      <span className="menupage-prep-badge">
                        <Clock size={12} aria-hidden="true" />
                        <span>{item.prepTime}</span>
                      </span>
                    )}
                  </div>

                  <div className="menupage-card-head">
                    <h3>{item.name}</h3>
                    <span className="menupage-price-pill">{item.price}</span>
                  </div>

                  <p className="menupage-card-desc">{item.description}</p>

                  {item.flavors && item.flavors.length > 0 && (
                    <div className="menupage-flavors-row">
                      <span className="menupage-flavors-label">Flavors:</span>
                      {item.flavors.map((flavor) => (
                        <span key={flavor} className="menupage-flavor-chip">
                          {flavor}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.ingredients && item.ingredients.length > 0 && (
                    <div className="menupage-card-ingredients">
                      <span className="menupage-card-ingredients-label">Includes</span>
                      <ul className="menupage-card-ingredients-list">
                        {item.ingredients.map((ingredient) => (
                          <li key={ingredient}>{ingredient}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasMacros && (
                    <div className="menupage-macro-row">
                      {item.protein && <span className="menupage-macro-chip">{item.protein} Protein</span>}
                      {item.calories && <span className="menupage-macro-chip">{item.calories}</span>}
                    </div>
                  )}

                  <div className="menupage-card-actions">
                    <a
                      href={buildWhatsAppOrderUrl(whatsappNumber, item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-tonal btn-sm menupage-order-btn"
                    >
                      <WhatsAppIcon size={16} />
                      <span>Pre-order</span>
                    </a>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm menupage-details-btn"
                      onClick={() => setSelectedItem(item)}
                    >
                      <Info size={15} />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Material Detail Dialog */}
      {selectedItem && (
        <div
          className="menupage-dialog-backdrop"
          onClick={() => setSelectedItem(null)}
          role="presentation"
        >
          <div
            className="menupage-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menupage-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="menupage-dialog-close"
              onClick={() => setSelectedItem(null)}
              aria-label="Close item details"
            >
              <X size={20} />
            </button>

            <div className="menupage-dialog-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedItem.image} alt={selectedItem.name} />
            </div>

            <div className="menupage-dialog-content">
              <div className="menupage-card-meta">
                {selectedItem.isVeg !== false && <VegMark />}
                <span className="menupage-tag-pill">{selectedItem.tag}</span>
                {selectedItem.prepTime && (
                  <span className="menupage-prep-badge">
                    <Clock size={12} aria-hidden="true" />
                    <span>{selectedItem.prepTime}</span>
                  </span>
                )}
              </div>

              <div className="menupage-dialog-head">
                <h2 id="menupage-dialog-title">{selectedItem.name}</h2>
                <span className="menupage-price-pill menupage-price-lg">{selectedItem.price}</span>
              </div>

              <p className="menupage-dialog-desc">{selectedItem.description}</p>

              {selectedItem.flavors && selectedItem.flavors.length > 0 && (
                <div className="menupage-flavors-row">
                  <span className="menupage-flavors-label">Flavors Available:</span>
                  {selectedItem.flavors.map((flavor) => (
                    <span key={flavor} className="menupage-flavor-chip">
                      {flavor}
                    </span>
                  ))}
                </div>
              )}

              {(selectedItem.protein || selectedItem.calories) && (
                <div className="menupage-macro-row menupage-dialog-macros">
                  {selectedItem.protein && (
                    <span className="menupage-macro-chip">{selectedItem.protein} Protein</span>
                  )}
                  {selectedItem.calories && (
                    <span className="menupage-macro-chip">{selectedItem.calories}</span>
                  )}
                </div>
              )}

              {selectedItem.ingredients && selectedItem.ingredients.length > 0 && (
                <div className="menupage-ingredients">
                  <h4>Key Ingredients</h4>
                  <div className="menupage-ingredient-chips">
                    {selectedItem.ingredients.map((ing) => (
                      <span key={ing} className="menupage-ingredient-chip">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="menupage-dialog-note">
                {menu.prepNote || "Made fresh on the spot"} — pick up at our stall opposite{" "}
                {siteData.location.gymName}.
              </p>

              <div className="menupage-dialog-actions">
                <a
                  href={buildWhatsAppOrderUrl(whatsappNumber, selectedItem)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary menupage-wa-cta"
                >
                  <WhatsAppIcon size={18} />
                  <span>Pre-order on WhatsApp</span>
                </a>
                <a href={telHref} className="btn btn-accent">
                  <Phone size={18} />
                  <span>Call Stall</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
