# Guía de Desarrollo - Sistema de Reservas Barbería

## 🚀 Configuración Inicial

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL (local o Railway/Render)
- Git

### 1. Clonar y configurar el proyecto

```bash
git clone <tu-repo>
cd ReservasBarberia
```

### 2. Configurar Frontend

```bash
cd frontend
npm install
cp env.example .env.local
# Editar .env.local con tus variables
npm run dev
```

El frontend estará disponible en: http://localhost:3000

### 3. Configurar Backend

```bash
cd backend
npm install
cp env.example .env
# Editar .env con tus variables
npm run dev
```

El backend estará disponible en: http://localhost:5000

## 📁 Estructura del Proyecto

```
ReservasBarberia/
├── frontend/                 # Next.js App
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── page.js      # Landing page
│   │   │   ├── login/       # Login page
│   │   │   ├── register/    # Register page
│   │   │   └── layout.js    # Root layout
│   │   ├── components/      # Componentes reutilizables
│   │   ├── lib/            # Utilidades y configuraciones
│   │   ├── hooks/          # Custom hooks
│   │   └── utils/          # Funciones auxiliares
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── backend/                 # Express API
│   ├── routes/             # Rutas de la API
│   │   ├── auth.js         # Autenticación
│   │   ├── users.js        # Usuarios
│   │   ├── services.js     # Servicios
│   │   ├── appointments.js # Citas
│   │   ├── payments.js     # Pagos
│   │   └── schedules.js    # Horarios
│   ├── prisma/             # Schema de PostgreSQL
│   ├── middleware/         # Middleware personalizado
│   ├── utils/              # Utilidades
│   ├── package.json
│   └── server.js           # Servidor principal
├── docs/                   # Documentación
└── README.md
```

## 🛠️ Comandos Útiles

### Frontend
```bash
npm run dev      # Desarrollo
npm run build    # Build para producción
npm run start    # Servidor de producción
npm run lint     # Linter
```

### Backend
```bash
npm run dev      # Desarrollo con nodemon
npm start        # Producción
```

## 🎨 Tecnologías Utilizadas

### Frontend
- **Next.js 14** - Framework React con App Router
- **React 18** - Biblioteca de UI
- **TailwindCSS** - Framework CSS
- **Axios** - Cliente HTTP
- **React Hook Form** - Manejo de formularios
- **Date-fns** - Manipulación de fechas
- **Stripe.js** - Pagos

### Backend
- **Express.js** - Framework web
- **PostgreSQL + Prisma** - Base de datos
- **JWT** - Autenticación
- **Stripe** - Procesamiento de pagos
- **Nodemailer** - Envío de emails
- **Helmet** - Seguridad
- **CORS** - Cross-origin requests

## 🔧 Variables de Entorno

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Backend (.env)
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/reservas
JWT_SECRET=tu_jwt_secret_super_seguro
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

## 📋 Próximos Pasos

1. **Implementar autenticación completa**
   - Registro de usuarios
   - Login/logout
   - Middleware de autenticación

2. **Crear modelos de base de datos**
   - User model
   - Service model
   - Appointment model
   - Payment model

3. **Desarrollar funcionalidades principales**
   - Dashboard de administración
   - Sistema de reservas
   - Integración con Stripe
   - Calendario de disponibilidad

4. **Añadir páginas adicionales**
   - Perfil público de barbería
   - Dashboard privado
   - Página de reservas

## 🚀 Deploy

### Frontend (Vercel)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático

### Backend (Railway/Heroku)
1. Crear aplicación
2. Configurar variables de entorno
3. Conectar base de datos PostgreSQL
4. Deploy

## 📞 Soporte

Para dudas o problemas, revisar la documentación en `/docs/` o crear un issue en el repositorio. 