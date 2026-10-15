'use client';

import React, { useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { HexLayer } from '@/components/HexLayer';

import { CITY_CENTER } from '@/constants/geo';

import type { Order } from '@/types/Order';
import type { LatLng } from '@/types/LatLng';
import type { Courier } from '@/types/Courier';
import type { SearchRing } from '@/types/Match';

interface CourierMapProps {
  couriers: Courier[];
  resolution: number;
  pickup: LatLng | null;
  dropoff: LatLng | null;
  rings: SearchRing[];
  visibleK: number;
  ringUsed: null | number;
  /** Courier chosen for the last order, highlighted */
  chosenId?: string;
  /** That order, to draw the route still ahead of the courier */
  chosenOrder?: Order;
  onMapClick: (point: LatLng) => void;
  onInteract: () => void;
}

/** Pickup and dropoff are the motif: a hexagon pin */
const hexIcon = (colour: string) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:22px;height:25px;background:${colour};clip-path:var(--hex)"></span>`,
    iconAnchor: [11, 12],
    iconSize: [22, 25],
  });

const ASSIGNED = '#3d8bff';

/** Bike glyph (Lucide, ISC licence) on a blue disc */
const assignedIcon = L.divIcon({
  className: '',
  html: `<span class="assigned-courier"><svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></span>`,
  iconAnchor: [17, 17],
  iconSize: [34, 34],
});

/** The road still ahead: to the pickup and on to the dropoff, or just to the dropoff */
const routeAhead = (courier: LatLng, order?: Order): LatLng[] => {
  if (order?.status === 'assigned')
    return [courier, order.pickup, order.dropoff];
  if (order?.status === 'picked_up') return [courier, order.dropoff];
  return [];
};

const MapEvents = ({
  onInteract,
  onMapClick,
}: Pick<CourierMapProps, 'onInteract' | 'onMapClick'>) => {
  useMapEvents({
    click: (event) => onMapClick(event.latlng),
    dragstart: onInteract,
    zoomstart: onInteract,
  });
  return null;
};

export const CourierMap = ({
  chosenId,
  chosenOrder,
  couriers,
  dropoff,
  onInteract,
  onMapClick,
  pickup,
  resolution,
  rings,
  ringUsed,
  visibleK,
}: CourierMapProps) => {
  const chosen = couriers.find((courier) => courier.id === chosenId);
  const icons = useMemo(
    () => ({ dropoff: hexIcon('#ffffff'), pickup: hexIcon('#dafa9c') }),
    []
  );

  return (
    <MapContainer
      center={CITY_CENTER}
      zoom={14}
      scrollWheelZoom={false}
      className='h-full w-full'
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        maxZoom={19}
      />
      <MapEvents onMapClick={onMapClick} onInteract={onInteract} />
      <HexLayer
        couriers={couriers}
        resolution={resolution}
        rings={rings}
        ringUsed={ringUsed}
        visibleK={visibleK}
      />
      {chosen && routeAhead(chosen, chosenOrder).length > 0 && (
        <Polyline
          positions={routeAhead(chosen, chosenOrder)}
          interactive={false}
          pathOptions={{
            color: ASSIGNED,
            dashArray: '2 8',
            lineCap: 'round',
            opacity: 0.95,
            weight: 4,
          }}
        />
      )}
      {couriers.map((courier) => {
        if (courier.id === chosenId) return null;
        return (
          <CircleMarker
            key={courier.id}
            center={courier}
            radius={5}
            pathOptions={{
              color: '#0f0f0f',
              fillColor: courier.status === 'idle' ? '#ffffff' : '#dafa9c',
              fillOpacity: 1,
              weight: 1.5,
            }}
          >
            <Tooltip>
              {courier.id},{' '}
              {courier.status === 'idle' ? 'free' : 'on a delivery'}
            </Tooltip>
          </CircleMarker>
        );
      })}
      {chosen && (
        <Marker
          position={chosen}
          icon={assignedIcon}
          keyboard={false}
          zIndexOffset={1000}
        >
          <Tooltip
            permanent
            direction='right'
            offset={[18, 0]}
            className='assigned-label'
          >
            {chosen.id}, assigned
          </Tooltip>
        </Marker>
      )}
      {pickup && (
        <Marker position={pickup} icon={icons.pickup} keyboard={false}>
          <Tooltip permanent direction='top' offset={[0, -12]}>
            Pickup
          </Tooltip>
        </Marker>
      )}
      {dropoff && (
        <Marker position={dropoff} icon={icons.dropoff} keyboard={false}>
          <Tooltip permanent direction='top' offset={[0, -12]}>
            Dropoff
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
};
