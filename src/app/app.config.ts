import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { environment } from '../environments/environment';
import { JwtModule } from '@auth0/angular-jwt';
import { ServerErrorsInterceptor } from './interceptor/server-errors.interceptor';
import { DatePipe, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { RECAPTCHA_SETTINGS, RECAPTCHA_V3_SITE_KEY, RecaptchaSettings } from 'ng-recaptcha';

export function tokenGetter() {
  return sessionStorage.getItem('access_token');
}

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), [DatePipe],
  provideAnimationsAsync(),
  //provideHttpClient() //Configuracion clasica de HttpClient
  importProvidersFrom(
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: environment.allowedDomains,
        disallowedRoutes: environment.disallowedRoutes,
      //  allowedDomains: ["localhost:8080"],
      //  disallowedRoutes: ["http://localhost:8080/backend-sicae/login/forget"]

     //   allowedDomains: ["sicae.ejercito.mil.pe"],
      //  disallowedRoutes: ["https://sicae.ejercito.mil.pe/backend-sicae/login/forget"]
      },
    })
  ),
  provideHttpClient(withInterceptorsFromDi()), //para peticion HTTP -Forma cuando viaje el token jwt
  {
    provide: HTTP_INTERCEPTORS,
    useClass: ServerErrorsInterceptor,
    multi: true,

  },
  {
    provide: LocationStrategy, useClass: HashLocationStrategy
  },
  {
    provide: RECAPTCHA_SETTINGS,
    useValue: {
      //  siteKey: environment.recaptcha.siteKey,
    } as RecaptchaSettings,
  },
  {
    provide: RECAPTCHA_V3_SITE_KEY,
    useValue: '6LfI0x8rAAAAAEtT4BAR-38Eit53h8o1xcIRDOAl',
  },

  ]
};
