/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
// src/shared/utils/geo-distance.util.ts
import { Injectable } from '@nestjs/common';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

@Injectable()
export class GeoDistanceUtil {
  private readonly earthRadiusKm = 6371; // Earth's radius in kilometers
  private readonly earthRadiusMiles = 3959; // Earth's radius in miles

  /**
   * Calculate distance between two points using Haversine formula
   * @returns distance in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    unit: 'km' | 'miles' = 'km'
  ): number {
    const R = unit === 'km' ? this.earthRadiusKm : this.earthRadiusMiles;
    
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate distance between two points (object version)
   */
  calculateDistanceBetweenPoints(
    point1: GeoPoint,
    point2: GeoPoint,
    unit: 'km' | 'miles' = 'km'
  ): number {
    return this.calculateDistance(
      point1.latitude,
      point1.longitude,
      point2.latitude,
      point2.longitude,
      unit
    );
  }

  /**
   * Calculate the bounding box around a point for radius search
   * @returns { minLat, maxLat, minLng, maxLng }
   */
  calculateBoundingBox(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): GeoBounds {
    // Latitude: 1 deg = 110.574 km
    // Longitude: 1 deg = 111.320 * cos(latitude) km
    
    const latChange = radiusKm / 110.574;
    const lonChange = radiusKm / (111.320 * Math.cos(this.toRadians(latitude)));
    
    return {
      minLat: latitude - latChange,
      maxLat: latitude + latChange,
      minLng: longitude - lonChange,
      maxLng: longitude + lonChange
    };
  }

  /**
   * Check if a point is within radius of another point
   */
  isWithinRadius(
    centerLat: number,
    centerLon: number,
    targetLat: number,
    targetLon: number,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(centerLat, centerLon, targetLat, targetLon);
    return distance <= radiusKm;
  }

  /**
   * Find the nearest point from a list of points
   */
  findNearestPoint(
    targetLat: number,
    targetLon: number,
    points: Array<{ latitude: number; longitude: number; [key: string]: any }>
  ): { point: any; distance: number; index: number } | null {
    if (!points || points.length === 0) {
      return null;
    }

    let nearestIndex = 0;
    let nearestDistance = this.calculateDistance(
      targetLat,
      targetLon,
      points[0].latitude,
      points[0].longitude
    );

    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(
        targetLat,
        targetLon,
        points[i].latitude,
        points[i].longitude
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    return {
      point: points[nearestIndex],
      distance: nearestDistance,
      index: nearestIndex
    };
  }

  /**
   * Calculate the center point of multiple coordinates
   */
  calculateCenterPoint(points: GeoPoint[]): GeoPoint {
    if (!points || points.length === 0) {
      throw new Error('At least one point is required');
    }

    if (points.length === 1) {
      return points[0];
    }

    let x = 0;
    let y = 0;
    let z = 0;

    for (const point of points) {
      const lat = this.toRadians(point.latitude);
      const lon = this.toRadians(point.longitude);

      x += Math.cos(lat) * Math.cos(lon);
      y += Math.cos(lat) * Math.sin(lon);
      z += Math.sin(lat);
    }

    const total = points.length;

    x /= total;
    y /= total;
    z /= total;

    const centralLon = Math.atan2(y, x);
    const centralSquareRoot = Math.sqrt(x * x + y * y);
    const centralLat = Math.atan2(z, centralSquareRoot);

    return {
      latitude: this.toDegrees(centralLat),
      longitude: this.toDegrees(centralLon)
    };
  }

  /**
   * Calculate the total distance of a route (array of points)
   */
  calculateRouteDistance(points: GeoPoint[], unit: 'km' | 'miles' = 'km'): number {
    if (!points || points.length < 2) {
      return 0;
    }

    let totalDistance = 0;

    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.calculateDistanceBetweenPoints(
        points[i],
        points[i + 1],
        unit
      );
    }

    return Math.round(totalDistance * 100) / 100;
  }

  /**
   * Generate a random point within radius of center
   */
  generateRandomPoint(
    centerLat: number,
    centerLon: number,
    radiusKm: number
  ): GeoPoint {
    // Convert radius from km to degrees
    const radiusInDegrees = radiusKm / 111.32;
    
    // Generate random angle
    const angle = Math.random() * 2 * Math.PI;
    
    // Generate random distance within radius (using uniform distribution)
    const distance = Math.random() * radiusInDegrees;
    
    // Calculate offset
    const dx = distance * Math.cos(angle);
    const dy = distance * Math.sin(angle);
    
    // Adjust dy for latitude distortion
    const lat = centerLat + dy;
    const lon = centerLon + dx / Math.cos(this.toRadians(centerLat));
    
    return {
      latitude: lat,
      longitude: lon
    };
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Calculate driving distance using OSRM or similar service (mock implementation)
   * In production, integrate with mapping service like Google Maps, OSRM, etc.
   */
  async calculateDrivingDistance(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number
  ): Promise<{ distanceKm: number; durationMinutes: number }> {
    // This is a mock implementation
    // In production, call a routing service API
    
    const straightLineDistance = this.calculateDistance(
      originLat,
      originLon,
      destLat,
      destLon
    );
    
    // Assume roads add ~30% to distance
    const drivingDistance = straightLineDistance * 1.3;
    
    // Assume average speed of 40 km/h in city
    const durationHours = drivingDistance / 40;
    const durationMinutes = durationHours * 60;
    
    return {
      distanceKm: Math.round(drivingDistance * 10) / 10,
      durationMinutes: Math.round(durationMinutes)
    };
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number, unit: 'km' | 'miles' = 'km', includeUnit: boolean = true): string {
    if (unit === 'km') {
      if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m${includeUnit ? ' meters' : ''}`;
      }
      return `${distanceKm.toFixed(1)}${includeUnit ? ' km' : ''}`;
    } else {
      const distanceMiles = distanceKm * 0.621371;
      if (distanceMiles < 0.1) {
        return `${Math.round(distanceMiles * 5280)} ft${includeUnit ? ' feet' : ''}`;
      }
      return `${distanceMiles.toFixed(1)}${includeUnit ? ' miles' : ''}`;
    }
  }

  /**
   * Sort points by distance from target
   */
  sortByDistance(
    targetLat: number,
    targetLon: number,
    points: Array<{ latitude: number; longitude: number; [key: string]: any }>
  ): Array<{ point: any; distance: number }> {
    const pointsWithDistance = points.map(point => ({
      point,
      distance: this.calculateDistance(
        targetLat,
        targetLon,
        point.latitude,
        point.longitude
      )
    }));

    return pointsWithDistance.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if point is within a polygon (geofence)
   * Uses ray-casting algorithm
   */
  isPointInPolygon(
    point: GeoPoint,
    polygon: GeoPoint[]
  ): boolean {
    if (!polygon || polygon.length < 3) {
      return false;
    }

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;

      const intersect = ((yi > point.latitude) !== (yj > point.latitude)) &&
        (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
      
      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate the geographic midpoint between two points
   */
  calculateMidpoint(
    point1: GeoPoint,
    point2: GeoPoint
  ): GeoPoint {
    const lat1 = this.toRadians(point1.latitude);
    const lon1 = this.toRadians(point1.longitude);
    const lat2 = this.toRadians(point2.latitude);
    const lon2 = this.toRadians(point2.longitude);

    const bx = Math.cos(lat2) * Math.cos(lon2 - lon1);
    const by = Math.cos(lat2) * Math.sin(lon2 - lon1);

    const lat3 = Math.atan2(
      Math.sin(lat1) + Math.sin(lat2),
      Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by)
    );
    const lon3 = lon1 + Math.atan2(by, Math.cos(lat1) + bx);

    return {
      latitude: this.toDegrees(lat3),
      longitude: this.toDegrees(lon3)
    };
  }
}
