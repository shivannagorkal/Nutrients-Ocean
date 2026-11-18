'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, Check, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import {
  STALL_COORDINATES,
  calculateDistanceMeters,
  calculateDeliveryFeeDetails,
  getCurrentUserLocation,
} from '@/lib/geo';
import 'leaflet/dist/leaflet.css';

export default function MapLocationPicker({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  subtotalRupees,
  onConfirmLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [currentLat, setCurrentLat] = useState(initialLat || STALL_COORDINATES.latitude + 0.002);
  const [currentLng, setCurrentLng] = useState(initialLng || STALL_COORDINATES.longitude + 0.002);
  const [distanceMeters, setDistanceMeters] = useState(
    calculateDistanceMeters(
      STALL_COORDINATES.latitude,
      STALL_COORDINATES.longitude,
      initialLat || STALL_COORDINATES.latitude + 0.002,
      initialLng || STALL_COORDINATES.longitude + 0.002
    )
  );

  const [isLocating, setIsLocating] = useState(false);
  const [locateNotice, setLocateNotice] = useState(null);

  // Compute live delivery details based on current pin
  const deliveryDetails = calculateDeliveryFeeDetails(distanceMeters, subtotalRupees);

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import Leaflet to prevent Next.js SSR window errors
    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix Leaflet default icon paths in bundler
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const startLat = initialLat || STALL_COORDINATES.latitude + 0.002;
      const startLng = initialLng || STALL_COORDINATES.longitude + 0.002;

      // Cleanup existing map if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Create Leaflet Map
      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: 15,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // Tile layer (OpenStreetMap)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // 1. Draw Stall Marker
      const stallIcon = L.divIcon({
        className: 'stall-map-icon',
        html: `
          <div style="background-color: #1E6B34; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">
            🥗
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([STALL_COORDINATES.latitude, STALL_COORDINATES.longitude], {
        icon: stallIcon,
        interactive: true,
      })
        .addTo(map)
        .bindPopup('<b>Nutrients Ocean Stall</b><br>Opposite Gym, Mangalore');

      // 2. 1km Free Delivery Circle
      L.circle([STALL_COORDINATES.latitude, STALL_COORDINATES.longitude], {
        radius: 1000,
        color: '#16A34A',
        fillColor: '#86EFAC',
        fillOpacity: 0.1,
        weight: 1.5,
        dashArray: '5, 5',
      }).addTo(map);

      // 3. 2km Max Delivery Boundary Circle
      L.circle([STALL_COORDINATES.latitude, STALL_COORDINATES.longitude], {
        radius: 2000,
        color: '#D97706',
        fillColor: '#FDE68A',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '5, 5',
      }).addTo(map);

      // 4. Draggable Customer Delivery Pin
      const pinMarker = L.marker([startLat, startLng], {
        draggable: true,
      }).addTo(map);
      markerRef.current = pinMarker;

      const updatePinLocation = (lat, lng) => {
        setCurrentLat(lat);
        setCurrentLng(lng);
        const dist = calculateDistanceMeters(
          STALL_COORDINATES.latitude,
          STALL_COORDINATES.longitude,
          lat,
          lng
        );
        setDistanceMeters(dist);
      };

      pinMarker.on('dragend', () => {
        const pos = pinMarker.getLatLng();
        updatePinLocation(pos.lat, pos.lng);
      });

      map.on('click', (e) => {
        pinMarker.setLatLng(e.latlng);
        updatePinLocation(e.latlng.lat, e.latlng.lng);
      });

      // Recalculate size after modal render
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, initialLat, initialLng]);

  // Optional "Locate Me" button (only runs on user click)
  const handleLocateMe = async () => {
    setIsLocating(true);
    setLocateNotice(null);
    try {
      const loc = await getCurrentUserLocation();
      setCurrentLat(loc.latitude);
      setCurrentLng(loc.longitude);
      setDistanceMeters(loc.distanceMeters);

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([loc.latitude, loc.longitude], 16);
        markerRef.current.setLatLng([loc.latitude, loc.longitude]);
      }
      setLocateNotice('📍 Pin moved to your current GPS location!');
    } catch (err) {
      setLocateNotice(
        'Device location is not enabled. No problem! Simply drag the pin on the map to your spot.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = () => {
    onConfirmLocation(currentLat, currentLng, distanceMeters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
              Set Delivery Spot on Map
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
              Drag the pin or tap anywhere on the map to set your location
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Notice Banner */}
        {locateNotice && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: locateNotice.includes('not enabled') ? '#FEF3C7' : '#DCFCE7',
              color: locateNotice.includes('not enabled') ? '#92400E' : '#166534',
              fontSize: '11.5px',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {locateNotice}
          </div>
        )}

        {/* Map Container */}
        <div style={{ position: 'relative', height: '380px', width: '100%' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Floating "Locate Me" Button (Optional, only triggers on click) */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              backgroundColor: '#FFFFFF',
              color: '#1E6B34',
              border: '1.5px solid #CBD5E1',
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isLocating ? 'not-allowed' : 'pointer',
            }}
          >
            {isLocating ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Finding...</span>
              </>
            ) : (
              <>
                <Navigation size={14} />
                <span>Locate Me</span>
              </>
            )}
          </button>

          {/* Map Legend */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              zIndex: 1000,
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(2px)',
              borderRadius: '10px',
              padding: '6px 10px',
              fontSize: '11px',
              color: '#334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
              <span>Green zone: Free &gt; ₹159 (&lt; 1km)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D97706' }} />
              <span>Amber zone: Free &gt; ₹359 (1 - 2km)</span>
            </div>
          </div>
        </div>

        {/* Selected Distance & Pricing Footer */}
        <div style={{ padding: '16px 20px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                Distance to Stall
              </span>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} style={{ color: '#1E6B34' }} />
                <span>{distanceMeters}m ({(distanceMeters / 1000).toFixed(1)} km)</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                Delivery Fee
              </span>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>
                {deliveryDetails.outOfRange ? (
                  <span style={{ color: '#DC2626' }}>Out of Range</span>
                ) : deliveryDetails.isFree ? (
                  <span style={{ color: '#16A34A' }}>FREE 🎉</span>
                ) : (
                  <span style={{ color: '#0F172A' }}>₹{deliveryDetails.feeRupees}</span>
                )}
              </div>
            </div>
          </div>

          {/* Warning if beyond 2km */}
          {deliveryDetails.outOfRange ? (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '12px',
              }}
            >
              <AlertTriangle size={15} />
              <span>Selected spot is beyond our 2km fresh delivery limit. Please choose Stall Pickup.</span>
            </div>
          ) : deliveryDetails.isFree ? (
            <div style={{ fontSize: '12px', color: '#15803D', fontWeight: '700', marginBottom: '10px' }}>
              ✓ You qualify for Free Delivery on this order!
            </div>
          ) : deliveryDetails.neededForFree > 0 ? (
            <div style={{ fontSize: '12px', color: '#92400E', marginBottom: '10px' }}>
              Add ₹{deliveryDetails.neededForFree} more to unlock Free Delivery!
            </div>
          ) : null}

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deliveryDetails.outOfRange}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: deliveryDetails.outOfRange ? '#94A3B8' : '#1E6B34',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '14px',
              border: 'none',
              cursor: deliveryDetails.outOfRange ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Check size={16} />
            <span>Confirm Delivery Spot ({distanceMeters}m)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
