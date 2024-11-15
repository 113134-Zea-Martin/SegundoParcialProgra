import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  AsyncValidator,
  AsyncValidatorFn,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Availability, Service, Venue } from '../interfaces';
import { ApiServiceService } from '../api-service.service';
import { catchError, map, Observable, of, Subscription } from 'rxjs';

@Component({
  selector: 'app-create-booking',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-booking.component.html',
  styleUrl: './create-booking.component.css',
})
export class CreateBookingComponent implements OnInit {
  suscriptions: Subscription[] = [];

  constructor(private api: ApiServiceService) { }

  ngOnInit(): void {
    this.addService();
    this.loadVenues();
    this.loadServices();
  }

  reservaForm: FormGroup = new FormGroup({
    companyName: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
    ]),
    companyEmail: new FormControl('', [Validators.required, Validators.email]),
    contactPhone: new FormControl('', [Validators.required]),
    venueId: new FormControl('', Validators.required),
    eventDate: new FormControl('', Validators.required, this.checkAvailability()),
    startTime: new FormControl('', Validators.required),
    endTime: new FormControl('', [Validators.required]),
    totalPeople: new FormControl('', Validators.required),
    services: new FormArray([], Validators.required),
    totalAmount: new FormControl(''),
  }, { validators: this.timeValidator });

  get servicesFormArray() {
    return this.reservaForm.get('services') as FormArray;
  }

  addService() {
    const service = new FormGroup({
      serviceId: new FormControl('', Validators.required),
      quantity: new FormControl('', Validators.required),
      pricePerPerson: new FormControl(''),
      startTime: new FormControl('', Validators.required),
      endTime: new FormControl('', [Validators.required]),
      subTotal: new FormControl(0),
    });

    const subtotal = service.get('quantity')?.valueChanges.subscribe(() => {
      this.calculateSubtotal(service);
    });

    const subtotal2 = service.get('serviceId')?.valueChanges.subscribe(() => {
      this.calculateSubtotal(service);
    });


    const total = this.reservaForm.valueChanges.subscribe(() => {
      this.calculateTotal();
    });
    this.suscriptions.push(total);

    this.servicesFormArray.push(service);
  }

  removeService(index: number) {
    this.servicesFormArray.removeAt(index);
  }

  venues: Venue[] = [];
  loadVenues() {
    const load = this.api.getVenues().subscribe((venues) => {
      this.venues = venues;
    });
    this.suscriptions.push(load);
  }

  services: Service[] = [];
  loadServices() {
    const load = this.api.getServices().subscribe((services) => {
      this.services = services;
    });
    this.suscriptions.push(load);
  }

  calculateSubtotal(service: FormGroup) {
    const quantity = service.get('quantity')?.value;
    const serviceId = service.get('serviceId')?.value;
    const serviceData = this.services.find((s) => s.id === serviceId);
    if (serviceData && quantity) {
      service.patchValue({
        subTotal: (serviceData.pricePerPerson * Number(quantity)).toFixed(2),
      });
    }
    if (serviceData && quantity === 0) {
      service.patchValue({
        subTotal: (serviceData.pricePerPerson * 0).toFixed(2),
      });
    }
  }

  subtotal: number = 0;
  discount: number = 0;
  total: number = 0;
  calculateTotal() {
    let subtotal = 0;
    this.servicesFormArray.controls.forEach((service) => {
      subtotal += Number(service.get('subTotal')?.value);
    });
    this.subtotal = Number((subtotal + this.calculatePricePerVenue()).toFixed(2));
    this.discount = 0;
    this.total = subtotal

    if (this.reservaForm.get('totalPeople')?.value > 100) {
      this.discount = this.subtotal * 0.15;
      this.total = this.subtotal * 0.85;
      console.log('total', this.total);
    }
  }

  calculatePricePerVenue() {
    const venueId = this.reservaForm.get('venueId')?.value;
    const venue = this.venues.find((v) => v.id === venueId);
    if (venue) {
      const startTime = this.reservaForm.get('startTime')?.value;
      const endTime = this.reservaForm.get('endTime')?.value;
      console.log('pricePerHour', venue.pricePerHour);

      const start = new Date(`01/01/2000 ${startTime}`);
      const end = new Date(`01/01/2000 ${endTime}`);


      const totalHours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
      console.log('totalHours', totalHours);

      return venue.pricePerHour * totalHours;
    } else {
      return 0;
    }
  }

  //Validacion sincronica para comprobar que la hora de inicio sea menor a la hora de fin
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

  get hasTimeError(): boolean {
    return this.reservaForm.errors?.['timeError'] === true;
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

  //Creamos la orden y la enviamos al servidor
  createOrder() {
    if (this.reservaForm.invalid) {
      return;
    }

    const order = this.reservaForm.value;
    console.log('order', order);

  }

}
