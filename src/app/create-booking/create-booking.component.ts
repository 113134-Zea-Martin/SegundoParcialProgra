import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Service, Venue } from '../interfaces';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-create-booking',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-booking.component.html',
  styleUrl: './create-booking.component.css',
})
export class CreateBookingComponent implements OnInit {
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getVenues();
    this.getServices();
    this.addService();
  }

  bookingGroup: FormGroup = new FormGroup({
    companyName: new FormControl(''),
    companyEmail: new FormControl(''),
    contactPhone: new FormControl(''),
    venueId: new FormControl(''),
    eventDate: new FormControl(''),
    startTime: new FormControl(''),
    endTime: new FormControl(''),
    totalPeople: new FormControl(''),
    services: new FormArray([], Validators.required),
  });

  get servicesFormArray() {
    return this.bookingGroup.get('services') as FormArray;
  }

  addService() {
    const serviceGroup = new FormGroup({
      serviceId: new FormControl(''),
      quantity: new FormControl('', Validators.min(10)),
      pricePerPerson: new FormControl(''),
      startTime: new FormControl(''),
      endTime: new FormControl(''),
      subTotal: new FormControl(0),
    });

    // Suscribimos al cambio de ambos valores para actualizar el subtotal
    serviceGroup.get('serviceId')?.valueChanges.subscribe(() => {
      this.updateSubTotal(serviceGroup);
    });

    serviceGroup.get('quantity')?.valueChanges.subscribe(() => {
      this.updateSubTotal(serviceGroup);
    });

    this.bookingGroup.get('totalPeople')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });

    this.bookingGroup.get('services')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });

    this.servicesFormArray.push(serviceGroup);
  }

  // Función que actualiza el subtotal
  updateSubTotal(serviceGroup: FormGroup) {
    const serviceId = serviceGroup.get('serviceId')?.value;
    const quantity = serviceGroup.get('quantity')?.value;

    const service = this.services.find((s) => s.id === serviceId);
    if (service && quantity) {
      serviceGroup.patchValue({
        subTotal: service.pricePerPerson * Number(quantity),
      });
    }
  }

  subTotal: number = 0;
  discount: number = 0;
  total: number = 0;
  calculateTotal() {
    this.subTotal = 0;
    this.servicesFormArray.controls.forEach((control) => {
      this.subTotal += control.get('subTotal')?.value;
      this.discount = 0;
      this.total = this.subTotal;
    });
    if (this.bookingGroup.get('totalPeople')?.value > 100) {
      this.total = this.subTotal * 0.85;
      this.discount = this.subTotal * 0.15;
    }
  }

  removeService(index: number) {
    this.servicesFormArray.removeAt(index);
  }

  venues: Venue[] = [];

  getVenues() {
    this.api.getVenues().subscribe((venues) => {
      this.venues = venues;
    });
  }

  services: Service[] = [];
  getServices() {
    this.api.getServices().subscribe((services) => {
      this.services = services;
    });
  }
}
