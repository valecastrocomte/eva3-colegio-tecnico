CREATE TABLE `empresas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`direccion` text NOT NULL,
	`telefono` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jefes_directos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`contacto` text NOT NULL,
	`cargo` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practicas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`estudiante_id` integer NOT NULL,
	`profesor_supervisor_id` integer NOT NULL,
	`empresa_id` integer NOT NULL,
	`jefe_directo_id` integer NOT NULL,
	`fecha_inicio` text NOT NULL,
	`fecha_termino` text NOT NULL,
	`descripcion_actividades` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profesor_supervisor_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jefe_directo_id`) REFERENCES `jefes_directos`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "fecha_termino_gte_fecha_inicio" CHECK("practicas"."fecha_termino" >= "practicas"."fecha_inicio")
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rut` text NOT NULL,
	`nombre_completo` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol` text NOT NULL,
	`carrera` text,
	`especialidad` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_rut_unique` ON `usuarios` (`rut`);