```
# HOMEPLUS - MAPA MAESTRO DE ARQUITECTURA Y DOMINIOS
```

```
Este documento es el "Nodo Gravitacional" del proyecto. Define la jerarquía
estructural estricta, las relaciones de dependencia y la topología de
**[HomePlus]**. Todas las demás especificaciones, dominios y reglas orbitan y
dependen de este mapa.
```

```
## 1. EL NÚCLEO (CORE)
```

```
El núcleo del sistema está compuesto por tres pilares inseparables:
```

```
* **[HomePlus]**: Es el Sistema Operativo del Hogar. Es la entidad central
suprema que contiene todos los dominios y usuarios.
```

```
* **[Final Spec V1]**: Es la Constitución del proyecto. Rige todas las leyes,
permisos y módulos de **[HomePlus]**. En caso de contradicción en cualquier otro
archivo, este documento gana.
* **[Geni]**: Es la capa de inteligencia artificial transversal. **[Geni]** se
conecta con todos los módulos, lee el contexto de **[HomePlus]**, y aplica la
**[AI Philosophy]**.
```

## `## 2. DOMINIOS OFICIALES (Módulos)` 

```
**[HomePlus]** se divide exactamente en 10 dominios oficiales. **[Geni]** tiene
acceso de consulta, análisis y recomendación sobre todos ellos (respetando los
permisos):
```

```
* **[People]**: Administra la coordinación humana. Contiene los submódulos de
**[Personas]**, **[Presence]** y **[Feed]**.
```

```
* **[Planner]**: Es el núcleo operativo de ejecución. Administra **[Tasks]**
(Tareas), **[Calendar]** (Eventos) y **[Goals]** (Metas).
```

```
* **[Finance]**: Es el copiloto de la economía compartida. Administra
```

```
**[Cuentas]**, **[Gastos]**, **[Ingresos]**, **[Presupuestos]**, **[Fondos]** y
**[Deudas]**.
```

```
* **[Presence]**: Administra la disponibilidad física. Gestiona **[Ubicación]**,
**[Lugares]**, **[Geocercas]** y **[Check-ins]**.
```

```
* **[Inventory]**: Administra el stock. Gestiona **[Consumibles]**, **[Productos
del hogar]**, **[Medicamentos]** y la **[Lista de compras]**.
```

```
* **[Assets]**: Administra los bienes físicos. Gestiona **[Vehículos]**,
```

```
**[Mascotas]**, **[Propiedades]**, **[Dispositivos]** y su respectivo
mantenimiento.
```

```
* **[HomeCloud]**: Es la memoria documental y emocional. Administra
```

```
**[Documentos]**, **[Álbumes]** y **[Recuerdos]**.
```

```
* **[SOS]**: Es el sistema de emergencias. Tiene **prioridad crítica** sobre
todos los demás dominios y desplaza cualquier contenido visual.
```

```
* **[Feed]**: Es el espacio social cronológico del hogar. Muestra actividad,
logros y reconocimientos.
* **[Automatizaciones]**: Motor de reglas lógicas. Conecta un "trigger" de un
dominio con una "acción" en otro.
```

```
## 3. ENTIDADES TRANSVERSALES
```

```
Estas entidades no viven aisladas en un solo módulo, sino que son el "pegamento"
relacional del sistema:
```

```
* **[Persona]**: Se relaciona con Tareas, Gastos, Eventos, Activos y Documentos.
* **[Responsabilidad]**: Agrupa operativamente Tareas, Gastos e Inventario.
```

```
* **[Goal]** (Meta): Vincula Tareas de [Planner] con Fondos de [Finance].
```

```
* **[Documento]**: Se vincula como evidencia o garantía a Gastos, Activos y
Personas.
```

```
## 4. ROLES OFICIALES (Usuarios)
```

```
La experiencia de **[HomePlus]** muta y se adapta según quién la use. Los 7
roles oficiales son:
```

```
* **[Coordinador]**: Tiene poder ejecutivo y visión global. Administra el hogar.
* **[Adulto]**: Tiene visión operativa plena y comparte la carga principal.
```

```
* **[Adolescente]**: Tiene autonomía progresiva, enfocado en gamificación
(misiones y XP).
* **[Niño]**: Tiene una experiencia visual, simplificada y de refuerzo positivo.
* **[Adulto Mayor]**: Tiene una experiencia asistiva (Modo Senior), enfocada en
```

```
salud, medicación y contactos.
```

```
* **[Invitado]**: Tiene acceso mínimo y participación limitada a tareas/eventos
específicos.
```

```
* **[Empleado Familiar]**: Tiene visión estrictamente profesional y acotada a su
trabajo asignado.
```

```
## 5. LAS FILOSOFÍAS (Leyes de Diseño y Lógica)
El comportamiento de **[HomePlus]** y **[Geni]** está dictado por 5 filosofías
inquebrantables:
```

```
* **[Data Philosophy]**: Rige la privacidad, el cifrado, la propiedad de los
datos y las políticas de retención (ej. el GPS nunca va a IA externa).
```

```
* **[UX Philosophy]**: Rige la navegación (Bottom Nav congelada), la regla del
1-tap, el progressive disclosure y la arquitectura de las 4 capas de pantalla.
```

```
* **[Relationship Philosophy]**: Rige el ecosistema interconectado. Define que
las entidades se enlazan cruzando dominios sin necesidad de volver atrás.
```

```
* **[Emotional Design]**: Rige el tono humano. Busca generar Calma, Pertenencia
y Alivio; y prohíbe generar Vigilancia, Culpa acumulada o Pánico.
```

```
* **[AI Philosophy]**: Rige los límites de **[Geni]**. Define el "Escalamiento
en 4 Niveles" y los "Guardrails" contra la obsesión de control.
```

```
## 6. ARQUITECTURA TÉCNICA Y DE INTERFAZ
Para que la filosofía se vuelva realidad, la ingeniería se sostiene en:
```

```
* **[Base de Datos]**: Diseñada en Supabase, depende estrictamente de Row Level
Security (RLS) y Soft-Delete.
```

```
* **[API y Edgecases]**: Controla la comunicación entre el Front-End y el Back-
End.
```

```
* **[Eventos del Sistema]**: Rige qué notificaciones y push se disparan según la
urgencia (CR, AL, ME, BA).
```

```
* **[Design System]**: Aplica la paleta "Tierra", la tipografía y los
componentes visuales accesibles.
```

```
* **[Pantallas UI]**: Diseños específicos para Auth, Onboarding y Home,
adaptados dinámicamente por rol.
```

```
---
```

## `### INSTRUCCIONES SEMÁNTICAS (RELACIONES DIRECTAS)` 

```
*NOTA PARA EXTRACCIÓN DE GRAFOS: Las siguientes declaraciones definen las
aristas (edges) direccionales obligatorias del sistema.*
```

`1. **[Geni]** -> analiza y recomienda sobre -> **[Planner]**, **[Finance]**, **[Presence]**, **[HomeCloud]**, **[Inventory]**, **[Assets]**.` 

`2. **[HomePlus]** -> contiene a -> **[Final Spec V1]**, **[Roles Oficiales]**,` 

```
**[Dominios Oficiales]**, **[Las Filosofías]**.
```

`3. **[UX Philosophy]** -> gobierna el diseño de -> **[Design System]**,` 

- `**[Pantallas UI]**.` 

`4. **[Data Philosophy]** -> gobierna la estructura de -> **[Base de Datos]**,` 

- `**[API y Edgecases]**.` 

`5. **[AI Philosophy]** -> gobierna la conducta de -> **[Geni]**, **[UX Writing Guide]**.` 

`6. **[Emotional Design]** -> modula el tono de -> **[SOS]**, **[Feed]**, **[UX Writing Guide]**.` 

`7. **[Base de Datos]** -> almacena -> **[Auditoría Permanente]** (append-only). 8. **[Coordinador]** -> delega temporalmente a -> **[Adulto]** (cuando hay crisis o inactividad).` 

`9. **[SOS]** -> tiene prioridad visual absoluta sobre -> **[Home]**.` 

