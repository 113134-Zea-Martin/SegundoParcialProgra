import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Booking, Venue } from '../interfaces';
import { ApiService } from '../api.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-bookings-list',
  templateUrl: './bookings-list.component.html',
  styles: [
    `
      .badge {
        text-transform: capitalize;
      }
    `,
  ],
  imports: [CurrencyPipe, CommonModule, ReactiveFormsModule],
  standalone: true,
})
export class BookingsListComponent implements OnInit {
  searchTerm: FormControl = new FormControl('');

  search() {
    this.searchTerm.valueChanges.subscribe((searchTerm) => {
      if (!searchTerm) {
        this.bookings = this.allBokings;
        return;
      }
      this.bookings = this.allBokings.filter((booking) => {
        if (booking.companyName && booking.bookingCode) {
          return (
            booking.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.bookingCode.toLowerCase().includes(searchTerm.toLowerCase())
          );
        } else {
          return false;
        }
      });
    });
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadBookings();
    this.getVenues();
    this.search();
  }

  bookings: Booking[] = [];
  allBokings: Booking[] = [];

  loadBookings() {
    this.api.getBookings().subscribe((bookings) => {
      this.bookings = bookings;
      this.allBokings = bookings;
    });
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'confirmed':
        return 'badge bg-success';
      case 'pending':
        return 'badge bg-warning text-dark';
      case 'cancelled':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  venues: Venue[] = [];

  getVenues() {
    this.api.getVenues().subscribe((venues) => {
      this.venues = venues;
    });
  }

  getVenueName(venueId: string): string {
    const venue = this.venues.find((v) => v.id === venueId);
    return venue?.name || '';
  }
}
