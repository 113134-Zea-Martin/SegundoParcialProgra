import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Availability, Booking, Service, Venue } from './interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(
      `https://671fe0b3e7a5792f052fd920.mockapi.io/services`
    );
  }

  getVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(
      `https://671fe0b3e7a5792f052fd920.mockapi.io/venues`
    );
  }

  createBookingOrder(order: Booking): Observable<Booking> {
    return this.http.post<Booking>(
      `https://671fe287e7a5792f052fdf93.mockapi.io/bookings`,
      order
    );
  }

  getAvailability(venueId: string, date: string): Observable<Availability> {
    return this.http.get<Availability>(
      `https://671fe287e7a5792f052fdf93.mockapi.io/availability?venueId=${venueId}&date=${date}`
    );
  }

  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(
      `https://671fe287e7a5792f052fdf93.mockapi.io/bookings`
    );
  }
}
