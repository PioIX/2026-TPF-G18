# 2026-TPF-G18
Proyecto Integrador Interdisciplinario 2026 - Casa Salesiana Pío IX

Integrantes: Santiago Kim, Francisco Lettieri, Julian Lopez del Prado y Faustino Vicente

## Presupuesto del proyecto

### Descripción del proyecto

El nombre de la aplicación es EducaLink. Se trata de una aplicación web de mensajería pensada para la comunidad escolar, que permite a alumnos, docentes y administradores comunicarse mediante chats privados y grupales. Los mensajes se envían y se reciben en tiempo real, cada usuario tiene su perfil con foto y existe un panel de administración desde el cual se gestionan los usuarios, los cursos y las conversaciones.

La necesidad que aborda el proyecto es la dispersión de la comunicación dentro de la escuela. Hoy alumnos y docentes se comunican a través de aplicaciones de uso general, como WhatsApp o el correo electrónico, donde la comunicación escolar se mezcla con la vida personal, la institución no tiene ningún control sobre los grupos y resulta difícil mantener la información ordenada por curso. Esto provoca mensajes que se pierden, grupos sin moderación y la ausencia de un canal oficial. EducaLink propone un espacio propio de la institución, ordenado y supervisado.

El público objetivo está formado por tres tipos de usuarios. Los alumnos de 5to informática, que usarán la aplicación para hablar con sus compañeros y con sus docentes. Los docentes, que necesitan comunicarse con sus cursos o con alumnos en particular. Y los administradores, que pueden ser preceptores, directivos o personal designado, y se encargan de gestionar usuarios y cursos y de moderar las conversaciones.

El objetivo general es desarrollar una aplicación web completa, con frontend, backend y base de datos, que ofrezca un canal de comunicación institucional en tiempo real, integrando peticiones HTTP y WebSockets.

Las principales funcionalidades son el registro y el inicio de sesión, la existencia de tres tipos de usuario (alumno, docente y administrador), la edición del perfil con foto, los chats privados y grupales, el envío de mensajes en tiempo real, la edición y eliminación de mensajes propios, los comunicados oficiales dirigidos a un curso o a toda la institución y un panel de administración para gestionar usuarios, cursos y chats.

---

### Alcance

En cuanto a la autenticación y los usuarios, se desarrollará el registro con nombre de usuario, email y contraseña. El inicio de sesión se resolverá con un token, y las rutas del sistema estarán protegidas según el rol del usuario, que puede ser alumno, docente o administrador. Cada usuario podrá editar su perfil y subir una foto, de la cual se guardará la ruta en la base de datos.

En cuanto a los chats, los usuarios podrán crear conversaciones privadas con otra persona y chats grupales con nombre y foto. En los grupos se podrán agregar y quitar participantes, y quien tenga el rol de administrador del grupo podrá gestionarlo. Cada usuario verá el listado de sus chats junto con el último mensaje de cada uno.

En cuanto a los mensajes, el historial de cada chat se cargará mediante peticiones HTTP realizadas con Fetch, mientras que el envío y la recepción de mensajes nuevos se harán en tiempo real mediante WebSockets. Los usuarios podrán editar sus mensajes, que quedarán marcados como editados, y también eliminarlos.

En cuanto a los comunicados, los docentes y administradores podrán publicarlos, ya sea para un curso en particular o para toda la institución, y los destinatarios recibirán un aviso en tiempo real.



En cuanto a la administración, el administrador podrá crear, consultar, modificar y dar de baja usuarios, hacer lo mismo con los cursos, asignar usuarios a cursos y moderar el sistema, desactivando usuarios o chats cuando sea necesario. La baja de usuarios y de chats será lógica, es decir que se marcarán como inactivos y no se borrarán, para conservar el historial.

Con esto se cubren las operaciones de creación, consulta, modificación y eliminación de datos sobre usuarios, chats, participantes de chat, mensajes, cursos y comunicados.

Como características esperadas del producto final, se busca una aplicación con comunicación entre cliente y servidor por HTTP y por WebSockets, datos guardados de forma persistente en una base de datos MySQL, una identidad visual coherente en todas las pantallas y un usuario administrador de prueba para que los docentes puedan evaluar el sistema.

Quedan fuera del alcance de esta versión las videollamadas, el envío de archivos pesados, las notificaciones push al celular y las funciones de gestión académica como notas o asistencia. Estas ideas podrían incorporarse en una versión futura.

---

### Tecnologías y arquitectura

El frontend se desarrollará con React y Next.js, y el backend con Node.js y Express. Las comunicaciones en tiempo real se implementarán con Socket.IO, la base de datos será MySQL y la autenticación se resolverá con JWT y bcrypt. El código se versionará con Git y GitHub dentro de la organización PioIX.

La arquitectura sigue el esquema general pedido en la consigna. El frontend en Next.js se comunica con el backend en Node.js mediante peticiones HTTP y WebSockets, y el backend es el único que se conecta con la base de datos, a la que realiza consultas y de la que recibe las respuestas.

---

### Diseño inicial

La identidad visual de EducaLink busca ser limpia, moderna y sobria, acorde al contexto educativo. El color principal es un azul institucional (#1F3A93), acompañado por un dorado (#C9A227) como color de acento y un rojo (#C0392B) reservado para acciones de alerta o eliminación. Los fondos son blancos y grises muy claros (#FFFFFF y #F4F6FA). La tipografía elegida es Inter, tanto para títulos como para texto corriente. Los componentes tienen bordes redondeados, los avatares son circulares y los mensajes se muestran en burbujas. Los colores se inspiran en el escudo del colegio.

Los wireframes de las pantallas principales se encuentran en la carpeta docs/wireframes del repositorio. A continuación se describe cada una.

La pantalla de inicio de sesión muestra el logo y el nombre de la aplicación en el centro, debajo los campos de email y contraseña, un botón para iniciar sesión y un enlace para quienes todavía no tienen cuenta y necesitan registrarse. La pantalla de registro mantiene la misma estructura, con los campos de nombre de usuario, email y contraseña.

La pantalla principal es la del chat. Está dividida en dos columnas. A la izquierda se encuentra el buscador de chats, el botón para crear uno nuevo y la lista de conversaciones, cada una con su foto, su nombre y el último mensaje. A la derecha se abre la conversación seleccionada, con la foto y el nombre del chat en la parte superior, los mensajes en el centro, alineados a la derecha los propios y a la izquierda los de los demás, y en la parte inferior el campo para escribir y el botón de enviar. En el encabezado general de la aplicación se ven el nombre, un icono de notificaciones y la foto del usuario con un menú desplegable.

La pantalla de nuevo chat se muestra como una ventana sobre la pantalla principal. Permite elegir entre un chat privado o uno grupal, y en el caso de los grupos se completan el nombre y la foto. Además tiene un buscador de usuarios con una lista para seleccionar a los participantes y un botón para crear el chat.

La pantalla de perfil muestra la foto del usuario con la opción de cambiarla, y los campos de nombre de usuario, email y contraseña nueva, junto con el rol, que es solo informativo, y un botón para guardar los cambios.

La pantalla de comunicados presenta una lista de avisos ordenados por fecha, donde cada uno muestra el título, quién lo publicó, a qué curso está dirigido y cuándo se publicó. Quienes tienen permiso para publicar ven además un botón para crear un comunicado nuevo.

La pantalla del panel de administración tiene un menú lateral con las secciones de usuarios, cursos, chats y comunicados. En la sección de usuarios se ve una tabla con el nombre de usuario, el email, el rol y el estado de cada persona, con botones para editar y eliminar, un buscador y un filtro por rol, además del botón para crear un usuario nuevo. Las demás secciones siguen la misma estructura.

---

### Modelo de datos

El Diagrama Entidad-Relación completo se encuentra en la carpeta docs del repositorio (docs/DER.png y el archivo editable docs/DER.drawio), junto con el script de creación de tablas en docs/script.sql. Este diagrama se actualizará al final del proyecto para que refleje la implementación definitiva.

La base de datos tiene siete entidades. La entidad usuarios representa a las personas que usan el sistema y tiene como atributos principales el identificador, el nombre de usuario, el email, la contraseña, el rol (alumno, docente o administrador), la ruta de la foto, un indicador de si está activo y la fecha de registro. La entidad chats representa las conversaciones y guarda su identificador, nombre, foto, un indicador de si es grupal, la fecha de creación, un indicador de si está activo y, de forma opcional, el curso al que pertenece. La entidad chats_por_usuarios registra la participación de cada usuario en cada chat, con su propio identificador, el chat, el usuario, la fecha en que se unió y un indicador de si es administrador del grupo. La entidad mensajes guarda el identificador, el chat y el usuario que lo envió, el contenido, la fecha de envío y un indicador de si fue editado. La entidad cursos guarda el identificador, el nombre, la orientación, el año y la división. La entidad usuarios_cursos indica a qué curso pertenece cada usuario en cada ciclo lectivo. Por último, la entidad comunicados guarda el identificador, el usuario que lo publica, el curso al que va dirigido (opcional), el título, el contenido y la fecha.

Las relaciones entre estas entidades son las siguientes. Entre usuarios y chats existe una relación de muchos a muchos, resuelta mediante la tabla chats_por_usuarios, ya que un usuario participa en muchos chats y un chat tiene muchos usuarios. Entre chats y mensajes hay una relación de uno a muchos, porque un chat contiene muchos mensajes, y lo mismo ocurre entre usuarios y mensajes, porque un usuario envía muchos mensajes. Entre usuarios y cursos existe otra relación de muchos a muchos, resuelta con la tabla usuarios_cursos. Entre cursos y chats hay una relación de uno a muchos opcional, ya que un curso puede tener un chat grupal asociado. Finalmente, un usuario publica muchos comunicados y un comunicado puede estar dirigido a un curso; si no tiene curso asignado, se entiende que es para toda la institución.

Se tomaron algunas decisiones de diseño. Para distinguir los chats privados de los grupales se usa un campo booleano llamado es_grupal, en lugar de un campo de tipo. La tabla chats_por_usuarios tiene una clave primaria propia en lugar de una clave compuesta, lo que simplifica las consultas desde el backend. Las fotos se guardan como una ruta en un campo VARCHAR(255) y el archivo se almacena en el servidor. Las contraseñas nunca se guardan en texto plano, sino con hash.

---

### Planificación

El proyecto se desarrolla entre el 28/09 y el 20/11, fecha de la Expo Pío. A continuación se detallan las tareas, sus responsables y las fechas estimadas de finalización.

| N° | Objetivo | Responsables | Plazo a cumplir |
|---:|---|---|---|
| 1 | Preparar el repositorio | Todos | 08/10 |
| 2 | Diseñar la base de datos | Faustino | 10/10 |
| 3 | Armar la estructura del backend | Faustino - Julián | 13/10 |
| 4 | Armar la estructura del frontend | Francisco - Santiago | 13/10 |
| 5 | Login y registro | Faustino - Santiago | 17/10 |
| 6 | Control de roles | Julián | 20/10 |
| 7 | Perfil de usuario | Francisco | 22/10 |
| 8 | Gestión de chats por HTTP | Todos | 24/10 |
| 9 | Mensajes por HTTP | Todos | 28/10 |
| 10 | Servidor de WebSockets | Faustino - Julián | 31/10 |
| 11 | Cliente de WebSockets | Francisco - Santiago | 03/11 |
| 12 | Chat en tiempo real | Faustino | 05/11 |
| 13 | Editar y eliminar mensajes | Francisco - Santiago | 10/11 |
| 14 | Panel de administración | Julián | 12/11 |
| 15 | Comunicados | Santiago | 14/11 |
| 16 | Moderación | Santiago | 15/11 |
| 17 | Pruebas y correcciones | Francisco | 19/11 |
| 18 | Documentación y cierre | Todos | 21/11 |
| 19 | Preparar la presentación | Todos | 22/11 |

## Explicación de las tareas

1. **Preparar el repositorio:** crear el repositorio del proyecto, organizar las carpetas de frontend, backend y documentación, configurar el .gitignore, realizar el README inicial y establecer las ramas e Issues para organizar el trabajo.

2. **Diseñar la base de datos:** finalizar el DER, definir las tablas, relaciones, claves primarias y foráneas, crear el script.sql y preparar algunos datos de prueba para poder comenzar con el desarrollo.

3. **Armar la estructura del backend:** configurar el proyecto de Node.js, instalar las dependencias necesarias, crear el index.js, configurar la conexión a MySQL mediante mysql.js y dejar preparada la estructura para las rutas y endpoints.

4. **Armar la estructura del frontend:** crear el proyecto en Next.js, configurar el layout general, definir la identidad visual y preparar los componentes reutilizables que se utilizarán durante el desarrollo.

5. **Login y registro:** desarrollar el registro de usuarios y el inicio de sesión, almacenar las contraseñas de forma segura mediante hash, implementar JWT y crear las pantallas correspondientes en el frontend.

6. **Control de roles:** implementar la autenticación y autorización para diferenciar alumnos, docentes y administradores, protegiendo las rutas y funcionalidades según el rol de cada usuario.

7. **Perfil de usuario:** permitir que cada usuario consulte y modifique sus datos personales y pueda subir o actualizar su foto de perfil.

8. **Gestión de chats por HTTP:** desarrollar la creación de chats privados y grupales, el listado de conversaciones y la posibilidad de agregar o quitar participantes.

9. **Mensajes por HTTP:** crear los endpoints necesarios para obtener el historial de mensajes y desarrollar la interfaz que permita visualizar las conversaciones existentes.

10. **Servidor de WebSockets:** configurar Socket.IO en el backend, crear las salas correspondientes a cada chat e implementar la autenticación de las conexiones mediante sockets.

11. **Cliente de WebSockets:** conectar el frontend con Socket.IO mediante el hook useSocket.js, permitiendo que la aplicación se conecte al servidor y reciba eventos en tiempo real.

12. **Chat en tiempo real:** implementar el envío y recepción instantánea de mensajes, además de actualizar automáticamente la lista de chats cuando se produzcan nuevos mensajes.

13. **Editar y eliminar mensajes:** desarrollar los endpoints y eventos necesarios para editar y eliminar mensajes, incluyendo la marca de mensaje editado y la sincronización de estos cambios en tiempo real.

14. **Panel de administración:** crear un panel desde el cual los administradores puedan gestionar usuarios y cursos, además de realizar las asignaciones correspondientes.

15. **Comunicados:** permitir que los administradores o usuarios autorizados creen, consulten y eliminen comunicados, incorporando avisos en tiempo real para informar a los usuarios.

16. **Moderación:** implementar herramientas administrativas para desactivar usuarios y chats cuando sea necesario, restringiendo estas acciones únicamente a los usuarios autorizados.

17. **Pruebas y correcciones:** probar las funcionalidades del sistema, detectar y corregir errores, verificar la comunicación entre frontend y backend y adaptar la interfaz para que funcione correctamente en celulares.

18. **Documentación y cierre:** actualizar el DER y el script.sql, completar el README, preparar el usuario administrador, cargar los datos de prueba y dejar documentado el funcionamiento final del proyecto.

19. **Preparar la presentación:** organizar la demostración del proyecto, definir qué funcionalidades mostrará cada integrante, preparar el guion de exposición y realizar ensayos antes de la Expo Pío.

Se definieron tres hitos a lo largo del período de desarrollo. El primer hito, con fecha de finalización el 28/10, consiste en tener una base funcional: un usuario puede registrarse, iniciar sesión, ver su perfil y crear chats, todo mediante peticiones HTTP con Fetch, con la base de datos ya creada y la autenticación por roles funcionando. El segundo hito, el 10/11, consiste en tener el chat en tiempo real: los WebSockets funcionando, mensajes que llegan de forma instantánea en chats privados y grupales, y la posibilidad de editar y eliminar mensajes. El tercer hito, el 17/11, es el producto completo: el panel de administración y los comunicados terminados, todas las funciones probadas y la documentación finalizada, de modo que los últimos días queden disponibles para corregir errores y preparar la presentación.

Otras fechas importantes son el 07/10, día de la devolución de las propuestas, el 20/11, día de la Expo Pío, y desde el 25/11 los coloquios individuales.

La distribución de tareas busca que cada integrante participe en frontend, backend y base de datos. El [Integrante 1] se ocupa principalmente de la autenticación, los roles y la moderación; el [Integrante 2] de la base de datos, la gestión de chats y el panel de administración; el [Integrante 3] de los WebSockets y el chat en tiempo real; y el [Integrante 4] del frontend, la interfaz y la identidad visual. Esta división sirve para organizar el trabajo, pero no implica que el conocimiento esté separado: todos los integrantes conocen el funcionamiento general del proyecto y pueden explicar cualquiera de sus partes.

---

### Organización del trabajo en GitHub

La rama main solo se actualiza mediante Pull Requests, que deben ser revisados por otro integrante del grupo. Cada funcionalidad se desarrolla en su propia rama, con nombres como feature/login o feature/chat-socket. Cada tarea de la tabla se crea como un Issue asignado a su responsable y se cierra cuando se aprueba el Pull Request correspondiente. Los conflictos y errores también se registran y se resuelven mediante Issues. Todos los integrantes hacen commits y participan en la revisión del código, y los mensajes de commit deben describir con claridad el cambio realizado.

---

### Estructura del repositorio

El repositorio sigue la estructura mínima pedida en la consigna. La carpeta frontend contiene la aplicación en React y Next.js, con su propio .gitignore, la carpeta public, y dentro de src las carpetas app, components y hooks, donde se ubica el archivo useSocket.js. La carpeta backend contiene el servidor en Node.js, con su .gitignore, el archivo index.js, el package.json y la carpeta modulos, que incluye mysql.js para la conexión con la base de datos. La carpeta docs contiene el DER, el script.sql y los wireframes. En la raíz se encuentra este README.md.

---

### Riesgos

El principal riesgo es el retraso con los WebSockets, un tema nuevo para el grupo. Para reducirlo, se empezará con una prueba mínima de envío y recepción de mensajes antes de integrarlo al chat completo, y se consultará a los docentes durante las horas de clase. Para evitar conflictos de código en Git se trabajará con ramas por funcionalidad y Pull Requests pequeños y frecuentes. Los cambios en el modelo de datos se registrarán de inmediato en el script.sql y en el DER. Si algún integrante se ausenta, las tareas podrán redistribuirse porque todos conocen el proyecto. Por último, para no subir datos sensibles al repositorio, el .gitignore se configurará desde el inicio y las credenciales se guardarán solo en archivos .env locales.

---

### Ejecución del proyecto

Esta sección se completará en la entrega final, con los pasos para instalar las dependencias y ejecutar el backend y el frontend, y con los datos del usuario administrador para los docentes.
