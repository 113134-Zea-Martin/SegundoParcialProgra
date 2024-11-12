import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Service, Venue } from './interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }

  getServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`https://671fe0b3e7a5792f052fd920.mockapi.io/services`);
  }

  getVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(`https://671fe0b3e7a5792f052fd920.mockapi.io/venues`);
  }

}
