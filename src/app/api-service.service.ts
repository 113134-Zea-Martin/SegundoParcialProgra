import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from './environment';
import { Service, Venue } from './interfaces';

@Injectable({
  providedIn: 'root'
})
export class ApiServiceService {

  constructor(private http: HttpClient) { }

  getVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(environment.apiVenues);
  }
  
  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(environment.apiServices);
  }
  
  getAvailability(venueId: string, date: Date): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiAvailability}?venueId=${venueId}&date=${date}`);
  }

}
