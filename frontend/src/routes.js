export const routes = [
  { 
    path: '/', 
    redirect: '/dashboard'
  },
  { 
    path: '/login', 
    name: 'Login',
    component: () => import('./views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    component: () => import('./layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { 
        path: 'dashboard', 
        name: 'Dashboard',
        component: () => import('./views/Dashboard.vue'),
        meta: { title: 'Dashboard' }
      }
    ]
  }
]