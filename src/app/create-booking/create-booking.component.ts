import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Booking, Service, Venue } from '../interfaces';
import { CommonModule } from '@angular/common';
import { ApiService } from '../api.service';
import { catchError, map, Observable, of } from 'rxjs';

@Component({
  selector: 'app-create-booking',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-booking.component.html',
  styleUrl: './create-booking.component.css',
})
export class CreateBookingComponent implements OnInit {
  constructor(private fb: FormBuilder, private api: ApiService) {}

  ngOnInit(): void {
    this.getVenues();
    this.getServices();
    this.addService();
  }

  bookingGroup: FormGroup = new FormGroup({
    companyName: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
    ]),
    companyEmail: new FormControl('', [Validators.required, Validators.email]),
    contactPhone: new FormControl('', Validators.required),
    venueId: new FormControl('', [Validators.required]),
    eventDate: new FormControl(
      '',
      [Validators.required],
      this.validateAvailability()
    ),
    startTime: new FormControl('', [Validators.required]),
    endTime: new FormControl('', [Validators.required]),
    totalPeople: new FormControl('', Validators.required),
    services: new FormArray([], [Validators.required, this.validateHours]),
  });

  get servicesFormArray() {
    return this.bookingGroup.get('services') as FormArray;
  }

  addService() {
    const serviceGroup = new FormGroup({
      serviceId: new FormControl('',Validators.required),
      quantity: new FormControl('', [Validators.min(10), Validators.required]),
      pricePerPerson: new FormControl(''),
      startTime: new FormControl('', Validators.required),
      endTime: new FormControl('', [Validators.required]),
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

  priceWithoutServices: number = 0;
  //Calcular cantidad de horas entre startTime y endTime
  calculateHours() {
    const startTime = this.bookingGroup.get('startTime')?.value;
    const endTime = this.bookingGroup.get('endTime')?.value;

    if (startTime && endTime) {
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      const totalHours = endHour - startHour;
      const venue = this.venues.find(
        (venue) => venue.id === this.bookingGroup.get('venueId')?.value
      );
      if (venue && venue.pricePerHour) {
        this.priceWithoutServices = totalHours * venue.pricePerHour;
      } else {
        this.priceWithoutServices = 0;
      }
    }
  }

  //Validator for availability of the venue and date
  validateAvailability(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const venueId = this.bookingGroup.get('venueId')?.value;
      const eventDate = this.bookingGroup.get('eventDate')?.value;

      if (!venueId || !eventDate) {
        return of(null);
      }

      return this.api.getAvailability(venueId, eventDate).pipe(
        map((availability) => {
          console.log('availability', availability.available);
          return availability.available ? null : { notAvailable: true };
        })
      );
    };
  }

  //Validator for range of hours (startTime and endTime)
  validateHours(formArray: FormArray): ValidationErrors | null {
    if (!formArray || formArray.length === 0) {
      return null;
    }

    const hasErrors = formArray.controls.some((serviceGroup) => {
      const startTime = serviceGroup.get('startTime')?.value;
      console.log('startTime', startTime);
      const endTime = serviceGroup.get('endTime')?.value;
      console.log('endTime', endTime);

      // Si alguno de los campos está vacío, no validamos
      if (!startTime || !endTime) {
        return false;
      }

      // Convertimos las horas a números para comparar
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinutes = parseInt(startTime.split(':')[1]);
      const endHour = parseInt(endTime.split(':')[0]);
      const endMinutes = parseInt(endTime.split(':')[1]);

      // Convertimos todo a minutos para una comparación más precisa
      const startTimeInMinutes = startHour * 60 + startMinutes;
      const endTimeInMinutes = endHour * 60 + endMinutes;

      return startTimeInMinutes >= endTimeInMinutes;
    });

    return hasErrors ? { invalidServiceHours: true } : null;
  }

  orderCode: number = 0;
  //Generar un código único para el campo bookingCode con un random de 6 numeros.
  generateBookingCode() {
    this.orderCode = Math.floor(100000 + Math.random() * 900000);
  }

  //Crear el booking
  createBooking() {
    this.generateBookingCode();
    const booking = this.bookingGroup.value;
    const bookingCreated: Booking = {
      bookingCode: this.orderCode.toString(),
      companyName: booking.companyName,
      companyEmail: booking.companyEmail,
      contactPhone: booking.contactPhone,
      venueId: booking.venueId,
      eventDate: booking.eventDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPeople: booking.totalPeople,
      services: booking.services,
      totalAmount: this.total + this.priceWithoutServices,
      status: 'confirmed',
      createdAt: new Date(),
    };

    this.api.createBookingOrder(bookingCreated).subscribe((booking) => {
      console.log('Booking created:', booking);
    });
  }
}
