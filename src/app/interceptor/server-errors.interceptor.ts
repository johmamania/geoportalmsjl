import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from "@angular/common/http";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import { EMPTY, Observable, catchError, retry, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { Injectable } from "@angular/core";
import Swal from "sweetalert2";
import { AdminAuthService } from "../services/admin-auth.service";


@Injectable({
    providedIn: 'root'
})
export class ServerErrorsInterceptor implements HttpInterceptor{
    constructor(
        private router: Router,
        private adminAuthService: AdminAuthService,
        private snackBar: MatSnackBar
    ) {}
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Verificar si el usuario es administrador
        const isAdmin = this.adminAuthService.getIsAuthenticated();

        return next.handle(req).pipe(retry(environment.RETRY))
            .pipe(tap(event => {
                if(event instanceof HttpResponse){
                    if (event.body && event.body.error === true && event.body.errorMessage) {
                        throw new Error(event.body.errorMessage);
                    }
                }
            })).pipe(catchError( (err) => {
                // Solo mostrar errores detallados si el usuario es administrador
                if (!isAdmin) {
                    // Para usuarios no administradores, solo registrar en consola
                    console.error('Error HTTP:', err);
                    // No mostrar SweetAlert para usuarios normales
                    return EMPTY;
                }

                // Para administradores, mostrar errores detallados
                if(err.status === 400){
                  Swal.fire({
                    title: 'ERROR ' + err.status,
                    text: err.error?.message || err.message || 'Error en la solicitud',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
                }
                else if (err.status === 404){

                    this.snackBar.open('No existe el recurso', 'ERROR 404', { duration: 5000 });

                }
                else if (err.status === 403 ) {
                    Swal.fire({
                        title: 'ERROR ' + err.status,
                        text: err.error?.message || 'Acceso denegado',
                        icon: 'warning',
                        confirmButtonText: 'OK'
                    });
                    this.router.navigate(['/admin/login']);
                } else if (err.status === 401) {
                  Swal.fire({
                      title: 'VALIDACION INCORRECTA ',
                      text: err.error?.message || 'No autorizado',
                      icon: 'warning',
                      confirmButtonText: 'OK'
                  });
                    this.router.navigate(['/admin/login']);
                }
                else if (err.status === 500) {
                  Swal.fire({
                    title: 'ERROR ' + err.status,
                    text: err.error?.message || 'Error interno del servidor',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                }
                else {
                  Swal.fire({
                    title: 'ERROR ' + (err.status || 'DESCONOCIDO'),
                    text: err.error?.message || err.message || 'Error desconocido',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                }

                return EMPTY;
            }));

    }

}
