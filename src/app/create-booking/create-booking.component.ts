import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  ReactiveFormsModule,
  ValidationErrors,
  AbstractControl,
  AsyncValidatorFn,
} from '@angular/forms';
import { ApiServiceService } from '../api-service.service';
import { Booking, Service, Venue } from '../interfaces';
import { catchError, map, Observable, of } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-booking',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-booking.component.html',
  styleUrl: './create-booking.component.css',
})
export class CreateBookingComponent implements OnInit {
  constructor(private api: ApiServiceService, private router: Router) {}

  ngOnInit(): void {
    this.loadVenues();
    this.loadServices();
    this.addService();

    this.reservaForm.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
  }

  reservaForm: FormGroup = new FormGroup(
    {
      companyName: new FormControl('', [
        Validators.required,
        Validators.minLength(5),
      ]),
      companyEmail: new FormControl('', [
        Validators.required,
        Validators.email,
      ]),
      contactPhone: new FormControl('', Validators.required),
      venueId: new FormControl('', Validators.required),
      eventDate: new FormControl(
        '',
        Validators.required,
        this.checkAvailability()
      ),
      startTime: new FormControl('', [Validators.required]),
      endTime: new FormControl('', [Validators.required]),
      totalPeople: new FormControl(0, Validators.required),
      services: new FormArray([], [Validators.required]),
    },
    { validators: this.timeValidator }
  );

  get servicesFormArray(): FormArray {
    return this.reservaForm.get('services') as FormArray;
  }

  addService() {
    const serviceGroup = new FormGroup(
      {
        serviceId: new FormControl('', Validators.required),
        quantity: new FormControl(0, Validators.required),
        pricePerPerson: new FormControl(0, Validators.required),
        startTime: new FormControl('', Validators.required),
        endTime: new FormControl('', Validators.required),
        subTotal: new FormControl(0),
      },
      { validators: this.validateServiceHours }
    );

    serviceGroup.get('serviceId')?.valueChanges.subscribe(() => {
      this.calculateSubtotal(serviceGroup);
    });

    serviceGroup.get('quantity')?.valueChanges.subscribe(() => {
      this.calculateSubtotal(serviceGroup);
    });

    this.servicesFormArray.push(serviceGroup);
  }

  removeService(index: number) {
    this.servicesFormArray.removeAt(index);
  }

  venues: Venue[] = [];
  loadVenues() {
    this.api.getVenues().subscribe((venues) => {
      this.venues = venues;
    });
  }

  services: Service[] = [];
  loadServices() {
    this.api.getServices().subscribe((services) => {
      this.services = services;
    });
  }

  calculateSubtotal(form: FormGroup) {
    const serviceId = form.get('serviceId')?.value;
    const quantity = form.get('quantity')?.value;

    const service = this.services.find((s) => s.id === serviceId);
    console.log(service);
    if (service && quantity) {
      form.patchValue({
        subTotal: service.pricePerPerson * Number(quantity),
      });
    }
    if (quantity === 0) {
      form.patchValue({
        subTotal: 0,
      });
    }
  }

  subTotal: number = 0;
  descuento: number = 0;
  total: number = 0;
  calculateTotal() {
    let subTotal = 0;
    this.servicesFormArray.controls.forEach((control) => {
      subTotal += control.get('subTotal')?.value;
      this.subTotal = subTotal;
      this.descuento = 0;
      this.total = this.subTotal;
    });

    this.subTotal += this.calculateVenuePrice();

    const totalPeople = this.reservaForm.get('totalPeople')?.value;
    if (totalPeople > 100) {
      this.descuento = this.subTotal * 0.15;
      this.total = this.subTotal * 0.85;
    }
  }

  calculateVenuePrice(): number {
    const venueId = this.reservaForm.get('venueId')?.value;
    const venue = this.venues.find((v) => v.id === venueId);
    if (venue) {
      const startTime = this.reservaForm.get('startTime')?.value;
      const endTime = this.reservaForm.get('endTime')?.value;

      const start = new Date(`01/01/2000 ${startTime}`);
      const end = new Date(`01/01/2000 ${endTime}`);

      const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
      const total = hours * venue.pricePerHour;

      return total;
    }
    return 0;
  }

  bookingCode: number = 0;
  createBookingCode() {
    //Genera un numero random de 6 digitos
    this.bookingCode = Math.floor(100000 + Math.random() * 900000);
  }

  //Creamos la reserva con los datos del formulario
  createBooking() {
    this.createBookingCode();
    const booking = this.reservaForm.value;
    const bookingCreated: Booking = {
      bookingCode: this.bookingCode.toString(),
      companyName: booking.companyName,
      companyEmail: booking.companyEmail,
      contactPhone: booking.contactPhone,
      venueId: booking.venueId,
      eventDate: booking.eventDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPeople: booking.totalPeople,
      services: booking.services,
      totalAmount: this.total,
      status: 'confirmed',
      createdAt: new Date(),
    };

    console.log(bookingCreated);
    this.api.createBooking(bookingCreated).subscribe((response) => {
      console.log('Reserva creada:', response);
      this.router.navigate(['/bookings']);
    });
  }

  //Validacion de que la endTime sea mayor a la startTime
  timeValidator(group: AbstractControl): ValidationErrors | null {
    if (!(group instanceof FormGroup)) {
      return null;
    }

    const startTime = group.get('startTime')?.value;
    const endTime = group.get('endTime')?.value;

    if (!startTime || !endTime) {
      return null;
    }

    const start = new Date(`01/01/2000 ${startTime}`);
    const end = new Date(`01/01/2000 ${endTime}`);

    if (start >= end) {
      return { timeError: true };
    }

    return null;
  }

  //Validacion asincronica para comprobar la disponibilidad de la fecha y hora seleccionada
  checkAvailability(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const venueId = this.reservaForm.get('venueId')?.value;
      const eventDate = this.reservaForm.get('eventDate')?.value;

      console.log('venueId', venueId);
      console.log('eventDate', eventDate);

      // Si no hay valores, no se realiza la verificación
      if (!venueId || !eventDate) {
        return of(null);
      }

      // Llamada a la API para verificar disponibilidad
      return this.api.getAvailability(venueId, eventDate).pipe(
        map((response) => {
          if (Array.isArray(response)) {
            // Verificar disponibilidad
            const availabilityRecord = response.find(
              (record: { venueId: any; date: any; available: boolean }) =>
                record.venueId === venueId && record.date === eventDate
            );

            // Devuelve `null` si está disponible, o `{ unavailable: true }` si no lo está
            return availabilityRecord?.available ? null : { unavailable: true };
          } else {
            // Si la respuesta no es un arreglo, retorna un error
            console.error('Respuesta de API no es un arreglo:', response);
            return { apiError: true };
          }
        }),
        catchError((error) => {
          // Manejo de errores de la API
          console.error('Error al verificar disponibilidad:', error);
          return of({ apiError: true });
        })
      );
    };
  }

  validateServiceHours(group: AbstractControl): ValidationErrors | null {
    const startTime = group.get('startTime')?.value;
    const endTime = group.get('endTime')?.value;

    if (!startTime || !endTime) {
      return null;
    }

    const start = new Date(`01/01/2000 ${startTime}`);
    const end = new Date(`01/01/2000 ${endTime}`);

    return start >= end ? { invalidServiceHours: true } : null;
  }
}
