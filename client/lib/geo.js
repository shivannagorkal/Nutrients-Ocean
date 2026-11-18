// Nutrients Ocean Stall Coordinates (Opposite Gym, Mangalore)
export const STALL_COORDINATES = {
  latitude: 12.8708,
  longitude: 74.8427,
  address: 'Opposite Gym, Mangalore, Karnataka 575001',
};

/**
 * Live Kitchen Operating Hours Engine:
 * - Morning Session: 6:30 AM to 8:20 AM (IST)
 * - Evening Session: 5:00 PM to 9:30 PM (IST)
 * Outside these hours, ordering is locked, but cart items can be saved.
 */
export function getKitchenLiveStatus() {
  const now = new Date();
  // Compute current Indian Standard Time (IST, UTC+5:30)
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
  });
  const parts = istFormatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const currentMinutes = hour * 60 + minute;

  // 6:30 AM = 390 mins, 8:20 AM = 500 mins
  const isMorning = currentMinutes >= 390 && currentMinutes <= 500;
  // 5:00 PM = 1020 mins, 9:30 PM = 1290 mins
  const isEvening = currentMinutes >= 1020 && currentMinutes <= 1290;

  const isOpen = isMorning || isEvening;
  const activeSession = isMorning ? 'MORNING' : isEvening ? 'EVENING' : null;

  let nextOpenMessage = '';
  if (!isOpen) {
    if (currentMinutes < 390) {
      nextOpenMessage = 'Kitchen opens today at 6:30 AM (Morning Session: 6:30 - 8:20 AM)';
    } else if (currentMinutes > 500 && currentMinutes < 1020) {
      nextOpenMessage = 'Morning service closed at 8:20 AM. Evening kitchen opens at 5:00 PM (5:00 - 9:30 PM)';
    } else {
      nextOpenMessage = 'Stall closed for tonight. Kitchen opens tomorrow at 6:30 AM';
    }
  }

  return {
    isOpen,
    activeSession,
    nextOpenMessage,
    isMorning,
    isEvening,
    currentMinutes,
    displayTimeIST: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} IST`,
  };
}

/**
 * Calculates straight-line distance in meters between two lat/lng coordinates using Haversine formula.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Delivery Fee & Free Delivery Threshold Engine:
 * - Within 1 km (< 1000m):
 *   - Base fee: ₹5 (0-500m) or ₹10 (500m-1km)
 *   - FREE Delivery if cart subtotal is > ₹159
 * - 1 km to 2 km (1000m - 2000m):
 *   - Base fee: ₹15
 *   - FREE Delivery if cart subtotal is > ₹359
 * - > 2 km (> 2000m):
 *   - Out of delivery radius (Stall Pickup only)
 */
export function calculateDeliveryFeeDetails(distanceMeters, subtotalRupees) {
  if (distanceMeters === null || distanceMeters === undefined) {
    // Fallback if location not granted yet
    const isFree = subtotalRupees > 159;
    return {
      feeRupees: isFree ? 0 : 10,
      feePaise: isFree ? 0 : 1000,
      isFree,
      outOfRange: false,
      bracket: 'M0_1000',
      neededForFree: subtotalRupees <= 159 ? Math.max(0, 160 - subtotalRupees) : 0,
      label: isFree ? 'FREE Delivery (< 1km)' : 'Standard Delivery (₹10)',
    };
  }

  // Tier 1: Under 1 km (< 1000 meters)
  if (distanceMeters <= 1000) {
    const isFree = subtotalRupees > 159;
    const baseFee = distanceMeters <= 500 ? 5 : 10;
    const feeRupees = isFree ? 0 : baseFee;
    const neededForFree = subtotalRupees <= 159 ? Math.max(0, 160 - subtotalRupees) : 0;

    return {
      feeRupees,
      feePaise: feeRupees * 100,
      isFree,
      outOfRange: false,
      bracket: distanceMeters <= 500 ? 'M0_500' : 'M501_1000',
      distanceMeters,
      distanceKm: (distanceMeters / 1000).toFixed(1),
      neededForFree,
      threshold: 159,
      label: isFree ? 'FREE Delivery (< 1km)' : `Delivery (₹${feeRupees})`,
    };
  }

  // Tier 2: 1 km to 2 km (1000 to 2000 meters)
  if (distanceMeters <= 2000) {
    const isFree = subtotalRupees > 359;
    const feeRupees = isFree ? 0 : 15;
    const neededForFree = subtotalRupees <= 359 ? Math.max(0, 360 - subtotalRupees) : 0;

    return {
      feeRupees,
      feePaise: feeRupees * 100,
      isFree,
      outOfRange: false,
      bracket: 'M1001_2000',
      distanceMeters,
      distanceKm: (distanceMeters / 1000).toFixed(1),
      neededForFree,
      threshold: 359,
      label: isFree ? 'FREE Delivery (1-2km)' : 'Delivery (₹15)',
    };
  }

  // Tier 3: Beyond 2 km
  return {
    feeRupees: null,
    feePaise: 0,
    isFree: false,
    outOfRange: true,
    bracket: 'OUT_OF_RANGE',
    distanceMeters,
    distanceKm: (distanceMeters / 1000).toFixed(1),
    neededForFree: 0,
    label: 'Out of Delivery Range (> 2km)',
  };
}

/**
 * Requests device GPS coordinates via HTML5 Geolocation API
 */
export function getCurrentUserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const distanceMeters = calculateDistanceMeters(
          STALL_COORDINATES.latitude,
          STALL_COORDINATES.longitude,
          latitude,
          longitude
        );
        resolve({
          latitude,
          longitude,
          distanceMeters,
        });
      },
      (err) => {
        let msg = 'Could not access your location.';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access.';
        else if (err.code === 2) msg = 'Location position unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
