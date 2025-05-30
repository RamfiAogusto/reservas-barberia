# Sistema de Reservas para Barberías 💈

Sistema web completo para gestión de citas y reservas de barberías con pagos integrados.

## 🏗️ Estructura del Proyecto

```
ReservasBarberia/
├── frontend/          # Next.js + React + TailwindCSS
├── backend/           # Node.js + Express + MongoDB
├── docs/              # Documentación
└── README.md          # Este archivo
```

## 🚀 Características Principales

- **Frontend**: Next.js 14 con App Router, React, TailwindCSS
- **Backend**: Node.js, Express, MongoDB
- **Pagos**: Integración con Stripe
- **Autenticación**: JWT
- **Deploy**: Vercel (Frontend) + Railway/Heroku (Backend)

## 🛠️ Instalación y Desarrollo

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000)

### Backend
```bash
cd backend
npm install
npm run dev
```
API disponible en [http://localhost:5000](http://localhost:5000)

## 📋 URLs del Sistema

- `/` - Landing page
- `/login` - Acceso general
- `/register` - Registro general
- `/[usuario]` - Perfil público del salón
- `/[usuario]/book` - Reservar cita
- `/dashboard` - Panel privado

## 🎯 MVP Funcionalidades

### Públicas
- ✅ Perfil público del salón
- ✅ Sistema de reservas con pago obligatorio
- ✅ Calendario de disponibilidad

### Privadas (Dashboard)
- ✅ Gestión de citas
- ✅ Configuración de horarios avanzada
- ✅ Gestión de servicios y precios
- ✅ Lista de clientes

## 🗄️ Base de Datos

- Users (propietarios)
- Services (servicios y precios)
- Staff (equipo de trabajo)
- Appointments (citas)
- Business_Hours (horarios)
- Recurring_Breaks (descansos)
- Schedule_Exceptions (excepciones)
- Payments (pagos)

## 🔧 Variables de Entorno

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/reservas
JWT_SECRET=tu_jwt_secret_aqui
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📦 Dependencias Principales

### Frontend
- Next.js 14
- React 18
- TailwindCSS
- Stripe.js
- Date-fns

### Backend
- Express.js
- MongoDB/Mongoose
- JWT
- Stripe
- Nodemailer

## 🚀 Deploy

### Frontend (Vercel)
```bash
npm run build
vercel deploy
```

### Backend (Railway/Heroku)
```bash
# Configurar variables de entorno
# Deploy automático desde GitHub
```

## 📄 Licencia

MIT License 