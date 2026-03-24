import { Component } from '@angular/core';

const DEBUG = true;


@Component({
  selector: 'app-dashboard-home',
  imports: [],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
constructor() {
    if (DEBUG) console.log('🏠 [DashboardHome] Init');
  }
}
